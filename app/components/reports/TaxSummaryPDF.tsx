import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

export interface ScheduleELine {
  line: string
  label: string
  amount: number
}

export interface ReportData {
  propertyName: string
  taxYear: number
  generatedAt: string
  totalGrossRent: number
  incomeBySource: Array<{ source: string; amount: number }>
  totalMgmtFees: number
  scheduleELines: ScheduleELine[]
  totalExpenses: number
  noi: number
  reservations: any[]
  expenses: any[]
}

const NAVY  = '#0D2C54'
const CORAL = '#FF7767'
const LIGHT = '#F7F9FC'
const MID   = '#DDE5EE'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    backgroundColor: NAVY,
    paddingTop: 22,
    paddingBottom: 22,
    paddingLeft: 40,
    paddingRight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: CORAL,
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
  },
  titleRight: {
    alignItems: 'flex-end',
  },
  titleText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 3,
  },
  titleYear: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // ── Meta bar ────────────────────────────────────────────────────
  metaBar: {
    backgroundColor: MID,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 40,
    paddingRight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
  },
  metaLabel: {
    fontSize: 7.5,
    color: '#777',
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: NAVY,
  },

  // ── Body ────────────────────────────────────────────────────────
  body: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingLeft: 40,
    paddingRight: 40,
    flex: 1,
  },

  // Section header band
  sectionHead: {
    backgroundColor: NAVY,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeadText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#ffffff',
    letterSpacing: 1.5,
  },

  // Column header row
  colHead: {
    backgroundColor: LIGHT,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: 'row',
  },
  colHeadText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#555',
  },

  // Data rows
  row: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowAlt: {
    backgroundColor: LIGHT,
  },
  totalRow: {
    backgroundColor: NAVY,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: 'row',
    marginBottom: 14,
  },

  // Cell styles
  cellLine: {
    width: 26,
    fontSize: 8,
    color: '#888',
  },
  cellLabel: {
    flex: 1,
    fontSize: 9,
    color: '#333',
  },
  cellSubLabel: {
    flex: 1,
    paddingLeft: 12,
    fontSize: 8.5,
    color: '#555',
  },
  cellAmt: {
    width: 78,
    textAlign: 'right',
    fontSize: 9,
    color: '#333',
  },
  totalLabel: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
  },
  totalAmt: {
    width: 78,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
  },

  // NOI box
  noiBox: {
    backgroundColor: CORAL,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 3,
  },
  noiLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1,
  },
  noiAmt: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: '#ffffff',
  },

  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    paddingTop: 11,
    paddingBottom: 16,
    paddingLeft: 40,
    paddingRight: 40,
    borderTopWidth: 1,
    borderTopColor: MID,
  },
  disclaimer: {
    fontSize: 6.5,
    color: '#aaa',
    lineHeight: 1.6,
  },
  footerBrand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: NAVY,
    marginTop: 5,
  },
})

function fmt(n: number): string {
  const abs = Math.abs(Math.round(n))
  const str = `$${abs.toLocaleString('en-US')}`
  return n < 0 ? `(${str})` : str
}

interface Props { data: ReportData }

export default function TaxSummaryPDF({ data }: Props) {
  const {
    propertyName, taxYear, generatedAt,
    totalGrossRent, incomeBySource,
    scheduleELines, totalExpenses, noi,
  } = data

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* ─── Header ─── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>HOSTICS</Text>
            <Text style={s.brandSub}>Short-Term Rental Analytics</Text>
          </View>
          <View style={s.titleRight}>
            <Text style={s.titleText}>TAX SUMMARY</Text>
            <Text style={s.titleYear}>Tax Year {taxYear}</Text>
          </View>
        </View>

        {/* ─── Meta bar ─── */}
        <View style={s.metaBar}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Property:  </Text>
            <Text style={s.metaValue}>{propertyName}</Text>
          </View>
          <Text style={s.metaLabel}>Generated: {generatedAt}</Text>
        </View>

        {/* ─── Body ─── */}
        <View style={s.body}>

          {/* INCOME */}
          <View style={s.sectionHead}>
            <Text style={s.sectionHeadText}>INCOME</Text>
            <Text style={s.sectionHeadText}>SCHEDULE E — LINE 3: RENTS RECEIVED</Text>
          </View>

          {incomeBySource.length === 0 ? (
            <View style={s.row}>
              <Text style={s.cellSubLabel}>No rental income recorded</Text>
              <Text style={s.cellAmt}>{fmt(0)}</Text>
            </View>
          ) : (
            incomeBySource.map((src, i) => (
              <View key={src.source} style={i % 2 === 1 ? [s.row, s.rowAlt] : s.row}>
                <Text style={s.cellSubLabel}>{src.source}</Text>
                <Text style={s.cellAmt}>{fmt(src.amount)}</Text>
              </View>
            ))
          )}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Rental Income</Text>
            <Text style={s.totalAmt}>{fmt(totalGrossRent)}</Text>
          </View>

          {/* EXPENSES */}
          <View style={s.sectionHead}>
            <Text style={s.sectionHeadText}>EXPENSES</Text>
            <Text style={s.sectionHeadText}>IRS SCHEDULE E</Text>
          </View>

          <View style={s.colHead}>
            <Text style={[s.colHeadText, { width: 26 }]}>Line</Text>
            <Text style={[s.colHeadText, { flex: 1 }]}>Category</Text>
            <Text style={[s.colHeadText, { width: 78, textAlign: 'right' }]}>Amount</Text>
          </View>

          {scheduleELines.length === 0 ? (
            <View style={s.row}>
              <Text style={s.cellLine}></Text>
              <Text style={s.cellLabel}>No expenses recorded</Text>
              <Text style={s.cellAmt}>{fmt(0)}</Text>
            </View>
          ) : (
            scheduleELines.map((line, i) => (
              <View key={line.line} style={i % 2 === 1 ? [s.row, s.rowAlt] : s.row}>
                <Text style={s.cellLine}>{line.line}</Text>
                <Text style={s.cellLabel}>{line.label}</Text>
                <Text style={s.cellAmt}>{fmt(line.amount)}</Text>
              </View>
            ))
          )}

          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { paddingLeft: 26 }]}>Total Expenses</Text>
            <Text style={s.totalAmt}>{fmt(totalExpenses)}</Text>
          </View>

          {/* NOI */}
          <View style={s.noiBox}>
            <Text style={s.noiLabel}>NET OPERATING INCOME</Text>
            <Text style={s.noiAmt}>{fmt(noi)}</Text>
          </View>

        </View>

        {/* ─── Footer ─── */}
        <View style={s.footer}>
          <Text style={s.disclaimer}>
            This summary is generated from data entered into Hostics and is provided for informational
            purposes only. Please verify all figures with your tax professional before filing. Figures
            may not account for all deductible expenses or income adjustments required for your specific
            situation. Hostics is not a tax advisor and this document does not constitute tax advice.
          </Text>
          <Text style={s.footerBrand}>Generated by Hostics · {generatedAt}</Text>
        </View>

      </Page>
    </Document>
  )
}
