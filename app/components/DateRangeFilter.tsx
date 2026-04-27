'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Presets ───────────────────────────────────────────────────────────────────
export const PRESETS = [
  { id: 'last_30_days',   label: 'Last 30 days' },
  { id: 'last_90_days',   label: 'Last 90 days' },
  { id: 'last_6_months',  label: 'Last 6 months' },
  { id: 'last_12_months', label: 'Last 12 months' },
  { id: 'year_to_date',   label: 'Year to date' },
  { id: 'last_year',      label: 'Last year' },
  { id: 'all_time',       label: 'All time' },
] as const

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DateRangeFilter() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const dropRef     = useRef<HTMLDivElement>(null)

  const [open, setOpen]           = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [inputFrom, setInputFrom] = useState('')
  const [inputTo, setInputTo]     = useState('')

  const urlPreset = searchParams.get('preset') ?? 'last_12_months'
  const urlFrom   = searchParams.get('from') ?? ''
  const urlTo     = searchParams.get('to') ?? ''

  // Close on outside click or Escape
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCustomMode(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setCustomMode(false) }
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  function applyPreset(id: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('preset', id)
    p.delete('from')
    p.delete('to')
    router.push(`/?${p.toString()}`)
    setOpen(false)
    setCustomMode(false)
  }

  function openCustomMode() {
    setCustomMode(true)
    setInputFrom(urlPreset === 'custom' ? urlFrom : '')
    setInputTo(urlPreset === 'custom' ? urlTo : '')
  }

  function applyCustom() {
    if (!inputFrom || !inputTo) return
    const p = new URLSearchParams(searchParams.toString())
    p.set('preset', 'custom')
    p.set('from', inputFrom)
    p.set('to', inputTo)
    router.push(`/?${p.toString()}`)
    setOpen(false)
    setCustomMode(false)
  }

  // Button label
  const buttonLabel =
    urlPreset === 'custom' && urlFrom && urlTo
      ? `${formatDateLabel(urlFrom)} – ${formatDateLabel(urlTo)}`
      : (PRESETS.find(p => p.id === urlPreset)?.label ?? 'Last 12 months')

  const isActive = open

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); if (open) setCustomMode(false) }}
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
        <span style={{ fontSize: '14px', lineHeight: 1 }}>📅</span>
        <span>{buttonLabel}</span>
        <span style={{ fontSize: '10px', color: isActive ? '#FF7767' : '#aaa', marginTop: '1px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
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
          {/* Preset list */}
          {!customMode && (
            <>
              {PRESETS.map(preset => {
                const isSelected = urlPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      background: isSelected ? '#FFF5F4' : 'none',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: isSelected ? '700' : '400',
                      color: isSelected ? '#FF7767' : '#0D2C54',
                      fontFamily: 'Raleway, sans-serif',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#F9FAFB'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isSelected ? '#FFF5F4' : 'none'
                    }}
                  >
                    {isSelected && <span style={{ marginRight: '8px' }}>✓</span>}
                    {!isSelected && <span style={{ marginRight: '8px', opacity: 0 }}>✓</span>}
                    {preset.label}
                  </button>
                )
              })}

              {/* Divider + Custom option */}
              <div style={{ height: '1px', background: '#f0f0f0', margin: '4px 0' }} />
              <button
                onClick={openCustomMode}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  background: urlPreset === 'custom' ? '#FFF5F4' : 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: urlPreset === 'custom' ? '700' : '400',
                  color: urlPreset === 'custom' ? '#FF7767' : '#0D2C54',
                  fontFamily: 'Raleway, sans-serif',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => {
                  if (urlPreset !== 'custom') e.currentTarget.style.background = '#F9FAFB'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = urlPreset === 'custom' ? '#FFF5F4' : 'none'
                }}
              >
                {urlPreset === 'custom' && <span style={{ marginRight: '8px' }}>✓</span>}
                {urlPreset !== 'custom' && <span style={{ marginRight: '8px', opacity: 0 }}>✓</span>}
                Custom range…
              </button>
            </>
          )}

          {/* Custom date picker */}
          {customMode && (
            <div style={{ padding: '16px' }}>
              <button
                onClick={() => setCustomMode(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: '#888', marginBottom: '12px',
                  fontFamily: 'Raleway, sans-serif', padding: 0,
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                ← Back
              </button>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                  From
                </label>
                <input
                  type="date"
                  value={inputFrom}
                  onChange={e => setInputFrom(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                    borderRadius: '7px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
                    color: '#0D2C54', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                  To
                </label>
                <input
                  type="date"
                  value={inputTo}
                  min={inputFrom || undefined}
                  onChange={e => setInputTo(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                    borderRadius: '7px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
                    color: '#0D2C54', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={applyCustom}
                disabled={!inputFrom || !inputTo}
                style={{
                  width: '100%', padding: '9px', background: (!inputFrom || !inputTo) ? '#faa99f' : '#FF7767',
                  color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px',
                  fontWeight: '700', fontFamily: 'Raleway, sans-serif',
                  cursor: (!inputFrom || !inputTo) ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
