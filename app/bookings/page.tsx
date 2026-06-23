export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds, fetchAccountBillingStatus } from '../../lib/auth'
import { isAccountLocked } from '../../lib/billing'
import BillingLockScreen from '../components/BillingLockScreen'
import BookingKpiRow from '../components/bookings/BookingKpiRow'
import type { BookingKpis } from '../components/bookings/BookingKpiRow'
import BookingsOverTimeChart from '../components/bookings/BookingsOverTimeChart'
import StayDurationChart from '../components/bookings/StayDurationChart'
import ReservationsTable from '../components/bookings/ReservationsTable'
import BookingSourceChart from '../components/dashboard/BookingSourceChart'
import DayOfWeekChart from '../components/dashboard/DayOfWeekChart'
import BookingsHeader from '../components/bookings/BookingsHeader'
import { getDateRangeFromParams, getPriorDateRange } from '../../lib/dateRanges'
import { isCancelled, isOwnerStay, resolvePropertyFilter } from '../../lib/reservations'
import { fetchAll } from '../../lib/supabaseFetch'

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
        Set up your first property
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Add a property to start tracking your reservations.
      </p>
      <Link href="/properties" style={{
        background: '#FF7767', color: '#fff', padding: '12px 28px', borderRadius: '8px',
        fontSize: '15px', fontWeight: '700', textDecoration: 'none', fontFamily: 'Raleway, sans-serif',
      }}>
        Add your first property
      </Link>
    </div>
  )
}

function NoDataState() {
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
        Your property is set up. Import your reservations to see booking trends.
      </p>
      <Link href="/upload" style={{
        background: '#FF7767', color: '#fff', padding: '12px 28px', borderRadius: '8px',
        fontSize: '15px', fontWeight: '700', textDecoration: 'none', fontFamily: 'Raleway, sans-serif',
      }}>
        Add your data
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
  if (isAccountLocked(await fetchAccountBillingStatus(userAccount))) return <BillingLockScreen />

  const clientIds = await getAccessibleClientIds(userAccount)

  if (!clientIds.length) return <EmptyState />

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, deleted_at')
    .in('client_id', clientIds)
    .order('name')

  const allPropertyIds = (properties ?? []).map((p: any) => p.id)
  if (!allPropertyIds.length) return <EmptyState />

  // ── Resolve property filter ────────────────────────────────────────────────
  const { effectivePropertyIds, propertyLabel } = resolvePropertyFilter(properties, params.property)

  // ── Fetch data ────────────────────────────────────────────────────────────
  const [
    { data: reservations },
    { data: priorReservations },
  ] = await Promise.all([
    fetchAll((pageFrom, pageTo) =>
      supabase.from('reservations').select('*').in('property_id', effectivePropertyIds)
        .gte('check_in', dateRange.from).lte('check_in', dateRange.to)
        .order('id', { ascending: true }).range(pageFrom, pageTo)
    ),
    priorRange
      ? fetchAll((pageFrom, pageTo) =>
          supabase.from('reservations').select('*').in('property_id', effectivePropertyIds)
            .gte('check_in', priorRange.from).lte('check_in', priorRange.to)
            .order('id', { ascending: true }).range(pageFrom, pageTo)
        )
      : Promise.resolve({ data: null }),
  ])

  // ── Account-scoped empty check ──────────────────────────────────────────────
  // The fetch above is date-range-scoped. If it returned nothing, confirm the
  // account truly has no reservations (ignoring the date filter) before
  // prompting — otherwise a user with data outside the active range is wrongly
  // shown it.
  if ((reservations ?? []).length === 0) {
    const { data: anyRes } = await supabase
      .from('reservations').select('id').in('property_id', effectivePropertyIds).limit(1)
    if ((anyRes ?? []).length === 0) return <NoDataState />
  }

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
  const propertyNameMap: Record<string, string> = {}
  for (const p of (properties ?? []) as any[]) {
    propertyNameMap[p.id] = p.deleted_at ? `${p.name} (deleted)` : p.name
  }
  const tableReservations = allRes
    .filter((r: any) => !isOwnerStay(r))
    .map((r: any) => ({
      id:             r.id,
      property_id:    r.property_id ?? null,
      property_name:  r.property_id ? (propertyNameMap[r.property_id] ?? null) : null,
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
      <BookingsHeader propertyLabel={propertyLabel} dateRangeLabel={dateRange.label} />

      <BookingKpiRow
        {...kpis}
        prior={prior}
        vsLabel={priorRange?.vsLabel ?? null}
      />

      <div className="hostics-grid-2" style={{ marginBottom: '16px' }}>
        <BookingsOverTimeChart data={bookingsOverTime} />
        <BookingSourceChart data={bookingsBySource} />
      </div>

      <div className="hostics-grid-2" style={{ marginBottom: '24px' }}>
        <StayDurationChart data={stayDuration} />
        <DayOfWeekChart data={bookingsByDay} />
      </div>

      <ReservationsTable reservations={tableReservations} />
    </div>
  )
}
