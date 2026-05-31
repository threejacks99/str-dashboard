'use client'

import { useState } from 'react'
import Modal from './Modal'
import { isOwnerSource, type Conflict, type ConflictReservation } from '../../lib/conflicts'

interface Props {
  conflicts: Conflict[]
  resolving: boolean
  onResolve: (cancelledIds: string[]) => void
  onClose: () => void
}

// 'cancel-a' / 'cancel-b' mark the chosen side Cancelled; 'keep' leaves both.
type Choice = 'cancel-a' | 'cancel-b' | 'keep'

function conflictKey(c: Conflict): string {
  return c.a.id + '|' + c.b.id
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s + 'T00:00:00')
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateRange(checkIn: string | null, checkOut: string | null): string {
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`
}

function formatCurrency(n: number | null): string {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString('en-US')
}

// Short label for a booking, used in the radio options: guest name when
// present, otherwise the formatted date range.
function bookingLabel(r: ConflictReservation): string {
  return r.guest_name?.trim() || formatDateRange(r.check_in, r.check_out)
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: '600', color: '#888',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
}

function BookingCard({ r }: { r: ConflictReservation }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '14px 16px',
        background: '#fff',
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0D2C54', marginBottom: '8px' }}>
        {r.guest_name?.trim() || '—'}
      </div>
      <div style={{ fontSize: '13px', color: '#0D2C54', marginBottom: '4px' }}>
        {formatDateRange(r.check_in, r.check_out)}
      </div>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
        {isOwnerSource(r.booking_source) ? 'Owner stay' : (r.booking_source?.trim() || '—')}
      </div>
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
        {formatCurrency(r.gross_rent)}
      </div>
      {r.reservation_ref?.trim() && (
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          Confirmation # {r.reservation_ref.trim()}
        </div>
      )}
    </div>
  )
}

export default function ConflictResolutionModal({ conflicts, resolving, onResolve, onClose }: Props) {
  const [choices, setChoices] = useState<Record<string, Choice>>({})

  function choiceFor(c: Conflict): Choice {
    return choices[conflictKey(c)] ?? 'keep'
  }

  function setChoice(c: Conflict, choice: Choice) {
    setChoices(prev => ({ ...prev, [conflictKey(c)]: choice }))
  }

  function handleApply() {
    const ids: string[] = []
    for (const c of conflicts) {
      const choice = choiceFor(c)
      if (choice === 'cancel-a') ids.push(c.a.id)
      else if (choice === 'cancel-b') ids.push(c.b.id)
    }
    onResolve(Array.from(new Set(ids)))
  }

  return (
    <Modal isOpen onClose={onClose} title="Resolve booking conflicts">
      <p style={{ fontSize: '14px', color: '#0D2C54', lineHeight: 1.5, marginTop: 0, marginBottom: '24px' }}>
        These bookings share dates on the same property, so one was likely cancelled — pick which
        one to mark Cancelled, or keep both.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {conflicts.map(c => {
          const key = conflictKey(c)
          const selected = choiceFor(c)
          return (
            <div
              key={key}
              style={{
                border: '1px solid #eee',
                borderRadius: '12px',
                padding: '16px',
                background: '#F5F7FA',
              }}
            >
              <div className="hostics-form-grid" style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <BookingCard r={c.a} />
                <BookingCard r={c.b} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <RadioOption
                  name={key}
                  checked={selected === 'cancel-a'}
                  onChange={() => setChoice(c, 'cancel-a')}
                  label={`Cancel ${bookingLabel(c.a)}`}
                />
                <RadioOption
                  name={key}
                  checked={selected === 'cancel-b'}
                  onChange={() => setChoice(c, 'cancel-b')}
                  label={`Cancel ${bookingLabel(c.b)}`}
                />
                <RadioOption
                  name={key}
                  checked={selected === 'keep'}
                  onChange={() => setChoice(c, 'keep')}
                  label="Keep both"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #ddd', borderRadius: '8px',
            padding: '12px 20px', fontSize: '14px', color: '#666',
            fontFamily: 'Raleway, sans-serif', cursor: 'pointer',
          }}
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={resolving}
          style={{
            background: resolving ? '#faa99f' : '#FF7767', color: '#fff', border: 'none',
            padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '700',
            fontFamily: 'Raleway, sans-serif', cursor: resolving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          {resolving ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </Modal>
  )
}

function RadioOption({
  name,
  checked,
  onChange,
  label,
}: {
  name: string
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#0D2C54', cursor: 'pointer' }}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        style={{ accentColor: '#FF7767', cursor: 'pointer' }}
      />
      {label}
    </label>
  )
}
