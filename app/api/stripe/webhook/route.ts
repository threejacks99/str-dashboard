import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { Tier, BillingInterval } from '../../../../lib/billing'
import { sendEmail } from '../../../../lib/postmark'
import { trialEndingEmail, planChangeEmail, cancellationEmail } from '../../../../lib/email-templates'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Tolerate missing env vars: webhook must keep ack'ing Stripe events even
// with partial config in dev.
type PriceKey = { tier: Tier; interval: BillingInterval }

const BASE_PRICE_LOOKUP: Map<string, PriceKey> = (() => {
  const map = new Map<string, PriceKey>()
  const entries: Array<[string, PriceKey]> = [
    ['STRIPE_PRICE_SOLO_MONTHLY',      { tier: 'solo',      interval: 'monthly' }],
    ['STRIPE_PRICE_SOLO_ANNUAL',       { tier: 'solo',      interval: 'annual'  }],
    ['STRIPE_PRICE_PORTFOLIO_MONTHLY', { tier: 'portfolio', interval: 'monthly' }],
    ['STRIPE_PRICE_PORTFOLIO_ANNUAL',  { tier: 'portfolio', interval: 'annual'  }],
    ['STRIPE_PRICE_INVESTOR_MONTHLY',  { tier: 'investor',  interval: 'monthly' }],
    ['STRIPE_PRICE_INVESTOR_ANNUAL',   { tier: 'investor',  interval: 'annual'  }],
  ]
  for (const [envVar, key] of entries) {
    const value = process.env[envVar]
    if (!value) {
      console.warn(`[webhook] ${envVar} is not set — base-tier resolution will skip this entry`)
      continue
    }
    map.set(value, key)
  }
  return map
})()

const OVERAGE_PRICE_IDS: Set<string> = (() => {
  const set = new Set<string>()
  for (const envVar of ['STRIPE_PRICE_PORTFOLIO_OVERAGE_MONTHLY', 'STRIPE_PRICE_PORTFOLIO_OVERAGE_ANNUAL']) {
    const value = process.env[envVar]
    if (!value) {
      console.warn(`[webhook] ${envVar} is not set — overage item recognition disabled for this variant`)
      continue
    }
    set.add(value)
  }
  return set
})()

type BaseMatch = {
  item: Stripe.SubscriptionItem
  tier: Tier
  interval: BillingInterval
}

function findBaseItem(sub: Stripe.Subscription): BaseMatch | null {
  for (const item of sub.items.data) {
    const match = BASE_PRICE_LOOKUP.get(item.price.id)
    if (match) return { item, tier: match.tier, interval: match.interval }
  }
  return null
}

function describeItems(sub: Stripe.Subscription): string {
  return sub.items.data.map(i => {
    const id = i.price.id
    if (BASE_PRICE_LOOKUP.has(id)) return `${id}(base)`
    if (OVERAGE_PRICE_IDS.has(id)) return `${id}(overage)`
    return `${id}(unknown)`
  }).join(',')
}

function toIsoOrNull(epochSeconds: number | null | undefined): string | null {
  if (epochSeconds == null) return null
  const ms = epochSeconds * 1000
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
  if (!customerId) {
    console.error(`[webhook] subscription.change sub=${sub.id} has no customer id — skipping`)
    return
  }

  const base = findBaseItem(sub)

  let tier: Tier | null = null
  let interval: BillingInterval | null = null
  let periodEndSource: number | null | undefined

  if (base) {
    tier = base.tier
    interval = base.interval
    periodEndSource = (base.item as any).current_period_end
  } else {
    // Interval cannot be inferred without a base price match — leave it null.
    const metaTier = sub.metadata?.tier as string | undefined
    if (metaTier === 'solo' || metaTier === 'portfolio' || metaTier === 'investor') {
      tier = metaTier
    }
    console.warn(
      `[webhook] subscription.change sub=${sub.id} customer=${customerId} ` +
      `no base item resolved; items=[${describeItems(sub)}]; ` +
      `falling back to metadata.tier=${metaTier ?? 'absent'} (interval unknown)`
    )
    periodEndSource = (sub.items.data[0] as any)?.current_period_end
  }

  console.log(
    `[webhook] subscription.change sub=${sub.id} customer=${customerId} ` +
    `status=${sub.status} tier=${tier} interval=${interval}`
  )

  const { data: prior } = await admin
    .from('accounts')
    .select('name, billing_email, subscription_tier, billing_interval, cancel_email_sent_at')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  const { error } = await admin
    .from('accounts')
    .update({
      subscription_status:    sub.status,
      subscription_tier:      tier,
      billing_interval:       interval,
      stripe_subscription_id: sub.id,
      current_period_end:     toIsoOrNull(periodEndSource),
      trial_ends_at:          toIsoOrNull(sub.trial_end),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error(
      `[webhook] subscription.change sub=${sub.id} customer=${customerId} db update failed: ${error.message}`
    )
  }

  try {
    if (prior?.billing_email && prior.subscription_tier && prior.billing_interval &&
        tier && interval &&
        (prior.subscription_tier !== tier || prior.billing_interval !== interval)) {
      const { subject, htmlBody, textBody } = planChangeEmail({
        accountName: prior.name || prior.billing_email,
        recipientEmail: prior.billing_email,
        oldTier: prior.subscription_tier as Tier,
        oldInterval: prior.billing_interval as BillingInterval,
        newTier: tier, newInterval: interval,
      })
      await sendEmail({ to: prior.billing_email, subject, htmlBody, textBody })
    }
  } catch (e) {
    console.error(`[webhook] plan-change email failed (non-fatal) sub=${sub.id}: ${e instanceof Error ? e.message : e}`)
  }

  // Cancellation-confirmation email — fires once on the cancel_at_period_end
  // false->true edge. The guard column self-heals: a resubscribe (cancel_at_
  // period_end back to false) clears it, re-arming for a future cancellation.
  // Kept out of handleSubscriptionDeleted on purpose: deleted fires at period
  // end, when access has already ended; the "access continues until" wording
  // only fits the moment the cancel is scheduled (this updated event).
  try {
    // dahlia (2026-04-22) deprecated cancel_at_period_end (reads false even when a
    // cancel is scheduled). cancel_at — a Unix-seconds timestamp — is the live signal
    // for a pending cancel-at-period-end. Keep the old boolean as a defensive fallback
    // in case the account's API version is ever pinned older. Mirrors the basil
    // current_period_end field-migration already handled elsewhere in this file.
    const cancelAt = (sub as any).cancel_at as number | null | undefined
    const cancelPending = cancelAt != null || sub.cancel_at_period_end === true
    const alreadySent = prior?.cancel_email_sent_at != null

    if (cancelPending && !alreadySent && prior?.billing_email && tier && interval) {
      const accessUntil = toIsoOrNull(periodEndSource)
      if (accessUntil) {
        const { subject, htmlBody, textBody } = cancellationEmail({
          accountName: prior.name || prior.billing_email,
          recipientEmail: prior.billing_email,
          tier, interval, accessUntil,
        })
        await sendEmail({ to: prior.billing_email, subject, htmlBody, textBody })
        // Mark sent only after a successful send, so a send failure retries on the next event.
        await admin.from('accounts')
          .update({ cancel_email_sent_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
      }
    } else if (!cancelPending && alreadySent) {
      // Resubscribe / un-cancel: re-arm the guard for a future cancellation.
      await admin.from('accounts')
        .update({ cancel_email_sent_at: null })
        .eq('stripe_customer_id', customerId)
    }
  } catch (e) {
    console.error(`[webhook] cancellation email failed (non-fatal) sub=${sub.id}: ${e instanceof Error ? e.message : e}`)
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
  if (!customerId) {
    console.error(`[webhook] subscription.deleted sub=${sub.id} has no customer id — skipping`)
    return
  }

  console.log(`[webhook] subscription.deleted sub=${sub.id} customer=${customerId}`)

  const { error } = await admin
    .from('accounts')
    .update({
      subscription_status:    null,
      subscription_tier:      null,
      billing_interval:       null,
      stripe_subscription_id: null,
      current_period_end:     null,
      trial_ends_at:          null,
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error(
      `[webhook] subscription.deleted sub=${sub.id} customer=${customerId} db update failed: ${error.message}`
    )
  }
}

async function handleTrialWillEnd(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
  if (!customerId) { console.error(`[webhook] trial_will_end sub=${sub.id} no customer — skipping`); return }
  const base = findBaseItem(sub)
  const trialEndsAt = toIsoOrNull(sub.trial_end)
  if (!base || !trialEndsAt) { console.warn(`[webhook] trial_will_end sub=${sub.id} missing base/trial_end — skipping`); return }
  const { data: acct } = await admin
    .from('accounts').select('name, billing_email').eq('stripe_customer_id', customerId).maybeSingle()
  if (!acct?.billing_email) { console.warn(`[webhook] trial_will_end sub=${sub.id} no billing_email — skipping`); return }
  try {
    const { subject, htmlBody, textBody } = trialEndingEmail({
      accountName: acct.name || acct.billing_email, recipientEmail: acct.billing_email,
      tier: base.tier, interval: base.interval, trialEndsAt,
    })
    await sendEmail({ to: acct.billing_email, subject, htmlBody, textBody })
  } catch (e) {
    console.error(`[webhook] trial-ending email failed (non-fatal) sub=${sub.id}: ${e instanceof Error ? e.message : e}`)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (err: unknown) {
    // Always 200 even on internal failure — non-2xx triggers Stripe retries
    // and would create duplicate updates.
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    const subId = (event.data?.object as Stripe.Subscription | undefined)?.id ?? 'unknown'
    console.error(
      `[webhook] event=${event.type} eventId=${event.id} sub=${subId} unhandled error: ${msg}`,
      stack
    )
  }

  return NextResponse.json({ received: true })
}
