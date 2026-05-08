'use client'

import Link from 'next/link'
import { useBillingStatus } from '../../lib/useBillingStatus'

export default function BillingLockScreen() {
  const { status } = useBillingStatus()
  const isOrphan = !status?.stripe_customer_id

  const headline = isOrphan
    ? 'Finish setting up your account'
    : 'Trial ended'

  const subcopy = isOrphan
    ? 'Pick a plan to start your 14-day trial. Card required up front — not charged until day 15.'
    : 'Add a payment method to continue entering data and keep your properties active.'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
      gap: '16px',
    }}>
      <div style={{ fontSize: '48px', lineHeight: 1 }}>🔒</div>
      <h2 style={{
        margin: 0,
        fontSize: '22px',
        fontWeight: 700,
        color: '#0D2C54',
        fontFamily: 'Raleway, sans-serif',
      }}>
        {headline}
      </h2>
      <p style={{
        margin: 0,
        fontSize: '15px',
        color: '#666',
        maxWidth: '360px',
        lineHeight: 1.6,
        fontFamily: 'Raleway, sans-serif',
      }}>
        {subcopy}
      </p>
      <Link
        href="/billing"
        style={{
          display: 'inline-block',
          marginTop: '8px',
          padding: '12px 28px',
          background: '#FF7767',
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '15px',
          fontFamily: 'Raleway, sans-serif',
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.85')}
        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
      >
        Choose a plan
      </Link>
    </div>
  )
}
