import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds } from '../lib/auth'
import KpiCards from './components/dashboard/KpiCards'
import RevenueChart from './components/dashboard/RevenueChart'
import ExpensesChart from './components/dashboard/ExpensesChart'
import BookingSourceChart from './components/dashboard/BookingSourceChart'
import DayOfWeekChart from './components/dashboard/DayOfWeekChart'

function EmptyState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        Welcome to Hostics!
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        You don't have any data yet. Upload your first CSV to get started.
      </p>
      <Link href="/upload" style={{
        background: '#FF7767',
        color: '#fff',
        padding: '12px 28px',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '700',
        textDecoration: 'none',
        fontFamily: 'Raleway, sans-serif',
      }}>
        Upload your first CSV
      </Link>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createAuthenticatedClient()

  // ── Determine what this user can see ──────────────────────────────────────
  const userAccount = await getCurrentUserAccount()
  const clientIds = await getAccessibleClientIds(userAccount)

  if (!clientIds.length) return <EmptyState />

  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .in('client_id', clientIds)

  const propertyIds = (properties ?? []).map((p: { id: string }) => p.id)

  if (!propertyIds.length) return <EmptyState />

  // ── Fetch data scoped to this user's properties ────────────────────────────
  const [{ data: reservations }, { data: expenses }] = await Promise.all([
    supabase.from('reservations').select('*').in('property_id', propertyIds),
    supabase.from('expenses').select('*').in('property_id', propertyIds),
  ])

  const allReservations = reservations ?? []
  const allExpenses = expenses ?? []

  // ── Filters ───────────────────────────────────────────────────────────────
  const isOwnerStay = (r: any) => ['OWN', 'Own', 'own'].includes(r.booking_source)
  const isCancelled = (r: any) => ['cancelled', 'Cancelled'].includes(r.status)
  const performanceReservations = allReservations.filter(r => !isOwnerStay(r) && !isCancelled(r))

  // ── KPI metrics ───────────────────────────────────────────────────────────
  const totalIncome = allReservations
    .filter(r => !isOwnerStay(r))
    .reduce((sum, r) => sum + (r.owner_payout || 0), 0)

  const totalGrossRent = performanceReservations.reduce((sum, r) => sum + (r.gross_rent || 0), 0)
  const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const noi = totalIncome - totalExpenses
  const oer = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  const performanceNights = performanceReservations.reduce((sum, r) => sum + (r.nights || 0), 0)
  const adr = performanceNights > 0 ? totalGrossRent / performanceNights : 0

  const today = new Date()
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(today.getFullYear() - 1)
  const last12MonthsNights = performanceReservations
    .filter(r => { const d = new Date(r.check_in); return d >= twelveMonthsAgo && d <= today })
    .reduce((sum, r) => sum + (r.nights || 0), 0)
  const occupancyRate = (last12MonthsNights / 365) * 100

  const totalBookings = performanceReservations.length
  const avgNightsPerBooking = totalBookings > 0 ? performanceNights / totalBookings : 0
  const avgGuestsPerBooking = totalBookings > 0
    ? performanceReservations.reduce((sum, r) => sum + (r.adult_guests || 0) + (r.child_guests || 0), 0) / totalBookings
    : 0
  const avgLeadTime = totalBookings > 0
    ? performanceReservations
        .filter(r => r.booking_created_at && r.check_in)
        .reduce((sum, r) => {
          const days = Math.ceil(
            (new Date(r.check_in).getTime() - new Date(r.booking_created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          return sum + (days > 0 ? days : 0)
        }, 0) / totalBookings
    : 0

  // ── Monthly revenue chart data ─────────────────────────────────────────────
  const monthlyMap: Record<string, { revenue: number; nights: number }> = {}
  for (const r of performanceReservations) {
    const date = new Date(r.check_in)
    if (isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, nights: 0 }
    monthlyMap[key].revenue += r.owner_payout || 0
    monthlyMap[key].nights += r.nights || 0
  }
  const monthlyRevenue = Object.keys(monthlyMap)
    .sort()
    .map(key => {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const { revenue, nights } = monthlyMap[key]
      return { month: label, revenue: Math.round(revenue), nights, netAdr: nights > 0 ? Math.round(revenue / nights) : 0 }
    })

  // ── Expenses by category chart data ───────────────────────────────────────
  const expenseCategoryMap: Record<string, number> = {}
  for (const e of allExpenses) {
    const cat = e.category?.trim() || 'Uncategorized'
    expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + (e.amount || 0)
  }
  const expensesByCategory = Object.entries(expenseCategoryMap)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  // ── Booking source chart data ──────────────────────────────────────────────
  const sourceCountMap: Record<string, number> = {}
  for (const r of performanceReservations) {
    const source = r.booking_source?.trim() || 'Unknown'
    sourceCountMap[source] = (sourceCountMap[source] || 0) + 1
  }
  const totalSourceCount = Object.values(sourceCountMap).reduce((s, n) => s + n, 0)
  const bookingsBySource = Object.entries(sourceCountMap)
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalSourceCount > 0 ? (count / totalSourceCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── Day of week chart data ─────────────────────────────────────────────────
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayCountMap: Record<string, number> = Object.fromEntries(DAYS.map(d => [d, 0]))
  for (const r of performanceReservations) {
    const date = new Date(r.check_in)
    if (isNaN(date.getTime())) continue
    // getDay(): 0=Sun,1=Mon,...,6=Sat — shift to Mon=0
    dayCountMap[DAYS[(date.getDay() + 6) % 7]]++
  }
  const bookingsByDay = DAYS.map(day => ({ day: day.slice(0, 3), count: dayCountMap[day] }))

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Siesta Palms
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>Performance overview · All time</p>
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
      />

      <RevenueChart data={monthlyRevenue} />

      <ExpensesChart data={expensesByCategory} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
        <BookingSourceChart data={bookingsBySource} />
        <DayOfWeekChart data={bookingsByDay} />
      </div>
    </div>
  )
}
