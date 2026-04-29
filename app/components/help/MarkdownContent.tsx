'use client'

import Markdown from 'react-markdown'

interface Props {
  content: string
}

export default function MarkdownContent({ content }: Props) {
  return (
    <Markdown
      components={{
        h1: ({ children }) => (
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#0D2C54',
            marginTop: '32px',
            marginBottom: '12px',
            lineHeight: 1.3,
            fontFamily: 'Raleway, sans-serif',
          }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#0D2C54',
            marginTop: '28px',
            marginBottom: '10px',
            lineHeight: 1.3,
            fontFamily: 'Raleway, sans-serif',
          }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#0D2C54',
            marginTop: '20px',
            marginBottom: '8px',
            lineHeight: 1.3,
            fontFamily: 'Raleway, sans-serif',
          }}>{children}</h3>
        ),
        p: ({ children }) => (
          <p style={{
            fontSize: '15px',
            color: '#444',
            lineHeight: 1.7,
            marginBottom: '16px',
            fontFamily: 'Raleway, sans-serif',
          }}>{children}</p>
        ),
        ul: ({ children }) => (
          <ul style={{
            paddingLeft: '24px',
            marginBottom: '16px',
            lineHeight: 1.7,
          }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{
            paddingLeft: '24px',
            marginBottom: '16px',
            lineHeight: 1.7,
          }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{
            fontSize: '15px',
            color: '#444',
            marginBottom: '6px',
            fontFamily: 'Raleway, sans-serif',
          }}>{children}</li>
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: 700, color: '#0D2C54' }}>{children}</strong>
        ),
        code: ({ children }) => (
          <code style={{
            background: '#F0F4F9',
            color: '#0D2C54',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}>{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: '3px solid #FF7767',
            paddingLeft: '16px',
            marginLeft: 0,
            marginBottom: '16px',
            color: '#666',
            fontStyle: 'italic',
          }}>{children}</blockquote>
        ),
        hr: () => (
          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '24px 0' }} />
        ),
        a: ({ href, children }) => (
          <a href={href} style={{
            color: '#FF7767',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}>{children}</a>
        ),
      }}
    >
      {content}
    </Markdown>
  )
}
