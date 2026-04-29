'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Financials', href: '/financials', icon: '💰' },
  { label: 'Bookings', href: '/bookings', icon: '📅' },
  { label: 'Properties', href: '/properties', icon: '🏠' },
  { label: 'Import Data', href: '/upload', icon: '📁' },
]

const ANALYTICS_PATHS = ['/', '/financials', '/bookings']

export default function Sidebar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function buildHref(itemHref: string) {
    const qs = searchParams.toString()
    if (!qs || !ANALYTICS_PATHS.includes(itemHref)) return itemHref
    return `${itemHref}?${qs}`
  }

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: '#0D2C54',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
    }}>
      {/* Logo area */}
      <div style={{
        padding: '28px 24px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Image
          src="/hostics-logo-coral-white.svg"
          alt="Hostics — STR Analytics"
          width={140}
          height={40}
          style={{ height: 'auto' }}
          priority
        />
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {navItems.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={buildHref(item.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#FF7767' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'rgba(255,119,103,0.12)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.3)',
      }}>
        Hostics © 2025
      </div>
    </aside>
  )
}
