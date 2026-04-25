import {
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  StyleSheet,
} from '@react-pdf/renderer'

export interface PdfLineItem {
  id: string
  name: string
  description: string | null
  unit: string | null
  quantity: number | null
  unit_price: number | null
}

export interface PdfFinding {
  id: string
  issue_type: string
  severity: string
  description: string
  suggested_service: string
}

export interface PdfPhoto {
  id: string
  annotatedImageBase64: string // JPEG base64, bounding boxes already composited by sharp
  findings: PdfFinding[]
}

export interface PdfEstimateData {
  title: string
  intro_text: string | null
  client_name: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  date: string
  // Contractor branding
  company_name: string
  company_email: string | null
  company_phone: string | null
  primary_color: string
  logo_base64: string | null
  // Content
  photos: PdfPhoto[]
  line_items: PdfLineItem[]
  subtotal: number
  discount: number
  total: number
}

const SEVERITY_STYLE: Record<string, { bg: string; fg: string }> = {
  low:      { bg: '#f3f4f6', fg: '#6b7280' },
  medium:   { bg: '#fef3c7', fg: '#d97706' },
  high:     { bg: '#fed7aa', fg: '#ea580c' },
  critical: { bg: '#fee2e2', fg: '#dc2626' },
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function makeStyles(primary: string) {
  return StyleSheet.create({
    // ── Base ──────────────────────────────────────────────────────
    pageBase: { fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937' },
    page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937', paddingHorizontal: 48, paddingVertical: 40 },

    // ── Cover: full-bleed header ──────────────────────────────────
    coverHeader: { backgroundColor: primary, paddingHorizontal: 48, paddingVertical: 40, alignItems: 'center' },
    coverLogo: { width: 110, height: 55, objectFit: 'contain', marginBottom: 14 },
    coverCompanyName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: 'white', textAlign: 'center' },
    coverContactInHeader: { fontSize: 9, color: 'white', opacity: 0.8, textAlign: 'center', marginTop: 6 },

    coverBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48, paddingVertical: 48 },
    coverDocTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'center', marginBottom: 16 },
    coverDivider: { borderBottom: `3px solid ${primary}`, width: 56, marginBottom: 28 },
    coverPrepLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 6 },
    coverClientName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'center', marginBottom: 4 },
    coverClientAddress: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginBottom: 2 },
    coverDateText: { fontSize: 9, color: '#9ca3af', marginTop: 16 },

    coverFooter: { borderTop: '1px solid #e5e7eb', paddingHorizontal: 48, paddingVertical: 14, alignItems: 'center' },
    coverFooterText: { fontSize: 8, color: '#9ca3af' },

    // ── Interior page header ──────────────────────────────────────
    pageHeader: {
      flexDirection: 'row', alignItems: 'center',
      marginBottom: 18, paddingBottom: 10,
      borderBottom: `2px solid ${primary}`,
    },
    pageHeaderAccent: { width: 4, height: 18, backgroundColor: primary, borderRadius: 2, marginRight: 10 },
    pageHeaderTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#111827' },

    // ── Body text ─────────────────────────────────────────────────
    bodyText: { fontSize: 10, color: '#374151', lineHeight: 1.65, marginBottom: 16 },

    // ── Photo + findings ──────────────────────────────────────────
    photoBlock: { marginBottom: 28 },
    photo: { width: '100%', borderRadius: 4, marginBottom: 12 },
    findingRow: { flexDirection: 'row', marginBottom: 7, gap: 8 },
    findingBadge: {
      width: 20, height: 20, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: primary, flexShrink: 0,
    },
    findingBadgeText: { color: 'white', fontSize: 9, fontFamily: 'Helvetica-Bold' },
    findingBody: { flex: 1, paddingTop: 1 },
    findingTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap', gap: 4 },
    findingTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
    findingDesc: { fontSize: 8, color: '#6b7280', lineHeight: 1.45 },
    findingService: { fontSize: 8, color: primary, marginTop: 2 },

    // ── Estimate table ────────────────────────────────────────────
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primary,
      paddingHorizontal: 8, paddingVertical: 7,
      borderRadius: 4, marginBottom: 1,
    },
    tableHeaderText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: 'white' },
    tableRowEven: { flexDirection: 'row', backgroundColor: '#f9fafb', paddingHorizontal: 8, paddingVertical: 6 },
    tableRowOdd: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 6 },
    tableCell: { fontSize: 9, color: '#374151' },
    colName: { flex: 3 },
    colQty: { flex: 1, textAlign: 'right' },
    colUnit: { flex: 1, textAlign: 'right' },
    colPrice: { flex: 1, textAlign: 'right' },
    colTotal: { flex: 1, textAlign: 'right' },

    // ── Totals ────────────────────────────────────────────────────
    totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', gap: 24, marginBottom: 4 },
    totalLabel: { fontSize: 10, color: '#6b7280', textAlign: 'right', width: 80 },
    totalValue: { fontSize: 10, color: '#374151', textAlign: 'right', width: 80 },
    grandTotalRow: { flexDirection: 'row', gap: 24, marginTop: 8, paddingTop: 8, borderTop: `2px solid ${primary}` },
    grandTotalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primary, textAlign: 'right', width: 80 },
    grandTotalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primary, textAlign: 'right', width: 80 },

    // ── Authorization ─────────────────────────────────────────────
    checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
    checkbox: { width: 13, height: 13, border: '1px solid #d1d5db', borderRadius: 2, flexShrink: 0, marginTop: 1 },
    checkboxLabel: { fontSize: 10, color: '#374151', flex: 1 },
    clientInfoBlock: { backgroundColor: '#f9fafb', padding: 14, borderRadius: 4, marginVertical: 20 },
    clientInfoLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 3 },
    clientInfoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
    signBlock: { marginTop: 28 },
    signLine: { borderBottom: '1px solid #9ca3af', width: '65%', marginBottom: 6 },
    signLineShort: { borderBottom: '1px solid #9ca3af', width: '32%', marginBottom: 6 },
    signFieldLabel: { fontSize: 8, color: '#9ca3af' },

    // ── Shared footer ─────────────────────────────────────────────
    pageFooter: { borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 'auto' },
    pageFooterText: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  })
}

function PageFooter({ data, styles }: { data: PdfEstimateData; styles: ReturnType<typeof makeStyles> }) {
  const contact = [data.company_name, data.company_email, data.company_phone].filter(Boolean).join('  ·  ')
  return (
    <View style={styles.pageFooter}>
      <Text style={styles.pageFooterText}>{contact}</Text>
    </View>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: s.fg }}>
        {severity.toUpperCase()}
      </Text>
    </View>
  )
}

export function EstimatePDF({ data }: { data: PdfEstimateData }) {
  const styles = makeStyles(data.primary_color || '#7C3AED')
  const addressLine = [data.address, data.city, data.state, data.zip].filter(Boolean).join(', ')
  const contactLine = [data.company_email, data.company_phone].filter(Boolean).join('  ·  ')

  return (
    <Document>
      {/* ── Cover page ─────────────────────────────────────────── */}
      <Page size="LETTER" style={styles.pageBase}>
        {/* Branded header — full bleed */}
        <View style={styles.coverHeader}>
          {data.logo_base64 && (
            <PdfImage src={`data:image/png;base64,${data.logo_base64}`} style={styles.coverLogo} />
          )}
          <Text style={styles.coverCompanyName}>{data.company_name}</Text>
          {contactLine ? <Text style={styles.coverContactInHeader}>{contactLine}</Text> : null}
        </View>

        {/* Document identity */}
        <View style={styles.coverBody}>
          <Text style={styles.coverDocTitle}>Roof Inspection & Estimate</Text>
          <View style={styles.coverDivider} />
          <Text style={styles.coverPrepLabel}>PREPARED FOR</Text>
          <Text style={styles.coverClientName}>{data.client_name}</Text>
          <Text style={styles.coverClientAddress}>{addressLine}</Text>
          <Text style={styles.coverDateText}>{data.date}</Text>
        </View>

        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>
            This estimate is valid for 30 days from the date above.
          </Text>
        </View>
      </Page>

      {/* ── Inspection findings ────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderAccent} />
          <Text style={styles.pageHeaderTitle}>Inspection Findings</Text>
        </View>

        {data.intro_text
          ? <Text style={styles.bodyText}>{data.intro_text}</Text>
          : null}

        {data.photos.map((photo) => (
          <View key={photo.id} style={styles.photoBlock} wrap={false}>
            <PdfImage
              src={`data:image/jpeg;base64,${photo.annotatedImageBase64}`}
              style={styles.photo}
            />
            {photo.findings.map((f, i) => (
              <View key={f.id} style={styles.findingRow}>
                <View style={styles.findingBadge}>
                  <Text style={styles.findingBadgeText}>{i + 1}</Text>
                </View>
                <View style={styles.findingBody}>
                  <View style={styles.findingTitleRow}>
                    <Text style={styles.findingTitle}>
                      {f.issue_type.replace(/_/g, ' ')}
                    </Text>
                    <SeverityBadge severity={f.severity} />
                  </View>
                  <Text style={styles.findingDesc}>{f.description}</Text>
                  <Text style={styles.findingService}>Recommended: {f.suggested_service}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <PageFooter data={data} styles={styles} />
      </Page>

      {/* ── Estimate ───────────────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderAccent} />
          <Text style={styles.pageHeaderTitle}>Estimate</Text>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colName]}>Service</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {data.line_items.map((item, idx) => {
          const lineTotal = item.quantity != null && item.unit_price != null
            ? item.quantity * item.unit_price
            : null
          const rowStyle = idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
          return (
            <View key={item.id} style={rowStyle}>
              <View style={styles.colName}>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{item.name}</Text>
                {item.description
                  ? <Text style={[styles.tableCell, { color: '#9ca3af', fontSize: 8, marginTop: 1 }]}>{item.description}</Text>
                  : null}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{item.quantity ?? '—'}</Text>
              <Text style={[styles.tableCell, styles.colUnit]}>{item.unit ?? '—'}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{fmt(item.unit_price)}</Text>
              <Text style={[styles.tableCell, styles.colTotal]}>{fmt(lineTotal)}</Text>
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(data.subtotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-{fmt(data.discount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmt(data.total)}</Text>
          </View>
        </View>

        <PageFooter data={data} styles={styles} />
      </Page>

      {/* ── Authorization ──────────────────────────────────────── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderAccent} />
          <Text style={styles.pageHeaderTitle}>Authorization</Text>
        </View>

        <Text style={styles.bodyText}>
          By signing below, I authorize {data.company_name} to perform the work described in this
          estimate. I understand that final pricing may vary if additional damage is discovered during
          the course of repairs. Payment is due upon completion unless otherwise arranged in writing.
        </Text>

        {/* Option checkboxes */}
        <View style={{ marginBottom: 20 }}>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>Proceed with the full estimate as quoted above.</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>Proceed with priority repairs only (to be scoped in a revised estimate).</Text>
          </View>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxLabel}>Decline repairs at this time.</Text>
          </View>
        </View>

        {/* Client info */}
        <View style={styles.clientInfoBlock}>
          <Text style={styles.clientInfoLabel}>Customer</Text>
          <Text style={styles.clientInfoValue}>{data.client_name}</Text>
          <Text style={[styles.clientInfoLabel, { marginTop: 6 }]}>Property Address</Text>
          <Text style={styles.clientInfoValue}>{addressLine}</Text>
        </View>

        {/* Signature fields */}
        <View style={styles.signBlock}>
          <View style={styles.signLine} />
          <Text style={styles.signFieldLabel}>Client Signature</Text>
        </View>
        <View style={[styles.signBlock, { flexDirection: 'row', gap: 32 }]}>
          <View style={{ flex: 2 }}>
            <View style={styles.signLine} />
            <Text style={styles.signFieldLabel}>Print Name</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.signLineShort} />
            <Text style={styles.signFieldLabel}>Date</Text>
          </View>
        </View>

        <PageFooter data={data} styles={styles} />
      </Page>
    </Document>
  )
}
