'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#FF7767', '#0D2C54', '#BDD9BF', '#FFC857']

export interface IncomeSourceRow {
  source: string
  label: string
  amount: number
  percentage: number
}

interface Props {
  data: IncomeSourceRow[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { label, amount, percentage } = payload[0].payload as IncomeSourceRow
  const fmt = `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
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
      <div style={{ fontWeight: 700, color: '#0D2C54', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#555' }}>Revenue: <strong>{fmt}</strong></div>
      <div style={{ color: '#555' }}>Share: <strong>{percentage.toFixed(1)}%</strong></div>
    </div>
  )
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) {
  if (percentage < 5) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
      fontFamily="Raleway, sans-serif"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  )
}

export default function IncomeBySourceChart({ data }: Props) {
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
        Income by Source
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            labelLine={false}
            label={CustomLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '14px' }}>
        {data.map((entry, i) => (
          <div key={entry.source} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: COLORS[i % COLORS.length],
              flexShrink: 0,
            }} />
            <span style={{ color: '#555', flex: 1 }}>{entry.label}</span>
            <span style={{ color: '#0D2C54', fontWeight: 700 }}>
              ${entry.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
