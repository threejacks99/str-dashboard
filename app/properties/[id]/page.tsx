'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import PropertyForm, { PropertyFormInitialValues } from '../../components/PropertyForm'

export default function EditPropertyPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [propertyName, setPropertyName] = useState('')
  const [initialValues, setInitialValues] = useState<PropertyFormInitialValues | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, bedrooms, bathrooms, total_nights_available, property_value, latitude, longitude, geocoded_at')
        .eq('id', id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      setPropertyName(data.name)
      setInitialValues({
        name: data.name,
        address: data.address ?? '',
        bedrooms: data.bedrooms != null ? String(data.bedrooms) : '',
        bathrooms: data.bathrooms != null ? String(data.bathrooms) : '',
        totalNights: data.total_nights_available != null ? String(data.total_nights_available) : '365',
        propertyValue: data.property_value != null ? String(data.property_value) : '',
        latitude: data.latitude,
        longitude: data.longitude,
        geocodedAt: data.geocoded_at,
      })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
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

  if (notFound) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif', textAlign: 'center', marginTop: '80px' }}>
        <p style={{ fontSize: '16px', color: '#888', marginBottom: '20px' }}>Property not found or access denied.</p>
        <Link href="/properties" style={{ color: '#FF7767', fontWeight: '600', textDecoration: 'none' }}>← Back to Properties</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif', maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link
          href="/properties"
          style={{ fontSize: '13px', color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}
        >
          ← Properties
        </Link>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          {propertyName || 'Edit Property'}
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>Update property details and geocode location.</p>
      </div>

      {initialValues && (
        <PropertyForm
          mode="edit"
          propertyId={id}
          initialValues={initialValues}
          onSuccess={(result) => { if (result?.name) setPropertyName(result.name) }}
          onCancel={() => router.push('/properties')}
        />
      )}
    </div>
  )
}
