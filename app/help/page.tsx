import Link from 'next/link'

const CATEGORIES = [
  {
    emoji: '🚀',
    name: 'Getting Started',
    description: 'First steps, signup, and navigating Hostics.',
    slug: 'getting-started',
    count: 0,
  },
  {
    emoji: '📁',
    name: 'Importing Data',
    description: 'How to upload data from Airbnb, VRBO, and other platforms.',
    slug: 'importing-data',
    count: 0,
  },
  {
    emoji: '📊',
    name: 'Understanding Your Metrics',
    description: 'Detailed explanations of every KPI and chart.',
    slug: 'understanding-metrics',
    count: 0,
  },
  {
    emoji: '🏠',
    name: 'Managing Properties',
    description: 'Adding, editing, and managing multiple properties.',
    slug: 'managing-properties',
    count: 0,
  },
  {
    emoji: '💳',
    name: 'Billing & Account',
    description: 'Subscriptions, payments, and account settings.',
    slug: 'billing-account',
    count: 0,
  },
  {
    emoji: '🛠️',
    name: 'Troubleshooting',
    description: 'Common issues and how to fix them.',
    slug: 'troubleshooting',
    count: 0,
  },
  {
    emoji: '❓',
    name: 'FAQ',
    description: 'Quick answers to top questions.',
    slug: 'faq',
    count: 0,
  },
]

function CategoryCard({ emoji, name, description, slug, count }: typeof CATEGORIES[number]) {
  return (
    <Link
      href={`/help/${slug}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="help-category-card"
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #eee',
          cursor: 'pointer',
          height: '100%',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px', lineHeight: 1 }}>{emoji}</div>
        <div style={{
          fontSize: '18px',
          fontWeight: 800,
          color: '#0D2C54',
          marginBottom: '6px',
          fontFamily: 'Raleway, sans-serif',
        }}>
          {name}
        </div>
        <div style={{
          fontSize: '13px',
          color: '#888',
          lineHeight: 1.5,
          marginBottom: '16px',
          fontFamily: 'Raleway, sans-serif',
        }}>
          {description}
        </div>
        <span style={{
          display: 'inline-block',
          background: '#F0F4F9',
          color: '#0D2C54',
          fontSize: '11px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '20px',
          fontFamily: 'Raleway, sans-serif',
          letterSpacing: '0.02em',
        }}>
          {count === 0 ? 'Coming soon' : `${count} article${count === 1 ? '' : 's'}`}
        </span>
      </div>
    </Link>
  )
}

function SupportSection() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '32px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
      <div style={{
        fontSize: '20px',
        fontWeight: 800,
        color: '#0D2C54',
        marginBottom: '8px',
        fontFamily: 'Raleway, sans-serif',
      }}>
        Still need help?
      </div>
      <p style={{
        fontSize: '14px',
        color: '#888',
        marginBottom: '20px',
        lineHeight: 1.6,
        fontFamily: 'Raleway, sans-serif',
      }}>
        Our support team is here to help. Send us a message and we'll get back to you.
      </p>
      <a
        href="mailto:support@hostics.app"
        style={{
          display: 'inline-block',
          background: '#FF7767',
          color: '#fff',
          padding: '12px 28px',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 700,
          textDecoration: 'none',
          fontFamily: 'Raleway, sans-serif',
          transition: 'opacity 0.15s ease',
        }}
      >
        Email Support
      </a>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Hero */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#0D2C54',
          marginBottom: '10px',
          fontFamily: 'Raleway, sans-serif',
        }}>
          How can we help?
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#888',
          lineHeight: 1.6,
          fontFamily: 'Raleway, sans-serif',
        }}>
          Browse guides and find answers to common questions about Hostics.
        </p>
      </div>

      {/* Category grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '40px',
      }}>
        {CATEGORIES.map(cat => (
          <CategoryCard key={cat.slug} {...cat} />
        ))}
      </div>

      <SupportSection />

      <style>{`
        .help-category-card:hover {
          border-color: #FF7767 !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.1) !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .help-category-card {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
      `}</style>
    </div>
  )
}
