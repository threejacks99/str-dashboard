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

export interface DurationBucket {
  bucket: string
  count: number
  percentage: number
}

interface Props {
  data: DurationBucket[]
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
      <div style={{ fontWeight: 700, color: '#FF7767', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#555' }}>Reservations: <strong>{payload[0].value}</strong></div>
    </div>
  )
}

export default function StayDurationChart({ data }: Props) {
  const labeled = data.map(d => ({
    ...d,
    label: d.count > 0 ? `${d.count}  (${d.percentage.toFixed(0)}%)` : '',
  }))

  const maxLabelLen = Math.max(...data.map(d => d.bucket.length), 8)
  const yAxisWidth  = Math.min(maxLabelLen * 7, 120)

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
        Stay Duration
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={labeled}
          layout="vertical"
          margin={{ top: 0, right: 90, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#888', fontFamily: 'Raleway, sans-serif' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="bucket"
            width={yAxisWidth}
            tick={{ fontSize: 12, fill: '#555', fontFamily: 'Raleway, sans-serif' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,119,103,0.06)' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {labeled.map((_, i) => <Cell key={i} fill="#FF7767" />)}
            <LabelList
              dataKey="label"
              position="right"
              style={{ fontSize: 12, fill: '#555', fontFamily: 'Raleway, sans-serif' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
