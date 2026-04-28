'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'

interface MonthCount {
  month: string
  count: number
}

interface Props {
  data: MonthCount[]
}

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
      fontFamily: 'Raleway, sans-serif',
    }}>
      <div style={{ fontWeight: 700, color: '#888', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#555' }}>Bookings: <strong>{payload[0].value}</strong></div>
    </div>
  )
}

export default function BookingsOverTimeChart({ data }: Props) {
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
        fontWeight: 600,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '20px',
        fontFamily: 'Raleway, sans-serif',
      }}>
        Bookings Over Time
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#888', fontFamily: 'Raleway, sans-serif' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#888', fontFamily: 'Raleway, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,119,103,0.06)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="#FF7767" />)}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 11, fill: '#FF7767', fontWeight: 700, fontFamily: 'Raleway, sans-serif' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
