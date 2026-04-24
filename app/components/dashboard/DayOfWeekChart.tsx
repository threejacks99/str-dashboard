'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DayCount {
  day: string
  count: number
}

interface Props {
  data: DayCount[]
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '10px 14px',
      fontSize: '13px',
      lineHeight: '1.7',
    }}>
      <div style={{ fontWeight: 700, color: '#0D2C54', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#555' }}>Bookings: <strong>{payload[0].value}</strong></div>
    </div>
  )
}

export default function DayOfWeekChart({ data }: Props) {
  const sorted = [...data].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  )

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '20px',
      }}>
        Check-ins by Day of Week
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sorted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: '#888' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#888' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13,44,84,0.04)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill="#0D2C54" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
