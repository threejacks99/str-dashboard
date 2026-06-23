// ── Date range utilities ────────────────────────────────────────────────────────
// Extracted verbatim (behavior-preserving) from the duplicated copies in
// app/dashboard/page.tsx, app/financials/page.tsx, and app/bookings/page.tsx.

/**
 * Formats a Date as a `YYYY-MM-DD` string (UTC slice of the ISO string).
 * Extracted from app/dashboard/page.tsx (also duplicated in financials/page.tsx and bookings/page.tsx).
 */
export function toStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Returns the inclusive number of days between two `YYYY-MM-DD` strings (minimum 1).
 * Extracted from app/dashboard/page.tsx (also duplicated in financials/page.tsx and bookings/page.tsx).
 */
export function daysBetween(from: string, to: string): number {
  return Math.max(1, Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000
  ) + 1)
}

/**
 * Resolves a date-range preset (or custom from/to) into a `{ from, to, label }` range.
 * Extracted from app/dashboard/page.tsx (also duplicated in financials/page.tsx and bookings/page.tsx).
 */
export function getDateRangeFromParams(params: { from?: string; to?: string; preset?: string }): {
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

/**
 * Computes the comparison ("prior") range for a given current range/preset, or null when
 * no comparison applies (all_time / all_upcoming).
 * Extracted from app/dashboard/page.tsx (also duplicated in financials/page.tsx and bookings/page.tsx).
 */
export function getPriorDateRange(
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
