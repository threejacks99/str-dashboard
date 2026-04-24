import { supabase } from '../lib/supabase'
import RevenueChart from './components/RevenueChart'
import ExpensesByCategoryChart from './components/ExpensesByCategoryChart'

async function getDashboardData() {
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*')

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')

  return { reservations: reservations || [], expenses: expenses || [] }
}

function formatCurrency(value: number): string {
  if (value < 0) {
    return `($${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  if (value < 0) {
    return `(${Math.abs(value).toFixed(1)}%)`
  }
  return `${value.toFixed(1)}%`
}

export default async function DashboardPage() {
  const { reservations, expenses } = await getDashboardData()

  const isOwnerStay = (r: any) =>
    ['OWN', 'Own', 'own'].includes(r.booking_source)

  const isCancelled = (r: any) =>
    ['cancelled', 'Cancelled'].includes(r.status)

  const performanceReservations = reservations.filter(r =>
    !isOwnerStay(r) && !isCancelled(r)
  )

  const totalIncome = reservations
    .filter(r => !isOwnerStay(r))
    .reduce((sum, r) => sum + (r.owner_payout || 0), 0)

  const totalGrossRent = performanceReservations
    .reduce((sum, r) => sum + (r.gross_rent || 0), 0)

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const noi = totalIncome - totalExpenses
  const oer = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0

  const performanceNights = performanceReservations
    .reduce((sum, r) => sum + (r.nights || 0), 0)

  const adr = performanceNights > 0 ? totalGrossRent / performanceNights : 0
  const checkInDates = performanceReservations
  .map(r => new Date(r.check_in))
  .filter(d => !isNaN(d.getTime()))

const checkOutDates = performanceReservations
  .map(r => new Date(r.check_out))
  .filter(d => !isNaN(d.getTime()))

const earliestDate = new Date(Math.min(...checkInDates.map(d => d.getTime())))
const latestDate = new Date(Math.max(...checkOutDates.map(d => d.getTime())))
const today = new Date()
const twelveMonthsAgo = new Date()
twelveMonthsAgo.setFullYear(today.getFullYear() - 1)

const last12MonthsReservations = performanceReservations.filter(r => {
  const checkIn = new Date(r.check_in)
  return checkIn >= twelveMonthsAgo && checkIn <= today
})

const last12MonthsNights = last12MonthsReservations
  .reduce((sum, r) => sum + (r.nights || 0), 0)

const occupancyRate = (last12MonthsNights / 365) * 100
  const totalBookings = performanceReservations.length
const avgNightsPerBooking = totalBookings > 0
  ? performanceNights / totalBookings
  : 0

const avgGuestsPerBooking = totalBookings > 0
  ? performanceReservations.reduce((sum, r) =>
      sum + (r.adult_guests || 0) + (r.child_guests || 0), 0) / totalBookings
  : 0

const avgLeadTime = totalBookings > 0
  ? performanceReservations
      .filter(r => r.booking_created_at && r.check_in)
      .reduce((sum, r) => {
        const created = new Date(r.booking_created_at)
        const checkIn = new Date(r.check_in)
        const days = Math.ceil((checkIn.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (days > 0 ? days : 0)
      }, 0) / totalBookings
  : 0

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
      return {
        month: label,
        revenue: Math.round(revenue),
        nights,
        netAdr: nights > 0 ? Math.round(revenue / nights) : 0,
      }
    })

  const expenseCategoryMap: Record<string, number> = {}
  for (const e of expenses) {
    const cat = e.category?.trim() || 'Uncategorized'
    expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + (e.amount || 0)
  }
  const expensesByCategory = Object.entries(expenseCategoryMap)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const kpis = [
    { label: 'Total Income', value: formatCurrency(totalIncome), color: '#0D2C54' },
    { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: '#FF7767' },
    { label: 'NOI', value: formatCurrency(noi), color: noi >= 0 ? '#0D2C54' : '#FF7767' },
    { label: 'OER', value: formatPercent(oer), color: '#FF7767' },
    { label: 'Average Daily Rate', value: `$${adr.toFixed(0)}`, color: '#0D2C54' },
    { label: 'Occupancy Rate (12mo)', value: formatPercent(occupancyRate), color: occupancyRate >= 50 ? '#0D2C54' : '#FF7767' },
    { label: 'Total Bookings', value: totalBookings.toString(), color: '#0D2C54' },
    { label: 'Total Nights', value: performanceNights.toString(), color: '#0D2C54' },
    { label: 'Avg Nights per Booking', value: avgNightsPerBooking.toFixed(1), color: '#0D2C54' },
    { label: 'Avg Guests per Booking', value: avgGuestsPerBooking.toFixed(1), color: '#0D2C54' },
    { label: 'Avg Booking Lead Time', value: `${Math.round(avgLeadTime)} days`, color: '#0D2C54' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '26px',
          fontWeight: '800',
          color: '#0D2C54',
          marginBottom: '4px'
        }}>
          Siesta Palms
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Performance overview · All time
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '40px'
      }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #eee',
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px'
            }}>
              {kpi.label}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '800',
              color: kpi.color,
              letterSpacing: '-0.5px'
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <RevenueChart data={monthlyRevenue} />

      {/* Expenses by Category Chart */}
      <ExpensesByCategoryChart data={expensesByCategory} />
    </div>
  )
}