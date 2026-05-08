'use client'

import { useState } from 'react'
import {
  type Tier,
  type BillingInterval,
  TIER_LABELS,
  TIER_PROPERTY_DESCRIPTIONS,
  TIER_PRICES,
} from '../../lib/billing'

const CORAL = '#FF7767'
const NAVY  = '#0D2C54'
const SAGE  = '#4CAF82'

type CardKey = Tier | 'enterprise'

type MarketingEntry = {
  name: string
  desc: string
  features: string[]
}

const TIER_MARKETING: Record<CardKey, MarketingEntry> = {
  solo: {
    name: 'Solo',
    desc: 'For individual hosts running one rental property.',
    features: [
      TIER_PROPERTY_DESCRIPTIONS.solo,
      'All analytics dashboards',
      'Smart CSV/Excel import',
      'Tax-ready exports',
      'Email support',
    ],
  },
  portfolio: {
    name: 'Portfolio',
    desc: 'For owners building a rental portfolio.',
    features: [
      `${TIER_PROPERTY_DESCRIPTIONS.portfolio} (+$5/mo per extra)`,
      'Portfolio rollup view',
      'All analytics dashboards',
      'Smart CSV/Excel import',
      'Tax-ready exports',
      'Priority email support',
    ],
  },
  investor: {
    name: 'Investor',
    desc: 'For serious investors managing a sizable rental portfolio.',
    features: [
      TIER_PROPERTY_DESCRIPTIONS.investor,
      'Portfolio rollup view',
      'All analytics dashboards',
      'Smart CSV/Excel import',
      'Tax-ready exports',
      'Dedicated support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    desc: 'For property managers and 50+ unit operators.',
    features: [
      'Unlimited properties',
      'Custom integrations',
      'White-glove onboarding',
      'Dedicated account manager',
    ],
  },
}

export type TierPickerProps = {
  onSelect: (tier: Tier, interval: BillingInterval) => void
  ctaLabel?: string
  selectedTier?: Tier
  currentTier?: Tier
  showEnterprise?: boolean
  initialInterval?: BillingInterval
}

export default function TierPicker({
  onSelect,
  ctaLabel = 'Choose this plan',
  selectedTier,
  currentTier,
  showEnterprise = true,
  initialInterval = 'monthly',
}: TierPickerProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(initialInterval)

  const cards: CardKey[] = showEnterprise
    ? ['solo', 'portfolio', 'investor', 'enterprise']
    : ['solo', 'portfolio', 'investor']

  return (
    <div>
      {/* ── Monthly / Annual toggle ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          padding: '4px',
          border: `1.5px solid ${NAVY}`,
          borderRadius: '999px',
          background: '#fff',
        }}>
          <button
            type="button"
            onClick={() => setBillingInterval('monthly')}
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              background: billingInterval === 'monthly' ? CORAL : 'transparent',
              color: billingInterval === 'monthly' ? '#fff' : NAVY,
              fontWeight: 700,
              fontSize: '14px',
              fontFamily: 'Raleway, sans-serif',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('annual')}
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              background: billingInterval === 'annual' ? CORAL : 'transparent',
              color: billingInterval === 'annual' ? '#fff' : NAVY,
              fontWeight: 700,
              fontSize: '14px',
              fontFamily: 'Raleway, sans-serif',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Annual
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: billingInterval === 'annual' ? '#fff' : SAGE,
            }}>
              Save ~17%
            </span>
          </button>
        </div>
      </div>

      {/* ── Cards grid ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        paddingTop: '14px',
      }}>
        {cards.map(cardKey => (
          <Card
            key={cardKey}
            cardKey={cardKey}
            interval={billingInterval}
            selectedTier={selectedTier}
            currentTier={currentTier}
            ctaLabel={ctaLabel}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function Card({
  cardKey,
  interval,
  selectedTier,
  currentTier,
  ctaLabel,
  onSelect,
}: {
  cardKey: CardKey
  interval: BillingInterval
  selectedTier?: Tier
  currentTier?: Tier
  ctaLabel: string
  onSelect: (tier: Tier, interval: BillingInterval) => void
}) {
  const marketing    = TIER_MARKETING[cardKey]
  const isPortfolio  = cardKey === 'portfolio'
  const isEnterprise = cardKey === 'enterprise'
  const isSelected   = !isEnterprise && selectedTier === cardKey
  const isCurrent    = !isEnterprise && currentTier === cardKey
  // Coral/featured treatment: explicit selection wins; otherwise Portfolio is
  // the default highlighted card.
  const isFeatured   = isSelected || (!selectedTier && isPortfolio)

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${isFeatured ? CORAL : '#eee'}`,
      borderRadius: '16px',
      padding: '32px 28px',
      boxShadow: isFeatured ? `0 8px 40px ${CORAL}22` : '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: 'Raleway, sans-serif',
    }}>
      {isPortfolio && (
        <div style={{
          position: 'absolute',
          top: '-14px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: CORAL,
          color: '#fff',
          borderRadius: '20px',
          padding: '4px 16px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Most Popular
        </div>
      )}

      {/* Eyebrow */}
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: CORAL,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        {cardKey === 'enterprise' ? 'ENTERPRISE' : TIER_LABELS[cardKey].toUpperCase()}
      </div>

      {/* Name */}
      <div style={{ fontSize: '20px', fontWeight: 800, color: NAVY, marginBottom: '8px' }}>
        {marketing.name}
      </div>

      {/* Description */}
      <div style={{
        fontSize: '13px',
        color: '#888',
        lineHeight: '1.5',
        marginBottom: '24px',
        minHeight: '40px',
      }}>
        {marketing.desc}
      </div>

      {/* Price */}
      <div style={{ marginBottom: '28px' }}>
        {cardKey === 'enterprise' ? (
          <span style={{ fontSize: '36px', fontWeight: 800, color: NAVY }}>Custom</span>
        ) : (
          <>
            <span style={{ fontSize: '36px', fontWeight: 800, color: NAVY }}>
              ${TIER_PRICES[cardKey][interval]}
            </span>
            <span style={{ fontSize: '14px', color: '#aaa', marginLeft: '4px' }}>
              {interval === 'monthly' ? '/month' : '/year'}
            </span>
          </>
        )}
      </div>

      {/* Features */}
      <ul style={{
        listStyle: 'none',
        padding: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '28px',
      }}>
        {marketing.features.map(f => (
          <li key={f} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '14px',
            color: '#555',
          }}>
            <span style={{ color: SAGE, fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div style={{
          textAlign: 'center',
          padding: '10px',
          borderRadius: '8px',
          background: '#E6F7EF',
          color: '#1A6B3C',
          fontSize: '14px',
          fontWeight: 700,
        }}>
          Current plan
        </div>
      ) : cardKey === 'enterprise' ? (
        <a
          href="mailto:hello@hostics.app"
          style={{
            display: 'block',
            textAlign: 'center',
            background: 'transparent',
            color: NAVY,
            border: `2px solid ${NAVY}`,
            borderRadius: '10px',
            padding: '13px 20px',
            fontSize: '15px',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Contact sales
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(cardKey, interval)}
          style={{
            display: 'block',
            width: '100%',
            background: isFeatured ? CORAL : 'transparent',
            color: isFeatured ? '#fff' : NAVY,
            border: `2px solid ${isFeatured ? CORAL : NAVY}`,
            borderRadius: '10px',
            padding: '13px 20px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Raleway, sans-serif',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
