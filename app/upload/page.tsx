'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { mapColumns, mapRow, detectFileType, mapExpenseColumns, mapExpenseRow } from '../../lib/csvMapper'
import { supabase } from '../../lib/supabase'

interface Property {
  id: string
  name: string
}

export default function UploadPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [propertiesLoading, setPropertiesLoading] = useState(true)

  const [status, setStatus] = useState<string>('')
  const [preview, setPreview] = useState<any[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileType, setFileType] = useState<'reservations' | 'expenses' | 'unknown' | null>(null)
  const [uploading, setUploading] = useState(false)

  // Fetch properties the current user has access to.
  // With RLS in place, this automatically scopes to the user's account.
  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name')

      if (!error && data) {
        setProperties(data)
        if (data.length === 1) setSelectedPropertyId(data[0].id)
      }
      setPropertiesLoading(false)
    }
    loadProperties()
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('Reading file...')
    setPreview([])
    setParsedRows([])
    setFileType(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        return Array.from(header)
          .filter(ch => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126)
          .join('')
          .trim()
      },
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
          const mapping = mapColumns(headers)
          const mappedRows = rows
            .map(row => mapRow(row, mapping))
            .filter(row => row.check_in && row.check_out)
          setParsedRows(mappedRows)
          setPreview(mappedRows.slice(0, 5))
          setStatus(`Detected: Reservation file. Ready to import ${mappedRows.length} reservations.`)
        } else {
          const mapping = mapExpenseColumns(headers)
          const mappedRows = rows
            .map(row => mapExpenseRow(row, mapping))
            .filter(row => row.paid_date && row.amount)
          setParsedRows(mappedRows)
          setPreview(mappedRows.slice(0, 5))
          setStatus(`Detected: Expense file. Ready to import ${mappedRows.length} expenses.`)
        }
      },
      error: (error) => {
        setStatus(`Error reading file: ${error.message}`)
      }
    })
  }

  async function handleUpload() {
    if (parsedRows.length === 0 || !fileType || !selectedPropertyId) return
    setUploading(true)
    setStatus('Uploading...')

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

  const isError = status.includes('failed') || status.includes('Could not')
  const isSuccess = status.includes('Successfully')

  // ── No properties yet ──────────────────────────────────────────────────────
  if (!propertiesLoading && properties.length === 0) {
    return (
      <main style={{ padding: '40px', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
          Import Data
        </h1>
        <div style={{
          marginTop: '48px',
          textAlign: 'center',
          padding: '48px 32px',
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #eee',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏠</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0D2C54', marginBottom: '8px' }}>
            No properties found
          </h2>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            You need at least one property before you can import data.
            Create a property in your account settings to get started.
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            background: '#0D2C54',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none',
            fontFamily: 'Raleway, sans-serif',
          }}>
            Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        Import Data
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Upload your CSV export from Airbnb, VRBO, or your property manager.
        We'll automatically detect whether it's a reservation or expense file.
      </p>

      {/* Property selector */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: '#0D2C54',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Property
        </label>
        {propertiesLoading ? (
          <div style={{
            height: '40px',
            background: '#e8eaed',
            borderRadius: '8px',
            width: '280px',
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
          }} />
        ) : properties.length === 1 ? (
          <div style={{
            padding: '10px 14px',
            background: '#f5f7fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#0D2C54',
            fontWeight: '500',
            display: 'inline-block',
          }}>
            {properties[0].name}
          </div>
        ) : (
          <select
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0D2C54',
              background: '#fff',
              fontFamily: 'Raleway, sans-serif',
              minWidth: '280px',
              cursor: 'pointer',
            }}
          >
            <option value="">Select a property…</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        disabled={!selectedPropertyId}
        style={{ marginBottom: '16px', display: 'block', cursor: selectedPropertyId ? 'pointer' : 'not-allowed' }}
      />
      {!selectedPropertyId && !propertiesLoading && properties.length > 1 && (
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
          Select a property above before uploading.
        </p>
      )}

      {status && (
        <p style={{
          padding: '12px 16px',
          background: isError ? '#fff0f0' : isSuccess ? '#f0fff4' : '#f0f4ff',
          border: `1px solid ${isError ? '#ffcccc' : isSuccess ? '#c3e6cb' : '#c3d0f5'}`,
          borderRadius: '8px',
          marginBottom: '24px',
          color: isError ? '#cc0000' : isSuccess ? '#2d6a4f' : '#2d3a8c',
        }}>
          {status}
        </p>
      )}

      {preview.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>Preview (first 5 rows)</h2>
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: '13px', border: '1px solid #e0e0e0',
            }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key} style={{
                      padding: '8px 12px', textAlign: 'left',
                      borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap',
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
                      <td key={j} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
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
              background: '#0D2C54',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: '600',
              cursor: uploading || !selectedPropertyId ? 'not-allowed' : 'pointer',
              opacity: uploading || !selectedPropertyId ? 0.7 : 1,
            }}
          >
            {uploading ? 'Importing...' : `Import ${parsedRows.length} ${fileType}`}
          </button>
        </>
      )}
    </main>
  )
}
