'use client'

import { Suspense, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AuthGuard from './AuthGuard'
import Sidebar from './Sidebar'
import Header from './Header'
import TrialBanner from './TrialBanner'

const PUBLIC_ROUTES = ['/', '/login']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useEffect(() => { setSidebarOpen(false) }, [pathname])   // close drawer on navigation

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FB' }}>
        <Suspense fallback={null}><Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /></Suspense>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <TrialBanner />
          <main className="hostics-main">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
