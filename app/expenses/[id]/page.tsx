'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import ExpenseForm, { ExpenseFormInitialValues } from '../../components/ExpenseForm'

export default function EditExpensePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [initialValues, setInitialValues] = useState<ExpenseFormInitialValues | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, property_id, paid_date, vendor, description, amount, category, frequency')
        .eq('id', id)
        .single()

      if (error || !data) { setNotFound(true); setLoading(false); return }

      setInitialValues({
        propertyId: data.property_id ?? '',
        paidDate: data.paid_date ?? '',
        vendor: data.vendor ?? '',
        description: data.description ?? '',
        amount: data.amount != null ? String(data.amount) : '',
        category: data.category ?? 'Maintenance',
        frequency: data.frequency ?? 'One-time',
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
        <p style={{ fontSize: '16px', color: '#888', marginBottom: '20px' }}>Expense not found or access denied.</p>
        <Link href="/financials" style={{ color: '#FF7767', fontWeight: '600', textDecoration: 'none' }}>← Back to Financials</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Raleway, sans-serif', maxWidth: '680px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Link
          href="/financials"
          style={{ fontSize: '13px', color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}
        >
          ← Financials
        </Link>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Edit expense
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>Update expense details.</p>
      </div>

      {initialValues && (
        <ExpenseForm
          mode="edit"
          expenseId={id}
          initialValues={initialValues}
          onSuccess={() => { router.push('/financials') }}
          onCancel={() => router.push('/financials')}
        />
      )}
    </div>
  )
}
