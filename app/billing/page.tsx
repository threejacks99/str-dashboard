'use client'

import { useState } from 'react'
import { useBillingStatus } from '../../lib/useBillingStatus'
import { TIER_LABELS, daysRemaining, type Tier, type BillingInterval } from '../../lib/billing'
import TierPicker from '../components/TierPicker'

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
  const { status, loading } = useBillingStatus()
  // Setter retained for an in-flight indicator we'll wire up in a polish pass.
  const [, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleChoosePlan(tier: Tier, interval: BillingInterval) {
    setError(null)
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setCheckoutLoading(false)
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

  const currentTier = status?.subscription_tier ?? undefined
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

      {/* Error banner */}
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

      {/* Pricing picker */}
      <TierPicker
        onSelect={handleChoosePlan}
        currentTier={currentTier}
      />

      <p style={{
        marginTop: '24px',
        fontSize: '13px',
        color: '#888',
        textAlign: 'center',
        fontFamily: 'Raleway, sans-serif',
      }}>
        All plans include a 14-day free trial. Card required at signup —
        not charged until day 15. Cancel anytime from the customer portal.
      </p>
    </div>
  )
}
