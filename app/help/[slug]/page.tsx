import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import matter from 'gray-matter'
import MarkdownContent from '../../components/help/MarkdownContent'

function SupportSection() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '28px 32px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
      marginTop: '48px',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>💬</div>
      <div style={{
        fontSize: '18px',
        fontWeight: 800,
        color: '#0D2C54',
        marginBottom: '6px',
        fontFamily: 'Raleway, sans-serif',
      }}>
        Still need help?
      </div>
      <p style={{
        fontSize: '14px',
        color: '#888',
        marginBottom: '18px',
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
          padding: '11px 26px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 700,
          textDecoration: 'none',
          fontFamily: 'Raleway, sans-serif',
        }}
      >
        Email Support
      </a>
    </div>
  )
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const filePath = path.join(process.cwd(), 'content', 'help', `${slug}.md`)

  const backLink = (
    <Link
      href="/help"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#888',
        textDecoration: 'none',
        marginBottom: '28px',
        fontFamily: 'Raleway, sans-serif',
        transition: 'color 0.15s ease',
      }}
    >
      ← Back to Help Center
    </Link>
  )

  if (!fs.existsSync(filePath)) {
    return (
      <div style={{ maxWidth: '720px' }}>
        {backLink}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #eee',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0D2C54',
            marginBottom: '8px',
            fontFamily: 'Raleway, sans-serif',
          }}>
            Article coming soon
          </h2>
          <p style={{
            color: '#888',
            fontSize: '14px',
            lineHeight: 1.6,
            fontFamily: 'Raleway, sans-serif',
          }}>
            This article is being written. Check back soon.
          </p>
        </div>
        <SupportSection />
      </div>
    )
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data: frontmatter, content } = matter(raw)
  const title    = frontmatter.title    as string | undefined
  const category = frontmatter.category as string | undefined

  return (
    <div style={{ maxWidth: '720px' }}>
      {backLink}

      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '36px 40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #eee',
      }}>
        {category && (
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#FF7767',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            fontFamily: 'Raleway, sans-serif',
          }}>
            {category}
          </div>
        )}
        {title && (
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0D2C54',
            marginBottom: '28px',
            lineHeight: 1.3,
            fontFamily: 'Raleway, sans-serif',
          }}>
            {title}
          </h1>
        )}

        <MarkdownContent content={content} />
      </div>

      <SupportSection />
    </div>
  )
}
