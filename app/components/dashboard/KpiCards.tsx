'use client'

import { useState } from 'react'
import Tooltip from '../Tooltip'
import { METRIC_DEFS } from '../../../lib/metricDefinitions'

export interface PriorKpis {
  totalIncome: number
  totalExpenses: number
  noi: number
  oer: number
  adr: number
  occupancyRate: number
  totalBookings: number
  performanceNights: number
  avgNightsPerBooking: number
  avgGuestsPerBooking: number
  avgLeadTime: number
}

interface Props {
  totalIncome: number
  totalExpenses: number
  noi: number
  oer: number
  adr: number
  occupancyRate: number
  totalBookings: number
  performanceNights: number
  avgNightsPerBooking: number
  avgGuestsPerBooking: number
  avgLeadTime: number
  priorKpis?: PriorKpis | null
  vsLabel?: string | null
}

function formatCurrency(value: number): string {
  if (value < 0) {
    return `($${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  if (value < 0) {
    return `(${Math.abs(value).toFixed(1)}%)`
  }
  return `${value.toFixed(1)}%`
}

// ── Comparison helpers ────────────────────────────────────────────────────────
const GOOD  = '#4CAF82'
const BAD   = '#FF7767'
const MUTED = '#aaa'

type ChangeDir = 'up_good' | 'down_good' | 'neutral'

function kpiChange(
  current: number,
  prior: number,
  dir: ChangeDir,
  vsLabel: string
): { text: string; color: string } {
  if (prior === 0 && current === 0) return { text: '—', color: MUTED }

  if (prior === 0) {
    const color = dir === 'neutral' ? MUTED : dir === 'up_good' ? GOOD : BAD
    return { text: `↑ New ${vsLabel}`, color }
  }

  const pct = Math.round(((current - prior) / prior) * 100)

  if (pct === 0) return { text: `— ${vsLabel}`, color: MUTED }

  const up    = pct > 0
  const arrow = up ? '↑' : '↓'
  const isGood: boolean | null = dir === 'neutral' ? null : dir === 'up_good' ? up : !up
  const color = isGood === null ? MUTED : isGood ? GOOD : BAD
  return { text: `${arrow} ${Math.abs(pct)}% ${vsLabel}`, color }
}

export default function KpiCards({
  totalIncome,
  totalExpenses,
  noi,
  oer,
  adr,
  occupancyRate,
  totalBookings,
  performanceNights,
  avgNightsPerBooking,
  avgGuestsPerBooking,
  avgLeadTime,
  priorKpis,
  vsLabel,
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const p  = priorKpis ?? null
  const vs = vsLabel ?? ''

  const kpis = [
    {
      label: 'Total Income',     metricKey: 'totalIncome',
      value: formatCurrency(totalIncome),
      color: '#0D2C54',
      change: p ? kpiChange(totalIncome, p.totalIncome, 'up_good', vs) : null,
    },
    {
      label: 'Total Expenses',   metricKey: 'totalExpenses',
      value: formatCurrency(totalExpenses),
      color: '#FF7767',
      change: p ? kpiChange(totalExpenses, p.totalExpenses, 'down_good', vs) : null,
    },
    {
      label: 'NOI',              metricKey: 'noi',
      value: formatCurrency(noi),
      color: noi >= 0 ? '#0D2C54' : '#FF7767',
      change: p ? kpiChange(noi, p.noi, 'up_good', vs) : null,
    },
    {
      label: 'OER',              metricKey: 'oer',
      value: formatPercent(oer),
      color: '#FF7767',
      change: p ? kpiChange(oer, p.oer, 'down_good', vs) : null,
    },
    {
      label: 'Average Daily Rate', metricKey: 'adr',
      value: `$${adr.toFixed(0)}`,
      color: '#0D2C54',
      change: p ? kpiChange(adr, p.adr, 'up_good', vs) : null,
    },
    {
      label: 'Occupancy Rate',   metricKey: 'occupancyRate',
      value: formatPercent(occupancyRate),
      color: occupancyRate >= 50 ? '#0D2C54' : '#FF7767',
      change: p ? kpiChange(occupancyRate, p.occupancyRate, 'up_good', vs) : null,
    },
    {
      label: 'Total Bookings',   metricKey: null,
      value: totalBookings.toString(),
      color: '#0D2C54',
      change: p ? kpiChange(totalBookings, p.totalBookings, 'up_good', vs) : null,
    },
    {
      label: 'Total Nights',     metricKey: null,
      value: performanceNights.toString(),
      color: '#0D2C54',
      change: p ? kpiChange(performanceNights, p.performanceNights, 'up_good', vs) : null,
    },
    {
      label: 'Avg Nights per Booking', metricKey: 'avgNightsPerBooking',
      value: avgNightsPerBooking.toFixed(1),
      color: '#0D2C54',
      change: p ? kpiChange(avgNightsPerBooking, p.avgNightsPerBooking, 'up_good', vs) : null,
    },
    {
      label: 'Avg Guests per Booking', metricKey: 'avgGuestsPerBooking',
      value: avgGuestsPerBooking.toFixed(1),
      color: '#0D2C54',
      change: p ? kpiChange(avgGuestsPerBooking, p.avgGuestsPerBooking, 'neutral', vs) : null,
    },
    {
      label: 'Avg Days Booked Ahead', metricKey: 'avgDaysBookedAhead',
      value: `${Math.round(avgLeadTime)} days`,
      color: '#0D2C54',
      change: p ? kpiChange(avgLeadTime, p.avgLeadTime, 'neutral', vs) : null,
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '40px',
    }}>
      {kpis.map((kpi, i) => {
        const hovered = hoveredIndex === i
        return (
          <div
            key={i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: hovered
                ? '0 4px 14px rgba(0,0,0,0.1)'
                : '0 1px 3px rgba(0,0,0,0.06)',
              border: hovered ? '1px solid #FF7767' : '1px solid #eee',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
              cursor: 'default',
            }}
          >
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
            }}>
              {kpi.label}
              {kpi.metricKey && <Tooltip content={METRIC_DEFS[kpi.metricKey]} />}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '800',
              color: kpi.color,
              letterSpacing: '-0.5px',
            }}>
              {kpi.value}
            </div>
            {kpi.change && (
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: kpi.change.color,
                marginTop: '6px',
                lineHeight: 1.3,
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
