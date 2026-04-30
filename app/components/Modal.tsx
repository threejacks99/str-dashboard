'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable[0]?.focus()
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <style>{`
        @keyframes modal-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-scale-in { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>
      <div
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(13, 44, 84, 0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          animation: 'modal-fade-in 0.15s ease',
        }}
      >
        <div
          ref={panelRef}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            position: 'relative',
            animation: 'modal-scale-in 0.15s ease',
            fontFamily: 'Raleway, sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 id="modal-title" style={{ fontSize: '20px', fontWeight: '800', color: '#0D2C54', margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '22px', color: '#aaa', lineHeight: 1, padding: '4px 8px',
                borderRadius: '4px', fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}
