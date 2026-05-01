import { NextResponse } from 'next/server'
import { createAuthenticatedClient } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createAuthenticatedClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json(null, { status: 401 })

    const { data: auRow } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!auRow) return NextResponse.json(null, { status: 404 })

    const { data: account } = await supabase
      .from('accounts')
      .select('subscription_status, subscription_tier, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('id', auRow.account_id)
      .single()

    return NextResponse.json(account ?? null)
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}
