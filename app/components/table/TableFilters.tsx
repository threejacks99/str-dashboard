'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const NAVY  = '#0D2C54'
const CORAL = '#FF7767'

/* ------------------------------------------------------------------ */
/* Value types                                                         */
/* ------------------------------------------------------------------ */

export interface NumericRange {
  min: string
  max: string
}

export interface DateRange {
  /** ISO yyyy-mm-dd */
  from: string
  /** ISO yyyy-mm-dd */
  to: string
}

export const emptyNumericRange: NumericRange = { min: '', max: '' }
export const emptyDateRange: DateRange = { from: '', to: '' }

/* ------------------------------------------------------------------ */
/* Pure match helpers                                                  */
/* ------------------------------------------------------------------ */

/** Case-insensitive, trimmed "contains" match. Empty filter matches everything. */
export function matchText(value: string | null | undefined, filter: string): boolean {
  const f = filter.trim().toLowerCase()
  if (!f) return true
  if (value == null) return false
  return value.toLowerCase().includes(f)
}

/** Inclusive numeric range; either bound optional. Empty range matches everything. */
export function matchNumericRange(value: number | null | undefined, range: NumericRange): boolean {
  const minStr = range.min.trim()
  const maxStr = range.max.trim()
  const min = minStr === '' ? null : Number(minStr)
  const max = maxStr === '' ? null : Number(maxStr)
  if (min === null && max === null) return true
  if (value == null || Number.isNaN(value)) return false
  if (min !== null && !Number.isNaN(min) && value < min) return false
  if (max !== null && !Number.isNaN(max) && value > max) return false
  return true
}

/** Inclusive date range over ISO yyyy-mm-dd strings; either bound optional. */
export function matchDateRange(value: string | null | undefined, range: DateRange): boolean {
  const from = range.from.trim()
  const to = range.to.trim()
  if (!from && !to) return true
  if (!value) return false
  const v = value.slice(0, 10)
  if (from && v < from) return false
  if (to && v > to) return false
  return true
}

/** Membership match against selected options. Empty selection matches everything. */
export function matchMultiSelect(
  value: string | null | undefined,
  selected: string[],
  opts?: { caseInsensitive?: boolean },
): boolean {
  if (selected.length === 0) return true
  if (value == null) return false
  if (opts?.caseInsensitive) {
    const v = value.toLowerCase()
    return selected.some(s => s.toLowerCase() === v)
  }
  return selected.includes(value)
}

/**
 * Deduped values pulled via `accessor`, preserving first-seen casing.
 * When `caseInsensitive` is set, values differing only by case collapse to one.
 * Null/empty values are skipped.
 */
export function distinctValues<T>(
  rows: T[],
  accessor: (row: T) => string | null | undefined,
  opts?: { caseInsensitive?: boolean },
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows) {
    const raw = accessor(row)
    if (raw == null || raw === '') continue
    const key = opts?.caseInsensitive ? raw.toLowerCase() : raw
    if (seen.has(key)) continue
    seen.add(key)
    out.push(raw)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Shared styling                                                      */
/* ------------------------------------------------------------------ */

const cellInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '4px 6px',
  fontSize: '12px',
  fontFamily: 'Raleway, sans-serif',
  color: NAVY,
  border: '1px solid #d8dee6',
  borderRadius: '4px',
  background: '#fff',
  outline: 'none',
}

/* ------------------------------------------------------------------ */
/* TextFilter                                                          */
/* ------------------------------------------------------------------ */

export function TextFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? 'Filter…'}
      style={cellInputStyle}
    />
  )
}

/* ------------------------------------------------------------------ */
/* NumericRangeFilter                                                  */
/* ------------------------------------------------------------------ */

export function NumericRangeFilter({
  value,
  onChange,
}: {
  value: NumericRange
  onChange: (v: NumericRange) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <input
        type="number"
        value={value.min}
        placeholder="min"
        onChange={e => onChange({ ...value, min: e.target.value })}
        style={{ ...cellInputStyle, flex: 1 }}
      />
      <input
        type="number"
        value={value.max}
        placeholder="max"
        onChange={e => onChange({ ...value, max: e.target.value })}
        style={{ ...cellInputStyle, flex: 1 }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* DateRangeFilter                                                     */
/* ------------------------------------------------------------------ */

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (v: DateRange) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <input
        type="date"
        value={value.from}
        onChange={e => onChange({ ...value, from: e.target.value })}
        style={cellInputStyle}
        aria-label="From"
      />
      <input
        type="date"
        value={value.to}
        onChange={e => onChange({ ...value, to: e.target.value })}
        style={cellInputStyle}
        aria-label="To"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* MultiSelectFilter                                                   */
/* ------------------------------------------------------------------ */

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  renderLabel,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  /** Render an option's visible label; matching still happens on the raw value. */
  renderLabel?: (option: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggleOpen() {
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
    setOpen(o => !o)
  }

  function toggleOption(opt: string) {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt))
    else onChange([...selected, opt])
  }

  const count = selected.length

  const triggerStyle: React.CSSProperties = {
    ...cellInputStyle,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    color: count > 0 ? NAVY : '#888',
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={toggleOpen} style={triggerStyle}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {count > 0 && (
          <span
            style={{
              background: CORAL,
              color: '#fff',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 700,
              lineHeight: 1,
              padding: '2px 5px',
            }}
          >
            {count}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#aaa' }}>▾</span>
      </button>
      {open && rect && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left,
              minWidth: Math.max(rect.width, 150),
              maxHeight: 260,
              overflowY: 'auto',
              background: '#fff',
              border: '1px solid #d8dee6',
              borderRadius: '6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 9999,
              padding: '4px',
              fontFamily: 'Raleway, sans-serif',
            }}
          >
            {options.length === 0 && (
              <div style={{ padding: '6px 8px', fontSize: '12px', color: '#aaa' }}>
                No options
              </div>
            )}
            {options.map(opt => {
              const checked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: checked ? '#FFF5F4' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(opt)}
                    style={{ margin: 0, accentColor: CORAL }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      color: NAVY,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {renderLabel ? renderLabel(opt) : opt}
                  </span>
                </label>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
