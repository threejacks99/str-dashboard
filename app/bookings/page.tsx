export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds } from '../../lib/auth'
import BookingKpiRow from '../components/bookings/BookingKpiRow'
import type { BookingKpis } from '../components/bookings/BookingKpiRow'
import BookingsOverTimeChart from '../components/bookings/BookingsOverTimeChart'
import StayDurationChart from '../components/bookings/StayDurationChart'
import ReservationsTable from '../components/bookings/ReservationsTable'
import BookingSourceChart from '../components/dashboard/BookingSourceChart'
import DayOfWeekChart from '../components/dashboard/DayOfWeekChart'

// ── Date utilities ─────────────────────────────────────────────────────────────
function toStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.max(1, Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000
  ) + 1)
}

function getDateRangeFromParams(params: { from?: string; to?: string; preset?: string }) {
  const today    = new Date()
  const todayStr = toStr(today)
  const preset   = params.preset ?? 'last_12_months'

  if (preset === 'custom' && params.from && params.to) {
    const fmt = (s: string) =>
      new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return { from: params.from, to: params.to, label: `${fmt(params.from)} – ${fmt(params.to)}` }
  }

  if (preset === 'all_time')    return { from: '2000-01-01', to: todayStr, label: 'All time' }
  if (preset === 'last_year') {
    const y = today.getFullYear() - 1
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: 'Last year' }
  }
  if (preset === 'year_to_date') {
    return { from: `${today.getFullYear()}-01-01`, to: todayStr, label: 'Year to date' }
  }

  const subDays   = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return toStr(d) }
  const subMonths = (n: number) => { const d = new Date(today); d.setMonth(d.getMonth() - n); return toStr(d) }

  switch (preset) {
    case 'last_30_days':  return { from: subDays(30),   to: todayStr, label: 'Last 30 days' }
    case 'last_90_days':  return { from: subDays(90),   to: todayStr, label: 'Last 90 days' }
    case 'last_6_months': return { from: subMonths(6),  to: todayStr, label: 'Last 6 months' }
    default:              return { from: subMonths(12), to: todayStr, label: 'Last 12 months' }
  }
}

function getPriorDateRange(
  params: { from?: string; to?: string; preset?: string },
  current: { from: string; to: string }
): { from: string; to: string; vsLabel: string } | null {
  const preset = params.preset ?? 'last_12_months'
  if (preset === 'all_time') return null

  const today = new Date()

  if (preset === 'last_year') {
    const y = today.getFullYear() - 2
    return { from: `${y}-01-01`, to: `${y}-12-31`, vsLabel: 'vs year before' }
  }
  if (preset === 'year_to_date') {
    const y  = today.getFullYear() - 1
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return { from: `${y}-01-01`, to: `${y}-${mm}-${dd}`, vsLabel: 'vs same period last year' }
  }

  const len      = daysBetween(current.from, current.to)
  const priorTo  = new Date(current.from + 'T00:00:00')
  priorTo.setDate(priorTo.getDate() - 1)
  const priorFrom = new Date(current.from + 'T00:00:00')
  priorFrom.setDate(priorFrom.getDate() - len)

  const vsLabels: Record<string, string> = {
    last_30_days:   'vs prior 30 days',
    last_90_days:   'vs prior 90 days',
    last_6_months:  'vs prior 6 months',
    last_12_months: 'vs prior 12 months',
    custom:         'vs prior equivalent period',
  }

  return { from: toStr(priorFrom), to: toStr(priorTo), vsLabel: vsLabels[preset] ?? 'vs prior period' }
}

// ── Reservation helpers ────────────────────────────────────────────────────────
function isOwnerStay(r: any): boolean {
  return ['OWN', 'Own', 'own'].includes(r.booking_source)
}
function isCancelled(r: any): boolean {
  return ['cancelled', 'Cancelled'].includes(r.status)
}

function buildKpis(reservations: any[]): BookingKpis {
  const nonOwner  = reservations.filter(r => !isOwnerStay(r))
  const perf      = nonOwner.filter(r => !isCancelled(r))
  const cancelled = nonOwner.filter(r => isCancelled(r))

  const totalBookings       = perf.length
  const totalNights         = perf.reduce((s: number, r: any) => s + (r.nights || 0), 0)
  const avgNightsPerBooking = totalBookings > 0 ? totalNights / totalBookings : 0
  const totalGuests         = perf.reduce((s: number, r: any) => s + (r.adult_guests || 0) + (r.child_guests || 0), 0)
  const avgGuestsPerBooking = totalBookings > 0 ? totalGuests / totalBookings : 0
  const avgLeadTime         = totalBookings > 0
    ? perf.filter((r: any) => r.booking_created_at && r.check_in)
        .reduce((s: number, r: any) => {
          const d = Math.ceil((new Date(r.check_in).getTime() - new Date(r.booking_created_at).getTime()) / 86400000)
          return s + (d > 0 ? d : 0)
        }, 0) / totalBookings
    : 0
  const cancellationRate = nonOwner.length > 0 ? (cancelled.length / nonOwner.length) * 100 : 0

  return { totalBookings, totalNights, avgNightsPerBooking, avgGuestsPerBooking, avgLeadTime, cancellationRate }
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        No bookings yet
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Upload your first CSV to see your reservation data.
      </p>
      <Link href="/upload" style={{
        background: '#FF7767', color: '#fff', padding: '12px 28px', borderRadius: '8px',
        fontSize: '15px', fontWeight: '700', textDecoration: 'none', fontFamily: 'Raleway, sans-serif',
      }}>
        Upload data
      </Link>
    </div>
  )
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string; property?: string }>
}) {
  const params     = await searchParams
  const dateRange  = getDateRangeFromParams(params)
  const priorRange = getPriorDateRange(params, dateRange)
  const supabase   = await createAuthenticatedClient()

  const userAccount = await getCurrentUserAccount()
  const clientIds   = await getAccessibleClientIds(userAccount)

  if (!clientIds.length) return <EmptyState />

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .in('client_id', clientIds)
    .order('name')

  const allPropertyIds = (properties ?? []).map((p: any) => p.id)
  if (!allPropertyIds.length) return <EmptyState />

  // ── Resolve property filter ────────────────────────────────────────────────
  const propertyParam = params.property
  let effectivePropertyIds: string[]
  let propertyLabel: string

  if (propertyParam && propertyParam !== 'all') {
    const match = (properties ?? []).find((p: any) => p.id === propertyParam)
    if (match) {
      effectivePropertyIds = [propertyParam]
      propertyLabel = (match as any).name
    } else {
      effectivePropertyIds = allPropertyIds
      propertyLabel = allPropertyIds.length === 1 ? (properties as any[])[0].name : 'All Properties'
    }
  } else {
    effectivePropertyIds = allPropertyIds
    propertyLabel = allPropertyIds.length === 1 ? (properties as any[])[0].name : 'All Properties'
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  const [
    { data: reservations },
    { data: priorReservations },
  ] = await Promise.all([
    supabase.from('reservations').select('*').in('property_id', effectivePropertyIds)
      .gte('check_in', dateRange.from).lte('check_in', dateRange.to),
    priorRange
      ? supabase.from('reservations').select('*').in('property_id', effectivePropertyIds)
          .gte('check_in', priorRange.from).lte('check_in', priorRange.to)
      : Promise.resolve({ data: null }),
  ])

  const allRes = reservations ?? []
  const kpis   = buildKpis(allRes)
  const prior  = priorRange && priorReservations != null ? buildKpis(priorReservations) : null

  // ── perf reservations for charts ──────────────────────────────────────────
  const perf = allRes.filter((r: any) => !isOwnerStay(r) && !isCancelled(r))

  // ── Bookings over time ─────────────────────────────────────────────────────
  const monthCountMap: Record<string, number> = {}
  for (const r of perf) {
    if (!r.check_in) continue
    const key = (r.check_in as string).slice(0, 7)
    monthCountMap[key] = (monthCountMap[key] || 0) + 1
  }
  const bookingsOverTime = Object.keys(monthCountMap).sort().map(key => {
    const [year, month] = key.split('-')
    const label = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    return { month: label, count: monthCountMap[key] }
  })

  // ── Stay duration buckets ──────────────────────────────────────────────────
  const BUCKETS = [
    { bucket: '1–2 nights',  min: 1,  max: 2 },
    { bucket: '3–4 nights',  min: 3,  max: 4 },
    { bucket: '5–7 nights',  min: 5,  max: 7 },
    { bucket: '8–14 nights', min: 8,  max: 14 },
    { bucket: '15+ nights',  min: 15, max: Infinity },
  ]
  const totalPerf    = perf.length
  const stayDuration = BUCKETS.map(b => {
    const count = perf.filter((r: any) => { const n = r.nights ?? 0; return n >= b.min && n <= b.max }).length
    return { bucket: b.bucket, count, percentage: totalPerf > 0 ? (count / totalPerf) * 100 : 0 }
  })

  // ── Booking source chart ───────────────────────────────────────────────────
  const sourceCountMap: Record<string, number> = {}
  for (const r of perf) {
    const src = r.booking_source?.trim() || 'Unknown'
    sourceCountMap[src] = (sourceCountMap[src] || 0) + 1
  }
  const totalSourceCount = Object.values(sourceCountMap).reduce((s: number, n: number) => s + n, 0)
  const bookingsBySource = Object.entries(sourceCountMap)
    .map(([source, count]) => ({
      source, count,
      percentage: totalSourceCount > 0 ? (count / totalSourceCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── Day of week chart ──────────────────────────────────────────────────────
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayCountMap: Record<string, number> = Object.fromEntries(DAYS.map(d => [d, 0]))
  for (const r of perf) {
    const date = new Date(r.check_in)
    if (isNaN(date.getTime())) continue
    dayCountMap[DAYS[(date.getDay() + 6) % 7]]++
  }
  const bookingsByDay = DAYS.map(day => ({ day: day.slice(0, 3), count: dayCountMap[day] }))

  // ── Reservations table ─────────────────────────────────────────────────────
  const tableReservations = allRes
    .filter((r: any) => !isOwnerStay(r))
    .map((r: any) => ({
      id:             r.id,
      guest_name:     r.guest_name ?? null,
      check_in:       r.check_in ?? null,
      check_out:      r.check_out ?? null,
      nights:         r.nights ?? null,
      booking_source: r.booking_source ?? null,
      gross_rent:     r.gross_rent ?? null,
      owner_payout:   r.owner_payout ?? null,
      status:         r.status ?? null,
    }))

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Bookings
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          {propertyLabel} · {dateRange.label}
        </p>
      </div>

      <BookingKpiRow
        {...kpis}
        prior={prior}
        vsLabel={priorRange?.vsLabel ?? null}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <BookingsOverTimeChart data={bookingsOverTime} />
        <BookingSourceChart data={bookingsBySource} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <StayDurationChart data={stayDuration} />
        <DayOfWeekChart data={bookingsByDay} />
      </div>

      <ReservationsTable reservations={tableReservations} />
    </div>
  )
}
