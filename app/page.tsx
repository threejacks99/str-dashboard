'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// ── Brand tokens ───────────────────────────────────────────────────────────────
const CORAL     = '#FF7767'
const NAVY      = '#0D2C54'
const DARK_NAVY = '#0a233f'
const SAGE      = '#4CAF82'
const LIGHT_BG  = '#FFF8F6'
const AMBER_BG  = '#FFF4E5'

// ── Testimonials gate ──────────────────────────────────────────────────────────
const SHOW_TESTIMONIALS = false

// ── Scroll fade-in hook ────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function FadeIn({
  children, delay = 0, style,
}: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const { ref, visible } = useFadeIn()
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Eyebrow label ──────────────────────────────────────────────────────────────
function Eyebrow({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: '700', color: CORAL,
      letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px',
    }}>
      {text}
    </div>
  )
}

// ── SECTION 1: Navigation bar ──────────────────────────────────────────────────
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#fff', borderBottom: '1px solid #eee',
    }}>
      <div style={{
        maxWidth: '1140px', margin: '0 auto',
        padding: '18px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Image
            src="/hostics-logo-coral-navy.svg"
            alt="Hostics"
            width={140}
            height={40}
            style={{ height: 'auto', display: 'block' }}
            priority
          />
        </Link>

        {/* Center nav — desktop */}
        <nav className="landing-nav-center" aria-label="Main navigation">
          {['Features', 'Pricing', 'FAQ'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="landing-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right actions — desktop */}
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-signin-link">Sign In</Link>
          <Link href="/login" className="landing-cta-btn">Start Free Trial</Link>
        </div>

        {/* Hamburger — mobile */}
        <button
          className="landing-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '22px', color: NAVY, padding: '4px',
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          background: '#fff', borderTop: '1px solid #eee',
          padding: '16px 32px 24px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          {['Features', 'Pricing', 'FAQ'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', padding: '12px 0',
                fontSize: '16px', fontWeight: '600', color: NAVY,
                textDecoration: 'none', borderBottom: '1px solid #f0f0f0',
              }}
            >
              {label}
            </a>
          ))}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
            <Link href="/login" style={{ fontSize: '15px', fontWeight: '600', color: NAVY, textDecoration: 'none' }}>
              Sign In
            </Link>
            <Link href="/login" style={{
              background: CORAL, color: '#fff', padding: '10px 20px',
              borderRadius: '8px', fontSize: '14px', fontWeight: '700',
              textDecoration: 'none',
            }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ── Dashboard mockup for hero ──────────────────────────────────────────────────
function MockDashboard() {
  const barHeights = [39, 50, 63, 59, 77, 87, 100, 95, 74, 66, 60, 71]
  const barLabels  = ['May', '', 'Jul', '', 'Sep', '', 'Nov', '', 'Jan', '', 'Mar', '']

  return (
    <div style={{
      borderRadius: '12px', overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(13,44,84,0.22)',
      border: '1px solid rgba(0,0,0,0.08)',
      width: '100%', maxWidth: '560px',
    }}>
      {/* Browser chrome */}
      <div style={{ background: NAVY, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FF5F57', flexShrink: 0 }} />
        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FFBD2E', flexShrink: 0 }} />
        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#28CA41', flexShrink: 0 }} />
        <div style={{
          marginLeft: '10px', flex: 1, background: 'rgba(255,255,255,0.08)',
          borderRadius: '4px', padding: '3px 10px',
          fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace',
        }}>
          app.hostics.app/dashboard
        </div>
      </div>

      {/* App content */}
      <div style={{ background: '#F8F9FB', padding: '14px' }}>
        {/* Mini header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: NAVY }}>Dashboard</div>
            <div style={{ fontSize: '10px', color: '#888' }}>All Properties · Last 12 months</div>
          </div>
          <div style={{
            fontSize: '10px', background: '#fff', border: '1px solid #eee',
            borderRadius: '6px', padding: '4px 10px', color: '#666',
          }}>
            Last 12 months ▾
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
          {[
            { label: 'Total Income', value: '$58,589', delta: '↑ 60%' },
            { label: 'NOI',          value: '$22,341', delta: '↑ 99%' },
            { label: 'Occupancy',    value: '38.3%',   delta: '↑ 69%' },
          ].map(k => (
            <div key={k.label} style={{
              background: '#fff', borderRadius: '8px', padding: '10px 10px 8px',
              border: '1px solid #eee', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: '8px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                {k.label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: NAVY, lineHeight: 1, marginBottom: '4px' }}>
                {k.value}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: SAGE }}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid #eee' }}>
          <div style={{ fontSize: '9px', fontWeight: '600', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Monthly Revenue
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px' }}>
            {barHeights.map((h, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: '2px 2px 0 0',
                height: `${(h / 100) * 64}px`,
                background: i === 6 ? CORAL : `rgba(13,44,84,${0.12 + (h / 100) * 0.45})`,
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '3px', marginTop: '5px' }}>
            {barLabels.map((label, i) => (
              <div key={i} style={{ flex: 1, fontSize: '7px', color: '#bbb', textAlign: 'center' }}>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SECTION 2: Hero ────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{
      background: `linear-gradient(160deg, #fff 0%, ${LIGHT_BG} 100%)`,
      padding: '80px 32px 72px',
    }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '64px', flexWrap: 'wrap' }}>
        {/* Text */}
        <div className="landing-hero-text">
          <FadeIn delay={0}>
            <div style={{
              display: 'inline-block', background: AMBER_BG, borderRadius: '20px',
              padding: '5px 14px', marginBottom: '20px',
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: CORAL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                For Property Managers &amp; STR Hosts
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <h1 style={{ fontSize: '44px', fontWeight: '800', color: NAVY, lineHeight: '1.15', marginBottom: '20px' }}>
              The analytics dashboard your{' '}
              <span style={{ color: CORAL }}>rental business</span>{' '}
              has been missing.
            </h1>
          </FadeIn>

          <FadeIn delay={160}>
            <p style={{ fontSize: '17px', color: '#555', lineHeight: '1.7', marginBottom: '32px', maxWidth: '520px' }}>
              Track real profit, not just revenue. Hostics turns your booking data and expenses
              into clean, actionable insights — and tax-ready reports your accountant will love.
            </p>
          </FadeIn>

          <FadeIn delay={240}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <Link href="/login" className="landing-btn-primary">
                Start free trial — no credit card →
              </Link>
              <a href="#features" className="landing-btn-outline">
                See how it works
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={320}>
            <p style={{ fontSize: '13px', color: '#aaa' }}>
              ⭐⭐⭐⭐⭐&nbsp; Trusted by hosts and property managers across the US
            </p>
          </FadeIn>
        </div>

        {/* Visual */}
        <div className="landing-hero-visual">
          <FadeIn delay={200} style={{ width: '100%' }}>
            <MockDashboard />
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ── SECTION 3: Problem ─────────────────────────────────────────────────────────
function ProblemSection() {
  const problems = [
    {
      icon: '💸', color: CORAL,
      title: 'Income isn\'t profit',
      body: 'Airbnb shows you got paid $50K. It doesn\'t show the $30K you spent maintaining the property to earn it.',
    },
    {
      icon: '📊', color: NAVY,
      title: 'Spreadsheets break at scale',
      body: 'One property in a sheet works. Five properties across three platforms? That\'s a full-time job and a recipe for errors.',
    },
    {
      icon: '🗂️', color: SAGE,
      title: 'Tax season shouldn\'t hurt',
      body: 'Every February, you scramble through statements, receipts, and bank records. Your accountant wants Schedule E numbers, not chaos.',
    },
  ]

  return (
    <section style={{ background: LIGHT_BG, padding: '80px 32px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <FadeIn>
          <Eyebrow text="The Problem" />
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: NAVY, marginBottom: '12px', maxWidth: '560px', lineHeight: '1.25' }}>
            Your booking platform shows income. Hostics shows the truth.
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '48px', maxWidth: '520px', lineHeight: '1.65' }}>
            Most rental tools track what comes in, but ignore what goes out. That gap leaves owners and managers flying blind.
          </p>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {problems.map((p, i) => (
            <FadeIn key={p.title} delay={i * 100}>
              <div style={{
                background: '#fff', borderRadius: '14px', padding: '28px 24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
                height: '100%',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: `${p.color}18`, marginBottom: '16px', fontSize: '22px',
                }}>
                  {p.icon}
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: NAVY, marginBottom: '10px' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.65' }}>
                  {p.body}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── SECTION 4: Features ────────────────────────────────────────────────────────
function FeatureRow({
  tag, headline, desc, bullets, visual, reversed,
}: {
  tag: string
  headline: string
  desc: string
  bullets: string[]
  visual: React.ReactNode
  reversed?: boolean
}) {
  return (
    <div className={`landing-feature-row${reversed ? ' reversed' : ''}`}>
      <FadeIn delay={0} style={{ flex: 1 }}>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: CORAL, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
            {tag}
          </div>
          <h3 style={{ fontSize: '26px', fontWeight: '800', color: NAVY, lineHeight: '1.25', marginBottom: '14px' }}>
            {headline}
          </h3>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.7', marginBottom: '20px' }}>
            {desc}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bullets.map(b => (
              <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#555' }}>
                <span style={{ color: SAGE, fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>

      <FadeIn delay={120} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {visual}
      </FadeIn>
    </div>
  )
}

// Feature visuals ──────────────────────────────────────────────────────────────
function KpiStackVisual() {
  return (
    <div style={{ background: '#F8F9FB', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '340px', boxShadow: '0 8px 32px rgba(13,44,84,0.1)' }}>
      {[
        { label: 'Total Income',    value: '$58,589', delta: '↑ 60%', deltaColor: SAGE },
        { label: 'Total Expenses',  value: '$36,248', delta: '↓ 12%', deltaColor: CORAL },
        { label: 'NOI',             value: '$22,341', delta: '↑ 99%', deltaColor: SAGE },
      ].map((k, i) => (
        <div key={k.label} style={{
          background: '#fff', borderRadius: '10px', padding: '14px 16px',
          border: `1px solid ${i === 1 ? '#FFCDC7' : '#eee'}`,
          marginBottom: i < 2 ? '10px' : 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: NAVY }}>{k.value}</div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: k.deltaColor }}>{k.delta}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PropertySelectorVisual() {
  const props = ['Beach House', 'Mountain Cabin', 'Aspen Lodge']
  return (
    <div style={{ background: '#F8F9FB', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '340px', boxShadow: '0 8px 32px rgba(13,44,84,0.1)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        Property
      </div>
      {/* "All Properties" selected */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: `${CORAL}14`, border: `1.5px solid ${CORAL}`, borderRadius: '10px',
        padding: '12px 14px', marginBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CORAL }} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: NAVY }}>All Properties</span>
        </div>
        <span style={{ fontSize: '11px', color: CORAL, fontWeight: '600' }}>3 active</span>
      </div>
      {props.map(p => (
        <div key={p} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#fff', borderRadius: '8px', padding: '11px 14px',
          border: '1px solid #eee', marginBottom: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ddd' }} />
          <span style={{ fontSize: '13px', color: '#555', fontWeight: '500' }}>{p}</span>
        </div>
      ))}
    </div>
  )
}

function ImportVisual() {
  return (
    <div style={{ background: '#F8F9FB', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '380px', boxShadow: '0 8px 32px rgba(13,44,84,0.1)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
        Import Summary
      </div>
      <div style={{
        background: '#F0FFF8', border: '1px solid #A8E6C3', borderRadius: '10px',
        padding: '16px', marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '18px', color: SAGE, fontWeight: '700', lineHeight: 1 }}>✓</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A6E47', marginBottom: '4px' }}>
              Detected: Airbnb reservations file
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A6E47' }}>
              47 new rows ready to import
            </div>
          </div>
        </div>
      </div>
      <div style={{
        background: '#fff', border: '1px solid #eee', borderRadius: '10px',
        padding: '12px 16px', fontSize: '12px', color: '#888',
      }}>
        ↩ 3 already exist and will be skipped
      </div>
      <div style={{ marginTop: '14px' }}>
        <div style={{
          background: CORAL, color: '#fff', borderRadius: '8px',
          padding: '11px 20px', fontSize: '13px', fontWeight: '700',
          display: 'inline-block', textAlign: 'center', width: '100%', boxSizing: 'border-box',
        }}>
          Import 47 reservations
        </div>
      </div>
    </div>
  )
}

function TaxVisual() {
  const lines = [
    { num: 'Line 3',  label: 'Rental Income',   value: '$58,589' },
    { num: 'Line 7',  label: 'Maintenance',      value: '$17,507' },
    { num: 'Line 16', label: 'Taxes',            value: '$11,434' },
  ]
  return (
    <div style={{ background: '#F8F9FB', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '340px', boxShadow: '0 8px 32px rgba(13,44,84,0.1)' }}>
      <div style={{ background: NAVY, borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Hostics · Tax Summary
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Tax Year 2026</div>
      </div>
      <div style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: '1px solid #eee' }}>
        {lines.map((l, i) => (
          <div key={l.num} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0',
            borderBottom: i < lines.length - 1 ? '1px solid #f0f0f0' : 'none',
          }}>
            <div>
              <span style={{ fontSize: '9px', fontWeight: '600', color: '#aaa', marginRight: '8px' }}>{l.num}</span>
              <span style={{ fontSize: '12px', color: '#555' }}>{l.label}</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: NAVY }}>{l.value}</span>
          </div>
        ))}
        <div style={{
          marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Net Operating Income</span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: CORAL }}>$22,341</span>
        </div>
      </div>
    </div>
  )
}

function FeaturesSection() {
  return (
    <section id="features" style={{ background: '#fff', padding: '96px 32px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <Eyebrow text="What You Get" />
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: NAVY, marginBottom: '12px' }}>
              Built for the way you actually run your rental.
            </h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '540px', margin: '0 auto', lineHeight: '1.65' }}>
              From the daily grind of tracking expenses to the annual headache of taxes,
              Hostics handles the parts you&apos;d rather not think about.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '96px' }}>
          <FeatureRow
            tag="Real Profitability"
            headline="See your true Net Operating Income, not just gross revenue."
            desc="Hostics combines your booking income with all your expenses to show what you're actually keeping — broken down by property, period, and source."
            bullets={[
              'NOI tracked over any time period',
              'Period-over-period comparisons on every metric',
              'Smart color coding — green when good, coral when not',
            ]}
            visual={<KpiStackVisual />}
          />
          <FeatureRow
            tag="Multi-Property"
            headline="Manage one property or fifty. Same clean view."
            desc="Built for everyone from the solo Airbnb host to property managers running portfolios. Switch between individual properties or roll everything up into one view."
            bullets={[
              'Property selector with portfolio rollup',
              'Per-property and aggregated metrics',
              'White-label option for property managers',
            ]}
            visual={<PropertySelectorVisual />}
            reversed
          />
          <FeatureRow
            tag="Smart Import"
            headline="Bring your data from anywhere. We figure it out."
            desc="Hostics's smart importer auto-detects exports from Airbnb, VRBO, Hostaway, and most property managers. Or enter data manually if you prefer."
            bullets={[
              'Auto-detects file format and column mapping',
              'Duplicate detection — re-uploading is safe',
              'Direct entry forms for one-off transactions',
            ]}
            visual={<ImportVisual />}
          />
          <FeatureRow
            tag="Tax-Ready Exports"
            headline="Hand your accountant a clean PDF, not a chaotic spreadsheet."
            desc="Generate IRS Schedule E-formatted reports in one click. Your accountant transcribes line-by-line. You spend tax season doing literally anything else."
            bullets={[
              'Schedule E line numbers built in',
              'PDF for accountants, Excel for the data nerds',
              'One report per property, per year',
            ]}
            visual={<TaxVisual />}
            reversed
          />
        </div>
      </div>
    </section>
  )
}

// ── SECTION 5: Pricing ─────────────────────────────────────────────────────────
function PricingCard({
  tier, name, desc, price, features, featured, ctaLabel,
}: {
  tier: string; name: string; desc: string; price: string
  features: string[]; featured?: boolean; ctaLabel?: string
}) {
  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${featured ? CORAL : '#eee'}`,
      borderRadius: '16px', padding: '32px 28px',
      boxShadow: featured ? `0 8px 40px ${CORAL}22` : '0 2px 12px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {featured && (
        <div style={{
          position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
          background: CORAL, color: '#fff', borderRadius: '20px',
          padding: '4px 16px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Most Popular
        </div>
      )}
      <div style={{ fontSize: '10px', fontWeight: '700', color: CORAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {tier}
      </div>
      <div style={{ fontSize: '20px', fontWeight: '800', color: NAVY, marginBottom: '8px' }}>{name}</div>
      <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.5', marginBottom: '24px', minHeight: '40px' }}>{desc}</div>
      <div style={{ marginBottom: '28px' }}>
        <span style={{ fontSize: '36px', fontWeight: '800', color: NAVY }}>{price}</span>
        <span style={{ fontSize: '14px', color: '#aaa', marginLeft: '4px' }}>/month</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: '#555' }}>
            <span style={{ color: SAGE, fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        style={{
          display: 'block', textAlign: 'center',
          background: featured ? CORAL : 'transparent',
          color: featured ? '#fff' : NAVY,
          border: `2px solid ${featured ? CORAL : NAVY}`,
          borderRadius: '10px', padding: '13px 20px',
          fontSize: '15px', fontWeight: '700', textDecoration: 'none',
          transition: 'all 0.15s ease',
        }}
        className="landing-pricing-cta"
      >
        {ctaLabel ?? 'Start free trial'}
      </Link>
    </div>
  )
}

function PricingSection() {
  return (
    <section id="pricing" style={{ background: '#F8F9FB', padding: '96px 32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <Eyebrow text="Pricing" />
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: NAVY, marginBottom: '12px' }}>
              Simple pricing. No surprises.
            </h2>
            <p style={{ fontSize: '16px', color: '#888', lineHeight: '1.6' }}>
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start', paddingTop: '14px' }}>
          <FadeIn delay={0}>
            <PricingCard
              tier="Solo Host"
              name="Single Property"
              desc="Perfect for individual hosts running one rental property."
              price="$29"
              features={['1 property', 'All analytics dashboards', 'Smart CSV/Excel import', 'Tax-ready exports', 'Email support']}
            />
          </FadeIn>
          <FadeIn delay={100}>
            <PricingCard
              tier="Multi-Property"
              name="Up to 10 Properties"
              desc="For hosts with a portfolio or small property managers."
              price="$79"
              features={['Up to 10 properties', 'Portfolio rollup view', 'All analytics dashboards', 'Smart CSV/Excel import', 'Tax-ready exports', 'Priority email support']}
              featured
            />
          </FadeIn>
          <FadeIn delay={200}>
            <PricingCard
              tier="Property Manager"
              name="Up to 50 Properties + White-label"
              desc="For property management companies serving many owners."
              price="$199"
              features={['Up to 50 properties', 'White-label branding', 'Owner-facing dashboards', 'All analytics dashboards', 'Tax-ready exports', 'Dedicated support']}
            />
          </FadeIn>
        </div>

        <FadeIn delay={100}>
          <p style={{ textAlign: 'center', marginTop: '36px', fontSize: '14px', color: '#aaa' }}>
            Need something different?{' '}
            <a href="mailto:hello@hostics.app" style={{ color: CORAL, fontWeight: '600', textDecoration: 'none' }}>
              Contact us for custom pricing
            </a>{' '}
            for 50+ properties.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ── SECTION 6: Testimonials (gated) ───────────────────────────────────────────
function TestimonialsSection() {
  if (!SHOW_TESTIMONIALS) return null

  return (
    <section style={{ background: '#fff', padding: '96px 32px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <Eyebrow text="Loved by Hosts" />
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: NAVY }}>Real talk from real users.</h2>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* TODO: Add real testimonials and set SHOW_TESTIMONIALS = true once we have customer permission */}
        </div>
      </div>
    </section>
  )
}

// ── SECTION 7: FAQ ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'What data does Hostics need from me?',
    a: 'Just CSV or Excel exports from wherever you currently track bookings — Airbnb, VRBO, Hostaway, Guesty, or your property manager\'s portal. Hostics auto-detects the format and maps the columns automatically. You can also enter reservations and expenses manually if you prefer.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel anytime from your account settings — no phone calls, no questions asked. You\'ll have access until the end of your billing period, and your data stays available for 30 days after cancellation in case you change your mind.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Hostics uses bank-level encryption and runs on Supabase with row-level security, so your data is completely isolated from other accounts. We never sell your data, and we don\'t share it with third parties. You own your data and can export it anytime.',
  },
  {
    q: 'Do you support direct integrations with Airbnb?',
    a: 'Direct API integrations with Airbnb, VRBO, Hostaway, and Guesty are coming soon. For now, exporting a CSV or Excel file from your platform takes about 30 seconds and our smart importer handles the rest. You\'ll be the first to know when direct sync is available.',
  },
  {
    q: 'How do you handle multiple properties?',
    a: 'Hostics is built for multi-property from day one. Switch between properties using the dropdown in the header, or select \'All Properties\' to see your portfolio rolled up into one view. Every metric, chart, and report works at both the individual property level and aggregated across your portfolio.',
  },
  {
    q: 'Can my accountant access reports directly?',
    a: 'You can download tax-ready PDF and Excel reports formatted for IRS Schedule E and email them to your accountant — no separate access needed. We\'re also evaluating a \'view-only accountant access\' feature for future versions if there\'s enough demand.',
  },
]

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" style={{ background: LIGHT_BG, padding: '96px 32px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <Eyebrow text="FAQ" />
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: NAVY }}>Common questions.</h2>
          </div>
        </FadeIn>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <FadeIn key={i} delay={i * 50}>
                <div style={{ borderBottom: '1px solid #e8e0db' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '22px 0', textAlign: 'left', gap: '16px',
                      fontFamily: 'Raleway, sans-serif',
                    }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: '700', color: NAVY, lineHeight: '1.35' }}>
                      {item.q}
                    </span>
                    <span style={{
                      fontSize: '18px', color: CORAL, flexShrink: 0, fontWeight: '400',
                      transition: 'transform 0.3s ease',
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                    }}>
                      +
                    </span>
                  </button>
                  <div style={{
                    maxHeight: isOpen ? '400px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.35s ease',
                  }}>
                    <p style={{
                      fontSize: '15px', color: '#666', lineHeight: '1.7',
                      paddingBottom: '22px', paddingRight: '32px',
                    }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── SECTION 8: Final CTA ───────────────────────────────────────────────────────
function CtaSection() {
  return (
    <section style={{ background: NAVY, padding: '96px 32px', textAlign: 'center' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <FadeIn>
          <h2 style={{ fontSize: '42px', fontWeight: '800', color: '#fff', lineHeight: '1.2', marginBottom: '16px' }}>
            Stop guessing.<br />
            <span style={{ color: CORAL }}>Start knowing.</span>
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', marginBottom: '36px', lineHeight: '1.6' }}>
            Setup takes 5 minutes. Your first insights are ready today.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', background: CORAL, color: '#fff',
            padding: '16px 36px', borderRadius: '10px',
            fontSize: '17px', fontWeight: '700', textDecoration: 'none',
            boxShadow: `0 4px 20px ${CORAL}55`,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
            className="landing-cta-hero"
          >
            Start your free trial →
          </Link>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '20px' }}>
            14 days free · No credit card required · Cancel anytime
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ── SECTION 9: Footer ──────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: DARK_NAVY, padding: '64px 32px 32px' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px', marginBottom: '48px' }}>
          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <Image
              src="/hostics-logo-coral-white.svg"
              alt="Hostics"
              width={130}
              height={37}
              style={{ height: 'auto', display: 'block', marginBottom: '14px' }}
            />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.65', maxWidth: '220px' }}>
              The analytics dashboard for short-term rental hosts and property managers.
            </p>
          </div>

          {/* Product */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Product
            </div>
            {[
              { label: 'Features', href: '#features' },
              { label: 'Pricing',  href: '#pricing' },
              { label: 'Help Center', href: '/help' },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: '10px', transition: 'color 0.15s' }}
                className="landing-footer-link">
                {l.label}
              </a>
            ))}
          </div>

          {/* Company */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Company
            </div>
            {[
              { label: 'About',   href: '#' },
              { label: 'Contact', href: 'mailto:hello@hostics.app' },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: '10px' }}
                className="landing-footer-link">
                {l.label}
              </a>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Legal
            </div>
            {[
              { label: 'Privacy', href: '#' },
              { label: 'Terms',   href: '#' },
            ].map(l => (
              <a key={l.label} href={l.href} style={{ display: 'block', fontSize: '14px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: '10px' }}
                className="landing-footer-link">
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            © 2026 Hostics · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── Root page ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        /* Navbar */
        .landing-nav-center {
          display: flex; align-items: center; gap: 32px;
        }
        .landing-nav-link {
          font-size: 15px; font-weight: 600; color: #0D2C54;
          text-decoration: none; transition: color 0.15s;
        }
        .landing-nav-link:hover { color: #FF7767; }
        .landing-nav-actions {
          display: flex; align-items: center; gap: 16px; flex-shrink: 0;
        }
        .landing-signin-link {
          font-size: 14px; font-weight: 600; color: #0D2C54;
          text-decoration: none; transition: color 0.15s;
        }
        .landing-signin-link:hover { color: #FF7767; }
        .landing-cta-btn {
          background: #FF7767; color: #fff;
          padding: 10px 20px; border-radius: 8px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          transition: opacity 0.15s; white-space: nowrap;
        }
        .landing-cta-btn:hover { opacity: 0.88; }
        .landing-hamburger { display: none !important; }

        /* Hero */
        .landing-hero-text { flex: 1; min-width: 280px; }
        .landing-hero-visual { flex: 1; min-width: 280px; display: flex; justify-content: center; }

        /* Feature rows */
        .landing-feature-row {
          display: flex; align-items: center; gap: 64px; flex-wrap: wrap;
        }
        .landing-feature-row.reversed { flex-direction: row-reverse; }

        /* Buttons */
        .landing-btn-primary {
          display: inline-block; background: #FF7767; color: #fff;
          padding: 14px 28px; border-radius: 10px;
          font-size: 16px; font-weight: 700; text-decoration: none;
          transition: opacity 0.15s, transform 0.15s; white-space: nowrap;
        }
        .landing-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .landing-btn-outline {
          display: inline-block; background: transparent; color: #0D2C54;
          border: 2px solid #0D2C54; padding: 14px 28px; border-radius: 10px;
          font-size: 16px; font-weight: 700; text-decoration: none;
          transition: background 0.15s, color 0.15s; white-space: nowrap;
        }
        .landing-btn-outline:hover { background: #0D2C54; color: #fff; }

        /* Pricing CTA hover */
        .landing-pricing-cta:hover { opacity: 0.88; }

        /* Final CTA */
        .landing-cta-hero:hover { transform: translateY(-2px); box-shadow: 0 8px 32px #FF776788 !important; }

        /* Footer links */
        .landing-footer-link:hover { color: rgba(255,255,255,0.9) !important; }

        /* ── Mobile ────────────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .landing-nav-center { display: none !important; }
          .landing-nav-actions { display: none !important; }
          .landing-hamburger { display: flex !important; }

          .landing-hero-text { flex: none; width: 100%; }
          .landing-hero-visual { flex: none; width: 100%; }

          .landing-feature-row { flex-direction: column !important; gap: 36px; }
          .landing-feature-row.reversed { flex-direction: column !important; }
        }

        @media (max-width: 640px) {
          .landing-btn-primary, .landing-btn-outline { font-size: 15px; padding: 13px 22px; }
        }
      `}</style>

      <div style={{ background: '#fff', overflowX: 'hidden', fontFamily: 'Raleway, sans-serif' }}>
        <Navbar />
        <main>
          <HeroSection />
          <ProblemSection />
          <FeaturesSection />
          <PricingSection />
          <TestimonialsSection />
          <FaqSection />
          <CtaSection />
        </main>
        <Footer />
      </div>
    </>
  )
}
