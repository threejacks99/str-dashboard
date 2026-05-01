'use client'

import Link from 'next/link'
import { useBillingStatus } from '../../lib/useBillingStatus'

export default function TrialBanner() {
  const { status, loading, daysLeft } = useBillingStatus()

  if (loading || !status) return null
  if (status.subscription_status === 'active') return null

  let bg      = '#FFF4E5'
  let border  = '#FFC947'
  let color   = '#7A4F00'
  let message = ''
  let cta     = 'Add payment method'

  if (status.subscription_status === 'past_due') {
    bg      = '#FFF0F0'
    border  = '#FF7767'
    color   = '#8B0000'
    message = 'Payment failed. Please update your billing info to keep your account active.'
    cta     = 'Update billing'
  } else if (status.subscription_status === 'canceled') {
    bg      = '#FFF0F0'
    border  = '#FF7767'
    color   = '#8B0000'
    message = 'Your subscription has ended. Choose a plan to continue.'
    cta     = 'Choose a plan'
  } else if (status.subscription_status === 'trialing') {
    if (daysLeft <= 0) {
      bg      = '#FFF0F0'
      border  = '#FF7767'
      color   = '#8B0000'
      message = 'Your free trial has ended. Add a payment method to continue.'
    } else if (daysLeft <= 3) {
      bg      = '#FFF0F0'
      border  = '#FF7767'
      color   = '#8B0000'
      message = `Your trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Add payment to avoid losing access.`
    } else if (daysLeft <= 7) {
      message = `Your trial expires in ${daysLeft} days. Add a payment method to keep access.`
    } else {
      return null
    }
  } else {
    return null
  }

  return (
    <div style={{
      background: bg,
      borderBottom: `2px solid ${border}`,
      color,
      padding: '10px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      fontSize: '14px',
      fontFamily: 'Raleway, sans-serif',
      fontWeight: 500,
      flexShrink: 0,
    }}>
      <span>{message}</span>
      <Link
        href="/billing"
        style={{
          flexShrink: 0,
          padding: '6px 16px',
          background: '#FF7767',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '13px',
          fontFamily: 'Raleway, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {cta}
      </Link>
    </div>
  )
}
