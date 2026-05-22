'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

// Styles mirrored from app/login/page.tsx so this reads as a sibling screen.
const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  padding: '48px 44px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  border: '1px solid #eee',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#0D2C54',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'Raleway, sans-serif',
  color: '#0D2C54',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
}

const h2Style: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: '700',
  color: '#0D2C54',
  marginBottom: '28px',
  textAlign: 'center',
}

const errorBannerStyle: React.CSSProperties = {
  background: '#FFF0EE',
  border: '1px solid #FFCDC7',
  borderRadius: '8px',
  padding: '12px 14px',
  marginBottom: '20px',
  fontSize: '13px',
  color: '#B83224',
  lineHeight: '1.5',
}

const successBannerStyle: React.CSSProperties = {
  background: '#F0FFF8',
  border: '1px solid #A8E6C3',
  borderRadius: '8px',
  padding: '12px 14px',
  fontSize: '13px',
  color: '#1A6E47',
  lineHeight: '1.5',
  textAlign: 'center',
}

function submitButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px',
    background: disabled ? '#faa99f' : '#FF7767',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Raleway, sans-serif',
    letterSpacing: '0.02em',
    transition: 'background 0.15s ease',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'block',
    boxSizing: 'border-box',
  }
}

type Status = 'loading' | 'ready' | 'invalid' | 'success'

function ResetShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F9FB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Raleway, sans-serif',
      padding: '24px',
    }}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Image
            src="/hostics-logo-coral-navy.svg"
            alt="Hostics — STR Analytics"
            width={200}
            height={56}
            style={{ height: 'auto' }}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus]         = useState<Status>('loading')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Establish the recovery session. The browser client (lib/supabase.js) is
  // @supabase/ssr createBrowserClient with default config — PKCE flow,
  // detectSessionInUrl on. We handle PKCE (?code=) and the auto-detected /
  // implicit PASSWORD_RECOVERY path defensively so either configuration works.
  useEffect(() => {
    let resolved = false
    const markReady = () => {
      if (!resolved) { resolved = true; setStatus('ready') }
    }
    const markInvalid = () => {
      if (!resolved) { resolved = true; setStatus('invalid') }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) markReady()
    })

    ;(async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const errorDescription = url.searchParams.get('error_description')

      if (errorDescription) {
        setError(errorDescription)
        markInvalid()
        return
      }

      // detectSessionInUrl may have already established the session.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { markReady(); return }

      // PKCE: exchange the ?code= for a recovery session.
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) { markReady(); return }
      }

      // Give the implicit-flow listener a brief window to fire, then give up.
      setTimeout(markInvalid, 1500)
    })()

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setStatus('success')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1400)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update your password. Please try again.')
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <ResetShell>
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#888' }}>
          Verifying your reset link…
        </p>
      </ResetShell>
    )
  }

  if (status === 'invalid') {
    return (
      <ResetShell>
        <h2 style={h2Style}>Reset link invalid or expired</h2>
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>
          {error ?? 'This reset link is invalid or has expired. Request a new one to continue.'}
        </p>
        <Link href="/login" style={submitButtonStyle(false)}>
          Back to sign in
        </Link>
      </ResetShell>
    )
  }

  if (status === 'success') {
    return (
      <ResetShell>
        <div style={successBannerStyle}>
          Password updated. Redirecting to your dashboard…
        </div>
      </ResetShell>
    )
  }

  // status === 'ready'
  return (
    <ResetShell>
      <h2 style={h2Style}>Set a new password</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={labelStyle}>Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={errorBannerStyle}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} style={submitButtonStyle(submitting)}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </ResetShell>
  )
}
