'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface CategoryExpense {
  category: string
  amount: number
}

interface Props {
  data: CategoryExpense[]
}

function formatXAxis(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const amount: number = payload[0].value
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
      <div style={{ fontWeight: 700, color: '#FF7767', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#555' }}>
        Total: <strong>${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
      </div>
    </div>
  )
}

export default function ExpensesChart({ data }: Props) {
  const barHeight = 36
  const chartHeight = Math.max(data.length * barHeight + 40, 120)
  const maxLabelLen = Math.max(...data.map(d => d.category.length), 8)
  const yAxisWidth = Math.min(maxLabelLen * 7, 180)

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
      marginBottom: '40px',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '20px',
      }}>
        Expenses by Category
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatXAxis}
            tick={{ fontSize: 12, fill: '#888' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={yAxisWidth}
            tick={{ fontSize: 12, fill: '#555' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(13,44,84,0.04)' }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="#FF7767" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
