import React from 'react'
import type {
  AreaNewsletterReport,
  NewsletterStoreActionFocusItem,
} from '@/lib/reports/monthly-newsletter-types'
import styles from './newsletter-poster-placeholder.module.css'

interface NewsletterPosterPlaceholderProps {
  report: AreaNewsletterReport
  newsletterMonth: string
}

type FocusTone = 'emerald' | 'slate' | 'red' | 'lime'
type ComplianceStatus = 'GREEN' | 'AMBER' | 'RED'

interface PosterFocusCard {
  title: string
  prompt: string
  imagePath: string
  tone: FocusTone
}

const FOCUS_TONES: FocusTone[] = ['emerald', 'slate', 'red', 'lime']
const FOCUS_IMAGE_FALLBACK_PATH = '/newsletter-placeholders/focus-generic.svg'
const REMINDERS_COMPOSITE_IMAGE_PATH =
  '/newsletter-placeholders/reminders-updates-composite-user.png'
const REMINDERS_COMPOSITE_FALLBACK_PATH =
  '/newsletter-placeholders/reminders-updates-composite.svg'

function formatMonthLabel(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return value
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const date = new Date(Date.UTC(year, month, 1))

  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function resolveFocusImagePath(topic: string): string {
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

function normalizeFocusTitle(topic: string, index: number): string {
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

function buildFocusImageStyle(imagePath: string): React.CSSProperties {
  return {
    backgroundImage: `url(${imagePath}), url(${FOCUS_IMAGE_FALLBACK_PATH})`,
  }
}

function tightenManagerPrompt(prompt: string): string {
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

function resolveComplianceStatus(
  metrics: AreaNewsletterReport['storeActionMetrics']
): ComplianceStatus {
  if (metrics.overdueCount > 0) return 'RED'
  if (metrics.highPriorityCount > 0 || metrics.activeCount > 0) return 'AMBER'
  return 'GREEN'
}

function toFocusCard(item: NewsletterStoreActionFocusItem, index: number): PosterFocusCard {
  return {
    title: normalizeFocusTitle(item.topic || '', index),
    prompt: tightenManagerPrompt(
      item.managerPrompt?.trim() || 'Review and close related actions with clear ownership.'
    ),
    imagePath: resolveFocusImagePath(item.topic || ''),
    tone: FOCUS_TONES[index % FOCUS_TONES.length],
  }
}

function buildFocusCards(report: AreaNewsletterReport): PosterFocusCard[] {
  return report.storeActionMetrics.focusItems.map(toFocusCard)
}

function splitFocusCardsForBento(cards: PosterFocusCard[]): [PosterFocusCard[], PosterFocusCard[]] {
  if (cards.length <= 1) return [cards, []]
  const topRowCount = Math.ceil(cards.length / 2)
  return [cards.slice(0, topRowCount), cards.slice(topRowCount)]
}

const focusToneClass: Record<FocusTone, string> = {
  emerald: styles.focusToneEmerald,
  slate: styles.focusToneSlate,
  red: styles.focusToneRed,
  lime: styles.focusToneLime,
}

export function NewsletterPosterPlaceholder({
  report,
  newsletterMonth,
}: NewsletterPosterPlaceholderProps) {
  const focusCards = buildFocusCards(report)
  const [focusTopRow, focusBottomRow] = splitFocusCardsForBento(focusCards)
  const focusBentoColumns = Math.max(1, Math.ceil(focusCards.length / 2))
  const bottomRowIsPartial =
    focusBottomRow.length > 0 && focusBottomRow.length < focusBentoColumns
  const focusTopRowStyle = {
    '--focus-cols': focusBentoColumns,
    '--focus-items': focusTopRow.length,
  } as React.CSSProperties
  const focusBottomRowStyle = {
    '--focus-cols': focusBentoColumns,
    '--focus-items': focusBottomRow.length,
  } as React.CSSProperties
  const focusGridColumns = Math.min(4, Math.max(1, focusCards.length))
  const complianceStatus = resolveComplianceStatus(report.storeActionMetrics)
  const monthLabel = formatMonthLabel(newsletterMonth)

  const complianceStatusMeta =
    complianceStatus === 'GREEN'
      ? 'No open actions. Maintain standards and continue daily checks.'
      : complianceStatus === 'AMBER'
        ? 'Open actions require active management and evidence upload.'
        : 'Escalation required. Immediate corrective action and evidence upload.'

  const complianceStatusClass =
    complianceStatus === 'GREEN'
      ? styles.statusGreen
      : complianceStatus === 'AMBER'
        ? styles.statusAmber
        : styles.statusRed

  return (
    <section className={styles.poster} aria-label={`${report.areaLabel} poster placeholder`}>
      <div className={styles.topRule} />

      <header className={styles.header}>
        <p className={styles.brand}>FOOTASYLUM</p>
        <h5 className={styles.title}>HEALTH & SAFETY AUDIT UPDATE</h5>
        <p className={styles.meta}>
          {report.areaLabel} | {monthLabel}
        </p>
      </header>

      <div className={styles.metricsGrid}>
        <div className={styles.metricTile}>
          <p className={styles.metricLabel}>Open Actions</p>
          <p className={styles.metricValue}>{report.storeActionMetrics.activeCount}</p>
        </div>
        <div className={styles.metricTile}>
          <p className={styles.metricLabel}>High Risk</p>
          <p className={styles.metricValue}>{report.storeActionMetrics.highPriorityCount}</p>
        </div>
        <div className={styles.metricTile}>
          <p className={styles.metricLabel}>Overdue</p>
          <p className={styles.metricValue}>{report.storeActionMetrics.overdueCount}</p>
        </div>
        <div className={`${styles.metricTile} ${styles.statusTile}`}>
          <p className={styles.metricLabel}>Compliance Status</p>
          <p className={`${styles.statusBadge} ${complianceStatusClass}`}>
            <span className={styles.statusDot} />
            COMPLIANCE STATUS: {complianceStatus}
          </p>
          <p className={styles.statusMeta}>{complianceStatusMeta}</p>
        </div>
      </div>
      <p className={styles.trendLine}>
        Previous Month: Baseline pending | This Month: {report.storeActionMetrics.activeCount} Open |{' '}
        {report.storeActionMetrics.highPriorityCount} High Risk
      </p>
      <div className={styles.statusLegend}>
        <p className={styles.statusLegendTitle}>Status Legend</p>
        <div className={styles.statusLegendRow}>
          <span className={styles.statusLegendItem}>
            <span className={`${styles.statusLegendDot} ${styles.statusLegendDotGreen}`} />
            GREEN: 0-2 low risk
          </span>
          <span className={styles.statusLegendItem}>
            <span className={`${styles.statusLegendDot} ${styles.statusLegendDotAmber}`} />
            AMBER: 3-10 open or high risk present
          </span>
          <span className={styles.statusLegendItem}>
            <span className={`${styles.statusLegendDot} ${styles.statusLegendDotRed}`} />
            RED: escalation required
          </span>
        </div>
      </div>

      {focusCards.length > 0 ? (
        <>
          <p className={styles.sectionTitle}>AREA FOCUS FROM H&amp;S TASKS</p>
          {focusCards.length > 4 ? (
            <div className={styles.focusBento}>
              <div
                className={styles.focusBentoRow}
                style={focusTopRowStyle}
              >
                {focusTopRow.map((card, index) => (
                  <article
                    key={`${card.title}-top-${index}`}
                    className={`${styles.focusCard} ${focusToneClass[card.tone]}`}
                  >
                    <h6 className={styles.focusHeader}>{card.title}</h6>
                    <div
                      className={styles.imagePlaceholder}
                      style={buildFocusImageStyle(card.imagePath)}
                    />
                    <p className={styles.prompt}>{card.prompt}</p>
                  </article>
                ))}
              </div>
              {focusBottomRow.length > 0 ? (
                <div
                  className={`${styles.focusBentoRow} ${
                    bottomRowIsPartial ? styles.focusBentoRowCentered : ''
                  }`}
                  style={focusBottomRowStyle}
                >
                  {focusBottomRow.map((card, index) => (
                    <article
                      key={`${card.title}-bottom-${index}`}
                      className={`${styles.focusCard} ${focusToneClass[card.tone]}`}
                    >
                      <h6 className={styles.focusHeader}>{card.title}</h6>
                      <div
                        className={styles.imagePlaceholder}
                        style={buildFocusImageStyle(card.imagePath)}
                      />
                      <p className={styles.prompt}>{card.prompt}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div
              className={styles.focusGrid}
              style={{ '--focus-cols': focusGridColumns } as React.CSSProperties}
            >
              {focusCards.map((card, index) => (
                <article
                  key={`${card.title}-${index}`}
                  className={`${styles.focusCard} ${focusToneClass[card.tone]}`}
                >
                  <h6 className={styles.focusHeader}>{card.title}</h6>
                  <div
                    className={styles.imagePlaceholder}
                    style={buildFocusImageStyle(card.imagePath)}
                  />
                  <p className={styles.prompt}>{card.prompt}</p>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}

      <div className={styles.remindersPanel}>
        <p className={`${styles.sectionTitle} ${styles.sectionTitleLight}`}>REMINDERS &amp; UPDATES</p>
        <article
          className={styles.remindersCompositeImage}
          aria-label="Reminders and updates composite"
          style={{
            backgroundImage: `url(${REMINDERS_COMPOSITE_IMAGE_PATH}), url(${REMINDERS_COMPOSITE_FALLBACK_PATH})`,
          }}
        />
      </div>

      <p className={styles.accountabilityLine}>
        All actions must include an owner, target date and evidence upload.
      </p>
      <div className={styles.footerMeta}>
        <p>www.kssnwltd.co.uk - Health &amp; Safety Consultants</p>
      </div>
    </section>
  )
}
