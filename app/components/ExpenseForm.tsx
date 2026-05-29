'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { sanitizeString } from '../../lib/csvMapper'
import { useBillingStatus } from '../../lib/useBillingStatus'
import BillingLockScreen from './BillingLockScreen'
import Modal from './Modal'

interface Property { id: string; name: string }

export interface ExpenseFormInitialValues {
  propertyId?: string
  paidDate?: string
  vendor?: string
  description?: string
  amount?: string
  category?: string
  frequency?: string
}

interface Props {
  mode?: 'create' | 'edit'
  expenseId?: string  // required for edit
  initialValues?: ExpenseFormInitialValues
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

const errorStyle: React.CSSProperties = {
  fontSize: '12px', color: '#B83224', marginTop: '4px',
}

function parseCurrency(s: string): number {
  const isNeg = s.trim().startsWith('-') || s.trim().startsWith('(')
  const cleaned = parseFloat(s.replace(/[$,\s()]/g, '')) || 0
  return isNeg ? -Math.abs(cleaned) : cleaned
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function Req() {
  return <span style={{ color: '#FF7767' }}>*</span>
}

const CATEGORIES = [
  'Maintenance', 'Insurance', 'Taxes', 'Utilities',
  'Fees', 'Professional Services', 'Software', 'Other',
]

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

export default function ExpenseForm({
  mode = 'create',
  expenseId,
  initialValues,
  onSuccess,
  onCancel,
}: Props) {
  const { isLocked } = useBillingStatus()
  const [properties, setProperties] = useState<Property[]>([])
  const [propsLoading, setPropsLoading] = useState(true)

  const [propertyId, setPropertyId]   = useState(initialValues?.propertyId ?? '')
  const [paidDate, setPaidDate]       = useState(initialValues?.paidDate ?? today())
  const [vendor, setVendor]           = useState(initialValues?.vendor ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [amount, setAmount]           = useState(initialValues?.amount ?? '')
  const [category, setCategory]       = useState(initialValues?.category ?? 'Maintenance')
  const [frequency, setFrequency]     = useState(initialValues?.frequency ?? 'One-time')

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
    // expense may already point to one, and the dropdown needs to render
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

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!propertyId) errs.propertyId = 'Please select a property'
    if (!paidDate) errs.paidDate = 'Paid date is required'
    if (!amount.trim()) errs.amount = 'Amount is required'
    else if (isNaN(parseCurrency(amount))) errs.amount = 'Enter a valid number'
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
      paid_date: paidDate,
      vendor: sanitizeString(vendor),
      description: sanitizeString(description),
      amount: parseCurrency(amount),
      category: sanitizeString(category) ?? category,
      frequency: sanitizeString(frequency) ?? frequency,
    }

    if (mode === 'edit') {
      const { error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', expenseId!)
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

    console.log('[ExpenseForm] Inserting:', payload)
    const { data, error } = await supabase.from('expenses').insert(payload).select()
    setSaving(false)

    if (error) {
      console.error('[ExpenseForm] Insert error:', error)
      setSaveError(error.message)
      return
    }

    console.log('[ExpenseForm] Inserted successfully:', data)
    setSaved(true)
    setTimeout(() => onSuccess(), 1500)
  }

  function openDeleteConfirm() {
    setDeleteConfirm(true)
  }

  async function handleConfirmDelete() {
    if (!expenseId) return
    setDeleting(true)

    let res: Response
    try {
      res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
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
    router.push('/financials')
    router.refresh()
  }

  if (isLocked) return <BillingLockScreen />

  if (propsLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '14px' }}>Loading…</div>
  }

  if (mode === 'create' && properties.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
          You need at least one property before adding an expense.
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
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
        <p style={{ fontSize: '18px', fontWeight: '700', color: '#1A6E47' }}>Expense saved!</p>
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

      {/* Date + Vendor */}
      <div className="hostics-form-grid" style={{ marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Paid Date <Req /></label>
          <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} style={inputStyle} />
          {errors.paidDate && <div style={errorStyle}>{errors.paidDate}</div>}
        </div>
        <div>
          <label style={labelStyle}>Vendor</label>
          <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
            placeholder="e.g. Home Depot" style={inputStyle} />
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={2} placeholder="Optional notes…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
      </div>

      {/* Amount */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Amount <Req /></label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>$</span>
          <input type="text" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00" style={{ ...inputStyle, paddingLeft: '24px' }} />
        </div>
        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
          Use negative for refunds (e.g. -50.00)
        </div>
        {errors.amount && <div style={errorStyle}>{errors.amount}</div>}
      </div>

      {/* Category + Frequency */}
      <div className="hostics-form-grid" style={{ marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Category <Req /></label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)} style={inputStyle}>
            <option>One-time</option>
            <option>Recurring</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
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
          {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save Expense'}
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
            Delete expense
          </button>
        )}
      </div>
    </form>

    {deleteConfirm && (
      <Modal
        isOpen={true}
        onClose={() => setDeleteConfirm(false)}
        title="Delete this expense?"
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
