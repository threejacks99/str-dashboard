'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { sanitizeString } from '../../lib/csvMapper'
import { useBillingStatus } from '../../lib/useBillingStatus'
import BillingLockScreen from './BillingLockScreen'

interface Property { id: string; name: string }

interface Props {
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

const rowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px',
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

export default function ExpenseForm({ onSuccess, onCancel }: Props) {
  const { isLocked } = useBillingStatus()
  const [properties, setProperties] = useState<Property[]>([])
  const [propsLoading, setPropsLoading] = useState(true)

  const [propertyId, setPropertyId] = useState('')
  const [paidDate, setPaidDate] = useState(today())
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Maintenance')
  const [frequency, setFrequency] = useState('One-time')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('properties').select('id, name').order('name').then(({ data, error }) => {
      if (error) console.error('Failed to load properties:', error)
      const props = data ?? []
      setProperties(props)
      if (props.length === 1) setPropertyId(props[0].id)
      setPropsLoading(false)
    })
  }, [])

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

    const payload = {
      property_id: propertyId,
      paid_date: paidDate,
      vendor: sanitizeString(vendor),
      description: sanitizeString(description),
      amount: parseCurrency(amount),
      category: sanitizeString(category) ?? category,
      frequency: sanitizeString(frequency) ?? frequency,
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

  if (isLocked) return <BillingLockScreen />

  if (propsLoading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: '#888', fontSize: '14px' }}>Loading…</div>
  }

  if (properties.length === 0) {
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

  if (saved) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
        <p style={{ fontSize: '18px', fontWeight: '700', color: '#1A6E47' }}>Expense saved!</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: 'Raleway, sans-serif' }}>
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
        {properties.length === 1 ? (
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
      <div style={rowStyle}>
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
      <div style={rowStyle}>
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
          {saving ? 'Saving…' : 'Save Expense'}
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
      </div>
    </form>
  )
}
