'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '../Modal'
import ExpenseForm from '../ExpenseForm'

interface Props {
  propertyLabel: string
  dateRangeLabel: string
}

export default function FinancialsHeader({ propertyLabel, dateRangeLabel }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
            Financials
          </h1>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {propertyLabel} · {dateRangeLabel}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: '#FF7767', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '700',
            fontFamily: 'Raleway, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
            flexShrink: 0, marginTop: '4px',
          }}
        >
          + Add Expense
        </button>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Expense">
        <ExpenseForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  )
}
