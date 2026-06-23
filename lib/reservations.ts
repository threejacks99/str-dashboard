// ── Reservation helpers ─────────────────────────────────────────────────────────
// Extracted verbatim (behavior-preserving) from the duplicated copies in
// app/dashboard/page.tsx, app/financials/page.tsx, and app/bookings/page.tsx.

/**
 * True when a reservation is an owner stay. Matches the current two-spelling set
 * exactly (NOT case-insensitive). Extracted from app/financials/page.tsx (also
 * duplicated in dashboard/page.tsx and bookings/page.tsx; ReportCards.tsx has the
 * same logic under the name `isOwner`).
 */
export function isOwnerStay(r: any): boolean {
  return /^own/i.test((r.booking_source ?? '').trim())
}

/**
 * True when a reservation is cancelled. Matches the current two-spelling set
 * exactly (NOT case-insensitive). Extracted from app/financials/page.tsx (also
 * duplicated in dashboard/page.tsx, bookings/page.tsx, and ReportCards.tsx, and
 * inlined in ReservationsTable.tsx's tab filter).
 */
export function isCancelled(r: any): boolean {
  return /cancel/i.test(r.status ?? '')
}

/**
 * Resolves which property ids are in scope and the display label for the current
 * property filter param. Extracted verbatim from the "Resolve property filter"
 * block duplicated in app/dashboard/page.tsx, app/financials/page.tsx, and
 * app/bookings/page.tsx.
 */
export function resolvePropertyFilter(
  properties: any[] | null,
  param: string | undefined,
): { effectivePropertyIds: string[]; propertyLabel: string } {
  const allPropertyIds = (properties ?? []).map((p: any) => p.id)

  let effectivePropertyIds: string[]
  let propertyLabel: string

  if (param && param !== 'all') {
    const match = (properties ?? []).find((p: any) => p.id === param)
    if (match) {
      effectivePropertyIds = [param]
      propertyLabel = (match as any).name
    } else {
      // Unknown or inaccessible property — fall back to all
      effectivePropertyIds = allPropertyIds
      propertyLabel = allPropertyIds.length === 1 ? (properties as any[])[0].name : 'All Properties'
    }
  } else {
    effectivePropertyIds = allPropertyIds
    propertyLabel = allPropertyIds.length === 1 ? (properties as any[])[0].name : 'All Properties'
  }

  return { effectivePropertyIds, propertyLabel }
}
