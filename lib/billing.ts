export type BillingStatus = {
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  subscription_tier: 'solo' | 'multi' | 'manager' | null
  trial_ends_at: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export function daysRemaining(isoDate: string | null): number {
  if (!isoDate) return 0
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

export function isAccountLocked(status: BillingStatus | null): boolean {
  if (!status) return false
  if (status.subscription_status === 'active') return false
  if (status.subscription_status === 'trialing') {
    return daysRemaining(status.trial_ends_at) <= 0
  }
  // past_due, canceled, incomplete → locked
  return true
}

export const TIER_LABELS: Record<string, string> = {
  solo:    'Single Property',
  multi:   'Up to 10 Properties',
  manager: 'Up to 50 Properties + White-label',
}
