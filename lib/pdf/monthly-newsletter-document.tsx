import React from 'react'
import fs from 'fs'
import path from 'path'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import type {
  AreaNewsletterReport,
  NewsletterAIPromptPack,
  NewsletterAreaStoreRow,
  NewsletterStoreActionFocusItem,
} from '@/lib/reports/monthly-newsletter-types'

interface MonthlyNewsletterPDFProps {
  report: AreaNewsletterReport
  periodLabel: string
  generatedAt: string
  aiPromptPack?: NewsletterAIPromptPack | null
}

const MAX_CHART_ROWS = 4
const MAX_POSTER_FOCUS_CARDS = 6
const FOCUS_IMAGE_FALLBACK_PATH = '/newsletter-placeholders/focus-generic.svg'
const REMINDERS_COMPOSITE_IMAGE_PATH =
  '/newsletter-placeholders/reminders-updates-composite-user.png'
const REMINDERS_COMPOSITE_FALLBACK_PATH =
  '/newsletter-placeholders/reminders-updates-composite.svg'
const imageDataUriCache = new Map<string, string | null>()

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  areaCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    width: '74%',
  },
  headerRight: {
    width: '26%',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 1,
    fontSize: 7.5,
    color: '#475569',
  },
  generated: {
    marginTop: 1,
    fontSize: 7.5,
    color: '#64748b',
    textAlign: 'right',
  },
  kpiGrid: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginRight: 6,
  },
  kpiCardLast: {
    marginRight: 0,
  },
  kpiLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: 'bold',
  },
  briefingCard: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 6,
    marginBottom: 6,
  },
  briefingTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#4338ca',
    marginBottom: 4,
  },
  briefingBody: {
    fontSize: 6.8,
    color: '#334155',
    lineHeight: 1.2,
  },
  briefingDivider: {
    borderTopWidth: 1,
    borderTopColor: '#c7d2fe',
    marginVertical: 4,
  },
  briefingSubTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#4338ca',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#334155',
    marginBottom: 6,
  },
  chartRow: {
    marginBottom: 3,
  },
  chartTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chartStoreName: {
    fontSize: 7,
    color: '#0f172a',
    width: '78%',
  },
  chartScoreText: {
    fontSize: 7,
    color: '#334155',
    width: '22%',
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
  },
  leaderboardColumns: {
    flexDirection: 'row',
  },
  leaderboardColumn: {
    width: '49%',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  leaderboardColumnFull: {
    width: '100%',
  },
  leaderboardSpacer: {
    width: '2%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 3.5,
  },
  tableHeaderCell: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  tableColRank: {
    width: '10%',
  },
  tableColStore: {
    width: '66%',
  },
  tableColScore: {
    width: '24%',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 2.2,
  },
  tableCell: {
    fontSize: 7,
    color: '#0f172a',
  },
  tableRank: {
    fontSize: 7,
    color: '#64748b',
    fontWeight: 'bold',
  },
  tableStoreName: {
    fontSize: 7,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  tableStoreCode: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1,
  },
  panelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginRight: 6,
  },
  panelWide: {
    width: '60%',
  },
  panelNarrow: {
    width: '40%',
  },
  panelLast: {
    marginRight: 0,
  },
  focusColumns: {
    flexDirection: 'row',
  },
  focusColumn: {
    width: '49%',
  },
  focusSpacer: {
    width: '2%',
  },
  panelTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  panelItem: {
    fontSize: 6.7,
    color: '#1e293b',
    marginBottom: 2,
    lineHeight: 1.15,
  },
  panelMuted: {
    fontSize: 6.7,
    color: '#475569',
  },
  posterPage: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#e2e8f0',
    backgroundColor: '#090d16',
  },
  posterFrame: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0b1220',
    minHeight: '100%',
  },
  posterTopRule: {
    height: 2,
    backgroundColor: '#84cc16',
    marginBottom: 6,
  },
  posterBrand: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  posterTitle: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  posterMeta: {
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 8,
    color: '#cbd5e1',
  },
  posterMetricsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  posterMetricTile: {
    flex: 1,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: '#f4be09',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  posterMetricTileLast: {
    marginRight: 0,
  },
  posterMetricLabel: {
    fontSize: 6.2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 0.4,
  },
  posterMetricValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#020617',
  },
  posterStatusTile: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#334155',
  },
  posterStatusLabel: {
    color: '#cbd5e1',
  },
  posterStatusBadge: {
    marginTop: 2,
    alignSelf: 'flex-start',
    backgroundColor: '#f4be09',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 7.1,
    color: '#111827',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  posterStatusMeta: {
    marginTop: 3,
    fontSize: 6.9,
    color: '#d1d5db',
    lineHeight: 1.3,
  },
  posterTrendLine: {
    marginBottom: 5,
    fontSize: 7.1,
    color: '#cbd5e1',
  },
  posterLegend: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
    backgroundColor: '#0f172a',
  },
  posterLegendTitle: {
    fontSize: 7.2,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  posterLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  posterLegendItem: {
    fontSize: 6.8,
    color: '#e2e8f0',
    marginRight: 9,
    marginBottom: 2,
  },
  posterSectionTitle: {
    borderTopWidth: 1.4,
    borderBottomWidth: 1.4,
    borderTopColor: '#84cc16',
    borderBottomColor: '#84cc16',
    paddingVertical: 4,
    marginBottom: 6,
    textAlign: 'center',
    color: '#f8fafc',
    fontSize: 9.6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  posterFocusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  posterFocusRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  posterFocusCard: {
    width: '31.5%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  posterFocusCardGap: {
    marginRight: 6,
  },
  posterFocusHeader: {
    minHeight: 34,
    paddingHorizontal: 6,
    paddingVertical: 5,
    textAlign: 'center',
    fontSize: 8.2,
    lineHeight: 1.1,
    textTransform: 'uppercase',
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  posterFocusImageWrap: {
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  posterFocusImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  posterFocusPrompt: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 7,
    fontSize: 6.8,
    color: '#1f2937',
    lineHeight: 1.25,
  },
  posterReminderPanel: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 7,
    backgroundColor: '#ffffff',
  },
  posterSectionTitleDark: {
    borderTopWidth: 1.4,
    borderBottomWidth: 1.4,
    borderTopColor: '#84cc16',
    borderBottomColor: '#84cc16',
    paddingVertical: 3,
    marginBottom: 6,
    textAlign: 'center',
    color: '#111827',
    fontSize: 8.8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  posterRemindersImage: {
    width: '100%',
    height: 168,
    borderRadius: 6,
  },
  posterReminderFallback: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 6,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  posterReminderFallbackText: {
    textAlign: 'center',
    fontSize: 7,
    color: '#334155',
  },
  posterAccountabilityLine: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#84cc16',
    paddingTop: 6,
    textAlign: 'center',
    fontSize: 7.4,
    color: '#f1f5f9',
  },
  posterFooterMeta: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 6.9,
    color: '#cbd5e1',
    lineHeight: 1.35,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
    fontSize: 7,
    color: '#64748b',
  },
})

function toScoreLabel(value: number | null): string {
  if (typeof value !== 'number') return 'N/A'
  return `${value.toFixed(1)}%`
}

function scoreColor(score: number | null): string {
  if (typeof score !== 'number') return '#64748b'
  if (score >= 90) return '#059669'
  if (score >= 85) return '#0284c7'
  if (score >= 80) return '#d97706'
  return '#dc2626'
}

function scoreBarWidth(score: number | null): string {
  if (typeof score !== 'number') return '5%'
  const clamped = Math.max(5, Math.min(100, Math.round(score)))
  return `${clamped}%`
}

function formatGeneratedLabel(generatedAt: string): string {
  const parsed = new Date(generatedAt)
  if (Number.isNaN(parsed.getTime())) return generatedAt
  return format(parsed, 'd MMM yyyy HH:mm')
}

function formatStoreLabel(store: NewsletterAreaStoreRow): string {
  return `${store.storeName}${store.storeCode ? ` (${store.storeCode})` : ''}`
}

function sanitizeMarkdownText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`/g, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function resolveAreaManagerGreeting(areaLabel: string): string {
  const normalized = areaLabel.trim().toUpperCase()
  const areaMatch = normalized.match(/^A(\d+)$/)
  if (areaMatch) {
    return `Dear Area ${Number(areaMatch[1])} Manager,`
  }
  if (!areaLabel.trim()) return 'Dear Area Manager,'
  return `Dear ${areaLabel.trim()} Manager,`
}

function extractSubjectAndBody(
  newsletter: string,
  fallbackAreaLabel: string
): { subjectLine: string; body: string } {
  const lines = newsletter.split('\n')
  let subject = ''
  let subjectRemoved = false
  const bodyLines: string[] = []

  lines.forEach((line) => {
    if (!subjectRemoved) {
      const match = line.match(/^\s*Subject:\s*(.+)\s*$/i)
      if (match) {
        subject = match[1].trim()
        subjectRemoved = true
        return
      }
    }
    bodyLines.push(line)
  })

  const fallbackSubject = `Monthly Health & Safety Update - ${fallbackAreaLabel}`
  return {
    subjectLine: `Subject: ${subject || fallbackSubject}`,
    body: bodyLines.join('\n').trim(),
  }
}

function personalizeGreeting(body: string, greeting: string): string {
  if (!body.trim()) return greeting
  if (/^Dear\s+.*?,/im.test(body)) {
    return body.replace(/^Dear\s+.*?,/im, greeting)
  }
  return `${greeting}\n\n${body}`
}

function toBulletLine(value: string): string {
  const normalized = value.trim().replace(/^[-*]\s+/, '')
  return `• ${normalized}`
}

function formatFocusLine(item: NewsletterStoreActionFocusItem): string {
  return `${item.topic} - ${item.actionCount} actions across ${item.storeCount} stores. ${item.managerPrompt}`
}

type ComplianceStatus = 'GREEN' | 'AMBER' | 'RED'

interface PosterFocusCard {
  title: string
  prompt: string
  imageSrc: string | null
  toneColor: string
}

function resolveComplianceStatus(
  metrics: AreaNewsletterReport['storeActionMetrics']
): ComplianceStatus {
  if (metrics.overdueCount > 0) return 'RED'
  if (metrics.highPriorityCount > 0 || metrics.activeCount > 0) return 'AMBER'
  return 'GREEN'
}

function toLocalPublicFilePath(assetPath: string): string {
  const normalized = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath
  return path.join(process.cwd(), 'public', normalized)
}

function mimeTypeFromAssetPath(assetPath: string): string {
  const ext = path.extname(assetPath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

function toDataUriFromPublicAsset(assetPath: string): string | null {
  if (imageDataUriCache.has(assetPath)) {
    return imageDataUriCache.get(assetPath) || null
  }

  try {
    const absolutePath = toLocalPublicFilePath(assetPath)
    if (!fs.existsSync(absolutePath)) {
      imageDataUriCache.set(assetPath, null)
      return null
    }

    const file = fs.readFileSync(absolutePath)
    const mime = mimeTypeFromAssetPath(assetPath)
    const dataUri = `data:${mime};base64,${file.toString('base64')}`
    imageDataUriCache.set(assetPath, dataUri)
    return dataUri
  } catch {
    imageDataUriCache.set(assetPath, null)
    return null
  }
}

function resolveImageDataUri(primaryPath: string, fallbackPath: string): string | null {
  return toDataUriFromPublicAsset(primaryPath) || toDataUriFromPublicAsset(fallbackPath)
}

function resolvePosterFocusImagePath(topic: string): string {
  const lower = topic.toLowerCase()
  if (lower.includes('emergency') && lower.includes('lighting')) {
    return '/newsletter-placeholders/focus-emergency-lighting-tests.png'
  }
  if (lower.includes('panel') && lower.includes('fault')) {
    return '/newsletter-placeholders/focus-fire-panel-fault-follow-up.png'
  }
  if (lower.includes('housekeeping') || lower.includes('slip') || lower.includes('trip')) {
    return '/newsletter-placeholders/focus-housekeeping-safe-access.png'
  }
  if (lower.includes('contractor') || lower.includes('visitor') || lower.includes('permit')) {
    return '/newsletter-placeholders/focus-contractor-visitor-controls.png'
  }
  if (
    lower.includes('fire') ||
    lower.includes('exit') ||
    lower.includes('door') ||
    lower.includes('escape')
  ) {
    return '/newsletter-placeholders/focus-fire-door-escape-routes.png'
  }
  if (lower.includes('height') || lower.includes('ladder') || lower.includes('step')) {
    return '/newsletter-placeholders/focus-work-at-height-equipment.png'
  }
  if (lower.includes('training') || lower.includes('refresher') || lower.includes('induction')) {
    return '/newsletter-placeholders/focus-training-refresher-completion.png'
  }
  if (
    lower.includes('coshh') ||
    lower.includes('hazardous') ||
    lower.includes('chemical') ||
    lower.includes('sds')
  ) {
    return '/newsletter-placeholders/focus-coshh-hazardous-substances.png'
  }
  return '/newsletter-placeholders/focus-generic.png'
}

function normalizePosterFocusTitle(topic: string, index: number): string {
  const trimmed = topic.trim()
  if (!trimmed) return `Focus Item ${index + 1}`

  const lower = trimmed.toLowerCase()
  if (lower.includes('housekeeping') || lower.includes('slip') || lower.includes('trip')) {
    return 'Housekeeping And Safe Access'
  }
  if (lower.includes('contractor') || lower.includes('visitor') || lower.includes('permit')) {
    return 'Contractor And Visitor Controls'
  }
  if (
    lower.includes('fire') &&
    (lower.includes('door') || lower.includes('exit') || lower.includes('escape'))
  ) {
    return 'Fire Door And Escape Route Controls'
  }
  if (lower.includes('height') || lower.includes('ladder') || lower.includes('step')) {
    return 'Work-At-Height Equipment Checks'
  }
  if (lower.includes('training') || lower.includes('refresher') || lower.includes('induction')) {
    return 'Training And Refresher Completion'
  }
  if (
    lower.includes('coshh') ||
    lower.includes('hazardous') ||
    lower.includes('chemical') ||
    lower.includes('sds')
  ) {
    return 'COSHH And Hazardous Substances'
  }
  if (lower.includes('emergency') && lower.includes('lighting')) {
    return 'Emergency Lighting Tests'
  }
  if (lower.includes('panel') && lower.includes('fault')) {
    return 'Fire Panel Fault Follow-Up'
  }

  const compact = trimmed.replace(/\s+/g, ' ').replace(/[.?!]+$/, '')
  const words = compact.split(' ')
  if (words.length <= 5) return compact
  return `${words.slice(0, 5).join(' ')}...`
}

function tightenPosterPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return 'Maintain controls and verify evidence is logged against each action.'

  return trimmed
    .replace(
      /reinforce daily housekeeping checks so walkways, stock areas, and exits stay clear throughout the trading day\./i,
      'Ensure sales floor and stock routes remain clear throughout trading hours.'
    )
    .replace(
      /check ladder and step equipment is uniquely identified, inspected, and used under the correct controls\./i,
      'Verify work-at-height equipment is identified, inspected and logged.'
    )
    .replace(/^ask store teams to\s+/i, 'Store teams must ')
    .replace(/^ask area managers to\s+/i, 'Area managers must ')
}

function buildPosterFocusCards(report: AreaNewsletterReport): PosterFocusCard[] {
  const tones = ['#0f7a3f', '#1f2731', '#b3312b', '#6d9f23']

  return report.storeActionMetrics.focusItems
    .slice(0, MAX_POSTER_FOCUS_CARDS)
    .map((item, index): PosterFocusCard => {
      const imagePath = resolvePosterFocusImagePath(item.topic || '')
      return {
        title: normalizePosterFocusTitle(item.topic || '', index),
        prompt: tightenPosterPrompt(item.managerPrompt || ''),
        imageSrc: resolveImageDataUri(imagePath, FOCUS_IMAGE_FALLBACK_PATH),
        toneColor: tones[index % tones.length],
      }
    })
}

function splitPosterFocusRows(cards: PosterFocusCard[]): [PosterFocusCard[], PosterFocusCard[]] {
  if (cards.length <= 3) return [cards, []]
  const topRowCount = Math.ceil(cards.length / 2)
  return [cards.slice(0, topRowCount), cards.slice(topRowCount)]
}

function renderLeaderboardColumn(
  rows: NewsletterAreaStoreRow[],
  rankOffset: number,
  keyPrefix: string,
  isFullWidth = false
) {
  const columnStyle = isFullWidth
    ? [styles.leaderboardColumn, styles.leaderboardColumnFull]
    : styles.leaderboardColumn

  return (
    <View style={columnStyle}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.tableColRank]}>#</Text>
        <Text style={[styles.tableHeaderCell, styles.tableColStore]}>Store</Text>
        <Text style={[styles.tableHeaderCell, styles.tableColScore]}>Score</Text>
      </View>
      {rows.map((store, index) => (
        <View key={`${keyPrefix}-${index}`} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableColRank, styles.tableRank]}>
            {rankOffset + index + 1}
          </Text>
          <View style={styles.tableColStore}>
            <Text style={styles.tableStoreName}>{store.storeName}</Text>
            {store.storeCode ? <Text style={styles.tableStoreCode}>{store.storeCode}</Text> : null}
          </View>
          <Text
            style={[
              styles.tableCell,
              styles.tableColScore,
              { color: scoreColor(store.latestAuditScore), fontWeight: 'bold' },
            ]}
          >
            {toScoreLabel(store.latestAuditScore)}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function MonthlyNewsletterPDF({
  report,
  periodLabel,
  generatedAt,
  aiPromptPack = null,
}: MonthlyNewsletterPDFProps) {
  const generatedLabel = formatGeneratedLabel(generatedAt)
  const rawNewsletter = sanitizeMarkdownText(
    aiPromptPack?.composeNewsletter?.trim() || report.newsletterMarkdown
  )
  const { subjectLine, body: newsletterBody } = extractSubjectAndBody(rawNewsletter, report.areaLabel)
  const composedNewsletter = personalizeGreeting(
    newsletterBody,
    resolveAreaManagerGreeting(report.areaLabel)
  )
  const riskPattern = sanitizeMarkdownText(aiPromptPack?.analyzeRegionalRisk || '')

  const chartRows = report.stores
    .filter((store) => typeof store.latestAuditScore === 'number')
    .slice(0, MAX_CHART_ROWS)

  const leaderboardSplitIndex = Math.ceil(report.stores.length / 2)
  const leaderboardFirstColumn = report.stores.slice(0, leaderboardSplitIndex)
  const leaderboardSecondColumn = report.stores.slice(leaderboardSplitIndex)
  const reminders = report.reminders
  const legislationUpdates = report.legislationUpdates
  const focusItems = report.storeActionMetrics.focusItems
  const focusSplitIndex = Math.ceil(focusItems.length / 2)
  const focusLeftColumn = focusItems.slice(0, focusSplitIndex)
  const focusRightColumn = focusItems.slice(focusSplitIndex)
  const complianceStatus = resolveComplianceStatus(report.storeActionMetrics)
  const complianceStatusMeta =
    complianceStatus === 'GREEN'
      ? 'No open actions. Maintain standards and continue daily checks.'
      : complianceStatus === 'AMBER'
        ? 'Open actions require active management and evidence upload.'
        : 'Escalation required. Immediate corrective action and evidence upload.'
  const posterFocusCards = buildPosterFocusCards(report)
  const [posterFocusTopRow, posterFocusBottomRow] = splitPosterFocusRows(posterFocusCards)
  const remindersCompositeImageSrc = resolveImageDataUri(
    REMINDERS_COMPOSITE_IMAGE_PATH,
    REMINDERS_COMPOSITE_FALLBACK_PATH
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.areaCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{subjectLine}</Text>
              <Text style={styles.subtitle}>
                {report.areaLabel} | {report.storeCount} stores | Newsletter period data with audit + H&S insights
              </Text>
              <Text style={styles.subtitle}>Period: {periodLabel}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.generated}>Generated: {generatedLabel}</Text>
            </View>
          </View>

          <View style={styles.briefingCard}>
            <Text style={styles.briefingBody}>{composedNewsletter}</Text>
            {riskPattern ? (
              <>
                <View style={styles.briefingDivider} />
                <Text style={styles.briefingSubTitle}>Risk Pattern</Text>
                <Text style={styles.briefingBody}>{riskPattern}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Average Audit Score</Text>
              <Text style={[styles.kpiValue, { color: scoreColor(report.auditMetrics.averageLatestScore) }]}> 
                {toScoreLabel(report.auditMetrics.averageLatestScore)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Audits Completed</Text>
              <Text style={[styles.kpiValue, { color: '#0f172a' }]}> 
                {report.auditMetrics.auditsCompletedThisMonth}
              </Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardLast]}>
              <Text style={styles.kpiLabel}>Stores Below 85%</Text>
              <Text style={[styles.kpiValue, { color: '#b45309' }]}> 
                {report.auditMetrics.belowThresholdCount}
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Audit Score Distribution</Text>
            {chartRows.length > 0 ? (
              chartRows.map((store, index) => (
                <View key={`chart-${index}`} style={styles.chartRow}>
                  <View style={styles.chartTopLine}>
                    <Text style={styles.chartStoreName}>{formatStoreLabel(store)}</Text>
                    <Text style={styles.chartScoreText}>{toScoreLabel(store.latestAuditScore)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={{
                        width: scoreBarWidth(store.latestAuditScore),
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: scoreColor(store.latestAuditScore),
                      }}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.panelMuted}>No scored audits available for this area.</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Store Leaderboard</Text>
            <View style={styles.leaderboardColumns}>
              {renderLeaderboardColumn(
                leaderboardFirstColumn,
                0,
                'left',
                leaderboardSecondColumn.length === 0
              )}
              {leaderboardSecondColumn.length > 0 ? (
                <>
                  <View style={styles.leaderboardSpacer} />
                  {renderLeaderboardColumn(
                    leaderboardSecondColumn,
                    leaderboardSplitIndex,
                    'right'
                  )}
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.panelRow}>
            <View
              style={[
                styles.panel,
                styles.panelWide,
                {
                  borderColor: '#fde68a',
                  backgroundColor: '#fffbeb',
                },
              ]}
            >
              <Text style={[styles.panelTitle, { color: '#b45309' }]}>Area Focus From H&S Tasks</Text>
              <Text style={[styles.panelMuted, { marginBottom: 4 }]}> 
                Active: {report.storeActionMetrics.activeCount} | High/Urgent:{' '}
                {report.storeActionMetrics.highPriorityCount} | Overdue:{' '}
                {report.storeActionMetrics.overdueCount}
              </Text>
              {focusItems.length > 0 ? (
                <View style={styles.focusColumns}>
                  <View style={styles.focusColumn}>
                    {focusLeftColumn.map((item, index) => (
                      <Text key={`focus-left-${index}`} style={styles.panelItem}>
                        {toBulletLine(formatFocusLine(item))}
                      </Text>
                    ))}
                  </View>
                  {focusRightColumn.length > 0 ? (
                    <>
                      <View style={styles.focusSpacer} />
                      <View style={styles.focusColumn}>
                        {focusRightColumn.map((item, index) => (
                          <Text key={`focus-right-${index}`} style={styles.panelItem}>
                            {toBulletLine(formatFocusLine(item))}
                          </Text>
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.panelMuted}>No active H&S task themes available for this area.</Text>
              )}
            </View>

            <View
              style={[
                styles.panel,
                styles.panelNarrow,
                styles.panelLast,
                {
                  borderColor: '#a7f3d0',
                  backgroundColor: '#ecfdf5',
                },
              ]}
            >
              <Text style={[styles.panelTitle, { color: '#047857' }]}>Reminders & Updates</Text>
              <Text style={[styles.panelMuted, { marginBottom: 2 }]}>Reminders</Text>
              {reminders.map((line, index) => (
                <Text key={`rem-${index}`} style={styles.panelItem}>
                  {toBulletLine(line)}
                </Text>
              ))}
              <Text style={[styles.panelMuted, { marginTop: 3, marginBottom: 2 }]}> 
                Legislation / Policy
              </Text>
              {legislationUpdates.map((line, index) => (
                <Text key={`leg-${index}`} style={styles.panelItem}>
                  {toBulletLine(line)}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          KSS NW Monthly Area Newsletter For Footasylum | {report.areaLabel} | {periodLabel}
        </Text>
      </Page>

      <Page size="A4" style={styles.posterPage}>
        <View style={styles.posterFrame}>
          <View style={styles.posterTopRule} />
          <Text style={styles.posterBrand}>FOOTASYLUM</Text>
          <Text style={styles.posterTitle}>HEALTH & SAFETY AUDIT UPDATE</Text>
          <Text style={styles.posterMeta}>
            {report.areaLabel} | {periodLabel}
          </Text>

          <View style={styles.posterMetricsRow}>
            <View style={styles.posterMetricTile}>
              <Text style={styles.posterMetricLabel}>Open Actions</Text>
              <Text style={styles.posterMetricValue}>{report.storeActionMetrics.activeCount}</Text>
            </View>
            <View style={styles.posterMetricTile}>
              <Text style={styles.posterMetricLabel}>High Risk</Text>
              <Text style={styles.posterMetricValue}>{report.storeActionMetrics.highPriorityCount}</Text>
            </View>
            <View style={styles.posterMetricTile}>
              <Text style={styles.posterMetricLabel}>Overdue</Text>
              <Text style={styles.posterMetricValue}>{report.storeActionMetrics.overdueCount}</Text>
            </View>
            <View style={[styles.posterMetricTile, styles.posterMetricTileLast, styles.posterStatusTile]}>
              <Text style={[styles.posterMetricLabel, styles.posterStatusLabel]}>Compliance Status</Text>
              <Text style={styles.posterStatusBadge}>COMPLIANCE STATUS: {complianceStatus}</Text>
              <Text style={styles.posterStatusMeta}>{complianceStatusMeta}</Text>
            </View>
          </View>

          <Text style={styles.posterTrendLine}>
            Previous Month: Baseline pending | This Month: {report.storeActionMetrics.activeCount} Open |{' '}
            {report.storeActionMetrics.highPriorityCount} High Risk
          </Text>

          <View style={styles.posterLegend}>
            <Text style={styles.posterLegendTitle}>Status Legend</Text>
            <View style={styles.posterLegendRow}>
              <Text style={styles.posterLegendItem}>GREEN: 0-2 low risk</Text>
              <Text style={styles.posterLegendItem}>AMBER: 3-10 open or high risk present</Text>
              <Text style={styles.posterLegendItem}>RED: escalation required</Text>
            </View>
          </View>

          <Text style={styles.posterSectionTitle}>Area Focus From H&amp;S Tasks</Text>
          {posterFocusCards.length > 0 ? (
            <>
              <View
                style={
                  posterFocusTopRow.length < 3
                    ? styles.posterFocusRowCentered
                    : styles.posterFocusRow
                }
              >
                {posterFocusTopRow.map((card, index) => (
                  <View
                    key={`poster-focus-top-${index}`}
                    style={[
                      styles.posterFocusCard,
                      { marginRight: index < posterFocusTopRow.length - 1 ? 6 : 0 },
                    ]}
                  >
                    <Text style={[styles.posterFocusHeader, { backgroundColor: card.toneColor }]}>
                      {card.title}
                    </Text>
                    <View style={styles.posterFocusImageWrap}>
                      {card.imageSrc ? (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <Image src={card.imageSrc} style={styles.posterFocusImage} />
                      ) : (
                        <View style={styles.posterReminderFallback}>
                          <Text style={styles.posterReminderFallbackText}>Image placeholder</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.posterFocusPrompt}>{card.prompt}</Text>
                  </View>
                ))}
              </View>
              {posterFocusBottomRow.length > 0 ? (
                <View
                  style={
                    posterFocusBottomRow.length < posterFocusTopRow.length
                      ? styles.posterFocusRowCentered
                      : styles.posterFocusRow
                  }
                >
                  {posterFocusBottomRow.map((card, index) => (
                    <View
                      key={`poster-focus-bottom-${index}`}
                      style={[
                        styles.posterFocusCard,
                        { marginRight: index < posterFocusBottomRow.length - 1 ? 6 : 0 },
                      ]}
                    >
                      <Text style={[styles.posterFocusHeader, { backgroundColor: card.toneColor }]}>
                        {card.title}
                      </Text>
                      <View style={styles.posterFocusImageWrap}>
                        {card.imageSrc ? (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image src={card.imageSrc} style={styles.posterFocusImage} />
                        ) : (
                          <View style={styles.posterReminderFallback}>
                            <Text style={styles.posterReminderFallbackText}>Image placeholder</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.posterFocusPrompt}>{card.prompt}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.posterReminderFallback}>
              <Text style={styles.posterReminderFallbackText}>
                No active H&amp;S task themes available for this area.
              </Text>
            </View>
          )}

          <View style={styles.posterReminderPanel}>
            <Text style={styles.posterSectionTitleDark}>Reminders &amp; Updates</Text>
            {remindersCompositeImageSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={remindersCompositeImageSrc} style={styles.posterRemindersImage} />
            ) : (
              <View style={styles.posterReminderFallback}>
                <Text style={styles.posterReminderFallbackText}>
                  Add reminders artwork at {REMINDERS_COMPOSITE_IMAGE_PATH}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.posterAccountabilityLine}>
            All actions must include an owner, target date and evidence upload.
          </Text>
          <Text style={styles.posterFooterMeta}>
            www.kssnwltd.co.uk - Health &amp; Safety Consultants
          </Text>
        </View>
      </Page>
    </Document>
  )
}
