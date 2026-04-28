'use client'

import { useState } from 'react'

export interface ExpenseRow {
  id: string
  paid_date: string | null
  vendor: string | null
  description: string | null
  category: string | null
  amount: number
}

interface Props {
  expenses: ExpenseRow[]
}

type SortKey = 'paid_date' | 'vendor' | 'description' | 'category' | 'amount'
type SortDir = 'asc' | 'desc'

function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(v: number): string {
  if (v < 0) return `($${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })})`
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const NAVY  = '#0D2C54'
const CORAL = '#FF7767'

export default function ExpenseTable({ expenses }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('paid_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'amount' ? 'desc' : 'asc')
    }
  }

  const sorted = [...expenses].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'amount') {
      cmp = (a.amount ?? 0) - (b.amount ?? 0)
    } else {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      cmp = av.localeCompare(bv)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>
    return <span style={{ marginLeft: '4px', color: CORAL }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: NAVY,
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: 'Raleway, sans-serif',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '20px 24px 16px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderBottom: '1px solid #f0f0f0',
        fontFamily: 'Raleway, sans-serif',
      }}>
        Recent Expenses
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('paid_date')}>
                Date<SortIcon col="paid_date" />
              </th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('vendor')}>
                Vendor<SortIcon col="vendor" />
              </th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('description')}>
                Description<SortIcon col="description" />
              </th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('category')}>
                Category<SortIcon col="category" />
              </th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('amount')}>
                Amount<SortIcon col="amount" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#aaa',
                    fontSize: '14px',
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  No expenses in this period
                </td>
              </tr>
            )}
            {sorted.map((e, i) => (
              <tr
                key={e.id}
                style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}
              >
                <td style={{
                  padding: '11px 16px',
                  fontSize: '13px',
                  color: '#555',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  whiteSpace: 'nowrap',
                }}>
                  {fmtDate(e.paid_date)}
                </td>
                <td style={{
                  padding: '11px 16px',
                  fontSize: '13px',
                  color: '#333',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  {e.vendor ?? '—'}
                </td>
                <td style={{
                  padding: '11px 16px',
                  fontSize: '13px',
                  color: '#555',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  maxWidth: '280px',
                }}>
                  {e.description ?? '—'}
                </td>
                <td style={{
                  padding: '11px 16px',
                  fontSize: '13px',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  {e.category ? (
                    <span style={{
                      background: '#F0F4F9',
                      color: NAVY,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {e.category}
                    </span>
                  ) : '—'}
                </td>
                <td style={{
                  padding: '11px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: e.amount < 0 ? CORAL : '#333',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtAmount(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
