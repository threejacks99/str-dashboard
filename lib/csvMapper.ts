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

  for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
    const value = row[originalHeader]?.trim() ?? null

    if (['nights', 'adult_guests', 'child_guests'].includes(standardField)) {
      mapped[standardField] = value ? parseInt(value) : 0
    } else if (['gross_rent', 'owner_payout', 'mgmt_fee'].includes(standardField)) {
  const cleaned = value ? parseFloat(value.replace(/[$,\s]/g, '')) : 0
  mapped[standardField] = isNaN(cleaned) ? 0 : cleaned
    } else if (['check_in', 'check_out'].includes(standardField)) {
      mapped[standardField] = value || null
    } else if (['booking_created_at'].includes(standardField)) {
      mapped[standardField] = value ? new Date(value).toISOString() : null
    } else {
      mapped[standardField] = value || null
    }
  }

  return mapped
}

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

  for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
    const value = row[originalHeader]?.trim() ?? null

    if (standardField === 'amount') {
      const cleaned = value ? parseFloat(value.replace(/[$,\s]/g, '')) : 0
      mapped[standardField] = isNaN(cleaned) ? 0 : cleaned
    } else if (standardField === 'paid_date') {
      mapped[standardField] = value || null
    } else {
      mapped[standardField] = value || null
    }
  }

  return mapped
}