'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

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

const toggleStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#FF7767',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '0',
  fontFamily: 'Raleway, sans-serif',
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
        return
      }

      // ── Sign up ──────────────────────────────────────────────────────────
      // Delegate to the server-side API route, which uses the service role key
      // to create the auth user and all related records atomically.
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountName: name.trim() || email }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Sign up failed. Please try again.')

      // User is confirmed server-side (email_confirm: true), so sign in immediately.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

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
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '48px 44px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #eee',
      }}>
        {/* Wordmark */}
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

        <h2 style={{
          fontSize: '17px',
          fontWeight: '700',
          color: '#0D2C54',
          marginBottom: '28px',
          textAlign: 'center',
        }}>
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </h2>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFF0EE',
              border: '1px solid #FFCDC7',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#B83224',
              lineHeight: '1.5',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#faa99f' : '#FF7767',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Raleway, sans-serif',
              letterSpacing: '0.02em',
              transition: 'background 0.15s ease',
            }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#888' }}>
          {mode === 'signin' ? (
            <>Don&apos;t have an account?{' '}
              <button onClick={() => switchMode('signup')} style={toggleStyle}>Sign Up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => switchMode('signin')} style={toggleStyle}>Sign In</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
