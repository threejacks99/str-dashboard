'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBillingStatus, invalidateBillingCache } from '../../lib/useBillingStatus'
import { TIER_LABELS, daysRemaining } from '../../lib/billing'

const TIERS = [
  {
    id: 'solo',
    name: 'Single Property',
    price: '$29',
    description: 'Perfect for individual STR owners managing one property.',
    features: ['1 property', 'Revenue & expense tracking', 'Tax-ready reports', 'CSV & Excel import'],
  },
  {
    id: 'portfolio',
    name: 'Up to 10 Properties',
    price: '$79',
    description: 'For owners building a rental portfolio.',
    features: ['Up to 10 properties', 'Everything in Single', 'Multi-property analytics', 'Priority support'],
    highlighted: true,
  },
  {
    id: 'investor',
    name: 'Up to 50 Properties',
    price: '$199',
    description: 'For serious investors managing a sizable rental portfolio.',
    features: ['Up to 50 properties', 'Everything in Multi', 'Dedicated support'],
  },
]

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; color: string }> = {
    active:     { label: 'Active',       bg: '#E6F7EF', color: '#1A6B3C' },
    trialing:   { label: 'Trial',        bg: '#FFF4E5', color: '#7A4F00' },
    past_due:   { label: 'Past Due',     bg: '#FFF0F0', color: '#8B0000' },
    canceled:   { label: 'Canceled',     bg: '#F0F0F0', color: '#555' },
    incomplete: { label: 'Incomplete',   bg: '#F0F0F0', color: '#555' },
  }
  const c = configs[status] ?? configs['incomplete']
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      background: c.bg,
      color: c.color,
      fontSize: '13px',
      fontWeight: 700,
      fontFamily: 'Raleway, sans-serif',
    }}>
      {c.label}
    </span>
  )
}

export default function BillingPage() {
  const router = useRouter()
  const { status, loading } = useBillingStatus()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading]     = useState(false)
  const [error, setError]                     = useState<string | null>(null)

  async function handleChoosePlan(tier: string) {
    setError(null)
    setCheckoutLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setCheckoutLoading(null)
    }
  }

  async function handleManageSubscription() {
    setError(null)
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to open portal')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPortalLoading(false)
    }
  }

  const currentTier = status?.subscription_tier
  const isActive    = status?.subscription_status === 'active'
  const isTrialing  = status?.subscription_status === 'trialing'
  const daysLeft    = daysRemaining(status?.trial_ends_at ?? null)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 800,
        color: '#0D2C54',
        fontFamily: 'Raleway, sans-serif',
        marginBottom: '8px',
      }}>
        Billing
      </h1>

      {/* Current status card */}
      {!loading && status && (
        <div style={{
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0D2C54', fontFamily: 'Raleway, sans-serif' }}>
                {status.subscription_tier
                  ? TIER_LABELS[status.subscription_tier]
                  : 'No plan selected'}
              </span>
              <StatusBadge status={status.subscription_status ?? 'incomplete'} />
            </div>
            {isTrialing && daysLeft > 0 && (
              <span style={{ fontSize: '13px', color: '#666', fontFamily: 'Raleway, sans-serif' }}>
                {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining in trial
              </span>
            )}
            {isTrialing && daysLeft <= 0 && (
              <span style={{ fontSize: '13px', color: '#FF7767', fontFamily: 'Raleway, sans-serif' }}>
                Trial has expired
              </span>
            )}
            {isActive && status.current_period_end && (
              <span style={{ fontSize: '13px', color: '#666', fontFamily: 'Raleway, sans-serif' }}>
                Renews {new Date(status.current_period_end).toLocaleDateString()}
              </span>
            )}
          </div>

          {isActive && status.stripe_customer_id && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: '2px solid #0D2C54',
                borderRadius: '8px',
                color: '#0D2C54',
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: 'Raleway, sans-serif',
                cursor: portalLoading ? 'not-allowed' : 'pointer',
                opacity: portalLoading ? 0.6 : 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (!portalLoading) (e.currentTarget.style.background = '#F0F4F9') }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'none') }}
            >
              {portalLoading ? 'Opening…' : 'Manage subscription'}
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{
          background: '#FFF0F0',
          border: '1px solid #FFCDD2',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#8B0000',
          fontSize: '14px',
          fontFamily: 'Raleway, sans-serif',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {/* Pricing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {TIERS.map(tier => {
          const isCurrent = currentTier === tier.id && isActive
          const isLoading = checkoutLoading === tier.id

          return (
            <div
              key={tier.id}
              style={{
                background: '#fff',
                border: tier.highlighted ? '2px solid #FF7767' : '1px solid #eee',
                borderRadius: '14px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
            >
              {tier.highlighted && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#FF7767',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'Raleway, sans-serif',
                  padding: '3px 12px',
                  borderRadius: '20px',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  Most popular
                </div>
              )}

              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0D2C54', fontFamily: 'Raleway, sans-serif' }}>
                  {tier.name}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#0D2C54', fontFamily: 'Raleway, sans-serif' }}>
                    {tier.price}
                  </span>
                  <span style={{ fontSize: '14px', color: '#888', fontFamily: 'Raleway, sans-serif' }}>/month</span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: 1.5, fontFamily: 'Raleway, sans-serif' }}>
                {tier.description}
              </p>

              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tier.features.map(f => (
                  <li key={f} style={{ fontSize: '13px', color: '#444', fontFamily: 'Raleway, sans-serif' }}>{f}</li>
                ))}
              </ul>

              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                {isCurrent ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#E6F7EF',
                    color: '#1A6B3C',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: 'Raleway, sans-serif',
                  }}>
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleChoosePlan(tier.id)}
                    disabled={isLoading || checkoutLoading !== null}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: tier.highlighted ? '#FF7767' : '#0D2C54',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      fontFamily: 'Raleway, sans-serif',
                      cursor: (isLoading || checkoutLoading !== null) ? 'not-allowed' : 'pointer',
                      opacity: (checkoutLoading !== null && !isLoading) ? 0.5 : 1,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {isLoading ? 'Redirecting…' : 'Choose this plan'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p style={{
        marginTop: '24px',
        fontSize: '13px',
        color: '#888',
        textAlign: 'center',
        fontFamily: 'Raleway, sans-serif',
      }}>
        All plans include a 14-day free trial. No credit card required to start.
        Cancel anytime.
      </p>
    </div>
  )
}
