import type { Metadata } from 'next'
import './globals.css'
import Sidebar from './components/Sidebar'

export const metadata: Metadata = {
  title: 'Hostics | STR Analytics',
  description: 'Short term rental analytics dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F8F9FB',
        }}>
          <Sidebar />
          <main style={{
            flex: 1,
            padding: '32px',
            overflowY: 'auto',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}