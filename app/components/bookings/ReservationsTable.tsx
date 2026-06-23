'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Edit2 } from 'lucide-react'
import Tooltip from '../Tooltip'
import { METRIC_DEFS } from '../../../lib/metricDefinitions'
import { isCancelled } from '../../../lib/reservations'
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

export interface Reservation {
  id: string
  property_id: string | null
  property_name: string | null
  guest_name: string | null
  check_in: string | null
  check_out: string | null
  nights: number | null
  booking_source: string | null
  gross_rent: number | null
  owner_payout: number | null
  status: string | null
}

interface Props {
  reservations: Reservation[]
}

const SOURCE_NAMES: Record<string, string> = {
  'SC-ABnB':  'Airbnb',
  'HAFamOLB': 'Direct',
  'STA':      'Other',
}

function displaySource(s: string | null): string {
  if (!s) return '—'
  return SOURCE_NAMES[s] ?? s
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return '—'
  if (v < 0) return `($${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })})`
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  confirmed:  { bg: '#E8F5EE', color: '#2D7A4F' },
  Confirmed:  { bg: '#E8F5EE', color: '#2D7A4F' },
  cancelled:  { bg: '#FFF0EE', color: '#B83224' },
  Cancelled:  { bg: '#FFF0EE', color: '#B83224' },
  pending:    { bg: '#FFF8E6', color: '#946A00' },
  Pending:    { bg: '#FFF8E6', color: '#946A00' },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: '#aaa' }}>—</span>
  const normalized = (status ?? '').toLowerCase()
  const match = Object.entries(STATUS_COLORS).find(([key]) => key.toLowerCase() === normalized)
  const style = match ? match[1] : { bg: '#F0F4F9', color: '#0D2C54' }
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      borderRadius: '4px',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: 'Raleway, sans-serif',
    }}>
      {status}
    </span>
  )
}

type SortKey = 'property_name' | 'guest_name' | 'check_in' | 'check_out' | 'nights' | 'booking_source' | 'gross_rent' | 'owner_payout' | 'status'
type SortDir = 'asc' | 'desc'
type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled'

const NAVY  = '#0D2C54'
const CORAL = '#FF7767'

export default function ReservationsTable({ reservations }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('check_in')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [tab, setTab]         = useState<FilterTab>('all')

  // Column filter state
  const [fProperty, setFProperty] = useState<string[]>([])
  const [fGuest, setFGuest]       = useState('')
  const [fCheckIn, setFCheckIn]   = useState<DateRange>(emptyDateRange)
  const [fCheckOut, setFCheckOut] = useState<DateRange>(emptyDateRange)
  const [fNights, setFNights]     = useState<NumericRange>(emptyNumericRange)
  const [fSource, setFSource]     = useState<string[]>([])
  const [fGross, setFGross]       = useState<NumericRange>(emptyNumericRange)
  const [fPayout, setFPayout]     = useState<NumericRange>(emptyNumericRange)
  const [fStatus, setFStatus]     = useState<string[]>([])

  const [visibleCount, setVisibleCount] = useState(50)

  const today = new Date().toISOString().slice(0, 10)

  const showPropertyColumn = useMemo(
    () => new Set(reservations.map(r => r.property_id).filter(Boolean)).size > 1,
    [reservations]
  )

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(['gross_rent', 'owner_payout', 'nights'].includes(key) ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      if (tab === 'cancelled') return isCancelled(r)
      if (tab === 'upcoming')  return (r.check_in ?? '') > today
      if (tab === 'past')      return (r.check_out ?? '') < today
      return true
    })
  }, [reservations, tab, today])

  // Distinct option lists for the multi-select filters
  const propertyOptions = useMemo(
    () => distinctValues(reservations, r => r.property_name),
    [reservations]
  )
  const sourceOptions = useMemo(
    () => distinctValues(reservations, r => r.booking_source),
    [reservations]
  )
  const statusOptions = useMemo(
    () => distinctValues(reservations, r => r.status, { caseInsensitive: true }),
    [reservations]
  )

  // Column filters: narrow the tab-filtered set before sorting.
  const columnFiltered = useMemo(() => {
    return filtered.filter(r =>
      matchMultiSelect(r.property_name, fProperty) &&
      matchText(r.guest_name, fGuest) &&
      matchDateRange(r.check_in, fCheckIn) &&
      matchDateRange(r.check_out, fCheckOut) &&
      matchNumericRange(r.nights, fNights) &&
      matchMultiSelect(r.booking_source, fSource) &&
      matchNumericRange(r.gross_rent, fGross) &&
      matchNumericRange(r.owner_payout, fPayout) &&
      matchMultiSelect(r.status, fStatus, { caseInsensitive: true })
    )
  }, [filtered, fProperty, fGuest, fCheckIn, fCheckOut, fNights, fSource, fGross, fPayout, fStatus])

  const sorted = useMemo(() => {
    return [...columnFiltered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'gross_rent' || sortKey === 'owner_payout' || sortKey === 'nights') {
        cmp = ((a[sortKey] ?? 0) as number) - ((b[sortKey] ?? 0) as number)
      } else {
        const av = ((a[sortKey] ?? '') as string)
        const bv = ((b[sortKey] ?? '') as string)
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
    (fGuest.trim() !== '' ? 1 : 0) +
    (dateActive(fCheckIn) ? 1 : 0) +
    (dateActive(fCheckOut) ? 1 : 0) +
    (rangeActive(fNights) ? 1 : 0) +
    (fSource.length > 0 ? 1 : 0) +
    (rangeActive(fGross) ? 1 : 0) +
    (rangeActive(fPayout) ? 1 : 0) +
    (fStatus.length > 0 ? 1 : 0)

  function clearFilters() {
    setFProperty([])
    setFGuest('')
    setFCheckIn(emptyDateRange)
    setFCheckOut(emptyDateRange)
    setFNights(emptyNumericRange)
    setFSource([])
    setFGross(emptyNumericRange)
    setFPayout(emptyNumericRange)
    setFStatus([])
  }

  // Reset progressive rendering whenever the result set could change.
  useEffect(() => {
    setVisibleCount(50)
  }, [fProperty, fGuest, fCheckIn, fCheckOut, fNights, fSource, fGross, fPayout, fStatus, tab, sortKey, sortDir])

  const total   = sorted.length
  const visible = sorted.slice(0, visibleCount)
  const shown   = visible.length

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span style={{ opacity: 0.25, marginLeft: '4px' }}>↕</span>
    return <span style={{ marginLeft: '4px', color: CORAL }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thBase: React.CSSProperties = {
    padding: '11px 14px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    background: NAVY,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
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

  const tabCounts = {
    all:       reservations.length,
    upcoming:  reservations.filter(r => (r.check_in ?? '') > today).length,
    past:      reservations.filter(r => (r.check_out ?? '') < today).length,
    cancelled: reservations.filter(r => isCancelled(r)).length,
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'upcoming',  label: 'Upcoming' },
    { key: 'past',      label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
      overflow: 'hidden',
    }}>
      {/* Header + filter tabs */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: 'Raleway, sans-serif',
        }}>
          Reservations
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {tabs.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: active ? `1px solid ${CORAL}` : '1px solid #eee',
                  background: active ? '#FFF5F4' : '#fff',
                  color: active ? CORAL : '#555',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Raleway, sans-serif',
                  transition: 'all 0.12s ease',
                }}
              >
                {t.label}
                <span style={{
                  marginLeft: '5px',
                  fontSize: '11px',
                  color: active ? CORAL : '#aaa',
                  fontWeight: 600,
                }}>
                  {tabCounts[t.key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active column-filter bar */}
      {activeFilterCount > 0 && (
        <div style={{
          padding: '8px 20px',
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
                <th style={{ ...thBase, textAlign: 'left' }} onClick={() => handleSort('property_name')}>
                  Property<SortIcon col="property_name" />
                </th>
              )}
              <th style={{ ...thBase, textAlign: 'left' }} onClick={() => handleSort('guest_name')}>
                Guest<SortIcon col="guest_name" />
              </th>
              <th style={{ ...thBase, textAlign: 'left' }} onClick={() => handleSort('check_in')}>
                Check-in<SortIcon col="check_in" />
              </th>
              <th style={{ ...thBase, textAlign: 'left' }} onClick={() => handleSort('check_out')}>
                Check-out<SortIcon col="check_out" />
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('nights')}>
                Nights<SortIcon col="nights" />
              </th>
              <th style={{ ...thBase, textAlign: 'left' }} onClick={() => handleSort('booking_source')}>
                Source<SortIcon col="booking_source" />
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('gross_rent')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  Gross Rent<SortIcon col="gross_rent" />
                  <Tooltip content={METRIC_DEFS.grossRent} />
                </span>
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('owner_payout')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  Owner Payout<SortIcon col="owner_payout" />
                  <Tooltip content={METRIC_DEFS.ownerPayout} />
                </span>
              </th>
              <th style={{ ...thBase, textAlign: 'left' }} onClick={() => handleSort('status')}>
                Status<SortIcon col="status" />
              </th>
              <th style={{ ...thBase, cursor: 'default', width: '40px' }} aria-label="Edit" />
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
                <TextFilter value={fGuest} onChange={setFGuest} />
              </td>
              <td style={filterTd}>
                <DateRangeFilter value={fCheckIn} onChange={setFCheckIn} />
              </td>
              <td style={filterTd}>
                <DateRangeFilter value={fCheckOut} onChange={setFCheckOut} />
              </td>
              <td style={filterTd}>
                <NumericRangeFilter value={fNights} onChange={setFNights} />
              </td>
              <td style={filterTd}>
                <MultiSelectFilter
                  label="Source"
                  options={sourceOptions}
                  selected={fSource}
                  onChange={setFSource}
                  renderLabel={displaySource}
                />
              </td>
              <td style={filterTd}>
                <NumericRangeFilter value={fGross} onChange={setFGross} />
              </td>
              <td style={filterTd}>
                <NumericRangeFilter value={fPayout} onChange={setFPayout} />
              </td>
              <td style={filterTd}>
                <MultiSelectFilter
                  label="Status"
                  options={statusOptions}
                  selected={fStatus}
                  onChange={setFStatus}
                />
              </td>
              <td style={filterTd} aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr>
                <td colSpan={showPropertyColumn ? 10 : 9} style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#aaa',
                  fontSize: '14px',
                  fontFamily: 'Raleway, sans-serif',
                }}>
                  {activeFilterCount > 0
                    ? 'No reservations match your filters'
                    : 'No reservations found'}
                </td>
              </tr>
            )}
            {visible.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                {showPropertyColumn && (
                  <td style={{
                    padding: '11px 14px',
                    fontSize: '13px',
                    color: '#555',
                    fontFamily: 'Raleway, sans-serif',
                    borderBottom: '1px solid #f5f5f5',
                    whiteSpace: 'nowrap',
                  }}>
                    {r.property_name ?? '—'}
                  </td>
                )}
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#333',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  {r.guest_name ?? '—'}
                </td>
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#555',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  whiteSpace: 'nowrap',
                }}>
                  {fmtDate(r.check_in)}
                </td>
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#555',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  whiteSpace: 'nowrap',
                }}>
                  {fmtDate(r.check_out)}
                </td>
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#555',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  textAlign: 'right',
                }}>
                  {r.nights ?? '—'}
                </td>
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#555',
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  {displaySource(r.booking_source)}
                </td>
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#333',
                  fontWeight: 500,
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtMoney(r.gross_rent)}
                </td>
                <td style={{
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#333',
                  fontWeight: 500,
                  fontFamily: 'Raleway, sans-serif',
                  borderBottom: '1px solid #f5f5f5',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtMoney(r.owner_payout)}
                </td>
                <td style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid #f5f5f5',
                }}>
                  <StatusBadge status={r.status} />
                </td>
                <td style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid #f5f5f5',
                  textAlign: 'center',
                }}>
                  <Link
                    href={`/reservations/${r.id}`}
                    aria-label="Edit reservation"
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
          padding: '12px 20px',
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
