export interface MetricDefinition {
  term: string
  definition: string
  formula?: string
  whyItMatters?: string
}

export const METRIC_DEFS: Record<string, MetricDefinition> = {
  noi: {
    term: 'Net Operating Income (NOI)',
    definition: 'The income left over after all operating expenses are paid.',
    formula: 'Total Revenue − Total Operating Expenses',
    whyItMatters: 'NOI shows the actual profitability of the property as a business.',
  },
  oer: {
    term: 'Operating Expense Ratio (OER)',
    definition: 'The percentage of revenue consumed by operating expenses.',
    formula: 'Total Expenses ÷ Total Revenue × 100',
    whyItMatters: 'Lower OER means more of your revenue turns into profit.',
  },
  adr: {
    term: 'Average Daily Rate (ADR)',
    definition: 'The average nightly rate earned across all booked nights in the period.',
    formula: 'Total Gross Rent ÷ Total Booked Nights',
    whyItMatters: 'ADR helps you benchmark pricing against the market.',
  },
  occupancyRate: {
    term: 'Occupancy Rate',
    definition: 'The percentage of available nights that were actually booked.',
    formula: 'Booked Nights ÷ Available Nights × 100',
    whyItMatters: 'Tracks how fully utilized your property is over time.',
  },
  totalIncome: {
    term: 'Total Income',
    definition: 'Total owner payout from all non-cancelled, non-owner-stay bookings in the period.',
    whyItMatters: 'Your top-line revenue before expenses.',
  },
  totalExpenses: {
    term: 'Total Expenses',
    definition: 'Sum of all recorded operating expenses for the property in the period.',
    whyItMatters: 'Tracking expenses is essential to understanding true profitability.',
  },
  avgNightsPerBooking: {
    term: 'Average Nights per Booking',
    definition: 'The average length of stay across all bookings in the period.',
    formula: 'Total Booked Nights ÷ Number of Bookings',
    whyItMatters: 'Longer stays typically mean lower turnover costs.',
  },
  avgGuestsPerBooking: {
    term: 'Average Guests per Booking',
    definition: 'The average number of guests (adults + children) per booking.',
    formula: '(Total Adults + Total Children) ÷ Number of Bookings',
  },
  avgDaysBookedAhead: {
    term: 'Average Days Booked Ahead',
    definition: 'How far in advance guests typically book, measured from booking date to check-in.',
    whyItMatters: 'Short lead times suggest last-minute demand; long lead times indicate planners.',
  },
  cancellationRate: {
    term: 'Cancellation Rate',
    definition: 'The percentage of non-owner bookings that were cancelled in the period.',
    formula: 'Cancelled Bookings ÷ Total Bookings × 100',
    whyItMatters: 'High cancellation rates can signal pricing, policy, or seasonal issues.',
  },
  grossRent: {
    term: 'Gross Rent',
    definition: 'The total amount the guest paid before any platform fees or management deductions.',
    whyItMatters: 'Gross Rent is what guests see; Owner Payout is what you receive.',
  },
  ownerPayout: {
    term: 'Owner Payout',
    definition: 'The amount the property owner receives after platform fees and management commissions are deducted from Gross Rent.',
    whyItMatters: 'Owner Payout is the revenue figure used in all financial calculations.',
  },
}
