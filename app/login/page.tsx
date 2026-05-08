'use client'

import Image from 'next/image'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import TierPicker from '../components/TierPicker'
import { type Tier, type BillingInterval } from '../../lib/billing'

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

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  padding: '48px 44px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  border: '1px solid #eee',
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const invited = searchParams.get('invited') === '1'

  const [mode, setMode]     = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]   = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [name, setName]     = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [selectedTier, setSelectedTier]         = useState<Tier | undefined>(undefined)
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly')

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setError(null)
    setSelectedTier(undefined)
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
      // Belt-and-suspenders: submit button is also disabled when no tier
      // is picked, but Enter-key submission can bypass disabled state.
      if (!selectedTier) {
        setError('Please select a plan to continue.')
        return
      }

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

      // Send straight to Stripe Checkout for tier+interval selected above.
      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, interval: selectedInterval }),
      })
      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok || !checkoutData.url) {
        throw new Error(checkoutData.error ?? 'Account created but could not start checkout. Please go to /billing to choose a plan.')
      }
      window.location.href = checkoutData.url
      return
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const signinDisabled = loading
  const signupDisabled = loading || !selectedTier || !email || !password

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
      {mode === 'signin' ? (
        <div style={cardStyle}>
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
            Sign in to your account
          </h2>

          {invited && (
            <div style={{
              background: '#F0FFF8',
              border: '1px solid #A8E6C3',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#1A6E47',
              lineHeight: 1.5,
            }}>
              Account created. Sign in to access your dashboard.
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                autoComplete="current-password"
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
              disabled={signinDisabled}
              style={{
                width: '100%',
                padding: '12px',
                background: signinDisabled ? '#faa99f' : '#FF7767',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: signinDisabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Raleway, sans-serif',
                letterSpacing: '0.02em',
                transition: 'background 0.15s ease',
              }}
            >
              {loading ? 'Please wait…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#888' }}>
            Don&apos;t have an account?{' '}
            <button onClick={() => switchMode('signup')} style={toggleStyle}>Sign Up</button>
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '1100px' }}>
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
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            Create your account
          </h2>

          <p style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#666',
            fontFamily: 'Raleway, sans-serif',
            margin: '0 0 16px',
          }}>
            Choose your plan and billing cycle to continue:
          </p>

          <div style={{ marginBottom: '32px' }}>
            <TierPicker
              onSelect={(tier, interval) => {
                setSelectedTier(tier)
                setSelectedInterval(interval)
              }}
              onIntervalChange={(interval) => setSelectedInterval(interval)}
              selectedTier={selectedTier}
              ctaLabel="Select"
              requireSelection={true}
            />
          </div>

          <div style={{ ...cardStyle, margin: '0 auto' }}>
            <form onSubmit={handleSubmit}>
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
                  autoComplete="new-password"
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
                disabled={signupDisabled}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: signupDisabled ? '#faa99f' : '#FF7767',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: signupDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'Raleway, sans-serif',
                  letterSpacing: '0.02em',
                  transition: 'background 0.15s ease',
                }}
              >
                {loading ? 'Please wait…' : 'Continue to checkout'}
              </button>

              <p style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#888',
                textAlign: 'center',
                fontFamily: 'Raleway, sans-serif',
                lineHeight: 1.5,
              }}>
                You&apos;ll enter card details next. Not charged until day 15 — cancel anytime before then.
              </p>
            </form>

            <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: '#888' }}>
              Already have an account?{' '}
              <button onClick={() => switchMode('signin')} style={toggleStyle}>Sign In</button>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
