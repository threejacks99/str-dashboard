'use client'

import { useState } from 'react'

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
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const kpis = [
    { label: 'Total Income', value: formatCurrency(totalIncome), color: '#0D2C54' },
    { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: '#FF7767' },
    { label: 'NOI', value: formatCurrency(noi), color: noi >= 0 ? '#0D2C54' : '#FF7767' },
    { label: 'OER', value: formatPercent(oer), color: '#FF7767' },
    { label: 'Average Daily Rate', value: `$${adr.toFixed(0)}`, color: '#0D2C54' },
    { label: 'Occupancy Rate', value: formatPercent(occupancyRate), color: occupancyRate >= 50 ? '#0D2C54' : '#FF7767' },
    { label: 'Total Bookings', value: totalBookings.toString(), color: '#0D2C54' },
    { label: 'Total Nights', value: performanceNights.toString(), color: '#0D2C54' },
    { label: 'Avg Nights per Booking', value: avgNightsPerBooking.toFixed(1), color: '#0D2C54' },
    { label: 'Avg Guests per Booking', value: avgGuestsPerBooking.toFixed(1), color: '#0D2C54' },
    { label: 'Avg Days Booked Ahead', value: `${Math.round(avgLeadTime)} days`, color: '#0D2C54' },
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
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '800',
              color: kpi.color,
              letterSpacing: '-0.5px',
            }}>
              {kpi.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
