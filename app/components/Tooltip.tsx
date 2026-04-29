'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { MetricDefinition } from '../../lib/metricDefinitions'

interface Props {
  content: MetricDefinition | React.ReactNode
  children?: React.ReactNode
}

function isMetricDef(v: unknown): v is MetricDefinition {
  return typeof v === 'object' && v !== null && 'term' in v && 'definition' in v
}

function MetricBody({ def }: { def: MetricDefinition }) {
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0D2C54', lineHeight: 1.3 }}>
        {def.term}
      </div>
      <div style={{ color: '#444', marginBottom: def.formula || def.whyItMatters ? '8px' : 0 }}>
        {def.definition}
      </div>
      {def.formula && (
        <div style={{ fontSize: '12px', color: '#555', marginBottom: def.whyItMatters ? '4px' : 0 }}>
          <span style={{ fontWeight: 600 }}>Formula: </span>{def.formula}
        </div>
      )}
      {def.whyItMatters && (
        <div style={{ fontSize: '12px', color: '#555' }}>
          <span style={{ fontWeight: 600 }}>Why it matters: </span>{def.whyItMatters}
        </div>
      )}
    </>
  )
}

export default function Tooltip({ content, children }: Props) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: 140 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  function compute() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const W = 280, pad = 12
    const cx = r.left + r.width / 2

    let left = cx - W / 2
    if (left < pad) left = pad
    if (left + W > window.innerWidth - pad) left = window.innerWidth - pad - W

    const arrowLeft = Math.max(8, Math.min(W - 20, cx - left - 6))
    setCoords({ top: r.top, left, arrowLeft })
  }

  function show() { compute(); setVisible(true) }
  function hide() { setVisible(false) }

  function handleTouchStart(e: React.TouchEvent) {
    e.stopPropagation()
    if (visible) hide()
    else show()
  }

  // Dismiss on outside tap (mobile)
  useEffect(() => {
    if (!visible) return
    function onOutside(e: TouchEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      hide()
    }
    document.addEventListener('touchstart', onOutside)
    return () => document.removeEventListener('touchstart', onOutside)
  }, [visible])

  // Keep position current while open
  useEffect(() => {
    if (!visible) return
    const update = () => compute()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [visible])

  const body = isMetricDef(content) ? <MetricBody def={content} /> : content

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onTouchStart={handleTouchStart}
        onClick={e => e.stopPropagation()}
        aria-label="Show metric definition"
        style={{
          background: 'none',
          border: 'none',
          padding: '0 0 0 4px',
          margin: 0,
          cursor: 'help',
          color: '#bbb',
          fontSize: '11px',
          lineHeight: 1,
          verticalAlign: 'middle',
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: 'sans-serif',
          flexShrink: 0,
          outline: 'none',
        }}
      >
        {children ?? 'ⓘ'}
      </button>

      {/* position: fixed escapes any overflow:hidden or stacking-context ancestor */}
      <div
        role="tooltip"
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          transform: 'translateY(calc(-100% - 10px))',
          zIndex: 9999,
          width: '280px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          border: '1px solid #e8ecf0',
          padding: '12px 16px',
          fontSize: '13px',
          lineHeight: '1.5',
          color: '#0D2C54',
          fontFamily: 'Raleway, sans-serif',
          textTransform: 'none',
          letterSpacing: 'normal',
          fontWeight: 'normal',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        {body}
        {/* Down-pointing arrow */}
        <div style={{
          position: 'absolute',
          bottom: -6,
          left: coords.arrowLeft,
          width: 12,
          height: 12,
          background: '#fff',
          borderRight: '1px solid #e8ecf0',
          borderBottom: '1px solid #e8ecf0',
          transform: 'rotate(45deg)',
        }} />
      </div>
    </>
  )
}
