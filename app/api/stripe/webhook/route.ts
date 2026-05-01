import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_SOLO    ?? '']: 'solo',
  [process.env.STRIPE_PRICE_MULTI   ?? '']: 'multi',
  [process.env.STRIPE_PRICE_MANAGER ?? '']: 'manager',
}

function toIsoOrNull(epochSeconds: number | null | undefined): string | null {
  if (epochSeconds == null) return null
  const ms = epochSeconds * 1000
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
  if (!customerId) {
    console.error('[webhook] subscription has no customer id', sub.id)
    return
  }

  const tier =
    (sub.metadata?.tier as string | undefined) ??
    PRICE_TO_TIER[sub.items.data[0]?.price.id ?? ''] ??
    null

  console.log(`[webhook] subscription.change sub=${sub.id} customer=${customerId} status=${sub.status} tier=${tier}`)

  const { error } = await admin
    .from('accounts')
    .update({
      subscription_status:    sub.status,
      subscription_tier:      tier,
      stripe_subscription_id: sub.id,
      current_period_end:     toIsoOrNull((sub as any).current_period_end),
    })
    .eq('stripe_customer_id', customerId)

  if (error) console.error('[webhook] db update failed', error.message)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id
  if (!customerId) {
    console.error('[webhook] deleted subscription has no customer id', sub.id)
    return
  }

  console.log(`[webhook] subscription.deleted sub=${sub.id} customer=${customerId}`)

  const { error } = await admin
    .from('accounts')
    .update({
      subscription_status:    'canceled',
      subscription_tier:      null,
      stripe_subscription_id: sub.id,
      current_period_end:     toIsoOrNull((sub as any).current_period_end),
    })
    .eq('stripe_customer_id', customerId)

  if (error) console.error('[webhook] db delete update failed', error.message)
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
      default:
        break
    }
  } catch (err: unknown) {
    // Log but still return 200 — Stripe retries on non-2xx which would create duplicate updates
    console.error('[webhook] unhandled error for event', event.type, err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ received: true })
}
