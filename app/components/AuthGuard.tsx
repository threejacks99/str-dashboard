'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Three states: checking (unknown), authed, unauthed.
  // Start as 'checking' so we never flash a redirect on page load.
  const [status, setStatus] = useState<'checking' | 'authed' | 'unauthed'>('checking')

  useEffect(() => {
    // Resolve the initial session from local storage / cookie immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('authed')
      } else {
        setStatus('unauthed')
        router.replace('/login')
      }
    })

    // Keep in sync with sign-in / sign-out events that happen in other tabs
    // or as a result of token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setStatus('authed')
      } else {
        setStatus('unauthed')
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (status === 'checking') {
    return (
      <>
        <style>{`
          @keyframes auth-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F9FB',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid #e8eaed',
            borderTopColor: '#FF7767',
            animation: 'auth-spin 0.7s linear infinite',
          }} />
        </div>
      </>
    )
  }

  if (status === 'unauthed') return null

  return <>{children}</>
}
