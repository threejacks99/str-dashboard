import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAuthenticatedClient } from '../../../../lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_IDS: Record<string, string | undefined> = {
  solo:    process.env.STRIPE_PRICE_SOLO,
  multi:   process.env.STRIPE_PRICE_MULTI,
  manager: process.env.STRIPE_PRICE_MANAGER,
}

export async function POST(req: NextRequest) {
  try {
    const { tier } = (await req.json()) as { tier?: string }
    const priceId = tier ? PRICE_IDS[tier] : undefined

    if (!tier || !priceId) {
      return NextResponse.json({ error: 'Invalid or missing tier' }, { status: 400 })
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
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url:  `${origin}/billing?canceled=true`,
      metadata: { account_id: account.id as string, tier },
      subscription_data: {
        metadata: { account_id: account.id as string, tier },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed'
    console.error('[stripe/checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
