import {
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  StyleSheet,
  Font,
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

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function makeStyles(primary: string) {
  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937', paddingHorizontal: 48, paddingVertical: 48 },
    // Cover
    coverPage: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
    logo: { width: 120, height: 60, objectFit: 'contain', marginBottom: 24 },
    coverTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: primary, marginBottom: 8, textAlign: 'center' },
    coverSub: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
    coverDate: { fontSize: 10, color: '#9ca3af', marginTop: 16 },
    divider: { borderBottom: `2px solid ${primary}`, marginVertical: 16 },
    // Section
    sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primary, marginBottom: 10, marginTop: 18 },
    bodyText: { fontSize: 10, color: '#374151', lineHeight: 1.6 },
    // Photo + findings
    photoBlock: { marginBottom: 20 },
    photo: { width: '100%', borderRadius: 4, marginBottom: 8 },
    findingRow: { flexDirection: 'row', marginBottom: 4, gap: 6 },
    findingNum: { width: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: primary },
    findingNumText: { color: 'white', fontSize: 8, fontFamily: 'Helvetica-Bold' },
    findingText: { flex: 1, fontSize: 9, color: '#374151', paddingTop: 2 },
    findingSeverity: { fontSize: 8, color: '#6b7280', marginTop: 1 },
    // Line items
    tableHeader: { flexDirection: 'row', borderBottom: `1px solid ${primary}`, paddingBottom: 4, marginBottom: 4 },
    tableHeaderText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: primary },
    tableRow: { flexDirection: 'row', borderBottom: '1px solid #f3f4f6', paddingVertical: 5 },
    tableCell: { fontSize: 9, color: '#374151' },
    colName: { flex: 3 },
    colQty: { flex: 1, textAlign: 'right' },
    colUnit: { flex: 1, textAlign: 'right' },
    colPrice: { flex: 1, textAlign: 'right' },
    colTotal: { flex: 1, textAlign: 'right' },
    // Totals
    totalsBlock: { marginTop: 12, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', gap: 16, marginBottom: 3 },
    totalLabel: { fontSize: 10, color: '#6b7280', textAlign: 'right', width: 80 },
    totalValue: { fontSize: 10, color: '#374151', textAlign: 'right', width: 80 },
    grandTotalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: primary, textAlign: 'right', width: 80 },
    grandTotalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: primary, textAlign: 'right', width: 80 },
    // Signing
    signBlock: { marginTop: 24 },
    signLabel: { fontSize: 9, color: '#9ca3af', marginBottom: 20 },
    signLine: { borderBottom: '1px solid #d1d5db', width: '60%', marginBottom: 4 },
    signFieldLabel: { fontSize: 8, color: '#9ca3af' },
  })
}

export function EstimatePDF({ data }: { data: PdfEstimateData }) {
  const styles = makeStyles(data.primary_color || '#7C3AED')
  const addressLine = [data.address, data.city, data.state, data.zip].filter(Boolean).join(', ')

  return (
    <Document>
      {/* Cover page */}
      <Page size="LETTER" style={[styles.page, styles.coverPage]}>
        {data.logo_base64 && (
          <PdfImage src={`data:image/png;base64,${data.logo_base64}`} style={styles.logo} />
        )}
        <Text style={styles.coverTitle}>{data.company_name}</Text>
        <View style={styles.divider} />
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 6, textAlign: 'center' }}>
          Roof Inspection &amp; Estimate
        </Text>
        <Text style={styles.coverSub}>{data.client_name}</Text>
        <Text style={styles.coverSub}>{addressLine}</Text>
        <Text style={styles.coverDate}>{data.date}</Text>
        {data.company_email && <Text style={[styles.coverDate, { marginTop: 32 }]}>{data.company_email}</Text>}
        {data.company_phone && <Text style={styles.coverDate}>{data.company_phone}</Text>}
      </Page>

      {/* Inspection section */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>Inspection Findings</Text>
        {data.intro_text && <Text style={[styles.bodyText, { marginBottom: 12 }]}>{data.intro_text}</Text>}

        {data.photos.map((photo) => (
          <View key={photo.id} style={styles.photoBlock} wrap={false}>
            <PdfImage
              src={`data:image/jpeg;base64,${photo.annotatedImageBase64}`}
              style={styles.photo}
            />
            {photo.findings.map((f, i) => (
              <View key={f.id} style={styles.findingRow}>
                <View style={styles.findingNum}>
                  <Text style={styles.findingNumText}>{i + 1}</Text>
                </View>
                <View style={styles.findingText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>
                    {f.issue_type.replace(/_/g, ' ')} — {f.severity.toUpperCase()}
                  </Text>
                  <Text style={styles.findingSeverity}>{f.description}</Text>
                  <Text style={[styles.findingSeverity, { color: '#7c3aed' }]}>
                    Recommended: {f.suggested_service}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </Page>

      {/* Estimate section */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>Estimate</Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colName]}>Service</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {data.line_items.map((item) => {
          const lineTotal = item.quantity != null && item.unit_price != null
            ? item.quantity * item.unit_price
            : null
          return (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.colName}>
                <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>{item.name}</Text>
                {item.description && (
                  <Text style={[styles.tableCell, { color: '#9ca3af', fontSize: 8 }]}>{item.description}</Text>
                )}
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
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmt(data.total)}</Text>
          </View>
        </View>
      </Page>

      {/* Signing page */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>Authorization</Text>
        <Text style={styles.bodyText}>
          By signing below, I authorize {data.company_name} to perform the work described in this
          estimate. I understand that final pricing may vary if additional damage is discovered during
          the course of repairs.
        </Text>

        <View style={[styles.signBlock, { marginTop: 40 }]}>
          <View style={styles.signLine} />
          <Text style={styles.signFieldLabel}>Client Signature</Text>
        </View>
        <View style={[styles.signBlock, { marginTop: 32 }]}>
          <View style={styles.signLine} />
          <Text style={styles.signFieldLabel}>Print Name</Text>
        </View>
        <View style={[styles.signBlock, { marginTop: 32 }]}>
          <View style={[styles.signLine, { width: '30%' }]} />
          <Text style={styles.signFieldLabel}>Date</Text>
        </View>

        <View style={{ marginTop: 48, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center' }}>
            {data.company_name} · {data.company_email} · {data.company_phone}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
