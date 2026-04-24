const pulse = {
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  background: '#e8eaed',
  borderRadius: '8px',
} as const

export default function DashboardLoading() {
  return (
    <div>
      {/* Header placeholder */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ ...pulse, width: '160px', height: '26px', marginBottom: '8px' }} />
        <div style={{ ...pulse, width: '220px', height: '14px' }} />
      </div>

      {/* KPI card placeholders */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '40px',
      }}>
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #eee',
          }}>
            <div style={{ ...pulse, width: '80px', height: '12px', marginBottom: '12px' }} />
            <div style={{ ...pulse, width: '100px', height: '28px' }} />
          </div>
        ))}
      </div>

      {/* Revenue chart placeholder */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #eee',
        marginBottom: '40px',
      }}>
        <div style={{ ...pulse, width: '140px', height: '12px', marginBottom: '20px' }} />
        <div style={{ ...pulse, width: '100%', height: '260px', borderRadius: '8px' }} />
      </div>

      {/* Expenses chart placeholder */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #eee',
        marginBottom: '40px',
      }}>
        <div style={{ ...pulse, width: '160px', height: '12px', marginBottom: '20px' }} />
        <div style={{ ...pulse, width: '100%', height: '180px', borderRadius: '8px' }} />
      </div>

      {/* Bottom row placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
        {[0, 1].map(i => (
          <div key={i} style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #eee',
          }}>
            <div style={{ ...pulse, width: '130px', height: '12px', marginBottom: '20px' }} />
            <div style={{ ...pulse, width: '100%', height: '220px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
