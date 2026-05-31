// Pure helpers for detecting booking-date conflicts between reservations.
// No React, no Supabase — safe to unit test and reuse anywhere.

export interface ConflictReservation {
  id: string
  guest_name: string | null
  check_in: string | null        // 'YYYY-MM-DD'
  check_out: string | null
  booking_source: string | null
  gross_rent: number | null
  reservation_ref: string | null
  property_id: string | null
  property_name?: string | null
  status: string | null
}

export interface Conflict {
  a: ConflictReservation
  b: ConflictReservation
}

export function isCancelledStatus(s: string | null): boolean {
  return s === 'cancelled' || s === 'Cancelled'
}

export function isOwnerSource(s: string | null): boolean {
  return s === 'OWN' || s === 'Own' || s === 'own'
}

// Strict intersection: same-day turnover (one checks out the day the next
// checks in) is NOT an overlap.
export function datesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && bIn < aOut
}

export function findConflicts(rows: ConflictReservation[], newIds: Set<string>): Conflict[] {
  // 1. Keep only rows that can actually conflict. Owner stays ARE eligible —
  // they're flagged in the modal rather than excluded here.
  const eligible = rows.filter(
    r =>
      r.check_in != null &&
      r.check_out != null &&
      !isCancelledStatus(r.status)
  )

  // 2. Group by property_id (skip null property_id).
  const groups = new Map<string, ConflictReservation[]>()
  for (const r of eligible) {
    if (r.property_id == null) continue
    const group = groups.get(r.property_id)
    if (group) group.push(r)
    else groups.set(r.property_id, [r])
  }

  const conflicts: Conflict[] = []

  // 3. Within each group, sort by check_in asc and find overlapping pairs.
  for (const group of groups.values()) {
    group.sort((x, y) => (x.check_in! < y.check_in! ? -1 : x.check_in! > y.check_in! ? 1 : 0))

    for (let i = 0; i < group.length; i++) {
      const a = group[i]
      for (let j = i + 1; j < group.length; j++) {
        const b = group[j]
        // Sorted by check_in, so once b starts on/after a ends, no further
        // j can overlap a — stop scanning.
        if (b.check_in! >= a.check_out!) break
        if (datesOverlap(a.check_in!, a.check_out!, b.check_in!, b.check_out!)) {
          // 4. Only surface pairs involving a newly added row.
          if (newIds.has(a.id) || newIds.has(b.id)) {
            conflicts.push({ a, b })
          }
        }
      }
    }
  }

  // 5. Each pair appears once.
  return conflicts
}
