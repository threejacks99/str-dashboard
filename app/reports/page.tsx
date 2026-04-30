export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAuthenticatedClient, getCurrentUserAccount, getAccessibleClientIds } from '../../lib/auth'
import ReportCards from '../components/reports/ReportCards'

interface Property {
  id: string
  name: string
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0D2C54', marginBottom: '8px' }}>
        No data to export yet
      </h2>
      <p style={{ color: '#888', fontSize: '15px', marginBottom: '28px', maxWidth: '340px', lineHeight: '1.6' }}>
        Upload your first CSV to generate tax-ready reports.
      </p>
      <Link href="/upload" style={{
        background: '#FF7767', color: '#fff', padding: '12px 28px', borderRadius: '8px',
        fontSize: '15px', fontWeight: '700', textDecoration: 'none', fontFamily: 'Raleway, sans-serif',
      }}>
        Upload data
      </Link>
    </div>
  )
}

export default async function ReportsPage() {
  const supabase    = await createAuthenticatedClient()
  const userAccount = await getCurrentUserAccount()
  const clientIds   = await getAccessibleClientIds(userAccount)

  if (!clientIds.length) return <EmptyState />

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .in('client_id', clientIds)
    .order('name')

  const props = (properties ?? []) as Property[]
  if (!props.length) return <EmptyState />

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0D2C54', marginBottom: '4px' }}>
          Reports
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Generate accountant-ready exports for tax season and operations
        </p>
      </div>

      <ReportCards properties={props} />
    </div>
  )
}
