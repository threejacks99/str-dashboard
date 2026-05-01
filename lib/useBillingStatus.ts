import { useState, useEffect } from 'react'
import { type BillingStatus, isAccountLocked, daysRemaining } from './billing'

// Module-level cache so multiple components on the same page share one fetch.
let cache: { data: BillingStatus | null; at: number } | null = null
const CACHE_TTL = 30_000

export function invalidateBillingCache() {
  cache = null
}

export function useBillingStatus() {
  const cached = cache && Date.now() - cache.at < CACHE_TTL ? cache.data : undefined
  const [status, setStatus]   = useState<BillingStatus | null>(cached ?? null)
  const [loading, setLoading] = useState(cached === undefined)

  useEffect(() => {
    if (cached !== undefined) return // already have a fresh cache hit from module scope

    fetch('/api/billing/status')
      .then(r => (r.ok ? r.json() : null))
      .then((data: BillingStatus | null) => {
        cache = { data, at: Date.now() }
        setStatus(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    loading,
    isLocked:      isAccountLocked(status),
    daysLeft:      daysRemaining(status?.trial_ends_at ?? null),
  }
}
