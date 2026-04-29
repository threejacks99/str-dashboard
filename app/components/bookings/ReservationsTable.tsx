'use client'

import { useMemo, useState } from 'react'
import Tooltip from '../Tooltip'
import { METRIC_DEFS } from '../../../lib/metricDefinitions'

export interface Reservation {
  id: string
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
  const style = STATUS_COLORS[status] ?? { bg: '#F0F4F9', color: '#0D2C54' }
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

type SortKey = 'guest_name' | 'check_in' | 'check_out' | 'nights' | 'booking_source' | 'gross_rent' | 'owner_payout' | 'status'
type SortDir = 'asc' | 'desc'
type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled'

const NAVY  = '#0D2C54'
const CORAL = '#FF7767'

export default function ReservationsTable({ reservations }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('check_in')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [tab, setTab]         = useState<FilterTab>('all')

  const today = new Date().toISOString().slice(0, 10)

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
      if (tab === 'cancelled') return r.status === 'cancelled' || r.status === 'Cancelled'
      if (tab === 'upcoming')  return (r.check_in ?? '') > today
      if (tab === 'past')      return (r.check_out ?? '') < today
      return true
    })
  }, [reservations, tab, today])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
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
  }, [filtered, sortKey, sortDir])

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

  const tabCounts = {
    all:       reservations.length,
    upcoming:  reservations.filter(r => (r.check_in ?? '') > today).length,
    past:      reservations.filter(r => (r.check_out ?? '') < today).length,
    cancelled: reservations.filter(r => r.status === 'cancelled' || r.status === 'Cancelled').length,
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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
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
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#aaa',
                  fontSize: '14px',
                  fontFamily: 'Raleway, sans-serif',
                }}>
                  No reservations found
                </td>
              </tr>
            )}
            {sorted.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
