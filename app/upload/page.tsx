'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { mapColumns, mapRow, detectFileType, mapExpenseColumns, mapExpenseRow } from '../../lib/csvMapper'
import { supabase } from '../../lib/supabase'

const PROPERTY_ID = '2246b102-f62f-4620-896e-dec1b95f2602'

export default function UploadPage() {
  const [status, setStatus] = useState<string>('')
  const [preview, setPreview] = useState<any[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileType, setFileType] = useState<'reservations' | 'expenses' | 'unknown' | null>(null)
  const [uploading, setUploading] = useState(false)

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
    if (parsedRows.length === 0 || !fileType) return
    setUploading(true)
    setStatus('Uploading...')

    const rows = parsedRows.map(row => ({
      ...row,
      property_id: PROPERTY_ID,
    }))

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
  const isDetected = status.includes('Detected')

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Import Data</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Upload your CSV export from Airbnb, VRBO, or your property manager. 
        We'll automatically detect whether it's a reservation or expense file.
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        style={{ marginBottom: '16px', display: 'block' }}
      />

      {status && (
        <p style={{
          padding: '12px 16px',
          background: isError ? '#fff0f0' : isSuccess ? '#f0fff4' : '#f0f4ff',
          border: `1px solid ${isError ? '#ffcccc' : isSuccess ? '#c3e6cb' : '#c3d0f5'}`,
          borderRadius: '8px',
          marginBottom: '24px',
          color: isError ? '#cc0000' : isSuccess ? '#2d6a4f' : '#2d3a8c'
        }}>
          {status}
        </p>
      )}

      {preview.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>
            Preview (first 5 rows)
          </h2>
          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: '13px', border: '1px solid #e0e0e0'
            }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key} style={{
                      padding: '8px 12px', textAlign: 'left',
                      borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap'
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
            disabled={uploading}
            style={{
              background: '#0D2C54',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1
            }}
          >
            {uploading ? 'Importing...' : `Import ${parsedRows.length} ${fileType}`}
          </button>
        </>
      )}
    </main>
  )
}