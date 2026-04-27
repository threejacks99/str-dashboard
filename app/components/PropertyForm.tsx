'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// ── Shared styles ──────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'Raleway, sans-serif',
  color: '#0D2C54',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
}

const readonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#F5F7FA',
  color: '#888',
  cursor: 'default',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#0D2C54',
  marginTop: 0,
  marginBottom: '20px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

// ── Banner (edit mode only) ────────────────────────────────────────────────────
function Banner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}) {
  useEffect(() => {
    if (type === 'success') {
      const t = setTimeout(onDismiss, 4000)
      return () => clearTimeout(t)
    }
  }, [type, onDismiss])

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '24px',
      fontSize: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      background: type === 'success' ? '#F0FFF8' : '#FFF0EE',
      border: `1px solid ${type === 'success' ? '#A8E6C3' : '#FFCDC7'}`,
      color: type === 'success' ? '#1A6E47' : '#B83224',
    }}>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit', lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PropertyFormInitialValues {
  name?: string
  address?: string
  bedrooms?: string
  bathrooms?: string
  totalNights?: string
  propertyValue?: string
  latitude?: number | null
  longitude?: number | null
  geocodedAt?: string | null
}

interface PropertyFormProps {
  mode: 'create' | 'edit'
  primaryClientId?: string | null  // required for create
  propertyId?: string               // required for edit
  initialValues?: PropertyFormInitialValues
  onSuccess: (result?: { id: string; name: string }) => void
  onCancel?: () => void
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PropertyForm({
  mode,
  primaryClientId,
  propertyId,
  initialValues,
  onSuccess,
  onCancel,
}: PropertyFormProps) {
  const [name, setName]                   = useState(initialValues?.name ?? '')
  const [address, setAddress]             = useState(initialValues?.address ?? '')
  const [bedrooms, setBedrooms]           = useState(initialValues?.bedrooms ?? '')
  const [bathrooms, setBathrooms]         = useState(initialValues?.bathrooms ?? '')
  const [totalNights, setTotalNights]     = useState(initialValues?.totalNights ?? '365')
  const [propertyValue, setPropertyValue] = useState(initialValues?.propertyValue ?? '')

  // Edit-mode geocode display state
  const [latitude, setLatitude]     = useState<number | null>(initialValues?.latitude ?? null)
  const [longitude, setLongitude]   = useState<number | null>(initialValues?.longitude ?? null)
  const [geocodedAt, setGeocodedAt] = useState<string | null>(initialValues?.geocodedAt ?? null)

  const savedAddress = useRef(initialValues?.address ?? '')

  const [saving, setSaving]       = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [banner, setBanner]       = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  async function runGeocode(addr: string, id: string): Promise<boolean> {
    setGeocoding(true)
    const res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: id, address: addr }),
    })
    const result = await res.json()
    setGeocoding(false)

    if (!res.ok) {
      if (mode === 'edit') setBanner({ type: 'error', message: `Geocoding failed: ${result.error}` })
      return false
    }

    setLatitude(result.latitude)
    setLongitude(result.longitude)
    setGeocodedAt(new Date().toISOString())
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setBanner(null)
    setCreateError(null)

    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      bedrooms: bedrooms !== '' ? parseInt(bedrooms) : null,
      bathrooms: bathrooms !== '' ? parseFloat(bathrooms) : null,
      total_nights_available: totalNights !== '' ? parseInt(totalNights) : 365,
      property_value: propertyValue !== '' ? parseFloat(propertyValue.replace(/,/g, '')) : null,
    }

    if (mode === 'create') {
      if (!primaryClientId) {
        setCreateError('No client found for your account.')
        setSaving(false)
        return
      }

      const { data, error } = await supabase
        .from('properties')
        .insert({ ...payload, client_id: primaryClientId })
        .select('id, name')
        .single()

      setSaving(false)

      if (error) {
        setCreateError(error.message)
        return
      }

      const newProperty = data as { id: string; name: string }

      if (address.trim()) {
        await runGeocode(address.trim(), newProperty.id)
      }

      onSuccess(newProperty)
    } else {
      // Edit mode
      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', propertyId!)

      setSaving(false)

      if (error) {
        setBanner({ type: 'error', message: `Save failed: ${error.message}` })
        return
      }

      const addressChanged = address.trim() !== savedAddress.current
      if (addressChanged && address.trim()) {
        savedAddress.current = address.trim()
        const ok = await runGeocode(address.trim(), propertyId!)
        setBanner({
          type: 'success',
          message: ok
            ? 'Property saved and geocoded successfully.'
            : 'Property saved. Geocoding failed — try Re-geocode.',
        })
      } else {
        savedAddress.current = address.trim()
        setBanner({ type: 'success', message: 'Property saved successfully.' })
      }

      onSuccess({ id: propertyId!, name: name.trim() })
    }
  }

  const busy = saving || geocoding

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: 'Raleway, sans-serif' }}>
      {/* Banner (edit mode only) */}
      {mode === 'edit' && banner && (
        <Banner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />
      )}

      {/* ── Basic Info ─────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Basic Info</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Property Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Address</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. 123 Beach Road, Siesta Key, FL"
            style={inputStyle}
          />
        </div>
      </div>

      {/* ── Unit Details ───────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Unit Details</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Bedrooms</label>
            <input
              type="number" min="0" step="1"
              value={bedrooms}
              onChange={e => setBedrooms(e.target.value)}
              placeholder="e.g. 3"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Bathrooms</label>
            <input
              type="number" min="0" step="0.5"
              value={bathrooms}
              onChange={e => setBathrooms(e.target.value)}
              placeholder="e.g. 2.5"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nights Available / Year</label>
            <input
              type="number" min="1" max="366" step="1"
              value={totalNights}
              onChange={e => setTotalNights(e.target.value)}
              placeholder="e.g. 365"
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Used in occupancy calculations. Default 365.</p>
          </div>
          <div>
            <label style={labelStyle}>Property Value</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '14px' }}>$</span>
              <input
                type="number" min="0" step="1000"
                value={propertyValue}
                onChange={e => setPropertyValue(e.target.value)}
                placeholder="e.g. 450000"
                style={{ ...inputStyle, paddingLeft: '24px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Location (edit mode only) ───────────────────────────────────────── */}
      {mode === 'edit' && (
        <div style={{ ...cardStyle, marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={sectionHeadingStyle}>Location</h2>
            {address.trim() && (
              <button
                type="button"
                onClick={() => runGeocode(address.trim(), propertyId!)}
                disabled={geocoding}
                style={{
                  padding: '7px 16px',
                  background: 'none',
                  border: '1px solid #0D2C54',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0D2C54',
                  fontFamily: 'Raleway, sans-serif',
                  cursor: geocoding ? 'not-allowed' : 'pointer',
                  opacity: geocoding ? 0.5 : 1,
                }}
              >
                {geocoding ? 'Geocoding…' : '↻ Re-geocode'}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Latitude</label>
              <input
                type="text"
                value={latitude != null ? String(latitude) : ''}
                readOnly
                placeholder="Not geocoded yet"
                style={readonlyStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Longitude</label>
              <input
                type="text"
                value={longitude != null ? String(longitude) : ''}
                readOnly
                placeholder="Not geocoded yet"
                style={readonlyStyle}
              />
            </div>
          </div>

          {geocodedAt ? (
            <p style={{ fontSize: '12px', color: '#4CAF82', marginTop: '10px', fontWeight: '600' }}>
              📍 Geocoded {new Date(geocodedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          ) : address.trim() ? (
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '10px' }}>
              Address not yet geocoded. Save or click Re-geocode to set coordinates.
            </p>
          ) : null}
        </div>
      )}

      {/* ── Create mode feedback ────────────────────────────────────────────── */}
      {mode === 'create' && createError && (
        <div style={{
          background: '#FFF0EE',
          border: '1px solid #FFCDC7',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#B83224',
        }}>
          {createError}
        </div>
      )}
      {mode === 'create' && geocoding && (
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
          📍 Geocoding address…
        </p>
      )}

      {/* ── Submit row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '12px 32px',
            background: busy ? '#faa99f' : '#FF7767',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '700',
            fontFamily: 'Raleway, sans-serif',
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          {saving ? 'Saving…' : geocoding ? 'Geocoding…' : mode === 'create' ? 'Create Property' : 'Save Changes'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: '14px',
              color: '#888',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Raleway, sans-serif',
              padding: 0,
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
