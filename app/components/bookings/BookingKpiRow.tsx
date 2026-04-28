'use client'

import { useState } from 'react'

const GOOD  = '#4CAF82'
const BAD   = '#FF7767'
const MUTED = '#aaa'
const NAVY  = '#0D2C54'

type ChangeDir = 'up_good' | 'down_good' | 'neutral'

function kpiChange(
  current: number,
  prior: number | undefined,
  dir: ChangeDir,
  vsLabel: string,
): { text: string; color: string } | null {
  if (prior === undefined || prior === null) return null
  if (prior === 0 && current === 0) return { text: '—', color: MUTED }
  if (prior === 0) {
    const color = dir === 'neutral' ? MUTED : dir === 'up_good' ? GOOD : BAD
    return { text: `↑ New ${vsLabel}`, color }
  }
  const pct = Math.round(((current - prior) / prior) * 100)
  if (pct === 0) return { text: `— ${vsLabel}`, color: MUTED }
  const up   = pct > 0
  const arrow = up ? '↑' : '↓'
  const isGood: boolean | null = dir === 'neutral' ? null : dir === 'up_good' ? up : !up
  return { text: `${arrow} ${Math.abs(pct)}% ${vsLabel}`, color: isGood === null ? MUTED : isGood ? GOOD : BAD }
}

export interface BookingKpis {
  totalBookings: number
  totalNights: number
  avgNightsPerBooking: number
  avgGuestsPerBooking: number
  avgLeadTime: number
  cancellationRate: number
}

interface Props extends BookingKpis {
  prior: BookingKpis | null
  vsLabel: string | null
}

export default function BookingKpiRow({
  totalBookings,
  totalNights,
  avgNightsPerBooking,
  avgGuestsPerBooking,
  avgLeadTime,
  cancellationRate,
  prior,
  vsLabel,
}: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const vs = vsLabel ?? ''
  const p  = prior

  const kpis = [
    {
      label: 'Total Bookings',
      value: totalBookings.toString(),
      change: p ? kpiChange(totalBookings, p.totalBookings, 'up_good', vs) : null,
    },
    {
      label: 'Total Nights',
      value: totalNights.toString(),
      change: p ? kpiChange(totalNights, p.totalNights, 'up_good', vs) : null,
    },
    {
      label: 'Avg Nights / Booking',
      value: avgNightsPerBooking.toFixed(1),
      change: p ? kpiChange(avgNightsPerBooking, p.avgNightsPerBooking, 'up_good', vs) : null,
    },
    {
      label: 'Avg Guests / Booking',
      value: avgGuestsPerBooking.toFixed(1),
      change: p ? kpiChange(avgGuestsPerBooking, p.avgGuestsPerBooking, 'neutral', vs) : null,
    },
    {
      label: 'Avg Days Ahead',
      value: `${Math.round(avgLeadTime)}d`,
      change: p ? kpiChange(avgLeadTime, p.avgLeadTime, 'neutral', vs) : null,
    },
    {
      label: 'Cancellation Rate',
      value: `${cancellationRate.toFixed(1)}%`,
      change: p ? kpiChange(cancellationRate, p.cancellationRate, 'down_good', vs) : null,
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '12px',
      marginBottom: '24px',
    }}>
      {kpis.map((kpi, i) => {
        const hovered = hoveredIdx === i
        return (
          <div
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '16px 18px',
              boxShadow: hovered ? '0 4px 14px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
              border: hovered ? '1px solid #FF7767' : '1px solid #eee',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
              cursor: 'default',
            }}
          >
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
              fontFamily: 'Raleway, sans-serif',
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '22px',
              fontWeight: 800,
              color: NAVY,
              letterSpacing: '-0.5px',
              fontFamily: 'Raleway, sans-serif',
            }}>
              {kpi.value}
            </div>
            {kpi.change && (
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: kpi.change.color,
                marginTop: '5px',
                lineHeight: 1.3,
                fontFamily: 'Raleway, sans-serif',
              }}>
                {kpi.change.text}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
