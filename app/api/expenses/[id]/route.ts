import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '../../../../lib/auth'
import { isAccountLocked, type BillingStatus, type Tier } from '../../../../lib/billing'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || id.trim() === '') {
      return NextResponse.json({ error: 'Expense id is required.' }, { status: 400 })
    }

    const supabase = await createAuthenticatedClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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

    // Hard delete — RLS scopes by account; expenses have no soft-delete column
    // and no Stripe side effects (overage math is property-count-driven only).
    const { error: deleteErr } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete expense'
    console.error('[api/expenses/[id] DELETE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
