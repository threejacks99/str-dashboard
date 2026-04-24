'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyRevenue {
  month: string
  revenue: number
}

interface Props {
  data: MonthlyRevenue[]
}

function formatYAxis(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

function formatTooltip(value: number) {
  return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Owner Payout']
}

export default function RevenueChart({ data }: Props) {
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
        Monthly Revenue
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF7767" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#FF7767" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#888' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: '#888' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #eee',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              fontSize: '13px',
            }}
            cursor={{ stroke: '#FF7767', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#FF7767"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#FF7767', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
