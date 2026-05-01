import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAuthenticatedClient } from '../../../../lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
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
      .select('stripe_customer_id')
      .eq('id', auRow.account_id)
      .single()

    if (!account?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer on file' }, { status: 400 })
    }

    const origin = req.headers.get('origin') ?? 'https://hostics.app'

    const session = await stripe.billingPortal.sessions.create({
      customer:   account.stripe_customer_id as string,
      return_url: `${origin}/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Portal session failed'
    console.error('[stripe/portal]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
