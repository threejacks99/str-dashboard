'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

interface Property {
  id: string
  name: string
}

const ANALYTICS_PATHS = ['/', '/financials', '/bookings']

export default function PropertySelector() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const dropRef      = useRef<HTMLDivElement>(null)

  const [properties, setProperties] = useState<Property[]>([])
  const [ready, setReady]           = useState(false)
  const [open, setOpen]             = useState(false)

  useEffect(() => {
    supabase
      .from('properties')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setProperties(data ?? [])
        setReady(true)
      })
  }, [])

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  if (!ANALYTICS_PATHS.includes(pathname)) return null
  if (!ready || properties.length === 0) return null

  const currentParam = searchParams.get('property')

  function select(value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      p.delete('property')
    } else {
      p.set('property', value)
    }
    router.push(`${pathname}?${p.toString()}`)
    setOpen(false)
  }

  // Single property — non-interactive label
  if (properties.length === 1) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '8px 14px',
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#0D2C54',
        fontFamily: 'Raleway, sans-serif',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '14px', lineHeight: 1 }}>🏠</span>
        <span>{properties[0].name}</span>
      </div>
    )
  }

  // Multi-property dropdown
  const effectiveParam      = currentParam && properties.some(p => p.id === currentParam) ? currentParam : 'all'
  const selectedProperty    = properties.find(p => p.id === effectiveParam)
  const buttonLabel         = selectedProperty
    ? selectedProperty.name
    : `All Properties (${properties.length})`
  const isActive = open

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          background: isActive ? '#FFF5F4' : '#fff',
          border: `1px solid ${isActive ? '#FF7767' : '#ddd'}`,
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          color: isActive ? '#FF7767' : '#0D2C54',
          fontFamily: 'Raleway, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '14px', lineHeight: 1 }}>🏠</span>
        <span>{buttonLabel}</span>
        <span style={{ fontSize: '10px', color: isActive ? '#FF7767' : '#aaa', marginTop: '1px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: '10px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
          minWidth: '210px',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* All Properties */}
          {(() => {
            const sel = effectiveParam === 'all'
            return (
              <button
                onClick={() => select('all')}
                style={{
                  display: 'block', width: '100%', padding: '10px 16px',
                  background: sel ? '#FFF5F4' : 'none', border: 'none', textAlign: 'left',
                  fontSize: '14px', fontWeight: sel ? '700' : '400',
                  color: sel ? '#FF7767' : '#0D2C54',
                  fontFamily: 'Raleway, sans-serif', cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? '#FFF5F4' : 'none' }}
              >
                <span style={{ marginRight: '8px', opacity: sel ? 1 : 0 }}>✓</span>
                All Properties ({properties.length})
              </button>
            )
          })()}

          <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />

          {properties.map(prop => {
            const sel = effectiveParam === prop.id
            return (
              <button
                key={prop.id}
                onClick={() => select(prop.id)}
                style={{
                  display: 'block', width: '100%', padding: '10px 16px',
                  background: sel ? '#FFF5F4' : 'none', border: 'none', textAlign: 'left',
                  fontSize: '14px', fontWeight: sel ? '700' : '400',
                  color: sel ? '#FF7767' : '#0D2C54',
                  fontFamily: 'Raleway, sans-serif', cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? '#FFF5F4' : 'none' }}
              >
                <span style={{ marginRight: '8px', opacity: sel ? 1 : 0 }}>✓</span>
                {prop.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
