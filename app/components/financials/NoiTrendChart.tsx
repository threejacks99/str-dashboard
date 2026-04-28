'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface NoiPoint {
  month: string
  noi: number
}

interface Props {
  data: NoiPoint[]
}

function fmtY(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const noi: number = payload[0].value
  const color = noi >= 0 ? '#0D2C54' : '#FF7767'
  const fmt = noi < 0
    ? `($${Math.abs(noi).toLocaleString('en-US', { maximumFractionDigits: 0 })})`
    : `$${noi.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '10px 14px',
      fontSize: '13px',
      lineHeight: '1.7',
      fontFamily: 'Raleway, sans-serif',
    }}>
      <div style={{ fontWeight: 700, color: '#888', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontWeight: 700, color }}>NOI: {fmt}</div>
    </div>
  )
}

export default function NoiTrendChart({ data }: Props) {
  return (
    <div style={{
      background: '#fff',
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
        NOI Trend
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#888', fontFamily: 'Raleway, sans-serif' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtY}
            tick={{ fontSize: 11, fill: '#888', fontFamily: 'Raleway, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#ddd" strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="noi"
            stroke="#0D2C54"
            strokeWidth={2.5}
            dot={{ fill: '#0D2C54', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#0D2C54' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
