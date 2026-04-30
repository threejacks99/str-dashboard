'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import AuthGuard from './AuthGuard'
import Sidebar from './Sidebar'
import Header from './Header'

const PUBLIC_ROUTES = ['/', '/login']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FB' }}>
        <Suspense fallback={null}><Sidebar /></Suspense>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header />
          <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
