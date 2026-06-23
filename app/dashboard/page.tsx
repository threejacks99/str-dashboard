export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds, fetchAccountBillingStatus } from '../../lib/auth'
import { isAccountLocked } from '../../lib/billing'
import BillingLockScreen from '../components/BillingLockScreen'
import KpiCards from '../components/dashboard/KpiCards'
import type { PriorKpis } from '../components/dashboard/KpiCards'
import RevenueChart from '../components/dashboard/RevenueChart'
import { daysBetween, getDateRangeFromParams, getPriorDateRange } from '../../lib/dateRanges'

// ── KPI computation ───────────────────────────────────────────────────────────
function computeKpis(reservations: any[], expenses: any[], days: number) {
  const isOwnerStay = (r: any) => ['OWN', 'Own', 'own'].includes(r.booking_source)
  const isCancelled = (r: any) => ['cancelled', 'Cancelled'].includes(r.status)
  const perf = reservations.filter(r => !isOwnerStay(r) && !isCancelled(r))

  const totalIncome    = reservations.filter(r => !isOwnerStay(r)).reduce((s, r) => s + (r.owner_payout || 0), 0)
  const totalGrossRent = perf.reduce((s, r) => s + (r.gross_rent || 0), 0)
  const totalExpenses  = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const noi            = totalIncome - totalExpenses
  const oer            = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const performanceNights   = perf.reduce((s, r) => s + (r.nights || 0), 0)
  const adr            = performanceNights > 0 ? totalGrossRent / performanceNights : 0
  // days already accounts for number of properties (caller multiplies by property count)
  const occupancyRate  = (performanceNights / days) * 100
  const totalBookings  = perf.length
  const avgNightsPerBooking = totalBookings > 0 ? performanceNights / totalBookings : 0
  const avgGuestsPerBooking = totalBookings > 0
    ? perf.reduce((s, r) => s + (r.adult_guests || 0) + (r.child_guests || 0), 0) / totalBookings
    : 0
  const avgLeadTime = totalBookings > 0
    ? perf.filter(r => r.booking_created_at && r.check_in)
        .reduce((s, r) => {
          const d = Math.ceil((new Date(r.check_in).getTime() - new Date(r.booking_created_at).getTime()) / 86400000)
          return s + (d > 0 ? d : 0)
        }, 0) / totalBookings
    : 0

  return {
    totalIncome, totalExpenses, noi, oer, adr, occupancyRate,
    totalBookings, performanceNights, avgNightsPerBooking, avgGuestsPerBooking, avgLeadTime,
    perf,
  }
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        Welcome to Hostics!
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Start by adding your first property — then you can import bookings and expenses.
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>No data yet</h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Your property is set up. Import your bookings and expenses to see your numbers.
      </p>
      <Link href="/upload" style={{ background: '#FF7767', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', fontFamily: 'Raleway, sans-serif' }}>
        Add your data
      </Link>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string; property?: string }>
}) {
  const params     = await searchParams
  const dateRange  = getDateRangeFromParams(params)
  const priorRange = getPriorDateRange(params, dateRange)
  const supabase   = await createAuthenticatedClient()

  // ── Determine what this user can see ──────────────────────────────────────
  const userAccount = await getCurrentUserAccount()
  if (isAccountLocked(await fetchAccountBillingStatus(userAccount))) return <BillingLockScreen />

  const clientIds = await getAccessibleClientIds(userAccount)

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
      // Unknown or inaccessible property — fall back to all
      effectivePropertyIds = allPropertyIds
      propertyLabel = allPropertyIds.length === 1 ? (properties as any[])[0].name : 'All Properties'
    }
  } else {
    effectivePropertyIds = allPropertyIds
    propertyLabel = allPropertyIds.length === 1 ? (properties as any[])[0].name : 'All Properties'
  }

  // Occupancy denominator: available nights = filter window × property count
  const baseDays       = daysBetween(dateRange.from, dateRange.to)
  const effectiveDays  = baseDays * effectivePropertyIds.length
  const priorBaseDays  = priorRange ? daysBetween(priorRange.from, priorRange.to) : 0
  const priorEffDays   = priorBaseDays * effectivePropertyIds.length

  // ── Fetch current + prior data in parallel ─────────────────────────────────
  const [
    { data: reservations },
    { data: expenses },
    { data: priorReservations },
    { data: priorExpenses },
  ] = await Promise.all([
    supabase.from('reservations').select('*').in('property_id', effectivePropertyIds)
      .gte('check_in', dateRange.from).lte('check_in', dateRange.to),
    supabase.from('expenses').select('*').in('property_id', effectivePropertyIds)
      .gte('paid_date', dateRange.from).lte('paid_date', dateRange.to),
    priorRange
      ? supabase.from('reservations').select('*').in('property_id', effectivePropertyIds)
          .gte('check_in', priorRange.from).lte('check_in', priorRange.to)
      : Promise.resolve({ data: null }),
    priorRange
      ? supabase.from('expenses').select('*').in('property_id', effectivePropertyIds)
          .gte('paid_date', priorRange.from).lte('paid_date', priorRange.to)
      : Promise.resolve({ data: null }),
  ])

  // ── Account-scoped empty check ──────────────────────────────────────────────
  // The fetch above is date-range-scoped. If it returned nothing, confirm the
  // account truly has no data (ignoring the date filter) before prompting —
  // otherwise a user with data outside the active range is wrongly shown it.
  if ((reservations ?? []).length === 0 && (expenses ?? []).length === 0) {
    const [{ data: anyRes }, { data: anyExp }] = await Promise.all([
      supabase.from('reservations').select('id').in('property_id', effectivePropertyIds).limit(1),
      supabase.from('expenses').select('id').in('property_id', effectivePropertyIds).limit(1),
    ])
    if ((anyRes ?? []).length === 0 && (anyExp ?? []).length === 0) return <NoDataState />
  }

  // ── Compute KPIs ──────────────────────────────────────────────────────────
  const current = computeKpis(reservations ?? [], expenses ?? [], effectiveDays)

  let priorKpis: PriorKpis | null = null
  if (priorRange && priorReservations != null && priorExpenses != null) {
    const p = computeKpis(priorReservations, priorExpenses, priorEffDays)
    priorKpis = {
      totalIncome: p.totalIncome, totalExpenses: p.totalExpenses, noi: p.noi,
      oer: p.oer, adr: p.adr, occupancyRate: p.occupancyRate,
      totalBookings: p.totalBookings, performanceNights: p.performanceNights,
      avgNightsPerBooking: p.avgNightsPerBooking, avgGuestsPerBooking: p.avgGuestsPerBooking,
      avgLeadTime: p.avgLeadTime,
    }
  }

  const {
    totalIncome, totalExpenses, noi, oer, adr, occupancyRate,
    totalBookings, performanceNights, avgNightsPerBooking, avgGuestsPerBooking, avgLeadTime,
    perf: performanceReservations,
  } = current

  // ── Monthly revenue chart data ─────────────────────────────────────────────
  const monthlyMap: Record<string, { revenue: number; nights: number }> = {}
  for (const r of performanceReservations) {
    const date = new Date(r.check_in)
    if (isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, nights: 0 }
    monthlyMap[key].revenue += r.owner_payout || 0
    monthlyMap[key].nights  += r.nights || 0
  }
  const monthlyRevenue = Object.keys(monthlyMap).sort().map(key => {
    const [year, month] = key.split('-')
    const label = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const { revenue, nights } = monthlyMap[key]
    return { month: label, revenue: Math.round(revenue), nights, netAdr: nights > 0 ? Math.round(revenue / nights) : 0 }
  })

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          {propertyLabel} · {dateRange.label}
        </p>
      </div>

      <KpiCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        noi={noi}
        oer={oer}
        adr={adr}
        occupancyRate={occupancyRate}
        totalBookings={totalBookings}
        performanceNights={performanceNights}
        avgNightsPerBooking={avgNightsPerBooking}
        avgGuestsPerBooking={avgGuestsPerBooking}
        avgLeadTime={avgLeadTime}
        priorKpis={priorKpis}
        vsLabel={priorRange?.vsLabel ?? null}
      />

      <RevenueChart data={monthlyRevenue} />
    </div>
  )
}
