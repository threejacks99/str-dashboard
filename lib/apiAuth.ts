import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createAuthenticatedClient } from './auth'
import { isAccountLocked, type BillingStatus, type Tier } from './billing'

// Same client type that createAuthenticatedClient resolves to.
type AuthenticatedClient = Awaited<ReturnType<typeof createAuthenticatedClient>>

/**
 * Shared API route preamble: authenticate, resolve the account, build the
 * BillingStatus, and enforce the account-lock gate. Extracted verbatim from the
 * identical preambles in app/api/properties/[id]/route.ts (DELETE),
 * app/api/reservations/[id]/route.ts (DELETE), and app/api/expenses/[id]/route.ts
 * (DELETE). Returns { ok:false, response } at each early-exit (caller does
 * `if (!auth.ok) return auth.response`), or { ok:true, ... } on success.
 */
export async function requireUnlockedAccount(): Promise<
  | { ok: true; supabase: AuthenticatedClient; user: User; accountId: string; status: BillingStatus }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createAuthenticatedClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  const { data: auRow } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!auRow) {
    return { ok: false, response: NextResponse.json({ error: 'No account found' }, { status: 404 }) }
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('subscription_tier, subscription_status, billing_interval, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id')
    .eq('id', auRow.account_id)
    .single()

  if (!account) {
    return { ok: false, response: NextResponse.json({ error: 'Account not found' }, { status: 500 }) }
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
    return { ok: false, response: NextResponse.json({ error: 'Account locked', code: 'LOCKED' }, { status: 403 }) }
  }

  return { ok: true, supabase, user, accountId: auRow.account_id, status }
}
