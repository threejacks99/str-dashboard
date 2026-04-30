export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds } from '../lib/auth'
import KpiCards from './components/dashboard/KpiCards'
import type { PriorKpis } from './components/dashboard/KpiCards'
import RevenueChart from './components/dashboard/RevenueChart'

// ── Utilities ──────────────────────────────────────────────────────────────────
function toStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.max(1, Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000
  ) + 1)
}

// ── Date range helpers ─────────────────────────────────────────────────────────
function getDateRangeFromParams(params: { from?: string; to?: string; preset?: string }): {
  from: string; to: string; label: string
} {
  const today    = new Date()
  const todayStr = toStr(today)
  const preset   = params.preset ?? 'last_12_months'

  if (preset === 'custom' && params.from && params.to) {
    const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  if (preset === 'this_year') {
    const y = today.getFullYear()
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: 'This year' }
  }

  const subDays   = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return toStr(d) }
  const subMonths = (n: number) => { const d = new Date(today); d.setMonth(d.getMonth() - n); return toStr(d) }
  const addDays   = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return toStr(d) }

  switch (preset) {
    case 'last_30_days':  return { from: subDays(30),   to: todayStr,  label: 'Last 30 days' }
    case 'last_90_days':  return { from: subDays(90),   to: todayStr,  label: 'Last 90 days' }
    case 'last_6_months': return { from: subMonths(6),  to: todayStr,  label: 'Last 6 months' }
    case 'next_30_days':  return { from: todayStr,      to: addDays(30),  label: 'Next 30 days' }
    case 'next_90_days':  return { from: todayStr,      to: addDays(90),  label: 'Next 90 days' }
    case 'all_upcoming': {
      const d = new Date(today); d.setFullYear(d.getFullYear() + 5)
      return { from: todayStr, to: toStr(d), label: 'All upcoming' }
    }
    default:              return { from: subMonths(12), to: todayStr,  label: 'Last 12 months' }
  }
}

function getPriorDateRange(
  params: { from?: string; to?: string; preset?: string },
  current: { from: string; to: string }
): { from: string; to: string; vsLabel: string } | null {
  const preset = params.preset ?? 'last_12_months'
  if (preset === 'all_time' || preset === 'all_upcoming') return null

  const today    = new Date()
  const todayStr = toStr(today)

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
  if (preset === 'this_year') {
    const y = today.getFullYear() - 1
    return { from: `${y}-01-01`, to: `${y}-12-31`, vsLabel: 'vs last year' }
  }
  if (preset === 'next_30_days') {
    const from = new Date(today); from.setDate(from.getDate() - 30)
    return { from: toStr(from), to: todayStr, vsLabel: 'vs prior 30 days' }
  }
  if (preset === 'next_90_days') {
    const from = new Date(today); from.setDate(from.getDate() - 90)
    return { from: toStr(from), to: todayStr, vsLabel: 'vs prior 90 days' }
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
        You don't have any data yet. Upload your first CSV or Excel file to get started.
      </p>
      <Link href="/upload" style={{
        background: '#FF7767', color: '#fff', padding: '12px 28px', borderRadius: '8px',
        fontSize: '15px', fontWeight: '700', textDecoration: 'none', fontFamily: 'Raleway, sans-serif',
      }}>
        Upload your first file
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
