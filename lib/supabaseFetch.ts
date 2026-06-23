/**
 * Paginated fetcher to defeat PostgREST's db-max-rows cap (default 1,000).
 * supabase-js silently returns at most that many rows with no error, so any
 * aggregate built from a single select() over a large window is silently
 * truncated. This pages through in 1,000-row blocks until a short page lands,
 * then returns the same { data, error } shape a raw supabase call would — so
 * it's a drop-in for `const { data, error } = await supabase.from(...)...`.
 *
 * The caller's builder MUST apply a stable `.order(...)` and call
 * `.range(pageFrom, pageTo)` with the supplied bounds — without a deterministic
 * order, rows can duplicate or drop across page boundaries. On error, returns
 * { data: null, error } immediately (existing `if (error)` checks keep working).
 *
 * Usage:
 *   const { data, error } = await fetchAll((pageFrom, pageTo) =>
 *     supabase.from('reservations').select('*')
 *       .in('property_id', ids).gte('check_in', start).lte('check_in', end)
 *       .order('id', { ascending: true }).range(pageFrom, pageTo))
 *   if (error) { ... }   // unchanged from before
 */
export async function fetchAll<T = any>(
  buildPage: (pageFrom: number, pageTo: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<{ data: T[] | null; error: any }> {
  const PAGE_SIZE = 1000
  const all: T[] = []
  for (let pageFrom = 0; ; pageFrom += PAGE_SIZE) {
    const { data, error } = await buildPage(pageFrom, pageFrom + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return { data: all, error: null }
  }
}
