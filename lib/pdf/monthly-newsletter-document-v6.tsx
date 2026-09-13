import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { AreaNewsletterReport, NewsletterAIPromptPack, NewsletterAreaStoreRow } from '@/lib/reports/monthly-newsletter-types'

interface Props {
  report: AreaNewsletterReport
  periodLabel: string
  generatedAt: string
  aiPromptPack?: NewsletterAIPromptPack | null
}

const ink = '#202c25'
const muted = '#647269'
const green = '#18774f'
const red = '#ad3b35'
const styles = StyleSheet.create({
  page: { padding: 34, paddingBottom: 52, fontFamily: 'Helvetica', fontSize: 10, color: ink, backgroundColor: '#ffffff' },
  masthead: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: ink, paddingBottom: 10, marginBottom: 22 },
  brand: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  small: { fontSize: 8, color: muted, lineHeight: 1.5 },
  eyebrow: { fontSize: 9, color: green, fontWeight: 'bold', letterSpacing: 1.4, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, lineHeight: 1.12 },
  sub: { fontSize: 12, color: muted, marginBottom: 20, lineHeight: 1.5 },
  section: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 12 },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  metrics: { flexDirection: 'row', marginBottom: 16 },
  metric: { flex: 1, padding: 12, backgroundColor: '#f0f5ed', marginRight: 5, borderRadius: 5 },
  value: { fontSize: 23, fontWeight: 'bold', marginBottom: 6 },
  panel: { padding: 13, backgroundColor: '#f5f7f4', borderRadius: 5, marginBottom: 10 },
  row: { flexDirection: 'row', paddingVertical: 4.5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#dce3dc' },
  tableHead: { backgroundColor: ink, color: '#ffffff' },
  rank: { width: '8%', fontSize: 9 },
  store: { width: '38%', fontSize: 9 },
  score: { width: '18%', fontSize: 9 },
  change: { width: '18%', fontSize: 9, fontWeight: 'bold' },
  caption: { fontSize: 7, color: muted, marginTop: 3 },
  theme: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  finding: { marginBottom: 4, padding: 6, borderLeftWidth: 3, borderLeftColor: '#d5ed9b', backgroundColor: '#f7f9f5' },
  footer: { position: 'absolute', bottom: 23, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#dce3dc', paddingTop: 8, fontSize: 8, color: muted },
})

const score = (value: number | null | undefined) => value == null ? 'Pending' : `${value.toFixed(2)}%`
const date = (value: string | null | undefined) => {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
const movement = (store: NewsletterAreaStoreRow) => `${(store.auditChange ?? 0) > 0 ? '+' : ''}${(store.auditChange ?? 0).toFixed(2)} pp`

export function MonthlyNewsletterPDF({ report, periodLabel, generatedAt }: Props) {
  const ranked = [...report.stores].sort((a, b) => ((b.audit2Score ?? b.audit1Score) ?? -1) - ((a.audit2Score ?? a.audit1Score) ?? -1) || a.storeName.localeCompare(b.storeName))
  const compared = ranked.filter((s) => s.auditChange != null)
  const improved = compared.filter((s) => s.auditChange! > 0).sort((a, b) => b.auditChange! - a.auditChange!)
  const declined = compared.filter((s) => s.auditChange! < 0).sort((a, b) => a.auditChange! - b.auditChange!)
  const second = ranked.filter((s) => s.audit2Score != null)
  const averageChange = compared.length ? compared.reduce((sum, s) => sum + s.auditChange!, 0) / compared.length : null
  const Header = ({ label }: { label: string }) => <View style={styles.masthead}><Text style={styles.brand}>KSS × FOOTASYLUM</Text><Text style={styles.small}>{report.areaLabel}  /  {label}</Text></View>
  const Footer = () => <View style={styles.footer} fixed><Text>{periodLabel} · Data as at {date(generatedAt)}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>
  const Movement = ({ title, rows, color }: { title: string; rows: NewsletterAreaStoreRow[]; color: string }) => <View style={styles.panel} wrap={false}><Text style={[styles.theme, { color }]}>{title} · {rows.length}</Text>{rows.length ? rows.map((s) => <Text key={s.storeCode || s.storeName} style={styles.body}>{s.storeName}  {movement(s)}  |  {score(s.audit1Score)} to {score(s.audit2Score)}</Text>) : <Text style={styles.body}>No stores recorded in this category.</Text>}</View>
  return <Document title={`${report.areaLabel} – ${periodLabel}`} author="KSS NW Ltd" subject="Half-year audit comparison and outstanding H&S findings">
    <Page size="A4" style={styles.page}>
      <Header label="AREA REVIEW" />
      <Text style={styles.eyebrow}>HEALTH & SAFETY · HALF-YEAR REPORT</Text>
      <Text style={styles.title}>{periodLabel} Update</Text>
      <Text style={styles.sub}>{report.areaLabel} · {report.areaManagerName || 'Area management'}{'\n'}{report.storeCount} stores · Prepared {date(generatedAt)}</Text>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.value}>{second.length}/{ranked.length}</Text><Text style={styles.small}>Audit 2 recorded</Text></View>
        <View style={styles.metric}><Text style={styles.value}>{report.storeActionMetrics.activeCount}</Text><Text style={styles.small}>Open H&S actions</Text></View>
        <View style={styles.metric}><Text style={styles.value}>{averageChange == null ? '—' : `${averageChange > 0 ? '+' : ''}${averageChange.toFixed(2)}`}</Text><Text style={styles.small}>Average change (pp)*</Text></View>
      </View>
      <Text style={styles.body}>This update compares the first and second audits available for the reporting year. {compared.length} stores have comparable results; {compared.length - improved.length - declined.length} are unchanged. Pending results are excluded from movement calculations.</Text>
      <Text style={styles.small}>*Average percentage-point change uses only the same stores with both audits recorded. This is a progress update as at the preparation date, not a completed year-end position.</Text>
      <Text style={styles.section}>Performance movement</Text>
      <Movement title="Improved" rows={improved} color={green} />
      <Movement title="Declined" rows={declined} color={red} />
      <Footer />
    </Page>
    <Page size="A4" style={styles.page}>
      <Header label="LEAGUE TABLE" />
      <Text style={styles.title}>Audit 1 → Audit 2</Text>
      <Text style={styles.body}>Ranked by Audit 2 where available, otherwise Audit 1. Equal scores share a rank. Changes are percentage points (pp).</Text>
      <View style={[styles.row, styles.tableHead]}><Text style={styles.rank}>Rank</Text><Text style={styles.store}>Store</Text><Text style={styles.score}>Audit 1</Text><Text style={styles.score}>Audit 2</Text><Text style={styles.change}>Change</Text></View>
      {ranked.map((s) => {
        const latest = s.audit2Score ?? s.audit1Score
        const rank = latest == null ? '—' : String(ranked.findIndex((item) => (item.audit2Score ?? item.audit1Score) === latest) + 1)
        return <View key={s.storeCode || s.storeName} style={styles.row} wrap={false}>
          <Text style={styles.rank}>{rank}</Text>
          <View style={styles.store}><Text>{s.storeName}</Text><Text style={styles.caption}>{s.storeCode || ''}</Text></View>
          <View style={styles.score}><Text>{score(s.audit1Score)}</Text><Text style={styles.caption}>{date(s.audit1Date)}</Text></View>
          <View style={styles.score}><Text>{score(s.audit2Score)}</Text><Text style={styles.caption}>{date(s.audit2Date)}</Text></View>
          <View style={styles.change}><Text style={{ color: s.auditChange == null ? muted : s.auditChange >= 0 ? green : red }}>{s.auditChange == null ? '—' : movement(s)}</Text><Text style={styles.caption}>{s.auditChange == null ? 'Awaiting comparison' : s.auditChange > 0 ? 'Improved' : s.auditChange < 0 ? 'Declined' : 'Unchanged'}</Text></View>
        </View>
      })}
      <Footer />
    </Page>
    <Page size="A4" style={styles.page}>
      <Header label="ACTION PRIORITIES" />
      <Text style={styles.title}>Outstanding H&S findings</Text>
      <Text style={styles.body}>{report.storeActionMetrics.activeCount} open actions · {report.storeActionMetrics.highPriorityCount} recorded high/urgent · {report.storeActionMetrics.overdueCount} overdue. The checks below identify the actual audit findings and affected stores. Corrective details and evidence requirements remain on each action in the system.</Text>
      <Text style={styles.small}>Themes with recorded high-priority or overdue actions appear first, followed by fire precautions, equipment safety and other control themes. These are source findings, not newly assigned severity ratings. A flagged question may require clarification; check the original action before closing it.</Text>
      {report.storeActionMetrics.focusItems.map((item) => <View key={item.topic}>
        <Text style={styles.section} minPresenceAhead={65}>{item.topic}</Text>
        <Text style={styles.body}>{item.actionCount} actions across {item.storeCount} stores. {item.managerPrompt}</Text>
        {(item.findings || []).map((finding) => <View key={finding.question} style={styles.finding} wrap={false}>
          <Text style={[styles.body, { fontWeight: 'bold', fontSize: 9, marginBottom: 4 }]}>Flagged check: {finding.question}</Text>
          <Text style={styles.small}>{finding.stores.join(', ')} · {finding.actionCount} open actions</Text>
        </View>)}
      </View>)}
      {!report.storeActionMetrics.activeCount && <Text style={styles.body}>No open H&S actions recorded for this area.</Text>}
      <Footer />
    </Page>
    <Page size="A4" style={styles.page}>
      <Header label="MANAGER FOLLOW-UP" />
      <Text style={styles.title}>Next steps & reminders</Text>
      <Text style={styles.section}>Area manager follow-up</Text>
      <Text style={styles.body}>Review the listed findings with the affected stores, agree ownership and completion dates, and retain evidence against each action. Give particular attention to stores with declining audit results and confirm plans for outstanding second visits.</Text>
      <Text style={styles.section}>Store team reminders</Text>
      {report.reminders.map((item, i) => <Text key={i} style={styles.body}>• {item}</Text>)}
      <Text style={styles.section}>Policy reminders</Text>
      {report.legislationUpdates.map((item, i) => <Text key={i} style={styles.body}>• {item}</Text>)}
      <Text style={styles.section}>Fire risk assessment status</Text>
      <Text style={styles.body}>{report.fraMetrics.upToDate} up to date · {report.fraMetrics.dueSoon} due soon · {report.fraMetrics.overdue} overdue · {report.fraMetrics.required} required.</Text>
      {report.fraMetrics.notableItems.map((item, i) => <Text key={i} style={styles.body}>{item.storeName}: {item.status}{item.note ? ` — ${item.note}` : ''}</Text>)}
      <Footer />
    </Page>
  </Document>
}
