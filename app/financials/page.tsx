export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds, fetchAccountBillingStatus } from '../../lib/auth'
import { isAccountLocked } from '../../lib/billing'
import BillingLockScreen from '../components/BillingLockScreen'
import PLTable from '../components/financials/PLTable'
import type { PLTablePrior } from '../components/financials/PLTable'
import NoiTrendChart from '../components/financials/NoiTrendChart'
import IncomeBySourceChart from '../components/financials/IncomeBySourceChart'
import ExpensesChart from '../components/dashboard/ExpensesChart'
import ExpenseTable from '../components/financials/ExpenseTable'
import FinancialsHeader from '../components/financials/FinancialsHeader'
import { getDateRangeFromParams, getPriorDateRange } from '../../lib/dateRanges'

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
        Set up your first property
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Add a property to start tracking income and expenses.
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
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        No financial data yet
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Your property is set up. Import data to see your P&L.
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
  const propertyNameMap: Record<string, string> = {}
  for (const p of (properties ?? []) as any[]) {
    propertyNameMap[p.id] = p.deleted_at ? `${p.name} (deleted)` : p.name
  }
  const tableExpenses = [...(expenses ?? [])]
    .sort((a: any, b: any) => (b.paid_date ?? '').localeCompare(a.paid_date ?? ''))
    .map((e: any) => ({
      ...e,
      property_name: e.property_id ? (propertyNameMap[e.property_id] ?? null) : null,
    }))

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

      <div className="hostics-grid-2" style={{ marginBottom: '24px' }}>
        <NoiTrendChart data={noiTrend} />
        <IncomeBySourceChart data={incomeBySource} />
      </div>

      <ExpensesChart data={current.expensesByCategory} />

      <ExpenseTable expenses={tableExpenses} />
    </div>
  )
}
