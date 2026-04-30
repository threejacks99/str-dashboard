import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { ReportData } from './TaxSummaryPDF'

const SCHEDULE_E_MAP: Record<string, string> = {
  Maintenance:           '7',
  Cleaning:              '7',
  Insurance:             '9',
  Fees:                  '10',
  'Professional Services': '10',
  Legal:                 '10',
  Repairs:               '14',
  Taxes:                 '16',
  Utilities:             '17',
}

function schLine(category: string | null | undefined): string {
  return SCHEDULE_E_MAP[(category ?? '').trim()] ?? '19'
}

function schLabel(line: string): string {
  const LABELS: Record<string, string> = {
    '7':  'Cleaning and Maintenance',
    '9':  'Insurance',
    '10': 'Legal and Professional Fees',
    '11': 'Management Fees',
    '14': 'Repairs',
    '16': 'Taxes',
    '17': 'Utilities',
    '19': 'Other Expenses',
  }
  return LABELS[line] ?? 'Other'
}

export function generateExcel(data: ReportData): void {
  const wb = XLSX.utils.book_new()

  // ── Tab 1: Summary ──────────────────────────────────────────────
  const summary: (string | number | null)[][] = [
    ['HOSTICS TAX SUMMARY'],
    [],
    ['Property:', data.propertyName],
    ['Tax Year:', data.taxYear],
    ['Generated:', data.generatedAt],
    [],
    ['INCOME'],
    [null, 'Source', 'Amount ($)'],
    ...data.incomeBySource.map(src => [null, src.source, src.amount]),
    [null, 'Total Rental Income', data.totalGrossRent],
    [],
    ['EXPENSES (IRS SCHEDULE E)'],
    ['Line', 'Category', 'Amount ($)'],
    ...data.scheduleELines.map(l => [l.line, l.label, l.amount]),
    [null, 'Total Expenses', data.totalExpenses],
    [],
    ['NET OPERATING INCOME', null, data.noi],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summary)
  wsSummary['!cols'] = [{ wch: 10 }, { wch: 36 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // ── Tab 2: Reservations ─────────────────────────────────────────
  const resHeaders = [
    'Reservation ID', 'Guest Name', 'Booking Source', 'Check-in', 'Check-out',
    'Nights', 'Adult Guests', 'Child Guests', 'Gross Rent', 'Owner Payout',
    'Mgmt Fee', 'Status',
  ]
  const sortedRes = [...data.reservations].sort((a, b) =>
    (a.check_in ?? '').localeCompare(b.check_in ?? '')
  )
  const resRows = sortedRes.map(r => [
    r.id ?? '',
    r.guest_name ?? '',
    r.booking_source ?? '',
    r.check_in ?? '',
    r.check_out ?? '',
    +(r.nights ?? 0),
    +(r.adult_guests ?? 0),
    +(r.child_guests ?? 0),
    +(r.gross_rent ?? 0),
    +(r.owner_payout ?? 0),
    +(r.mgmt_fee ?? 0),
    r.status ?? '',
  ] as (string | number)[])

  const resTotals: (string | number)[] = ['TOTAL', '', '', '', '']
  for (let col = 5; col <= 10; col++) {
    resTotals.push(resRows.reduce((s, row) => s + (row[col] as number), 0))
  }
  resTotals.push('')

  const wsRes = XLSX.utils.aoa_to_sheet([resHeaders, ...resRows, resTotals])
  wsRes['!cols'] = [
    { wch: 38 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
    { wch: 8 },  { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsRes, 'Reservations')

  // ── Tab 3: Expenses ─────────────────────────────────────────────
  const expHeaders = ['Date', 'Vendor', 'Description', 'Category', 'Schedule E Line', 'Amount ($)']
  const sortedExp = [...data.expenses].sort((a, b) =>
    (a.paid_date ?? '').localeCompare(b.paid_date ?? '')
  )
  const expRows = sortedExp.map(e => [
    e.paid_date ?? '',
    e.vendor ?? '',
    e.description ?? '',
    e.category ?? '',
    schLine(e.category),
    +(e.amount ?? 0),
  ] as (string | number)[])

  const expTotal: (string | number)[] = [
    'TOTAL', '', '', '', '',
    expRows.reduce((s, r) => s + (r[5] as number), 0),
  ]
  const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows, expTotal])
  wsExp['!cols'] = [
    { wch: 12 }, { wch: 24 }, { wch: 36 }, { wch: 20 }, { wch: 16 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses')

  // ── Tab 4: Schedule E Summary ───────────────────────────────────
  const scheRows: (string | number | null)[][] = [
    ['IRS SCHEDULE E SUMMARY'],
    [`Tax Year ${data.taxYear}  —  ${data.propertyName}`],
    [],
    ['Schedule E Line', 'Description', 'Amount ($)'],
    [`Line 3`, 'Rents Received', data.totalGrossRent],
    [],
    ...data.scheduleELines.map(l => [`Line ${l.line}`, l.label, l.amount]),
    [],
    [null, 'Total Expenses', data.totalExpenses],
    [null, 'Net Operating Income', data.noi],
    [],
    [null, null, null],
    ['NOTE: This schedule is for informational purposes only. Consult a tax professional before filing.'],
  ]
  const wsSchE = XLSX.utils.aoa_to_sheet(scheRows)
  wsSchE['!cols'] = [{ wch: 16 }, { wch: 36 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsSchE, 'Schedule E Summary')

  // ── Write & download ────────────────────────────────────────────
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob(
    [wbout],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  )
  const safeName = data.propertyName.replace(/[^a-zA-Z0-9]/g, '')
  saveAs(blob, `Hostics_TaxSummary_${data.taxYear}_${safeName}.xlsx`)
}
