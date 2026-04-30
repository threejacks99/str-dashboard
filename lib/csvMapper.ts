// ─────────────────────────────────────────────────────────────────────────────
// String sanitization policy
//
// All string values from any source (CSV, Excel, or direct entry forms) are run
// through sanitizeString() before being written to the database. It strips:
//   - Control characters (U+0000-U+001F, U+007F-U+009F)
//   - The Unicode replacement character (U+FFFD) -- common in bad Excel exports
//   - Any code point outside printable ASCII (0x20-0x7E)
//   - Leading and trailing whitespace
//
// The database layer mirrors this via CHECK constraints on the same columns,
// so any row that somehow bypasses the application layer is rejected at insert.
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeString(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value
    .normalize('NFKC')             // convert Unicode equivalents to ASCII where possible
    .replace(/[^\x20-\x7E]/g, '')  // strip everything outside printable ASCII
    .trim()
  return cleaned || null
}

// ── Date parsing ──────────────────────────────────────────────────────────────
// Handles: YYYY-MM-DD (ISO), M/D/YYYY (US), D/M/YYYY (international),
// and long-form strings like "Dec 21, 2024" that JS Date() can parse.
export function parseDate(raw: string): string | null {
  if (!raw?.trim()) return null
  const s = raw.trim()

  // ISO: YYYY-MM-DD (possibly with trailing time)
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  // Slash: M/D/YYYY or D/M/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10)
    const b = parseInt(slashMatch[2], 10)
    const year = parseInt(slashMatch[3], 10)
    // If the first component is >12 it can only be a day (DD/MM/YYYY)
    const [month, day] = a > 12 ? [b, a] : [a, b]
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Long-form: "Dec 21, 2024", "December 21, 2024", etc.
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    // Use local-time components to avoid UTC midnight shift
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return null
}

// ── Reservation column mappings ────────────────────────────────────────────────
export const COLUMN_MAPPINGS: Record<string, string[]> = {
  reservation_ref: [
    'reservation #', 'reservation#', 'confirmation code',
    'reservation id', 'booking id', 'confirmation #'
  ],
  guest_name: [
    'guest', 'guest name', 'visitor', 'renter', 'customer'
  ],
  booking_created_at: [
    'creation date', 'booking date', 'date booked',
    'created date', 'created at'
  ],
  booking_source: [
    'type', 'platform', 'channel', 'source',
    'booking source', 'booking channel'
  ],
  check_in: [
    'arrive', 'arrive ', ' arrive', 'arrival', 'check in', 'check-in',
    'checkin', 'start date', 'from', 'check in date', 'arrival date'
  ],
  check_out: [
    'depart', 'depart ', ' depart', 'departure', 'check out', 'check-out',
    'checkout', 'end date', 'to', 'check out date', 'departure date'
  ],
  nights: [
    'nights', 'nights stayed', 'length of stay', 'duration'
  ],
  adult_guests: [
    'adult guests', 'adults', 'adult count'
  ],
  child_guests: [
    'child guests', 'children', 'kids', 'child count'
  ],
  gross_rent: [
    'rent', 'gross rent', 'total', 'gross amount',
    'booking amount', 'total rent', 'rental amount',
    'rate', 'total rate', 'accommodation fare'
  ],
  owner_payout: [
    'owner commission', 'owner payout', 'net payout',
    'you earned', 'host payout', 'payout', 'net amount',
    'owner earnings', 'earnings'
  ],
  mgmt_fee: [
    'management commission', 'management fee',
    'mgmt fee', 'management', 'pm fee'
  ],
}

export function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const [standardField, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (const header of headers) {
      const normalized = Array.from(header)
        .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)
        .join('')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
      if (aliases.includes(normalized)) {
        mapping[standardField] = header
        break
      }
    }
  }

  return mapping
}

export function mapRow(
  row: Record<string, string>,
  columnMapping: Record<string, string>
): Record<string, any> {
  const mapped: Record<string, any> = {}
  const errors: string[] = []

  for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
    const value = row[originalHeader]?.trim() ?? null

    if (['nights', 'adult_guests', 'child_guests'].includes(standardField)) {
      mapped[standardField] = value ? parseInt(value) : 0
    } else if (['gross_rent', 'owner_payout', 'mgmt_fee'].includes(standardField)) {
      const cleaned = value ? parseFloat(value.replace(/[$,\s]/g, '')) : 0
      mapped[standardField] = isNaN(cleaned) ? 0 : cleaned
    } else if (['check_in', 'check_out'].includes(standardField)) {
      if (!value) {
        mapped[standardField] = null
      } else {
        const parsed = parseDate(value)
        if (parsed) {
          mapped[standardField] = parsed
        } else {
          errors.push(`Unrecognized date "${value}" in ${standardField.replace('_', ' ')}`)
          mapped[standardField] = null
        }
      }
    } else if (standardField === 'booking_created_at') {
      const parsed = value ? parseDate(value) : null
      mapped[standardField] = parsed ? `${parsed}T00:00:00.000Z` : null
    } else {
      mapped[standardField] = sanitizeString(value)
    }
  }

  if (errors.length > 0) mapped._errors = errors
  return mapped
}

// ── File type detection ────────────────────────────────────────────────────────
const RESERVATION_SIGNATURE = ['arrive', 'nights', 'rent', 'owner commission', 'depart']
const EXPENSE_SIGNATURE = ['paid date', 'vendor', 'category', 'amount']

export function detectFileType(headers: string[]): 'reservations' | 'expenses' | 'unknown' {
  const normalized = headers.map(h =>
    Array.from(h)
      .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)
      .join('')
      .toLowerCase()
      .trim()
  )

  const reservationMatches = RESERVATION_SIGNATURE.filter(sig =>
    normalized.some(h => h.includes(sig))
  ).length

  const expenseMatches = EXPENSE_SIGNATURE.filter(sig =>
    normalized.some(h => h.includes(sig))
  ).length

  if (reservationMatches >= 3) return 'reservations'
  if (expenseMatches >= 3) return 'expenses'
  return 'unknown'
}

// ── Expense column mappings ────────────────────────────────────────────────────
export const EXPENSE_COLUMN_MAPPINGS: Record<string, string[]> = {
  paid_date: ['paid date', 'date', 'payment date', 'expense date'],
  vendor: ['vendor', 'payee', 'supplier', 'merchant', 'paid to'],
  description: ['description', 'memo', 'notes', 'details', 'note'],
  amount: ['amount', 'cost', 'total', 'expense amount', 'price'],
  category: ['category', 'type', 'expense type', 'expense category'],
  frequency: ['frequency', 'recurring', 'recurrence'],
}

export function mapExpenseColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const [standardField, aliases] of Object.entries(EXPENSE_COLUMN_MAPPINGS)) {
    for (const header of headers) {
      const normalized = Array.from(header)
        .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)
        .join('')
        .toLowerCase()
        .trim()
      if (aliases.includes(normalized)) {
        mapping[standardField] = header
        break
      }
    }
  }

  return mapping
}

export function mapExpenseRow(
  row: Record<string, string>,
  columnMapping: Record<string, string>
): Record<string, any> {
  const mapped: Record<string, any> = {}
  const errors: string[] = []

  for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
    const value = row[originalHeader]?.trim() ?? null

    if (standardField === 'amount') {
      if (!value) {
        mapped[standardField] = 0
      } else {
        const isNegative = value.startsWith('-') || value.startsWith('(')
        const cleaned = value.replace(/[$,\s()]/g, '')
        const parsed = parseFloat(cleaned)
        mapped[standardField] = isNaN(parsed) ? 0 : (isNegative ? -parsed : parsed)
      }
    } else if (standardField === 'paid_date') {
      if (!value) {
        mapped[standardField] = null
      } else {
        const parsed = parseDate(value)
        if (parsed) {
          mapped[standardField] = parsed
        } else {
          errors.push(`Unrecognized date "${value}" in paid date`)
          mapped[standardField] = null
        }
      }
    } else {
      mapped[standardField] = sanitizeString(value)
    }
  }

  if (errors.length > 0) mapped._errors = errors
  return mapped
}
