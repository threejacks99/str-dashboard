'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Edit2 } from 'lucide-react'
import {
  TextFilter,
  NumericRangeFilter,
  DateRangeFilter,
  MultiSelectFilter,
  matchText,
  matchNumericRange,
  matchDateRange,
  matchMultiSelect,
  distinctValues,
  emptyNumericRange,
  emptyDateRange,
  type NumericRange,
  type DateRange,
} from '../table/TableFilters'

export interface ExpenseRow {
  id: string
  property_id: string | null
  property_name: string | null
  paid_date: string | null
  vendor: string | null
  description: string | null
  category: string | null
  amount: number
}

interface Props {
  expenses: ExpenseRow[]
}

type SortKey = 'property_name' | 'paid_date' | 'vendor' | 'description' | 'category' | 'amount'
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

  // Column filter state
  const [fProperty, setFProperty]       = useState<string[]>([])
  const [fDate, setFDate]               = useState<DateRange>(emptyDateRange)
  const [fVendor, setFVendor]           = useState('')
  const [fDescription, setFDescription] = useState('')
  const [fCategory, setFCategory]       = useState<string[]>([])
  const [fAmount, setFAmount]           = useState<NumericRange>(emptyNumericRange)

  const [visibleCount, setVisibleCount] = useState(50)

  const showPropertyColumn = useMemo(
    () => new Set(expenses.map(e => e.property_id).filter(Boolean)).size > 1,
    [expenses]
  )

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'amount' ? 'desc' : 'asc')
    }
  }

  // Distinct option lists for the multi-select filters
  const propertyOptions = useMemo(
    () => distinctValues(expenses, e => e.property_name),
    [expenses]
  )
  const categoryOptions = useMemo(
    () => distinctValues(expenses, e => e.category, { caseInsensitive: true }),
    [expenses]
  )

  // Column filters: narrow the set before sorting.
  const columnFiltered = useMemo(() => {
    return expenses.filter(e =>
      matchMultiSelect(e.property_name, fProperty) &&
      matchDateRange(e.paid_date, fDate) &&
      matchText(e.vendor, fVendor) &&
      matchText(e.description, fDescription) &&
      matchMultiSelect(e.category, fCategory, { caseInsensitive: true }) &&
      matchNumericRange(e.amount, fAmount)
    )
  }, [expenses, fProperty, fDate, fVendor, fDescription, fCategory, fAmount])

  const sorted = useMemo(() => {
    return [...columnFiltered].sort((a, b) => {
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
  }, [columnFiltered, sortKey, sortDir])

  // Active column-filter accounting
  const rangeActive = (r: NumericRange) => r.min.trim() !== '' || r.max.trim() !== ''
  const dateActive  = (r: DateRange)  => r.from.trim() !== '' || r.to.trim() !== ''
  const activeFilterCount =
    (fProperty.length > 0 ? 1 : 0) +
    (dateActive(fDate) ? 1 : 0) +
    (fVendor.trim() !== '' ? 1 : 0) +
    (fDescription.trim() !== '' ? 1 : 0) +
    (fCategory.length > 0 ? 1 : 0) +
    (rangeActive(fAmount) ? 1 : 0)

  function clearFilters() {
    setFProperty([])
    setFDate(emptyDateRange)
    setFVendor('')
    setFDescription('')
    setFCategory([])
    setFAmount(emptyNumericRange)
  }

  // Reset progressive rendering whenever the result set could change.
  useEffect(() => {
    setVisibleCount(50)
  }, [fProperty, fDate, fVendor, fDescription, fCategory, fAmount, sortKey, sortDir])

  const total   = sorted.length
  const visible = sorted.slice(0, visibleCount)
  const shown   = visible.length

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

  const filterTd: React.CSSProperties = {
    padding: '6px 10px',
    background: '#F7F9FB',
    borderBottom: '1px solid #e5e9ef',
    verticalAlign: 'top',
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
        Expenses
      </div>

      {/* Active column-filter bar */}
      {activeFilterCount > 0 && (
        <div style={{
          padding: '8px 24px',
          borderBottom: '1px solid #f0f0f0',
          background: '#FFF5F4',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'Raleway, sans-serif',
        }}>
          <span style={{ fontSize: '12px', color: NAVY, fontWeight: 600 }}>
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
          </span>
          <button
            onClick={clearFilters}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: `1px solid ${CORAL}`,
              background: '#fff',
              color: CORAL,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Raleway, sans-serif',
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="hostics-table-scroll">
        <table className="hostics-data-table">
          <thead>
            <tr>
              {showPropertyColumn && (
                <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('property_name')}>
                  Property<SortIcon col="property_name" />
                </th>
              )}
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
              <th style={{ ...thStyle, cursor: 'default', width: '40px' }} aria-label="Edit" />
            </tr>
            {/* Per-column filter row */}
            <tr>
              {showPropertyColumn && (
                <td style={filterTd}>
                  <MultiSelectFilter
                    label="Property"
                    options={propertyOptions}
                    selected={fProperty}
                    onChange={setFProperty}
                  />
                </td>
              )}
              <td style={filterTd}>
                <DateRangeFilter value={fDate} onChange={setFDate} />
              </td>
              <td style={filterTd}>
                <TextFilter value={fVendor} onChange={setFVendor} />
              </td>
              <td style={filterTd}>
                <TextFilter value={fDescription} onChange={setFDescription} />
              </td>
              <td style={filterTd}>
                <MultiSelectFilter
                  label="Category"
                  options={categoryOptions}
                  selected={fCategory}
                  onChange={setFCategory}
                />
              </td>
              <td style={filterTd}>
                <NumericRangeFilter value={fAmount} onChange={setFAmount} />
              </td>
              <td style={filterTd} aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr>
                <td
                  colSpan={showPropertyColumn ? 7 : 6}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#aaa',
                    fontSize: '14px',
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  {activeFilterCount > 0
                    ? 'No expenses match your filters'
                    : 'No expenses in this period'}
                </td>
              </tr>
            )}
            {visible.map((e, i) => (
              <tr
                key={e.id}
                style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}
              >
                {showPropertyColumn && (
                  <td style={{
                    padding: '11px 16px',
                    fontSize: '13px',
                    color: '#555',
                    fontFamily: 'Raleway, sans-serif',
                    borderBottom: '1px solid #f5f5f5',
                    whiteSpace: 'nowrap',
                  }}>
                    {e.property_name ?? '—'}
                  </td>
                )}
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
                <td style={{
                  padding: '11px 16px',
                  borderBottom: '1px solid #f5f5f5',
                  textAlign: 'center',
                }}>
                  <Link
                    href={`/expenses/${e.id}`}
                    aria-label="Edit expense"
                    style={{ color: '#888', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <Edit2 size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progressive-rendering footer */}
      {total > 50 && (
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          fontFamily: 'Raleway, sans-serif',
        }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            Showing {shown} of {total}
          </span>
          {shown < total && (
            <>
              <button
                onClick={() => setVisibleCount(c => c + 50)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '20px',
                  border: '1px solid #eee',
                  background: '#fff',
                  color: '#555',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                Show 50 more
              </button>
              <button
                onClick={() => setVisibleCount(total)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '20px',
                  border: `1px solid ${CORAL}`,
                  background: '#FFF5F4',
                  color: CORAL,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                Show all ({total})
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
