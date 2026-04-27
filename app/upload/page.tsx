'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { mapColumns, mapRow, detectFileType, mapExpenseColumns, mapExpenseRow } from '../../lib/csvMapper'
import { supabase } from '../../lib/supabase'
import PropertyForm from '../components/PropertyForm'

interface Property {
  id: string
  name: string
}

// ── Shared style tokens ────────────────────────────────────────────────────────
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [properties, setProperties]           = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null)
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [showCreateForm, setShowCreateForm]   = useState(false)

  const [status, setStatus]       = useState<string>('')
  const [preview, setPreview]     = useState<any[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileType, setFileType]   = useState<'reservations' | 'expenses' | 'unknown' | null>(null)
  const [uploading, setUploading] = useState(false)

  async function loadProperties() {
    const [propertiesRes, clientsRes] = await Promise.all([
      supabase.from('properties').select('id, name').order('name'),
      supabase.from('clients').select('id').order('created_at', { ascending: true }).limit(1),
    ])

    const props = propertiesRes.data ?? []
    setProperties(props)
    if (props.length === 1) setSelectedPropertyId(props[0].id)
    if (props.length > 1)  setSelectedPropertyId('')

    if (clientsRes.data?.length) setPrimaryClientId(clientsRes.data[0].id)
    setPropertiesLoading(false)
  }

  useEffect(() => { loadProperties() }, [])

  async function handlePropertyCreated(result?: { id: string; name: string }) {
    if (!result) return
    setShowCreateForm(false)
    const { data } = await supabase.from('properties').select('id, name').order('name')
    const props = data ?? []
    setProperties(props)
    setSelectedPropertyId(result.id)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('Reading file…')
    setPreview([])
    setParsedRows([])
    setFileType(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) =>
        Array.from(header)
          .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)
          .join('')
          .trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? []
        const detected = detectFileType(headers)
        setFileType(detected)

        if (detected === 'unknown') {
          setStatus('Could not detect file type. Please upload a reservations or expenses CSV.')
          return
        }

        const rows = results.data as Record<string, string>[]

        if (detected === 'reservations') {
          const mapped = rows
            .map(row => mapRow(row, mapColumns(headers)))
            .filter(row => row.check_in && row.check_out)
          setParsedRows(mapped)
          setPreview(mapped.slice(0, 5))
          setStatus(`Detected: Reservation file. Ready to import ${mapped.length} reservations.`)
        } else {
          const mapped = rows
            .map(row => mapExpenseRow(row, mapExpenseColumns(headers)))
            .filter(row => row.paid_date && row.amount)
          setParsedRows(mapped)
          setPreview(mapped.slice(0, 5))
          setStatus(`Detected: Expense file. Ready to import ${mapped.length} expenses.`)
        }
      },
      error: (err) => setStatus(`Error reading file: ${err.message}`),
    })
  }

  async function handleUpload() {
    if (!parsedRows.length || !fileType || !selectedPropertyId) return
    setUploading(true)
    setStatus('Uploading…')

    const rows = parsedRows.map(row => ({ ...row, property_id: selectedPropertyId }))
    const table = fileType === 'reservations' ? 'reservations' : 'expenses'
    const { error } = await supabase.from(table).insert(rows)

    if (error) {
      setStatus(`Upload failed: ${error.message}`)
    } else {
      setStatus(`Successfully imported ${rows.length} ${fileType}!`)
      setPreview([])
      setParsedRows([])
      setFileType(null)
    }
    setUploading(false)
  }

  const isError   = status.includes('failed') || status.includes('Could not')
  const isSuccess = status.includes('Successfully')
  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (propertiesLoading) {
    return (
      <main style={{ padding: '40px', maxWidth: '900px', fontFamily: 'Raleway, sans-serif' }}>
        <div style={{ width: '180px', height: '28px', background: '#e8eaed', borderRadius: '8px', marginBottom: '12px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '320px', height: '16px', background: '#e8eaed', borderRadius: '6px', marginBottom: '40px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '280px', height: '40px', background: '#e8eaed', borderRadius: '8px', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
      </main>
    )
  }

  // ── Zero properties ──────────────────────────────────────────────────────────
  if (properties.length === 0) {
    return (
      <main style={{ padding: '40px', maxWidth: '560px', fontFamily: 'Raleway, sans-serif' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Import Data
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          Upload your CSV export from Airbnb, VRBO, or your property manager.
        </p>

        <div style={{
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏠</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0D2C54', marginBottom: '8px' }}>
            No properties yet
          </h2>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px', maxWidth: '300px', margin: '0 auto 28px' }}>
            Create your first property before importing data.
          </p>
          <Link
            href="/properties"
            style={{
              display: 'inline-block',
              background: '#FF7767',
              color: '#fff',
              textDecoration: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'Raleway, sans-serif',
            }}
          >
            Go to Properties
          </Link>
        </div>
      </main>
    )
  }

  // ── Normal upload UI (one or more properties) ────────────────────────────────
  return (
    <main style={{ padding: '40px', maxWidth: '900px', fontFamily: 'Raleway, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
        Import Data
      </h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>
        Upload your CSV export from Airbnb, VRBO, or your property manager.
        We'll automatically detect whether it's a reservation or expense file.
      </p>

      {/* ── Property selector ──────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={labelStyle}>Property</div>
            {properties.length === 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#0D2C54' }}>
                  {properties[0].name}
                </span>
                <span style={{ fontSize: '12px', color: '#aaa' }}>— uploading to this property</span>
              </div>
            ) : (
              <select
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '260px', cursor: 'pointer' }}
              >
                <option value="">Select a property…</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                color: '#666',
                fontFamily: 'Raleway, sans-serif',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Add property
            </button>
          )}
        </div>
      </div>

      {/* Inline create form (rendered below selector, not inside it) */}
      {showCreateForm && (
        <div style={{ marginBottom: '28px' }}>
          <PropertyForm
            mode="create"
            primaryClientId={primaryClientId}
            onSuccess={handlePropertyCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* ── File input ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        {selectedProperty && (
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
            Uploading to: <strong style={{ color: '#0D2C54' }}>{selectedProperty.name}</strong>
          </p>
        )}
        {!selectedPropertyId && properties.length > 1 && (
          <p style={{ fontSize: '13px', color: '#FF7767', marginBottom: '10px' }}>
            Select a property above before uploading.
          </p>
        )}
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          disabled={!selectedPropertyId}
          style={{ display: 'block', cursor: selectedPropertyId ? 'pointer' : 'not-allowed' }}
        />
      </div>

      {/* ── Status message ─────────────────────────────────────────────────── */}
      {status && (
        <p style={{
          padding: '12px 16px',
          background: isError ? '#fff0f0' : isSuccess ? '#f0fff4' : '#f0f4ff',
          border: `1px solid ${isError ? '#ffcccc' : isSuccess ? '#c3e6cb' : '#c3d0f5'}`,
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          color: isError ? '#cc0000' : isSuccess ? '#2d6a4f' : '#2d3a8c',
        }}>
          {status}
        </p>
      )}

      {/* ── Preview table + import button ───────────────────────────────────── */}
      {preview.length > 0 && (
        <>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0D2C54', marginBottom: '12px' }}>
            Preview <span style={{ fontWeight: '400', color: '#aaa', fontSize: '14px' }}>(first 5 rows)</span>
          </h2>
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              border: '1px solid #e0e0e0',
              background: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <thead>
                <tr style={{ background: '#f5f7fa' }}>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key} style={{
                      padding: '9px 12px',
                      textAlign: 'left',
                      borderBottom: '1px solid #e0e0e0',
                      whiteSpace: 'nowrap',
                      fontWeight: '600',
                      color: '#0D2C54',
                      fontSize: '12px',
                    }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#444' }}>
                        {val ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedPropertyId}
            style={{
              background: uploading || !selectedPropertyId ? '#faa99f' : '#FF7767',
              color: '#fff',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '15px',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: '700',
              cursor: uploading || !selectedPropertyId ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {uploading ? 'Importing…' : `Import ${parsedRows.length} ${fileType}`}
          </button>
        </>
      )}
    </main>
  )
}
