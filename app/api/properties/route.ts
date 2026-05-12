import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAuthenticatedClient } from '../../../lib/auth'
import {
  isAccountLocked,
  TIER_PROPERTY_CAPS,
  PORTFOLIO_OVERAGE_RATE,
  getPortfolioOveragePriceId,
  calculateOverage,
  type BillingStatus,
  type Tier,
} from '../../../lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json()) as {
      name?: string
      address?: string | null
      bedrooms?: number | null
      bathrooms?: number | null
      total_nights_available?: number
      property_value?: number | null
      confirmOverage?: boolean
    }

    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({ error: 'Property name is required.' }, { status: 400 })
    }

    const { data: auRow } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!auRow) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('subscription_tier, subscription_status, billing_interval, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('id', auRow.account_id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 500 })
    }

    const status: BillingStatus = {
      subscription_tier:      account.subscription_tier      as Tier | null,
      subscription_status:    account.subscription_status    as BillingStatus['subscription_status'],
      billing_interval:       account.billing_interval       as BillingStatus['billing_interval'],
      trial_ends_at:          account.trial_ends_at          as string | null,
      current_period_end:     account.current_period_end     as string | null,
      stripe_customer_id:     account.stripe_customer_id     as string | null,
      stripe_subscription_id: account.stripe_subscription_id as string | null,
    }

    if (isAccountLocked(status)) {
      return NextResponse.json({ error: 'Account locked', code: 'LOCKED' }, { status: 403 })
    }

    // isAccountLocked already returns true when tier is null, so this is a
    // belt-and-suspenders fallback rather than a real path.
    if (!status.subscription_tier) {
      return NextResponse.json({ error: 'Tier not set' }, { status: 500 })
    }
    const tier: Tier = status.subscription_tier
    const cap = TIER_PROPERTY_CAPS[tier]

    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)

    const currentCount = count ?? 0
    if (currentCount >= cap) {
      if (tier === 'portfolio') {
        if (!body.confirmOverage) {
          // Soft cap — needs user confirmation before adding overage.
          return NextResponse.json(
            {
              status: 'needs_confirmation',
              currentCount,
              cap,
              tier,
              interval: status.billing_interval,
              overageRate: status.billing_interval
                ? PORTFOLIO_OVERAGE_RATE[status.billing_interval]
                : null,
            },
            { status: 200 }
          )
        }
        // Confirmed overage — defensive checks before insert + Stripe update.
        if (!status.stripe_subscription_id || !status.billing_interval) {
          return NextResponse.json(
            { error: 'Subscription not configured for overage' },
            { status: 500 }
          )
        }
      } else {
        // Solo and Investor stay hard 403.
        return NextResponse.json(
          {
            error: `You have reached your plan's property limit (${cap}). Upgrade to add more properties.`,
            code: 'CAP_EXCEEDED',
            currentCount,
            cap,
            tier,
          },
          { status: 403 }
        )
      }
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('account_id', auRow.account_id)
      .limit(1)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'No client found for account' }, { status: 404 })
    }

    const { data: newProp, error: insertErr } = await supabase
      .from('properties')
      .insert({
        name: body.name.trim(),
        address: body.address?.trim() || null,
        bedrooms: body.bedrooms ?? null,
        bathrooms: body.bathrooms ?? null,
        total_nights_available: body.total_nights_available ?? 365,
        property_value: body.property_value ?? null,
        client_id: client.id,
      })
      .select('id, name')
      .single()

    if (insertErr || !newProp) {
      return NextResponse.json(
        { error: insertErr?.message ?? 'Failed to create property' },
        { status: 500 }
      )
    }

    if (tier === 'portfolio' && currentCount + 1 > TIER_PROPERTY_CAPS.portfolio) {
      try {
        const overagePriceId = getPortfolioOveragePriceId(status.billing_interval!)
        const sub = await stripe.subscriptions.retrieve(status.stripe_subscription_id!)
        const existing = sub.items.data.find(i => i.price.id === overagePriceId)
        const newQuantity = calculateOverage('portfolio', status.billing_interval, currentCount + 1).units

        const itemUpdate = existing
          ? { id: existing.id, quantity: newQuantity }
          : { price: overagePriceId, quantity: newQuantity }

        await stripe.subscriptions.update(status.stripe_subscription_id!, {
          items: [itemUpdate],
          proration_behavior: 'none',
        })
      } catch (err) {
        // Rollback the just-inserted property so we don't leak revenue.
        await supabase.from('properties').delete().eq('id', newProp.id)
        const msg = err instanceof Error ? err.message : 'Failed to update subscription'
        console.error('[api/properties POST overage]', msg)
        return NextResponse.json(
          { error: `Couldn't update subscription: ${msg}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      status: 'created',
      id:     newProp.id   as string,
      name:   newProp.name as string,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create property'
    console.error('[api/properties POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// TODO: Phase 8b — delete-side overage decrement.
// Build DELETE /api/properties/[id] that:
//   1. deletes the property (with cascade behavior decided then)
//   2. on Portfolio, recomputes overage quantity = max(0, count - 10)
//   3. calls stripe.subscriptions.update with proration_behavior: 'none'
//   4. removes the overage item entirely (items: [{ id, deleted: true }])
//      when quantity would drop to 0.
