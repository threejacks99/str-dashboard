'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useBillingStatus } from '../../../lib/useBillingStatus'
import { getFeatures } from '../../../lib/billing'
import type { ReportData, ScheduleELine } from './TaxSummaryPDF'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Property {
  id: string
  name: string
}

interface Props {
  properties: Property[]
}

// ── Schedule E mapping ────────────────────────────────────────────────────────
const SCHED_E: Record<string, { line: string; label: string }> = {
  Maintenance:             { line: '7',  label: 'Cleaning and Maintenance' },
  Cleaning:                { line: '7',  label: 'Cleaning and Maintenance' },
  Insurance:               { line: '9',  label: 'Insurance' },
  Fees:                    { line: '10', label: 'Legal and Professional Fees' },
  'Professional Services': { line: '10', label: 'Legal and Professional Fees' },
  Legal:                   { line: '10', label: 'Legal and Professional Fees' },
  Repairs:                 { line: '14', label: 'Repairs' },
  Taxes:                   { line: '16', label: 'Taxes' },
  Utilities:               { line: '17', label: 'Utilities' },
}

function buildReportData(
  propertyName: string,
  taxYear: number,
  rawRes: any[],
  rawExp: any[],
): ReportData {
  const isOwner     = (r: any) => ['OWN', 'Own', 'own'].includes(r.booking_source)
  const isCancelled = (r: any) => ['cancelled', 'Cancelled'].includes(r.status)
  const perf = rawRes.filter(r => !isOwner(r) && !isCancelled(r))

  // Income
  const srcMap: Record<string, number> = {}
  let totalGrossRent = 0
  let totalMgmtFees  = 0

  for (const r of perf) {
    const src = r.booking_source?.trim() || 'Unknown'
    srcMap[src]     = (srcMap[src] || 0) + (r.gross_rent || 0)
    totalGrossRent += r.gross_rent || 0
    totalMgmtFees  += r.mgmt_fee  || 0
  }

  const incomeBySource = Object.entries(srcMap)
    .map(([source, amount]) => ({ source, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)

  // Expense lines
  const lineMap: Record<string, { label: string; amount: number }> = {}

  if (totalMgmtFees > 0) {
    lineMap['11'] = { label: 'Management Fees', amount: Math.round(totalMgmtFees) }
  }

  for (const e of rawExp) {
    const cat     = e.category?.trim() || ''
    const mapping = SCHED_E[cat] ?? { line: '19', label: 'Other Expenses' }
    if (!lineMap[mapping.line]) {
      lineMap[mapping.line] = { label: mapping.label, amount: 0 }
    }
    lineMap[mapping.line].amount += e.amount || 0
  }

  const scheduleELines: ScheduleELine[] = Object.entries(lineMap)
    .map(([line, { label, amount }]) => ({ line, label, amount: Math.round(amount) }))
    .sort((a, b) => parseInt(a.line) - parseInt(b.line))

  const totalExpenses = scheduleELines.reduce((s, l) => s + l.amount, 0)
  const noi = Math.round(totalGrossRent) - totalExpenses

  return {
    propertyName,
    taxYear,
    generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    totalGrossRent: Math.round(totalGrossRent),
    incomeBySource,
    totalMgmtFees:  Math.round(totalMgmtFees),
    scheduleELines,
    totalExpenses,
    noi,
    reservations: perf,
    expenses:     rawExp,
  }
}

// ── Dropdown component ────────────────────────────────────────────────────────
function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
  icon,
  disabled,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  icon?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '9px 14px',
          background: open ? '#FFF5F4' : '#fff',
          border: `1px solid ${open ? '#FF7767' : '#ddd'}`,
          borderRadius: '8px',
          fontSize: '13px', fontWeight: 600,
          color: open ? '#FF7767' : '#0D2C54',
          fontFamily: 'Raleway, sans-serif',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap', minWidth: '160px',
        }}
      >
        {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
        <span style={{ flex: 1, textAlign: 'left' }}>{selected?.label ?? '—'}</span>
        <span style={{ fontSize: '10px', color: open ? '#FF7767' : '#aaa' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#fff', border: '1px solid #eee', borderRadius: '10px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.10)', minWidth: '180px', overflow: 'hidden',
        }}>
          {options.map(opt => {
            const sel = opt.value === value
            return (
              <button
                key={String(opt.value)}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', padding: '10px 16px',
                  background: sel ? '#FFF5F4' : 'none', border: 'none',
                  textAlign: 'left', fontSize: '14px',
                  fontWeight: sel ? 700 : 400,
                  color: sel ? '#FF7767' : '#0D2C54',
                  fontFamily: 'Raleway, sans-serif', cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={e => { e.currentTarget.style.background = sel ? '#FFF5F4' : 'none' }}
              >
                <span style={{ marginRight: '8px', opacity: sel ? 1 : 0 }}>✓</span>
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportCards({ properties }: Props) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  const defaultProp = properties.length === 1 ? properties[0].id : 'all'
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(defaultProp)
  const [selectedYear,        setSelectedYear]       = useState<number>(currentYear)
  const [loadingPdf,          setLoadingPdf]         = useState(false)
  const [loadingExcel,        setLoadingExcel]       = useState(false)
  const [toast,               setToast]              = useState<{ msg: string; ok: boolean } | null>(null)

  const router = useRouter()
  const { status, loading: billingLoading } = useBillingStatus()
  const canGeneratePdf = getFeatures(status).scheduleEPdf
  const canGenerateExcel = getFeatures(status).excelExport

  const propertyOptions = [
    ...(properties.length > 1 ? [{ value: 'all', label: `All Properties (${properties.length})` }] : []),
    ...properties.map(p => ({ value: p.id, label: p.name })),
  ]
  const yearOptions = years.map(y => ({ value: y, label: String(y) }))

  const propertyName = selectedPropertyId === 'all'
    ? 'All Properties'
    : (properties.find(p => p.id === selectedPropertyId)?.name ?? 'All Properties')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function fetchData() {
    const from = `${selectedYear}-01-01`
    const to   = `${selectedYear}-12-31`
    const ids  = selectedPropertyId === 'all'
      ? properties.map(p => p.id)
      : [selectedPropertyId]

    const [{ data: reservations }, { data: expenses }] = await Promise.all([
      supabase.from('reservations').select('*')
        .in('property_id', ids).gte('check_in', from).lte('check_in', to),
      supabase.from('expenses').select('*')
        .in('property_id', ids).gte('paid_date', from).lte('paid_date', to),
    ])
    return { reservations: reservations ?? [], expenses: expenses ?? [] }
  }

  async function handleGeneratePdf() {
    setLoadingPdf(true)
    try {
      const { reservations, expenses } = await fetchData()
      if (!reservations.length && !expenses.length) {
        showToast(`No data found for ${selectedYear}.`, false)
        return
      }
      const reportData = buildReportData(propertyName, selectedYear, reservations, expenses)

      const { pdf }               = await import('@react-pdf/renderer')
      const TaxSummaryPDF         = (await import('./TaxSummaryPDF')).default
      const { saveAs }            = await import('file-saver')

      const element = React.createElement(TaxSummaryPDF as React.ComponentType<{ data: ReportData }>, { data: reportData })
      const blob    = await (pdf as any)(element).toBlob()
      const safe    = reportData.propertyName.replace(/[^a-zA-Z0-9]/g, '')
      saveAs(blob, `Hostics_TaxSummary_${selectedYear}_${safe}.pdf`)
      showToast('PDF downloaded!')
    } catch (err) {
      console.error(err)
      showToast('Failed to generate PDF. Please try again.', false)
    } finally {
      setLoadingPdf(false)
    }
  }

  function handlePdfClick() {
    if (!canGeneratePdf) {
      router.push('/billing')
      return
    }
    handleGeneratePdf()
  }

  async function handleGenerateExcel() {
    setLoadingExcel(true)
    try {
      const { reservations, expenses } = await fetchData()
      if (!reservations.length && !expenses.length) {
        showToast(`No data found for ${selectedYear}.`, false)
        return
      }
      const reportData = buildReportData(propertyName, selectedYear, reservations, expenses)
      const { generateExcel } = await import('./ExcelExport')
      generateExcel(reportData)
      showToast('Excel file downloaded!')
    } catch (err) {
      console.error(err)
      showToast('Failed to generate Excel. Please try again.', false)
    } finally {
      setLoadingExcel(false)
    }
  }

  function handleExcelClick() {
    if (!canGenerateExcel) {
      router.push('/billing')
      return
    }
    handleGenerateExcel()
  }

  const btnDisabled = loadingPdf || loadingExcel

  return (
    <>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ─── Report configuration ─── */}
      <div style={{
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, color: '#888',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: 'Raleway, sans-serif', marginBottom: '12px',
        }}>
          Report Configuration
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {properties.length > 1 ? (
            <Dropdown
              value={selectedPropertyId}
              onChange={setSelectedPropertyId}
              options={propertyOptions}
              icon="🏠"
            />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', background: '#fff', border: '1px solid #ddd',
              borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              color: '#0D2C54', fontFamily: 'Raleway, sans-serif',
            }}>
              <span style={{ fontSize: '14px' }}>🏠</span>
              <span>{properties[0]?.name ?? 'All Properties'}</span>
            </div>
          )}
          <Dropdown
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearOptions}
            icon="📅"
          />
        </div>
      </div>

      {/* ─── Export cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Card 1 — PDF */}
        <div style={{
          background: '#fff', border: '1px solid #eee', borderRadius: '12px',
          padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', lineHeight: 1 }}>📄</div>
          <h2 style={{
            fontSize: '18px', fontWeight: 800, color: '#0D2C54',
            marginBottom: '8px', fontFamily: 'Raleway, sans-serif',
          }}>
            Tax Summary (PDF)
          </h2>
          <p style={{
            fontSize: '14px', color: '#666', lineHeight: '1.6',
            marginBottom: '24px', flex: 1,
          }}>
            Clean P&L summary structured like IRS Schedule E. Perfect for emailing to your accountant.
          </p>

          {/* What's included */}
          <ul style={{
            fontSize: '13px', color: '#888', paddingLeft: '18px',
            marginBottom: '24px', lineHeight: 1.8,
          }}>
            <li>Rental income by booking source (Line 3)</li>
            <li>Expenses mapped to Schedule E lines</li>
            <li>Net Operating Income total</li>
            <li>Hostics branding + disclaimer</li>
          </ul>

          <button
            onClick={handlePdfClick}
            disabled={btnDisabled || !properties.length || billingLoading}
            style={{
              background: (btnDisabled || !properties.length || billingLoading) ? '#faa99f' : '#FF7767',
              color: '#fff', border: 'none', borderRadius: '8px',
              padding: '12px 20px', fontSize: '14px', fontWeight: 700,
              fontFamily: 'Raleway, sans-serif',
              cursor: (btnDisabled || !properties.length || billingLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s ease',
            }}
          >
            {loadingPdf ? (
              <>
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Generating…
              </>
            ) : !canGeneratePdf ? (
              <><span>🔒</span> Upgrade to export</>
            ) : (
              <><span>📄</span> Generate PDF</>
            )}
          </button>
        </div>

        {/* Card 2 — Excel */}
        <div style={{
          background: '#fff', border: '1px solid #eee', borderRadius: '12px',
          padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', lineHeight: 1 }}>📊</div>
          <h2 style={{
            fontSize: '18px', fontWeight: 800, color: '#0D2C54',
            marginBottom: '8px', fontFamily: 'Raleway, sans-serif',
          }}>
            Detailed Export (Excel)
          </h2>
          <p style={{
            fontSize: '14px', color: '#666', lineHeight: '1.6',
            marginBottom: '24px', flex: 1,
          }}>
            Raw transaction data in Excel format. All reservations and expenses on separate tabs.
          </p>

          {/* What's included */}
          <ul style={{
            fontSize: '13px', color: '#888', paddingLeft: '18px',
            marginBottom: '24px', lineHeight: 1.8,
          }}>
            <li>Summary tab with P&L and Schedule E</li>
            <li>All reservations with guest details</li>
            <li>All expenses with Schedule E line</li>
            <li>Schedule E summary — ready to transcribe</li>
          </ul>

          <button
            onClick={handleExcelClick}
            disabled={btnDisabled || !properties.length || billingLoading}
            style={{
              background: (btnDisabled || !properties.length || billingLoading) ? '#faa99f' : '#FF7767',
              color: '#fff', border: 'none', borderRadius: '8px',
              padding: '12px 20px', fontSize: '14px', fontWeight: 700,
              fontFamily: 'Raleway, sans-serif',
              cursor: (btnDisabled || !properties.length || billingLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s ease',
            }}
          >
            {loadingExcel ? (
              <>
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Generating…
              </>
            ) : !canGenerateExcel ? (
              <><span>🔒</span> Upgrade to export</>
            ) : (
              <><span>📊</span> Download Excel</>
            )}
          </button>
        </div>
      </div>

      {/* ─── Disclaimer note ─── */}
      <div style={{
        background: '#F7F9FC', border: '1px solid #E1E8F0', borderRadius: '8px',
        padding: '14px 18px', fontSize: '13px', color: '#888', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#0D2C54' }}>Note: </strong>
        Hostics reports include all data within the selected tax year for the chosen property.
        Always have your accountant review for accuracy before filing.
      </div>

      {/* ─── Toast ─── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: toast.ok ? '#0D2C54' : '#c0392b',
          color: '#fff', padding: '12px 20px', borderRadius: '8px',
          fontSize: '14px', fontWeight: 600,
          fontFamily: 'Raleway, sans-serif',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  )
}
