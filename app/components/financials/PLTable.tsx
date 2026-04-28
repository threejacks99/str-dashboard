const NAVY  = '#0D2C54'
const CORAL = '#FF7767'
const SAGE  = '#4CAF82'
const MUTED = '#aaa'

const SOURCE_NAMES: Record<string, string> = {
  'SC-ABnB':  'Airbnb',
  'HAFamOLB': 'Direct',
  'STA':      'Other',
}

function displaySource(source: string): string {
  return SOURCE_NAMES[source] ?? source
}

function fmtCurrency(v: number): string {
  if (v < 0) return `($${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })})`
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`
}

function fmtChange(
  current: number,
  prior: number | undefined,
  isGoodWhenUp: boolean,
): { text: string; color: string } {
  if (prior === undefined || prior === null) return { text: '—', color: MUTED }
  if (prior === 0 && current === 0) return { text: '—', color: MUTED }
  if (prior === 0) {
    const good = current > 0 ? isGoodWhenUp : !isGoodWhenUp
    return { text: current > 0 ? '↑ New' : '↓ New', color: good ? SAGE : CORAL }
  }
  const pct = ((current - prior) / Math.abs(prior)) * 100
  const arrow = pct >= 0 ? '↑' : '↓'
  const good  = pct === 0 ? true : (pct > 0 ? isGoodWhenUp : !isGoodWhenUp)
  return {
    text:  `${arrow} ${Math.abs(pct).toFixed(1)}%`,
    color: pct === 0 ? MUTED : (good ? SAGE : CORAL),
  }
}

export interface RevenueRow    { source: string; amount: number }
export interface ExpenseRow    { category: string; amount: number }

export interface PLTablePrior {
  revenueBySource: RevenueRow[]
  expensesByCategory: ExpenseRow[]
  totalRevenue: number
  totalExpenses: number
  noi: number
  oer: number
}

interface Props {
  revenueBySource: RevenueRow[]
  expensesByCategory: ExpenseRow[]
  totalRevenue: number
  totalExpenses: number
  noi: number
  oer: number
  prior: PLTablePrior | null
  vsLabel: string | null
}

const cellStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: '14px',
  borderBottom: '1px solid #f0f0f0',
  color: '#333',
  fontFamily: 'Raleway, sans-serif',
}

const numCell: React.CSSProperties = {
  ...cellStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

export default function PLTable({
  revenueBySource,
  expensesByCategory,
  totalRevenue,
  totalExpenses,
  noi,
  oer,
  prior,
  vsLabel,
}: Props) {
  const hasPrior = prior !== null

  function priorRevAmt(source: string): number | undefined {
    return prior?.revenueBySource.find(r => r.source === source)?.amount
  }
  function priorExpAmt(category: string): number | undefined {
    return prior?.expensesByCategory.find(e => e.category === category)?.amount
  }

  const noiColor = noi >= 0 ? NAVY : CORAL

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      border: '1px solid #eee',
      marginBottom: '24px',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8F9FB' }}>
            <th style={{ ...cellStyle, fontWeight: 700, color: NAVY, textAlign: 'left', width: '40%' }}>
              P&amp;L Summary
            </th>
            <th style={{ ...numCell, fontWeight: 700, color: NAVY, width: '20%' }}>Current Period</th>
            <th style={{ ...numCell, fontWeight: 700, color: NAVY, width: '20%' }}>
              {hasPrior ? 'Prior Period' : '—'}
            </th>
            <th style={{ ...numCell, fontWeight: 700, color: NAVY, width: '20%' }}>
              {vsLabel ?? 'Change'}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* ── INCOME header ── */}
          <tr style={{ background: NAVY }}>
            <td colSpan={4} style={{
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'Raleway, sans-serif',
            }}>
              Income
            </td>
          </tr>

          {/* Revenue rows by source */}
          {revenueBySource.map(row => {
            const p  = priorRevAmt(row.source)
            const ch = fmtChange(row.amount, p, true)
            return (
              <tr key={row.source} style={{ background: '#fff' }}>
                <td style={{ ...cellStyle, paddingLeft: '32px', color: '#555' }}>
                  {displaySource(row.source)}
                </td>
                <td style={numCell}>{fmtCurrency(row.amount)}</td>
                <td style={{ ...numCell, color: '#888' }}>{hasPrior ? fmtCurrency(p ?? 0) : '—'}</td>
                <td style={{ ...numCell, color: ch.color, fontWeight: 600 }}>{ch.text}</td>
              </tr>
            )
          })}

          {/* Total Revenue */}
          {(() => {
            const ch = fmtChange(totalRevenue, prior?.totalRevenue, true)
            return (
              <tr style={{ background: '#F8F9FB' }}>
                <td style={{ ...cellStyle, fontWeight: 700, color: NAVY }}>Total Revenue</td>
                <td style={{ ...numCell, fontWeight: 700, color: NAVY }}>{fmtCurrency(totalRevenue)}</td>
                <td style={{ ...numCell, fontWeight: 700, color: '#888' }}>
                  {hasPrior ? fmtCurrency(prior!.totalRevenue) : '—'}
                </td>
                <td style={{ ...numCell, fontWeight: 700, color: ch.color }}>{ch.text}</td>
              </tr>
            )
          })()}

          {/* ── EXPENSES header ── */}
          <tr style={{ background: CORAL }}>
            <td colSpan={4} style={{
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'Raleway, sans-serif',
            }}>
              Expenses
            </td>
          </tr>

          {/* Expense rows by category */}
          {expensesByCategory.map(row => {
            const p  = priorExpAmt(row.category)
            const ch = fmtChange(row.amount, p, false)
            return (
              <tr key={row.category} style={{ background: '#fff' }}>
                <td style={{ ...cellStyle, paddingLeft: '32px', color: '#555' }}>{row.category}</td>
                <td style={numCell}>{fmtCurrency(row.amount)}</td>
                <td style={{ ...numCell, color: '#888' }}>{hasPrior ? fmtCurrency(p ?? 0) : '—'}</td>
                <td style={{ ...numCell, color: ch.color, fontWeight: 600 }}>{ch.text}</td>
              </tr>
            )
          })}

          {/* Total Expenses */}
          {(() => {
            const ch = fmtChange(totalExpenses, prior?.totalExpenses, false)
            return (
              <tr style={{ background: '#FFF5F4' }}>
                <td style={{ ...cellStyle, fontWeight: 700, color: CORAL }}>Total Expenses</td>
                <td style={{ ...numCell, fontWeight: 700, color: CORAL }}>{fmtCurrency(totalExpenses)}</td>
                <td style={{ ...numCell, fontWeight: 700, color: '#888' }}>
                  {hasPrior ? fmtCurrency(prior!.totalExpenses) : '—'}
                </td>
                <td style={{ ...numCell, fontWeight: 700, color: ch.color }}>{ch.text}</td>
              </tr>
            )
          })()}

          {/* ── Net Operating Income ── */}
          {(() => {
            const ch = fmtChange(noi, prior?.noi, true)
            return (
              <tr style={{ background: '#F0F4F9', borderTop: '2px solid #ddd' }}>
                <td style={{ ...cellStyle, fontWeight: 800, fontSize: '15px', color: noiColor }}>
                  Net Operating Income
                </td>
                <td style={{ ...numCell, fontWeight: 800, fontSize: '15px', color: noiColor }}>
                  {fmtCurrency(noi)}
                </td>
                <td style={{ ...numCell, fontWeight: 800, fontSize: '15px', color: '#888' }}>
                  {hasPrior ? fmtCurrency(prior!.noi) : '—'}
                </td>
                <td style={{ ...numCell, fontWeight: 700, color: ch.color }}>{ch.text}</td>
              </tr>
            )
          })()}

          {/* ── Operating Expense Ratio ── */}
          {(() => {
            const ch = fmtChange(oer, prior?.oer, false)
            return (
              <tr style={{ background: '#F8F9FB' }}>
                <td style={{ ...cellStyle, color: '#555' }}>Operating Expense Ratio</td>
                <td style={{ ...numCell, color: '#555' }}>{fmtPct(oer)}</td>
                <td style={{ ...numCell, color: '#888' }}>
                  {hasPrior ? fmtPct(prior!.oer) : '—'}
                </td>
                <td style={{ ...numCell, color: ch.color, fontWeight: 600 }}>{ch.text}</td>
              </tr>
            )
          })()}
        </tbody>
      </table>
    </div>
  )
}
