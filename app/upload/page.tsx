'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { mapColumns, mapRow, detectFileType, mapExpenseColumns, mapExpenseRow } from '../../lib/csvMapper'
import { supabase } from '../../lib/supabase'
import PropertyForm from '../components/PropertyForm'
import Modal from '../components/Modal'
import ReservationForm from '../components/ReservationForm'
import ExpenseForm from '../components/ExpenseForm'
import { useBillingStatus } from '../../lib/useBillingStatus'
import BillingLockScreen from '../components/BillingLockScreen'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Property {
  id: string
  name: string
}

interface InvalidRow {
  index: number
  reason: string
}

interface UploadHistoryRow {
  id: string
  upload_type: string
  filename: string | null
  row_count: number
  uploaded_at: string
  properties: { name: string } | null
}

// ── Style tokens ───────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'Raleway, sans-serif',
  color: '#0D2C54',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const thStyle: React.CSSProperties = {
  padding: '9px 14px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#888',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid #eee',
  background: '#F5F7FA',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: '#444',
  fontSize: '13px',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 50

function friendlyError(msg: string): string {
  if (!msg) return 'An unknown error occurred. Please try again.'
  if (msg.includes('duplicate key value')) return 'Some rows already exist and were skipped.'
  if (msg.includes('violates not-null constraint')) {
    const col = msg.match(/column "(.+?)"/)?.[1]
    return col ? `Required column "${col}" is missing or empty.` : 'A required column is missing or empty.'
  }
  if (/network|fetch|failed to fetch/i.test(msg)) return 'Connection issue. Please check your network and try again.'
  return msg
}

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`
}

// ── Action card ────────────────────────────────────────────────────────────────
function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  onAction,
  disabled,
  comingSoon,
  active,
}: {
  icon: string
  title: string
  description: string
  buttonLabel: string
  onAction: () => void
  disabled?: boolean
  comingSoon?: boolean
  active?: boolean
}) {
  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${active ? '#FF7767' : '#eee'}`,
      borderRadius: '12px',
      padding: '28px 24px',
      boxShadow: active ? '0 4px 16px rgba(255,119,103,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    }}>
      <div style={{ fontSize: '32px', lineHeight: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0D2C54', marginBottom: '6px' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.5' }}>
          {description}
        </div>
      </div>
      {comingSoon ? (
        <span style={{
          display: 'inline-block', background: '#F0F4F9', color: '#0D2C54',
          borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '600',
          alignSelf: 'flex-start',
        }}>
          Coming soon
        </span>
      ) : (
        <button
          onClick={onAction}
          disabled={disabled}
          style={{
            alignSelf: 'flex-start',
            background: disabled ? '#f0f0f0' : '#FF7767',
            color: disabled ? '#aaa' : '#fff',
            border: 'none', borderRadius: '8px',
            padding: '10px 20px', fontSize: '14px', fontWeight: '700',
            fontFamily: 'Raleway, sans-serif',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  // Modal state
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCsvSection, setShowCsvSection] = useState(false)

  // Properties
  const [properties, setProperties]           = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null)
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [showCreateForm, setShowCreateForm]   = useState(false)

  // File parsing
  const [filename, setFilename]     = useState('')
  const [fileType, setFileType]     = useState<'reservations' | 'expenses' | 'unknown' | null>(null)
  const [validRows, setValidRows]   = useState<Record<string, any>[]>([])
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([])
  const [parseStatus, setParseStatus] = useState('')

  // Duplicate detection
  const [readyRows, setReadyRows]           = useState<Record<string, any>[]>([])
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicatesChecked, setDuplicatesChecked]   = useState(false)
  const [showInvalidDetail, setShowInvalidDetail]   = useState(false)

  // Multi-property mode
  const [multiPropertyMode, setMultiPropertyMode] = useState(false)
  const [propertyNameToId, setPropertyNameToId]   = useState<Record<string, string>>({})
  const [unknownPropertyNames, setUnknownPropertyNames] = useState<string[]>([])
  const [unknownMappings, setUnknownMappings]     = useState<Record<string, string>>({}) // unknown name -> existing property id, or '__new__'
  const [applyingMappings, setApplyingMappings]   = useState(false)

  // Upload
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult]     = useState<{ imported: number; duplicatesSkipped: number; kind: string } | null>(null)
  const [uploadError, setUploadError]       = useState<string | null>(null)

  // History
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryRow[]>([])

  const { isLocked } = useBillingStatus()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Data loading ─────────────────────────────────────────────────────────────
  async function loadProperties() {
    const [propertiesRes, clientsRes] = await Promise.all([
      supabase.from('properties').select('id, name').is('deleted_at', null).order('name'),
      supabase.from('clients').select('id').order('created_at', { ascending: true }).limit(1),
    ])
    const props = propertiesRes.data ?? []
    setProperties(props)
    if (props.length === 1) setSelectedPropertyId(props[0].id)
    if (clientsRes.data?.length) setPrimaryClientId(clientsRes.data[0].id)
    setPropertiesLoading(false)
  }

  async function loadUploadHistory() {
    try {
      const { data } = await supabase
        .from('uploads')
        .select('id, upload_type, filename, row_count, uploaded_at, properties(name)')
        .order('uploaded_at', { ascending: false })
        .limit(5)
      setUploadHistory((data as any as UploadHistoryRow[]) ?? [])
    } catch {
      setUploadHistory([])
    }
  }

  useEffect(() => {
    loadProperties()
    loadUploadHistory()
  }, [])

  // ── Duplicate detection ───────────────────────────────────────────────────────
  // Rows in multi-property mode each carry their own _propertyId. Single-property
  // mode passes propId and every row uses it. Either way, dedup queries are
  // fanned out per property and merged.
  async function runCheckDuplicates(
    rows: Record<string, any>[],
    type: 'reservations' | 'expenses',
    propId: string | null
  ) {
    if (!rows.length) {
      setReadyRows([])
      setDuplicateCount(0)
      setDuplicatesChecked(true)
      return
    }

    setCheckingDuplicates(true)
    setDuplicatesChecked(false)

    // Stamp every row with the property_id it will land on
    const stamped = rows.map(r => ({
      ...r,
      _propertyId: r._propertyId ?? propId,
    })).filter(r => r._propertyId)

    // Group by property
    const byProperty: Record<string, Record<string, any>[]> = {}
    for (const r of stamped) {
      const pid = r._propertyId as string
      if (!byProperty[pid]) byProperty[pid] = []
      byProperty[pid].push(r)
    }

    try {
      const readyAcc: Record<string, any>[] = []
      let dupeAcc = 0

      for (const [pid, propRows] of Object.entries(byProperty)) {
        if (type === 'reservations') {
          const refs = propRows.map(r => r.reservation_ref).filter(Boolean)
          if (!refs.length) {
            readyAcc.push(...propRows)
            continue
          }
          const { data } = await supabase
            .from('reservations')
            .select('reservation_ref')
            .eq('property_id', pid)
            .in('reservation_ref', refs)

          const existing = new Set((data ?? []).map((r: any) => r.reservation_ref))
          const ready = propRows.filter(r => !r.reservation_ref || !existing.has(r.reservation_ref))
          readyAcc.push(...ready)
          dupeAcc += propRows.length - ready.length
        } else {
          const { data } = await supabase
            .from('expenses')
            .select('paid_date, vendor, amount')
            .eq('property_id', pid)

          const existingFps = new Set(
            (data ?? []).map((r: any) => `${r.paid_date}|${r.vendor ?? ''}|${r.amount}`)
          )
          const ready = propRows.filter(r =>
            !existingFps.has(`${r.paid_date}|${r.vendor ?? ''}|${r.amount}`)
          )
          readyAcc.push(...ready)
          dupeAcc += propRows.length - ready.length
        }
      }

      setReadyRows(readyAcc)
      setDuplicateCount(dupeAcc)
    } catch {
      setReadyRows(stamped)
      setDuplicateCount(0)
    }

    setDuplicatesChecked(true)
    setCheckingDuplicates(false)
  }

  // ── Multi-property resolution handler ─────────────────────────────────────
  // Re-runs dedup after the user maps every unknown name to either an existing
  // property id or '__new__' (create new). Creates the new properties first
  // via POST /api/properties so the tier-cap and overage checks fire.
  async function applyUnknownMappings() {
    if (unknownPropertyNames.some(name => !unknownMappings[name])) return
    if (applyingMappings) return // guard against double-click during in-flight create
    setApplyingMappings(true)

    const newPropertyNames = unknownPropertyNames.filter(n => unknownMappings[n] === '__new__')
    const createdMap: Record<string, string> = {}

    for (const name of newPropertyNames) {
      try {
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, confirmOverage: true }),
        })
        const json = await res.json()
        if (!res.ok || !json.id) {
          setParseStatus(`Failed to create property "${name}": ${json.error ?? 'unknown error'}. Try mapping it to an existing property instead.`)
          setApplyingMappings(false)
          return
        }
        createdMap[name.trim().toLowerCase()] = json.id
      } catch (err: any) {
        setParseStatus(`Failed to create property "${name}": ${err.message ?? 'network error'}.`)
        setApplyingMappings(false)
        return
      }
    }

    const { data: refreshed } = await supabase.from('properties').select('id, name').is('deleted_at', null).order('name')
    if (refreshed) setProperties(refreshed)

    const finalNameMap = { ...propertyNameToId, ...createdMap }
    const resolveName = (name: string): string | null => {
      const key = name.trim().toLowerCase()
      if (finalNameMap[key]) return finalNameMap[key]
      const mapping = unknownMappings[name]
      if (mapping && mapping !== '__new__') return mapping
      return null
    }

    const stamped = validRows.map(r => {
      if (!r.property_name) return r
      const pid = resolveName(r.property_name as string)
      return pid ? { ...r, _propertyId: pid } : r
    }).filter(r => r._propertyId)

    // Resolution complete — clear unknowns so the Import button gate passes.
    // Refresh the name-to-id map too so subsequent re-parses see the new properties.
    setPropertyNameToId(finalNameMap)
    setUnknownPropertyNames([])
    setUnknownMappings({})
    setApplyingMappings(false)

    if (fileType === 'reservations' || fileType === 'expenses') {
      runCheckDuplicates(stamped, fileType, null)
    }
  }

  // ── Property select handler ────────────────────────────────────────────────
  function handlePropertySelect(propId: string) {
    setSelectedPropertyId(propId)
    if (multiPropertyMode) return
    if (propId && validRows.length > 0 && (fileType === 'reservations' || fileType === 'expenses')) {
      runCheckDuplicates(validRows, fileType, propId)
    } else if (!propId) {
      setReadyRows(validRows)
      setDuplicateCount(0)
      setDuplicatesChecked(false)
    }
  }

  // ── Property created handler ───────────────────────────────────────────────
  async function handlePropertyCreated(result?: { id: string; name: string }) {
    if (!result) return
    setShowCreateForm(false)
    const { data } = await supabase.from('properties').select('id, name').is('deleted_at', null).order('name')
    setProperties(data ?? [])
    handlePropertySelect(result.id)
  }

  // ── File parsing ──────────────────────────────────────────────────────────────
  function cleanHeader(header: string): string {
    return Array.from(header)
      .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)
      .join('')
      .trim()
  }

  function processParseResult(headers: string[], rows: Record<string, string>[]) {
    const detected = detectFileType(headers)
    setFileType(detected)

    if (detected === 'unknown') {
      setParseStatus('Could not detect file type. Please upload a reservations or expenses CSV or Excel file.')
      return
    }

    const filteredRows = rows.filter(row =>
      Object.values(row).some(v => v != null && String(v).trim() !== '')
    )
    let valid: Record<string, any>[]
    let invalid: InvalidRow[]

    if (detected === 'reservations') {
      const mapped = filteredRows.map(row => mapRow(row, mapColumns(headers)))
      valid = mapped.filter(r => r.check_in && r.check_out)
      invalid = mapped
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.check_in || !r.check_out)
        .map(({ r, i }) => ({
          index: i,
          reason: (r._errors as string[] | undefined)?.join('; ')
            ?? (!r.check_in ? 'Missing or invalid check-in date' : 'Missing or invalid check-out date'),
        }))
    } else {
      const mapped = filteredRows.map(row => mapExpenseRow(row, mapExpenseColumns(headers)))
      valid = mapped.filter(r => r.paid_date && r.amount)
      invalid = mapped
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.paid_date || !r.amount)
        .map(({ r, i }) => ({
          index: i,
          reason: (r._errors as string[] | undefined)?.join('; ')
            ?? (!r.paid_date ? 'Missing or invalid date' : 'Missing amount'),
        }))
    }

    setValidRows(valid)
    setInvalidRows(invalid)
    setParseStatus('')

    // Multi-property detection: only activates when account has >1 property
    // AND the file contains a property_name column with values. Solo users
    // (properties.length === 1) get the column read and ignored.
    const hasPropertyCol = valid.some(r => r.property_name)
    const isMulti = properties.length > 1 && hasPropertyCol

    if (isMulti) {
      const nameMap: Record<string, string> = {}
      for (const p of properties) {
        nameMap[p.name.trim().toLowerCase()] = p.id
      }

      const unknownSet = new Set<string>()
      for (const r of valid) {
        if (!r.property_name) continue
        const key = (r.property_name as string).trim().toLowerCase()
        if (!nameMap[key]) unknownSet.add(r.property_name as string)
      }

      setMultiPropertyMode(true)
      setPropertyNameToId(nameMap)
      setUnknownPropertyNames([...unknownSet].sort())
      setUnknownMappings({})

      const stamped = valid.map(r => {
        if (!r.property_name) return r
        const pid = nameMap[(r.property_name as string).trim().toLowerCase()]
        return pid ? { ...r, _propertyId: pid } : r
      })

      if (unknownSet.size === 0) {
        runCheckDuplicates(stamped, detected, null)
      } else {
        setReadyRows([])
        setDuplicateCount(0)
        setDuplicatesChecked(false)
      }
    } else {
      setMultiPropertyMode(false)
      setUnknownPropertyNames([])
      setUnknownMappings({})

      if (selectedPropertyId && (detected === 'reservations' || detected === 'expenses')) {
        runCheckDuplicates(valid, detected, selectedPropertyId)
      } else {
        setReadyRows(valid)
        setDuplicateCount(0)
        setDuplicatesChecked(false)
      }
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParseStatus('Reading file…')
    setValidRows([])
    setInvalidRows([])
    setReadyRows([])
    setDuplicateCount(0)
    setDuplicatesChecked(false)
    setUploadResult(null)
    setUploadError(null)
    setShowInvalidDetail(false)
    setFilename(file.name)

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: cleanHeader,
        complete: (results) => processParseResult(results.meta.fields ?? [], results.data as Record<string, string>[]),
        error: (err: any) => setParseStatus(`Error reading file: ${err.message}`),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const workbook = XLSX.read(evt.target?.result as ArrayBuffer, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: false })

          if (rawRows.length === 0) {
            setParseStatus('The file appears to be empty.')
            return
          }

          const originalHeaders = Object.keys(rawRows[0])
          const headers = originalHeaders.map(cleanHeader)
          const cleanedRows = rawRows.map(row =>
            Object.fromEntries(
              originalHeaders.map((orig, i) => [headers[i], String(row[orig] ?? '')])
            ) as Record<string, string>
          )

          processParseResult(headers, cleanedRows)
        } catch (err: any) {
          setParseStatus(`Error reading Excel file: ${err.message}`)
        }
      }
      reader.onerror = () => setParseStatus('Error reading file. Please try again.')
      reader.readAsArrayBuffer(file)
    } else {
      setParseStatus('Unsupported file type. Please upload a CSV or Excel (.xlsx, .xls) file.')
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!readyRows.length || !fileType || (!selectedPropertyId && !multiPropertyMode)) return
    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    const table = fileType === 'reservations' ? 'reservations' : 'expenses'

    try {
      const withId = readyRows.map(r => {
        const clean: Record<string, any> = {}
        for (const [k, v] of Object.entries(r)) {
          if (!k.startsWith('_') && k !== 'property_name') clean[k] = v
        }
        const pid = r._propertyId ?? selectedPropertyId
        return { ...clean, property_id: pid }
      })

      let imported = 0
      for (let i = 0; i < withId.length; i += BATCH_SIZE) {
        const batch = withId.slice(i, i + BATCH_SIZE)
        const { error } = await supabase.from(table).insert(batch)
        if (error) throw new Error(friendlyError(error.message))
        imported += batch.length
        if (withId.length > 100) {
          setUploadProgress(Math.round((imported / withId.length) * 100))
        }
      }

      const uploadPropertyId = multiPropertyMode
        ? (withId[0]?.property_id ?? selectedPropertyId)
        : selectedPropertyId
      supabase.from('uploads').insert({
        property_id: uploadPropertyId,
        upload_type: fileType,
        filename: filename || null,
        row_count: imported,
      }).then(() => loadUploadHistory())

      setUploadResult({
        imported,
        duplicatesSkipped: duplicateCount,
        kind: fileType === 'expenses' ? 'expense' : 'reservation',
      })

      setValidRows([])
      setReadyRows([])
      setInvalidRows([])
      setDuplicateCount(0)
      setDuplicatesChecked(false)
      setFileType(null)
      setFilename('')
      setParseStatus('')
      setMultiPropertyMode(false)
      setUnknownPropertyNames([])
      setUnknownMappings({})
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed. Please try again.')
    }

    setUploading(false)
    setUploadProgress(0)
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const selectedProperty   = properties.find(p => p.id === selectedPropertyId)
  const preview            = readyRows.slice(0, 5)
  const hasFileLoaded      = validRows.length > 0 || invalidRows.length > 0
  const isError            = parseStatus.includes('failed') || parseStatus.includes('Could not') || parseStatus.includes('Error')

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (propertiesLoading) {
    return (
      <main style={{ padding: '40px', maxWidth: '960px', fontFamily: 'Raleway, sans-serif' }}>
        <div style={{ width: '140px', height: '28px', background: '#e8eaed', borderRadius: '8px', marginBottom: '12px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '320px', height: '16px', background: '#e8eaed', borderRadius: '6px', marginBottom: '40px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ height: '180px', background: '#e8eaed', borderRadius: '12px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', maxWidth: '960px', fontFamily: 'Raleway, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>Add Data</h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>
        Log a reservation or expense, or bulk-import historical data from a CSV or Excel export.
      </p>

      {/* ── Action cards ────────────────────────────────────────────────────── */}
      {isLocked && <BillingLockScreen />}
      {!isLocked && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' }}>
        <ActionCard
          icon="📂"
          title="Upload CSV or Excel"
          description="Bulk import historical data from any platform"
          buttonLabel={showCsvSection ? 'Hide upload' : 'Upload CSV or Excel'}
          active={showCsvSection}
          onAction={() => setShowCsvSection(v => !v)}
        />
        <ActionCard
          icon="📅"
          title="Add Reservation"
          description="Log a new booking manually"
          buttonLabel="Add Reservation"
          onAction={() => setShowReservationModal(true)}
        />
        <ActionCard
          icon="💳"
          title="Add Expense"
          description="Track a new expense as it happens"
          buttonLabel="Add Expense"
          onAction={() => setShowExpenseModal(true)}
        />
        <ActionCard
          icon="🔗"
          title="Direct Integrations"
          description="Coming soon — auto-sync from Airbnb, VRBO, and more"
          buttonLabel=""
          onAction={() => {}}
          comingSoon
        />
      </div>}

      {/* ── File upload section ─────────────────────────────────────────────── */}
      {showCsvSection && (
        <>
          {properties.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 32px', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏠</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0D2C54', marginBottom: '8px' }}>No properties yet</h2>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto 28px' }}>
                Create your first property before importing data.
              </p>
              <Link href="/properties" style={{
                display: 'inline-block', background: '#FF7767', color: '#fff',
                textDecoration: 'none', padding: '12px 28px', borderRadius: '8px',
                fontSize: '15px', fontWeight: '700', fontFamily: 'Raleway, sans-serif',
              }}>
                Go to Properties
              </Link>
            </div>
          ) : (
            <>
              {/* ── Property selector (single-property mode only) ──────────── */}
              {!multiPropertyMode && <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={labelStyle}>Property</div>
                    {properties.length === 1 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#0D2C54' }}>{properties[0].name}</span>
                        <span style={{ fontSize: '12px', color: '#aaa' }}>— uploading to this property</span>
                      </div>
                    ) : (
                      <select
                        value={selectedPropertyId}
                        onChange={e => handlePropertySelect(e.target.value)}
                        style={{ ...inputStyle, width: 'auto', minWidth: '260px', cursor: 'pointer' }}
                      >
                        <option value="">Select a property…</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                  {!showCreateForm && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      style={{
                        background: 'none', border: '1px solid #ddd', borderRadius: '8px',
                        padding: '8px 16px', fontSize: '13px', color: '#666',
                        fontFamily: 'Raleway, sans-serif', fontWeight: '500',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      + Add property
                    </button>
                  )}
                </div>
              </div>}

              {/* ── Inline create form ───────────────────────────────────────── */}
              {showCreateForm && (
                <div style={{ marginBottom: '24px' }}>
                  <PropertyForm
                    mode="create"
                    primaryClientId={primaryClientId}
                    onSuccess={handlePropertyCreated}
                    onCancel={() => setShowCreateForm(false)}
                  />
                </div>
              )}

              {/* ── File input ──────────────────────────────────────────────── */}
              <div style={{ ...cardStyle, marginBottom: '24px' }}>
                <div style={labelStyle}>CSV or Excel File</div>
                {selectedProperty && (
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
                    Uploading to: <strong style={{ color: '#0D2C54' }}>{selectedProperty.name}</strong>
                  </p>
                )}
                {!selectedPropertyId && !multiPropertyMode && properties.length > 1 && (
                  <p style={{ fontSize: '13px', color: '#FF7767', marginBottom: '10px' }}>
                    Select a property above before uploading.
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFile}
                  disabled={uploading}
                  style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer' }}
                />
                {parseStatus && (
                  <p style={{ marginTop: '12px', fontSize: '13px', color: isError ? '#B83224' : '#888' }}>
                    {parseStatus}
                  </p>
                )}
              </div>

              {/* ── Multi-property mode banner + resolution UI ──────────────── */}
              {multiPropertyMode && hasFileLoaded && (
                <div style={{ ...cardStyle, borderColor: '#FFE3DF', background: '#FFF9F8' }}>
                  <div style={{
                    fontSize: '12px', fontWeight: '700', color: '#FF7767',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
                  }}>
                    Multi-property file detected
                  </div>
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '14px', lineHeight: '1.5' }}>
                    Hostics found a Property column in this file. Rows will be split across properties automatically.
                  </div>

                  {unknownPropertyNames.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#1A6E47', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓</span> All property names matched existing properties.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '13px', color: '#0D2C54', fontWeight: '600', marginBottom: '10px' }}>
                        {unknownPropertyNames.length} property {unknownPropertyNames.length === 1 ? 'name' : 'names'} in the file {unknownPropertyNames.length === 1 ? "doesn't" : "don't"} match any of your properties:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        {unknownPropertyNames.map(name => (
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '13px', fontWeight: '600', color: '#0D2C54',
                              background: '#fff', padding: '6px 12px', borderRadius: '6px',
                              border: '1px solid #ddd', minWidth: '160px',
                            }}>
                              {name}
                            </span>
                            <span style={{ color: '#aaa' }}>→</span>
                            <select
                              value={unknownMappings[name] ?? ''}
                              onChange={e => setUnknownMappings(prev => ({ ...prev, [name]: e.target.value }))}
                              style={{ ...inputStyle, width: 'auto', minWidth: '240px', cursor: 'pointer' }}
                            >
                              <option value="">Choose an action…</option>
                              <option value="__new__">+ Create new property "{name}"</option>
                              <option disabled>──────────</option>
                              {properties.map(p => (
                                <option key={p.id} value={p.id}>Map to {p.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={applyUnknownMappings}
                        disabled={unknownPropertyNames.some(n => !unknownMappings[n]) || applyingMappings}
                        style={{
                          background: (unknownPropertyNames.some(n => !unknownMappings[n]) || applyingMappings) ? '#faa99f' : '#FF7767',
                          color: '#fff', border: 'none', padding: '10px 22px',
                          borderRadius: '8px', fontSize: '14px', fontWeight: '700',
                          fontFamily: 'Raleway, sans-serif',
                          cursor: (unknownPropertyNames.some(n => !unknownMappings[n]) || applyingMappings) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {applyingMappings ? 'Applying…' : 'Apply mapping'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Summary panel ───────────────────────────────────────────── */}
              {hasFileLoaded && (
                <div style={{ ...cardStyle, borderColor: '#e8edf3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{
                      fontSize: '12px', fontWeight: '700', color: '#0D2C54', margin: 0,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Import Summary
                      {fileType && fileType !== 'unknown' && (
                        <span style={{ marginLeft: '8px', fontWeight: '400', color: '#aaa', textTransform: 'none', letterSpacing: 0 }}>
                          — {fileType === 'reservations' ? 'Reservations' : 'Expenses'} file
                        </span>
                      )}
                    </h3>
                    {checkingDuplicates && (
                      <span style={{ fontSize: '12px', color: '#aaa' }}>Checking for duplicates…</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {!checkingDuplicates && duplicatesChecked && (() => {
                      const allDupes = readyRows.length === 0 && duplicateCount > 0
                      const mixed    = readyRows.length > 0 && duplicateCount > 0
                      const allNew   = readyRows.length > 0 && duplicateCount === 0

                      if (allDupes) return (
                        <div style={{ fontSize: '14px', color: '#888' }}>
                          This file has already been imported. All {duplicateCount.toLocaleString()} rows are already in your data.
                        </div>
                      )
                      if (mixed) return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1A6E47' }}>
                            <span>✓</span>
                            <strong>{readyRows.length.toLocaleString()} new {readyRows.length === 1 ? 'row' : 'rows'} ready to import</strong>
                          </div>
                          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px', marginLeft: '20px' }}>
                            ({duplicateCount.toLocaleString()} already {duplicateCount === 1 ? 'exists' : 'exist'} and will be skipped)
                          </div>
                        </div>
                      )
                      if (allNew) return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1A6E47' }}>
                          <span>✓</span>
                          <strong>{readyRows.length.toLocaleString()} {readyRows.length === 1 ? 'row' : 'rows'} ready to import</strong>
                        </div>
                      )
                      return null
                    })()}

                    {!duplicatesChecked && !checkingDuplicates && validRows.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1A6E47' }}>
                        <span>✓</span>
                        <span>
                          <strong>{validRows.length.toLocaleString()}</strong> {validRows.length === 1 ? 'row' : 'rows'} parsed
                        </span>
                        {!selectedPropertyId && !multiPropertyMode && (
                          <span style={{ fontSize: '12px', color: '#aaa', marginLeft: '4px' }}>
                            — select a property to check for duplicates
                          </span>
                        )}
                      </div>
                    )}

                    {invalidRows.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowInvalidDetail(v => !v)}
                          style={{
                            fontSize: '14px', color: '#B83224', background: 'none', border: 'none',
                            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px',
                            fontFamily: 'Raleway, sans-serif',
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>✗</span>
                          <span>
                            <strong>{invalidRows.length.toLocaleString()}</strong> {invalidRows.length === 1 ? 'row' : 'rows'} with invalid data
                          </span>
                          <span style={{ fontSize: '11px', color: '#aaa' }}>{showInvalidDetail ? '▲' : '▼'}</span>
                        </button>
                        {showInvalidDetail && (
                          <div style={{
                            marginTop: '8px', marginLeft: '24px',
                            paddingLeft: '12px', borderLeft: '2px solid #FFCDC7',
                          }}>
                            {invalidRows.slice(0, 8).map((r, i) => (
                              <div key={i} style={{ fontSize: '12px', color: '#888', marginBottom: '3px' }}>
                                Row {r.index + 1}: {r.reason}
                              </div>
                            ))}
                            {invalidRows.length > 8 && (
                              <div style={{ fontSize: '12px', color: '#aaa' }}>
                                …and {invalidRows.length - 8} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Preview table ────────────────────────────────────────────── */}
              {preview.length > 0 && (
                <>
                  <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0D2C54', marginBottom: '12px' }}>
                    Preview{' '}
                    <span style={{ fontWeight: '400', color: '#aaa', fontSize: '13px' }}>(first 5 rows)</span>
                  </h2>
                  <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                    <table style={{
                      width: '100%', borderCollapse: 'collapse', fontSize: '12px',
                      border: '1px solid #eee', background: '#fff', borderRadius: '8px', overflow: 'hidden',
                    }}>
                      <thead>
                        <tr>
                          {Object.keys(preview[0])
                            .filter(k => !k.startsWith('_'))
                            .map(key => <th key={key} style={thStyle}>{key}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                            {Object.entries(row)
                              .filter(([k]) => !k.startsWith('_'))
                              .map(([k, val]) => (
                                <td key={k} style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                  {val != null && val !== '' ? String(val) : <span style={{ color: '#ccc' }}>—</span>}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Progress bar ─────────────────────────────────────────────── */}
              {uploading && readyRows.length > 100 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#666' }}>Importing…</span>
                    <span style={{ fontSize: '13px', color: '#666' }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${uploadProgress}%`,
                      background: '#FF7767', borderRadius: '3px',
                      transition: 'width 0.25s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* ── Import button ─────────────────────────────────────────────── */}
              {hasFileLoaded && (selectedPropertyId || multiPropertyMode) && !checkingDuplicates && unknownPropertyNames.length === 0 && (
                duplicatesChecked && readyRows.length === 0 && duplicateCount > 0 ? (
                  <button disabled style={{
                    background: '#f0f0f0', color: '#aaa', border: 'none', padding: '12px 32px',
                    borderRadius: '8px', fontSize: '15px', fontFamily: 'Raleway, sans-serif',
                    fontWeight: '700', marginBottom: '24px', cursor: 'not-allowed',
                  }}>
                    Already imported
                  </button>
                ) : (
                  <button
                    onClick={handleUpload}
                    disabled={uploading || readyRows.length === 0}
                    style={{
                      background: (uploading || readyRows.length === 0) ? '#faa99f' : '#FF7767',
                      color: '#fff', border: 'none', padding: '12px 32px',
                      borderRadius: '8px', fontSize: '15px', fontFamily: 'Raleway, sans-serif',
                      fontWeight: '700', marginBottom: '24px',
                      cursor: (uploading || readyRows.length === 0) ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {uploading
                      ? (readyRows.length > 100 ? 'Importing…' : `Importing ${plural(readyRows.length, 'row')}…`)
                      : `Import ${plural(readyRows.length || validRows.length, fileType === 'expenses' ? 'expense' : 'reservation')}`}
                  </button>
                )
              )}

              {/* ── Upload error ──────────────────────────────────────────────── */}
              {uploadError && (
                <div style={{
                  padding: '12px 16px', background: '#FFF0EE', border: '1px solid #FFCDC7',
                  borderRadius: '8px', marginBottom: '24px', fontSize: '14px', color: '#B83224',
                }}>
                  {uploadError}
                </div>
              )}

              {/* ── Upload result ─────────────────────────────────────────────── */}
              {uploadResult && (
                <div style={{
                  padding: '14px 18px', background: '#F0FFF8', border: '1px solid #A8E6C3',
                  borderRadius: '8px', marginBottom: '32px', fontSize: '14px', color: '#1A6E47',
                }}>
                  <strong>
                    {plural(uploadResult.imported, `new ${uploadResult.kind}`)} imported.
                  </strong>
                  {uploadResult.duplicatesSkipped > 0 && (
                    <span style={{ color: '#888', marginLeft: '8px', fontSize: '13px' }}>
                      ({uploadResult.duplicatesSkipped.toLocaleString()} already existed and {uploadResult.duplicatesSkipped === 1 ? 'was' : 'were'} skipped)
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Upload history ───────────────────────────────────────────────────── */}
      {uploadHistory.length > 0 && (
        <div style={{ marginTop: showCsvSection ? '16px' : '0' }}>
          <h2 style={{
            fontSize: '13px', fontWeight: '700', color: '#0D2C54',
            marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Recent Uploads
          </h2>
          <div style={{
            background: '#fff', border: '1px solid #eee',
            borderRadius: '12px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Property', 'File', 'Rows'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map((h, i) => (
                  <tr key={h.id} style={{ borderBottom: i < uploadHistory.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={tdStyle}>
                      {new Date(h.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: h.upload_type === 'reservations' ? '#EBF4FF' : '#FFF4E5',
                        color: h.upload_type === 'reservations' ? '#1A5CA8' : '#A85C1A',
                        padding: '2px 9px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: '600',
                      }}>
                        {h.upload_type === 'reservations' ? 'Reservations' : 'Expenses'}
                      </span>
                    </td>
                    <td style={tdStyle}>{h.properties?.name ?? '—'}</td>
                    <td style={{ ...tdStyle, color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.filename ?? '—'}
                    </td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>
                      {h.row_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={showReservationModal} onClose={() => setShowReservationModal(false)} title="Add Reservation">
        <ReservationForm
          onSuccess={() => setShowReservationModal(false)}
          onCancel={() => setShowReservationModal(false)}
        />
      </Modal>

      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Add Expense">
        <ExpenseForm
          onSuccess={() => setShowExpenseModal(false)}
          onCancel={() => setShowExpenseModal(false)}
        />
      </Modal>
    </main>
  )
}
