'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import DateRangeFilter from './DateRangeFilter'
import PropertySelector from './PropertySelector'

function HelpLink() {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href="/help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '13px',
        fontWeight: 500,
        color: hovered ? '#FF7767' : '#0D2C54',
        textDecoration: 'none',
        transition: 'color 0.15s ease',
        fontFamily: 'Raleway, sans-serif',
      }}
    >
      <span style={{ fontSize: '14px', lineHeight: 1 }}>?</span>
      <span>Help</span>
    </Link>
  )
}

export default function Header() {
  const router   = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = email ? email[0].toUpperCase() : '?'

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #eee',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      {/* Left: property selector + date range filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {['/dashboard', '/financials', '/bookings'].includes(pathname) && (
          <>
            <Suspense fallback={null}>
              <PropertySelector />
            </Suspense>
            <Suspense fallback={null}>
              <DateRangeFilter />
            </Suspense>
          </>
        )}
      </div>

      {/* Right: help link + user avatar */}
      {email && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HelpLink />
          <span style={{ fontSize: '13px', color: '#666' }}>{email}</span>

          {/* Avatar + dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              aria-label="Account menu"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FF7767',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                fontFamily: 'Raleway, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'opacity 0.15s ease',
                opacity: dropdownOpen ? 0.85 : 1,
              }}
            >
              {initial}
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                minWidth: '160px',
                zIndex: 100,
                overflow: 'hidden',
              }}>
                <a
                  href="/billing"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    color: '#0D2C54',
                    textDecoration: 'none',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: '500',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget.style.background = '#F5F7FA') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = 'none') }}
                  onClick={() => setDropdownOpen(false)}
                >
                  Billing
                </a>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid #f0f0f0',
                    textAlign: 'left',
                    fontSize: '14px',
                    color: signingOut ? '#aaa' : '#0D2C54',
                    cursor: signingOut ? 'not-allowed' : 'pointer',
                    fontFamily: 'Raleway, sans-serif',
                    fontWeight: '500',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => {
                    if (!signingOut) (e.currentTarget.style.background = '#FFF5F4')
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget.style.background = 'none')
                  }}
                >
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

