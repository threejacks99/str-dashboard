import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAuthenticatedClient } from '../../../../lib/auth'
import { getPriceId, type Tier, type BillingInterval } from '../../../../lib/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function isTier(v: unknown): v is Tier {
  return v === 'solo' || v === 'portfolio' || v === 'investor'
}
function isInterval(v: unknown): v is BillingInterval {
  return v === 'monthly' || v === 'annual'
}

export async function POST(req: NextRequest) {
  try {
    const { tier, interval } = (await req.json()) as { tier?: unknown; interval?: unknown }

    if (!isTier(tier)) {
      return NextResponse.json(
        { error: 'Invalid or missing tier. Expected one of: solo, portfolio, investor.' },
        { status: 400 }
      )
    }
    if (!isInterval(interval)) {
      return NextResponse.json(
        { error: 'Invalid or missing interval. Expected one of: monthly, annual.' },
        { status: 400 }
      )
    }

    let priceId: string
    try {
      priceId = getPriceId(tier, interval)
    } catch (e) {
      console.error('[stripe/checkout] price lookup failed:', e instanceof Error ? e.message : e)
      return NextResponse.json(
        { error: 'Pricing configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const supabase = await createAuthenticatedClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: auRow } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!auRow) return NextResponse.json({ error: 'No account found' }, { status: 404 })

    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, billing_email, stripe_customer_id')
      .eq('id', auRow.account_id)
      .single()

    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    // Create Stripe customer on first checkout
    let customerId = account.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (account.billing_email as string | null) ?? user.email ?? undefined,
        name:  (account.name as string | null) ?? undefined,
        metadata: { account_id: account.id as string },
      })
      customerId = customer.id
      await supabase
        .from('accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account.id)
    }

    const origin = req.headers.get('origin') ?? 'https://hostics.app'

    const session = await stripe.checkout.sessions.create({
      mode:      'subscription',
      customer:  customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'always',
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url:  `${origin}/billing?canceled=true`,
      metadata: { account_id: account.id as string, tier, billing_interval: interval },
      subscription_data: {
        trial_period_days: 14,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
        metadata: { account_id: account.id as string, tier, billing_interval: interval },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed'
    console.error('[stripe/checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
