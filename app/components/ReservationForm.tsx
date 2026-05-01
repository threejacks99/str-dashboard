'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { sanitizeString } from '../../lib/csvMapper'
import { useBillingStatus } from '../../lib/useBillingStatus'
import BillingLockScreen from './BillingLockScreen'

interface Property { id: string; name: string }

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: '#888',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
  borderRadius: '8px', fontSize: '14px', fontFamily: 'Raleway, sans-serif',
  color: '#0D2C54', background: '#fff', boxSizing: 'border-box', outline: 'none',
}

const readonlyStyle: React.CSSProperties = {
  ...inputStyle, background: '#F5F7FA', color: '#888', cursor: 'default',
}

const errorStyle: React.CSSProperties = {
  fontSize: '12px', color: '#B83224', marginTop: '4px',
}

const hintStyle: React.CSSProperties = {
  fontSize: '11px', color: '#aaa', marginTop: '4px',
}

const rowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px',
}

function parseCurrency(s: string): number {
  if (!s.trim()) return 0
  return parseFloat(s.replace(/[$,\s]/g, '')) || 0
}

// Accepts "20%" → percentage of grossRent, or "$300" / "300" → fixed dollar amount
function parseMgmtFee(input: string, grossRent: number): number {
  const trimmed = input.trim()
  if (trimmed.endsWith('%')) {
    const pct = parseFloat(trimmed.slice(0, -1))
    if (isNaN(pct)) return 0
    return Math.round(grossRent * (pct / 100) * 100) / 100
  }
  return parseFloat(trimmed.replace(/[$,\s]/g, '')) || 0
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const diff = (new Date(checkOut + 'T00:00:00').getTime() - new Date(checkIn + 'T00:00:00').getTime()) / 86400000
  return Math.max(0, Math.round(diff))
}

function Req() {
  return <span style={{ color: '#FF7767' }}>*</span>
}

export default function ReservationForm({ onSuccess, onCancel }: Props) {
  const { isLocked } = useBillingStatus()
  const [properties, setProperties] = useState<Property[]>([])
  const [propsLoading, setPropsLoading] = useState(true)

  const [propertyId, setPropertyId] = useState('')
  const [reservationRef, setReservationRef] = useState('')
  const [guestName, setGuestName] = useState('')
  const [bookingSource, setBookingSource] = useState('Airbnb')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adultGuests, setAdultGuests] = useState('1')
  const [childGuests, setChildGuests] = useState('0')
  const [grossRent, setGrossRent] = useState('')
  const [mgmtFee, setMgmtFee] = useState('')
  const [ownerPayout, setOwnerPayout] = useState('')
  const [payoutEdited, setPayoutEdited] = useState(false)
  const [bookingCreatedAt, setBookingCreatedAt] = useState(today())
  const [status, setStatus] = useState('Confirmed')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('properties').select('id, name').order('name').then(({ data, error }) => {
      if (error) console.error('Failed to load properties:', error)
      const props = data ?? []
      setProperties(props)
      if (props.length === 1) setPropertyId(props[0].id)
      setPropsLoading(false)
    })
  }, [])

  const nights = calcNights(checkIn, checkOut)
  const grossRentNum = parseCurrency(grossRent)
  const resolvedMgmtFee = parseMgmtFee(mgmtFee, grossRentNum)
  const isMgmtPct = mgmtFee.trim().endsWith('%')

  // Auto-calculate owner payout unless user has manually overridden it
  useEffect(() => {
    if (payoutEdited) return
    if (grossRentNum > 0) {
      setOwnerPayout(String((grossRentNum - resolvedMgmtFee).toFixed(2)))
    } else {
      setOwnerPayout('')
    }
  }, [grossRent, mgmtFee, payoutEdited]) // eslint-disable-line react-hooks/exhaustive-deps

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!propertyId) errs.propertyId = 'Please select a property'
    if (!checkIn) errs.checkIn = 'Check-in date is required'
    if (!checkOut) errs.checkOut = 'Check-out date is required'
    if (checkIn && checkOut && checkOut <= checkIn) errs.checkOut = 'Check-out must be after check-in'
    if (!grossRent || grossRentNum <= 0) errs.grossRent = 'Gross rent must be greater than 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSaveError(null)

    const payload = {
      property_id: propertyId,
      reservation_ref: sanitizeString(reservationRef),
      guest_name: sanitizeString(guestName),
      booking_source: sanitizeString(bookingSource) ?? bookingSource,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      adult_guests: parseInt(adultGuests) || 1,
      child_guests: parseInt(childGuests) || 0,
      gross_rent: grossRentNum,
      mgmt_fee: resolvedMgmtFee,
      owner_payout: parseCurrency(ownerPayout),
      booking_created_at: bookingCreatedAt ? `${bookingCreatedAt}T00:00:00.000Z` : null,
      status: sanitizeString(status) ?? status,
    }

    console.log('[ReservationForm] Inserting:', payload)
    const { data, error } = await supabase.from('reservations').insert(payload).select()
    setSaving(false)

    if (error) {
      console.error('[ReservationForm] Insert error:', error)
      setSaveError(error.message)
      return
    }

    console.log('[ReservationForm] Inserted successfully:', data)
    setSaved(true)
    setTimeout(() => onSuccess(), 1500)
  }

  if (propsLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '14px' }}>Loading…</div>
  }

  if (isLocked) return <BillingLockScreen />

  if (properties.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
          You need at least one property before adding a reservation.
        </p>
        <a href="/properties" style={{
          display: 'inline-block', background: '#FF7767', color: '#fff',
          padding: '10px 24px', borderRadius: '8px', fontWeight: '700',
          fontSize: '14px', textDecoration: 'none',
        }}>Go to Properties</a>
      </div>
    )
  }

  if (saved) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
        <p style={{ fontSize: '18px', fontWeight: '700', color: '#1A6E47', margin: 0 }}>Reservation saved!</p>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
          It will appear on the Bookings page within the active date range.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: 'Raleway, sans-serif' }}>
      {saveError && (
        <div style={{
          background: '#FFF0EE', border: '1px solid #FFCDC7', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#B83224',
          lineHeight: '1.5',
        }}>
          <strong>Save failed:</strong> {saveError}
        </div>
      )}

      {/* Property */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Property <Req /></label>
        {properties.length === 1 ? (
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0D2C54', padding: '10px 0' }}>
            {properties[0].name}
          </div>
        ) : (
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle}>
            <option value="">Select a property…</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {errors.propertyId && <div style={errorStyle}>{errors.propertyId}</div>}
      </div>

      {/* Ref + Guest */}
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Confirmation #</label>
          <input type="text" value={reservationRef} onChange={e => setReservationRef(e.target.value)}
            placeholder="e.g. HMKQC9JT3B" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Guest Name</label>
          <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
            placeholder="e.g. Jane Smith" style={inputStyle} />
        </div>
      </div>

      {/* Source + Status */}
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Booking Source <Req /></label>
          <select value={bookingSource} onChange={e => setBookingSource(e.target.value)} style={inputStyle}>
            <option>Airbnb</option>
            <option>VRBO</option>
            <option>Direct</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
            <option>Confirmed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Check-in <Req /></label>
          <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inputStyle} />
          {errors.checkIn && <div style={errorStyle}>{errors.checkIn}</div>}
        </div>
        <div>
          <label style={labelStyle}>Check-out <Req /></label>
          <input type="date" value={checkOut}
            min={checkIn || undefined}
            onChange={e => setCheckOut(e.target.value)} style={inputStyle} />
          {errors.checkOut && <div style={errorStyle}>{errors.checkOut}</div>}
        </div>
      </div>

      {/* Nights + Guests */}
      <div style={{ ...rowStyle, gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div>
          <label style={labelStyle}>Nights</label>
          <input type="text" value={nights > 0 ? String(nights) : ''} readOnly
            placeholder="Auto" style={readonlyStyle} tabIndex={-1} />
        </div>
        <div>
          <label style={labelStyle}>Adults</label>
          <input type="number" min="0" value={adultGuests}
            onChange={e => setAdultGuests(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Children</label>
          <input type="number" min="0" value={childGuests}
            onChange={e => setChildGuests(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Gross Rent + Management Fee */}
      <div style={rowStyle}>
        <div>
          <label style={labelStyle}>Gross Rent <Req /></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>$</span>
            <input type="text" value={grossRent}
              onChange={e => setGrossRent(e.target.value)}
              placeholder="0.00" style={{ ...inputStyle, paddingLeft: '24px' }} />
          </div>
          {errors.grossRent && <div style={errorStyle}>{errors.grossRent}</div>}
        </div>
        <div>
          <label style={labelStyle}>Management Fee</label>
          <input
            type="text"
            value={mgmtFee}
            onChange={e => setMgmtFee(e.target.value)}
            placeholder="e.g. 20% or $300"
            style={inputStyle}
          />
          {isMgmtPct && grossRentNum > 0 && (
            <div style={{ ...hintStyle, color: '#4CAF82' }}>
              = ${resolvedMgmtFee.toFixed(2)} on ${grossRentNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gross rent
            </div>
          )}
          <div style={hintStyle}>Enter as percentage (e.g. 20%) or dollar amount (e.g. $300)</div>
        </div>
      </div>

      {/* Owner Payout */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Owner Payout</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>$</span>
          <input type="text" value={ownerPayout}
            onChange={e => { setPayoutEdited(true); setOwnerPayout(e.target.value) }}
            placeholder="Auto-calculated" style={{ ...inputStyle, paddingLeft: '24px' }} />
        </div>
        <div style={hintStyle}>
          Auto-calculated as gross rent minus management fee. Edit to override.
        </div>
      </div>

      {/* Booking Created Date */}
      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>Booking Created Date</label>
        <input type="date" value={bookingCreatedAt}
          onChange={e => setBookingCreatedAt(e.target.value)} style={inputStyle} />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? '#faa99f' : '#FF7767', color: '#fff', border: 'none',
            padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '700',
            fontFamily: 'Raleway, sans-serif', cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          {saving ? 'Saving…' : 'Save Reservation'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: '8px',
            padding: '12px 20px', fontSize: '14px', color: '#666',
            fontFamily: 'Raleway, sans-serif', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
