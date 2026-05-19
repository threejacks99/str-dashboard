'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { useBillingStatus } from '../../../lib/useBillingStatus'
import { isAccountLocked } from '../../../lib/billing'
import ReservationForm, { ReservationFormInitialValues } from '../../components/ReservationForm'
import BillingLockScreen from '../../components/BillingLockScreen'

export default function EditReservationPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { status, loading: billingLoading } = useBillingStatus()

  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [initialValues, setInitialValues] = useState<ReservationFormInitialValues | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, property_id, reservation_ref, guest_name, booking_source, check_in, check_out, adult_guests, child_guests, gross_rent, mgmt_fee, owner_payout, booking_created_at, status')
        .eq('id', id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      setInitialValues({
        propertyId: data.property_id ?? '',
        reservationRef: data.reservation_ref ?? '',
        guestName: data.guest_name ?? '',
        bookingSource: data.booking_source ?? 'Airbnb',
        checkIn: data.check_in ?? '',
        checkOut: data.check_out ?? '',
        adultGuests: data.adult_guests != null ? String(data.adult_guests) : '1',
        childGuests: data.child_guests != null ? String(data.child_guests) : '0',
        grossRent: data.gross_rent != null ? String(data.gross_rent) : '',
        mgmtFee: data.mgmt_fee != null ? String(data.mgmt_fee) : '',
        ownerPayout: data.owner_payout != null ? String(data.owner_payout) : '',
        bookingCreatedAt: data.booking_created_at ? data.booking_created_at.slice(0, 10) : '',
        status: data.status ?? 'Confirmed',
      })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading || billingLoading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif' }}>
        <div style={{ width: '240px', height: '28px', background: '#e8eaed', borderRadius: '8px', marginBottom: '32px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '64px', background: '#e8eaed', borderRadius: '8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  if (isAccountLocked(status)) return <BillingLockScreen />

  if (notFound) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif', textAlign: 'center', marginTop: '80px' }}>
        <p style={{ fontSize: '16px', color: '#888', marginBottom: '20px' }}>Reservation not found or access denied.</p>
        <Link href="/bookings" style={{ color: '#FF7767', fontWeight: '600', textDecoration: 'none' }}>← Back to Bookings</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif', maxWidth: '680px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link
          href="/bookings"
          style={{ fontSize: '13px', color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}
        >
          ← Bookings
        </Link>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Edit reservation
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>Update reservation details.</p>
      </div>

      {initialValues && (
        <ReservationForm
          mode="edit"
          reservationId={id}
          initialValues={initialValues}
          onSuccess={() => { router.push('/bookings') }}
          onCancel={() => router.push('/bookings')}
        />
      )}
    </div>
  )
}
