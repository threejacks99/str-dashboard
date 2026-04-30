export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds } from '../../lib/auth'
import PLTable from '../components/financials/PLTable'
import type { PLTablePrior } from '../components/financials/PLTable'
import NoiTrendChart from '../components/financials/NoiTrendChart'
import IncomeBySourceChart from '../components/financials/IncomeBySourceChart'
import ExpensesChart from '../components/dashboard/ExpensesChart'
import ExpenseTable from '../components/financials/ExpenseTable'
import FinancialsHeader from '../components/financials/FinancialsHeader'

// ── Utilities ─────────────────────────────────────────────────────────────────
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

const SOURCE_NAMES: Record<string, string> = {
  'SC-ABnB':  'Airbnb',
  'HAFamOLB': 'Direct',
  'STA':      'Other',
}

function isOwnerStay(r: any): boolean {
  return ['OWN', 'Own', 'own'].includes(r.booking_source)
}

function isCancelled(r: any): boolean {
  return ['cancelled', 'Cancelled'].includes(r.status)
}

function buildFinancials(reservations: any[], expenses: any[]) {
  const perf = reservations.filter(r => !isOwnerStay(r) && !isCancelled(r))

  const revMap: Record<string, number> = {}
  for (const r of perf) {
    const src = r.booking_source?.trim() || 'Unknown'
    revMap[src] = (revMap[src] || 0) + (r.owner_payout || 0)
  }
  const revenueBySource = Object.entries(revMap)
    .map(([source, amount]) => ({ source, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const expMap: Record<string, number> = {}
  for (const e of expenses) {
    const cat = e.category?.trim() || 'Uncategorized'
    expMap[cat] = (expMap[cat] || 0) + (e.amount || 0)
  }
  const expensesByCategory = Object.entries(expMap)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const totalRevenue  = revenueBySource.reduce((s, r) => s + r.amount, 0)
  const totalExpenses = expensesByCategory.reduce((s, e) => s + e.amount, 0)
  const noi           = totalRevenue - totalExpenses
  const oer           = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0

  return { perf, revenueBySource, expensesByCategory, totalRevenue, totalExpenses, noi, oer }
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        No financial data yet
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Upload your first CSV to see your P&L report.
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

export default async function FinancialsPage({
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

  const current = buildFinancials(reservations ?? [], expenses ?? [])

  // ── Prior period ──────────────────────────────────────────────────────────
  let prior: PLTablePrior | null = null
  if (priorRange && priorReservations != null && priorExpenses != null) {
    const p = buildFinancials(priorReservations, priorExpenses)
    prior = {
      revenueBySource:    p.revenueBySource,
      expensesByCategory: p.expensesByCategory,
      totalRevenue:       p.totalRevenue,
      totalExpenses:      p.totalExpenses,
      noi:                p.noi,
      oer:                p.oer,
    }
  }

  // ── NOI trend (monthly) ────────────────────────────────────────────────────
  const monthRevMap: Record<string, number> = {}
  for (const r of current.perf) {
    if (!r.check_in) continue
    const key = (r.check_in as string).slice(0, 7)
    monthRevMap[key] = (monthRevMap[key] || 0) + (r.owner_payout || 0)
  }
  const monthExpMap: Record<string, number> = {}
  for (const e of expenses ?? []) {
    if (!e.paid_date) continue
    const key = (e.paid_date as string).slice(0, 7)
    monthExpMap[key] = (monthExpMap[key] || 0) + (e.amount || 0)
  }
  const allMonthKeys = [...new Set([...Object.keys(monthRevMap), ...Object.keys(monthExpMap)])].sort()
  const noiTrend = allMonthKeys.map(key => {
    const [year, month] = key.split('-')
    const label = new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    return { month: label, noi: Math.round((monthRevMap[key] || 0) - (monthExpMap[key] || 0)) }
  })

  // ── Income by source ──────────────────────────────────────────────────────
  const totalRev = current.revenueBySource.reduce((s, r) => s + r.amount, 0)
  const incomeBySource = current.revenueBySource.map(r => ({
    source:     r.source,
    label:      SOURCE_NAMES[r.source] ?? r.source,
    amount:     r.amount,
    percentage: totalRev > 0 ? (r.amount / totalRev) * 100 : 0,
  }))

  // ── Recent expenses ───────────────────────────────────────────────────────
  const recentExpenses = [...(expenses ?? [])]
    .sort((a: any, b: any) => (b.paid_date ?? '').localeCompare(a.paid_date ?? ''))
    .slice(0, 50)

  return (
    <div>
      <FinancialsHeader propertyLabel={propertyLabel} dateRangeLabel={dateRange.label} />

      <div style={{ marginBottom: '24px' }}>
        <PLTable
          revenueBySource={current.revenueBySource}
          expensesByCategory={current.expensesByCategory}
          totalRevenue={current.totalRevenue}
          totalExpenses={current.totalExpenses}
          noi={current.noi}
          oer={current.oer}
          prior={prior}
          vsLabel={priorRange?.vsLabel ?? null}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <NoiTrendChart data={noiTrend} />
        <IncomeBySourceChart data={incomeBySource} />
      </div>

      <ExpensesChart data={current.expensesByCategory} />

      <ExpenseTable expenses={recentExpenses} />
    </div>
  )
}
