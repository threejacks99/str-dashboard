'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { sanitizeString } from '../../lib/csvMapper'
import { useBillingStatus } from '../../lib/useBillingStatus'
import BillingLockScreen from './BillingLockScreen'
import Modal from './Modal'

interface Property { id: string; name: string }

export interface ReservationFormInitialValues {
  propertyId?: string
  reservationRef?: string
  guestName?: string
  bookingSource?: string
  checkIn?: string
  checkOut?: string
  adultGuests?: string
  childGuests?: string
  grossRent?: string
  mgmtFee?: string
  ownerPayout?: string
  bookingCreatedAt?: string
  status?: string
}

interface Props {
  mode?: 'create' | 'edit'
  reservationId?: string  // required for edit
  initialValues?: ReservationFormInitialValues
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

// Banner for edit-mode save success/error (mirrors PropertyForm).
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
      marginBottom: '20px',
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

export default function ReservationForm({
  mode = 'create',
  reservationId,
  initialValues,
  onSuccess,
  onCancel,
}: Props) {
  const { isLocked } = useBillingStatus()
  const [properties, setProperties] = useState<Property[]>([])
  const [propsLoading, setPropsLoading] = useState(true)

  const [propertyId, setPropertyId]             = useState(initialValues?.propertyId ?? '')
  const [reservationRef, setReservationRef]     = useState(initialValues?.reservationRef ?? '')
  const [guestName, setGuestName]               = useState(initialValues?.guestName ?? '')
  const [bookingSource, setBookingSource]       = useState(initialValues?.bookingSource ?? 'Airbnb')
  const [checkIn, setCheckIn]                   = useState(initialValues?.checkIn ?? '')
  const [checkOut, setCheckOut]                 = useState(initialValues?.checkOut ?? '')
  const [adultGuests, setAdultGuests]           = useState(initialValues?.adultGuests ?? '1')
  const [childGuests, setChildGuests]           = useState(initialValues?.childGuests ?? '0')
  const [grossRent, setGrossRent]               = useState(initialValues?.grossRent ?? '')
  const [mgmtFee, setMgmtFee]                   = useState(initialValues?.mgmtFee ?? '')
  const [ownerPayout, setOwnerPayout]           = useState(initialValues?.ownerPayout ?? '')
  // In edit mode, treat the loaded payout as user-edited so the auto-calc
  // effect doesn't clobber it on first render.
  const [payoutEdited, setPayoutEdited]         = useState(mode === 'edit')
  const [bookingCreatedAt, setBookingCreatedAt] = useState(initialValues?.bookingCreatedAt ?? today())
  const [status, setStatus]                     = useState(initialValues?.status ?? 'Confirmed')

  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [banner, setBanner]       = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const router = useRouter()

  useEffect(() => {
    // In edit mode, don't filter out soft-deleted properties — the existing
    // reservation may already point to one, and the dropdown needs to render
    // it as the current selection.
    const q = mode === 'edit'
      ? supabase.from('properties').select('id, name').order('name')
      : supabase.from('properties').select('id, name').is('deleted_at', null).order('name')
    q.then(({ data, error }) => {
      if (error) console.error('Failed to load properties:', error)
      const props = data ?? []
      setProperties(props)
      if (mode === 'create' && props.length === 1) setPropertyId(props[0].id)
      setPropsLoading(false)
    })
  }, [mode])

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
    setBanner(null)

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

    if (mode === 'edit') {
      const { error } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', reservationId!)
      setSaving(false)
      if (error) {
        setBanner({ type: 'error', message: `Save failed: ${error.message}` })
        return
      }
      // No success banner — onSuccess navigates immediately, so the banner
      // would flash for a fraction of a second and read as a UI bug.
      onSuccess()
      return
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

  function openDeleteConfirm() {
    setDeleteConfirm(true)
  }

  async function handleConfirmDelete() {
    if (!reservationId) return
    setDeleting(true)

    let res: Response
    try {
      res = await fetch(`/api/reservations/${reservationId}`, { method: 'DELETE' })
    } catch (err: any) {
      setDeleting(false)
      setBanner({ type: 'error', message: err?.message ?? 'Network error. Please try again.' })
      setDeleteConfirm(false)
      return
    }

    const result = await res.json().catch(() => ({}))
    setDeleting(false)

    if (!res.ok) {
      setBanner({ type: 'error', message: result?.error ?? `Delete failed (${res.status})` })
      setDeleteConfirm(false)
      return
    }

    setDeleteConfirm(false)
    router.push('/bookings')
    router.refresh()
  }

  if (propsLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '14px' }}>Loading…</div>
  }

  if (isLocked) return <BillingLockScreen />

  if (mode === 'create' && properties.length === 0) {
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

  if (mode === 'create' && saved) {
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
    <>
    <form onSubmit={handleSubmit} style={{ fontFamily: 'Raleway, sans-serif' }}>
      {mode === 'edit' && banner && (
        <Banner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />
      )}

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
        {mode === 'create' && properties.length === 1 ? (
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
          {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save Reservation'}
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
        {mode === 'edit' && (
          <button
            type="button"
            onClick={openDeleteConfirm}
            disabled={saving || deleting}
            style={{
              marginLeft: 'auto',
              padding: '10px 18px',
              background: 'none',
              border: '1px solid #DC2626',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#DC2626',
              fontFamily: 'Raleway, sans-serif',
              cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
              opacity: (saving || deleting) ? 0.5 : 1,
            }}
          >
            Delete reservation
          </button>
        )}
      </div>
    </form>

    {deleteConfirm && (
      <Modal
        isOpen={true}
        onClose={() => setDeleteConfirm(false)}
        title="Delete this reservation?"
      >
        <p style={{ fontSize: '14px', color: '#0D2C54', lineHeight: 1.5, marginTop: 0 }}>
          This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setDeleteConfirm(false)}
            disabled={deleting}
            style={{
              fontSize: '14px',
              color: '#888',
              background: 'none',
              border: 'none',
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontFamily: 'Raleway, sans-serif',
              padding: 0,
              opacity: deleting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            style={{
              padding: '12px 32px',
              background: deleting ? '#fca5a5' : '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'Raleway, sans-serif',
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    )}
    </>
  )
}
