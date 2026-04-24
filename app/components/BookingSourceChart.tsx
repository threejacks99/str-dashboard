'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface BookingSource {
  source: string
  count: number
  percentage: number
}

interface Props {
  data: BookingSource[]
}

const COLORS = ['#FF7767', '#0D2C54', '#BDD9BF', '#FFC857']

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { source, count, percentage } = payload[0].payload as BookingSource
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
      <div style={{ fontWeight: 700, color: '#0D2C54', marginBottom: '4px' }}>{source}</div>
      <div style={{ color: '#555' }}>Bookings: <strong>{count}</strong></div>
      <div style={{ color: '#555' }}>Share: <strong>{percentage.toFixed(1)}%</strong></div>
    </div>
  )
}

function CustomLegend({ data }: { data: BookingSource[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
      {data.map((entry, i) => (
        <div key={entry.source} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: COLORS[i % COLORS.length],
            flexShrink: 0,
          }} />
          <span style={{ color: '#555', flex: 1 }}>{entry.source}</span>
          <span style={{ color: '#0D2C54', fontWeight: 700 }}>{entry.percentage.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function BookingSourceChart({ data }: Props) {
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
        Bookings by Source
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="source"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend data={data} />
    </div>
  )
}
