'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useBillingStatus } from '../../lib/useBillingStatus'
import { TIER_PROPERTY_CAPS } from '../../lib/billing'
import PropertyForm from '../components/PropertyForm'

interface Property {
  id: string
  name: string
  address: string | null
  bedrooms: number | null
  bathrooms: number | null
  geocoded_at: string | null
}

// ── Property card ──────────────────────────────────────────────────────────────
function PropertyCard({ property }: { property: Property }) {
  const bedLabel  = property.bedrooms  != null ? `${property.bedrooms} bed${property.bedrooms === 1 ? '' : 's'}` : null
  const bathLabel = property.bathrooms != null ? `${property.bathrooms} bath${property.bathrooms === 1 ? '' : 's'}` : null
  const unitLabel = bedLabel && bathLabel ? `${bedLabel} · ${bathLabel}` : bedLabel ?? bathLabel

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #eee',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0D2C54', margin: 0, fontFamily: 'Raleway, sans-serif' }}>
          {property.name}
        </h3>
        <Link href={`/properties/${property.id}`} style={{
          flexShrink: 0,
          padding: '6px 16px',
          background: 'none',
          border: '1px solid #FF7767',
          borderRadius: '7px',
          fontSize: '13px',
          fontWeight: '600',
          color: '#FF7767',
          textDecoration: 'none',
          fontFamily: 'Raleway, sans-serif',
        }}>
          Edit
        </Link>
      </div>

      {property.address && (
        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{property.address}</p>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
        {unitLabel && (
          <span style={{
            fontSize: '12px', color: '#888', background: '#F5F7FA',
            padding: '3px 10px', borderRadius: '20px', border: '1px solid #eee',
          }}>
            {unitLabel}
          </span>
        )}
        {property.geocoded_at ? (
          <span style={{ fontSize: '11px', color: '#4CAF82', fontWeight: '600' }}>📍 Geocoded</span>
        ) : property.address ? (
          <span style={{ fontSize: '11px', color: '#aaa' }}>📍 Not geocoded</span>
        ) : null}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const [properties, setProperties]           = useState<Property[]>([])
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [showForm, setShowForm]               = useState(false)

  const router = useRouter()
  const { status, loading: billingLoading } = useBillingStatus()
  const tier = status?.subscription_tier ?? null
  const cap = tier ? TIER_PROPERTY_CAPS[tier] : null
  const atCap = cap !== null && properties.length >= cap

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Resolve the correct client for this user by walking account_users → clients.
    // Never rely on "first visible client" since loose RLS could expose other accounts' rows.
    const { data: accountUsers } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)

    let resolvedClientId: string | null = null

    if (accountUsers?.length) {
      const accountIds = (accountUsers as { account_id: string }[]).map(au => au.account_id)
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .in('account_id', accountIds)
        .order('created_at', { ascending: true })
        .limit(1)
      resolvedClientId = (clients as { id: string }[] | null)?.[0]?.id ?? null
    }

    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, address, bedrooms, bathrooms, geocoded_at')
      .order('name')

    setProperties(properties ?? [])
    setPrimaryClientId(resolvedClientId)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreated(result?: { id: string; name: string }) {
    if (!result) return
    const { data } = await supabase
      .from('properties')
      .select('id, name, address, bedrooms, bathrooms, geocoded_at')
      .eq('id', result.id)
      .single()
    if (data) {
      setProperties(prev => [...prev, data as Property].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setShowForm(false)
  }

  function handleAddPropertyClick() {
    if (atCap) {
      router.push('/billing')
      return
    }
    setShowForm(true)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif' }}>
        <div style={{ width: '160px', height: '28px', background: '#e8eaed', borderRadius: '8px', marginBottom: '32px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '100px', background: '#e8eaed', borderRadius: '12px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>Properties</h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {properties.length === 0
              ? 'No properties yet — create your first one to get started.'
              : `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleAddPropertyClick}
            disabled={billingLoading}
            style={{
              padding: '10px 22px', background: '#FF7767', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
              fontFamily: 'Raleway, sans-serif',
              cursor: billingLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {atCap ? '🔒 Property limit reached' : '+ Add Property'}
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showForm && (
        <div style={{ marginBottom: '32px' }}>
          <PropertyForm
            mode="create"
            primaryClientId={primaryClientId}
            onSuccess={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Empty state (no form) */}
      {properties.length === 0 && !showForm && (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          background: '#fff', borderRadius: '12px', border: '1px solid #eee',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏠</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0D2C54', marginBottom: '8px' }}>No properties yet</h2>
          <p style={{ color: '#888', fontSize: '14px', maxWidth: '300px', margin: '0 auto 28px', lineHeight: '1.6' }}>
            Create your first property to start importing reservation and expense data.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: '#FF7767', color: '#fff', border: 'none', padding: '12px 28px',
              borderRadius: '8px', fontSize: '15px', fontWeight: '700', fontFamily: 'Raleway, sans-serif', cursor: 'pointer',
            }}
          >
            Create your first property
          </button>
        </div>
      )}

      {/* Property grid */}
      {properties.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {properties.map(p => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  )
}
