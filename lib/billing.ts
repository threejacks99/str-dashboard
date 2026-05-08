export type Tier = 'solo' | 'portfolio' | 'investor'
export type BillingInterval = 'monthly' | 'annual'

export type BillingStatus = {
  subscription_tier: Tier | null
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | null
  billing_interval: BillingInterval | null
  trial_ends_at: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export const TIER_LABELS: Record<Tier, string> = {
  solo:      'Solo',
  portfolio: 'Portfolio',
  investor:  'Investor',
}

export const TIER_PROPERTY_DESCRIPTIONS: Record<Tier, string> = {
  solo:      '1 property',
  portfolio: 'Up to 10 properties',
  investor:  'Up to 50 properties',
}

export const TIER_PROPERTY_CAPS: Record<Tier, number> = {
  solo:      1,
  portfolio: 10,
  investor:  50,
}

export const TIER_PRICES: Record<Tier, Record<BillingInterval, number>> = {
  solo:      { monthly: 15,  annual: 149 },
  portfolio: { monthly: 39,  annual: 389 },
  investor:  { monthly: 169, annual: 1690 },
}

export type FeatureFlags = {
  scheduleEPdf: boolean
  excelExport: boolean
  periodOverPeriod: boolean
}

export const PORTFOLIO_OVERAGE_RATE: Record<BillingInterval, number> = {
  monthly: 5,
  annual:  50,
}

export function getPriceId(tier: Tier, interval: BillingInterval): string {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`
  const value = process.env[key]
  if (!value) throw new Error(`Missing env var: ${key}`)
  return value
}

export function getPortfolioOveragePriceId(interval: BillingInterval): string {
  const key = `STRIPE_PRICE_PORTFOLIO_OVERAGE_${interval.toUpperCase()}`
  const value = process.env[key]
  if (!value) throw new Error(`Missing env var: ${key}`)
  return value
}

export function daysRemaining(isoDate: string | null): number {
  if (!isoDate) return 0
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

export function isInTrial(status: BillingStatus | null): boolean {
  if (!status) return false
  if (status.subscription_status !== 'trialing') return false
  return daysRemaining(status.trial_ends_at) > 0
}

export function isAccountLocked(status: BillingStatus | null): boolean {
  if (!status) return false
  if (!status.subscription_tier) return true
  if (status.subscription_status === 'active') return false
  if (status.subscription_status === 'trialing') {
    return daysRemaining(status.trial_ends_at) <= 0
  }
  return true
}

export function getFeatures(status: BillingStatus | null): FeatureFlags {
  if (!status || !status.subscription_tier) {
    return { scheduleEPdf: false, excelExport: false, periodOverPeriod: false }
  }
  if (isInTrial(status)) {
    return { scheduleEPdf: false, excelExport: false, periodOverPeriod: true }
  }
  if (status.subscription_status === 'active') {
    return { scheduleEPdf: true, excelExport: true, periodOverPeriod: true }
  }
  return { scheduleEPdf: false, excelExport: false, periodOverPeriod: false }
}

export function calculateOverage(
  tier: Tier | null,
  interval: BillingInterval | null,
  propertyCount: number
): { units: number; ratePerUnit: number; total: number } {
  if (tier !== 'portfolio' || !interval) return { units: 0, ratePerUnit: 0, total: 0 }
  const units = Math.max(0, propertyCount - TIER_PROPERTY_CAPS.portfolio)
  const ratePerUnit = PORTFOLIO_OVERAGE_RATE[interval]
  return { units, ratePerUnit, total: units * ratePerUnit }
}
