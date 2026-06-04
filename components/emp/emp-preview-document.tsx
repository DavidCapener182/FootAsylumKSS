import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type {
  EmpPreviewBlock,
  EmpPreviewModel,
  EmpRiskAssessmentModel,
  EmpRiskAssessmentRow,
} from '@/lib/emp/preview'

interface EmpContentPage {
  key: string
  title: string
  description?: string
  continuation: boolean
  showHeading: boolean
  orientation: 'portrait' | 'landscape'
  blocks: EmpPreviewBlock[]
}

const EMP_PAGE_CAPACITY_UNITS = 43
const EMP_LANDSCAPE_PAGE_CAPACITY_UNITS = 46
const EMP_BLOCK_GAP_UNITS = 1
const EMP_KEY_VALUE_HEADER_UNITS = 1.5
const EMP_MULTI_TABLE_HEADER_UNITS = 1.5
const EMP_DEPLOYMENT_MAX_ROWS_PER_TABLE = 40

function getPageCapacityUnits(orientation: EmpContentPage['orientation']) {
  return orientation === 'landscape' ? EMP_LANDSCAPE_PAGE_CAPACITY_UNITS : EMP_PAGE_CAPACITY_UNITS
}

function countDeploymentRows(blocks: EmpPreviewBlock[]) {
  return blocks.reduce((sum, block) => {
    if (block.type !== 'multi_table' || !block.deploymentSchedule) return sum
    return sum + block.rows.length
  }, 0)
}

function chunkItems<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function wrapTextIntoLines(text: string, maxChars = 34) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []

  const words = normalized.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
    }

    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function wrapTextLines(text: string, maxChars = 34, maxLines = 4) {
  const lines = wrapTextIntoLines(text, maxChars)

  if (lines.length <= maxLines) {
    return lines
  }

  const truncated = lines.slice(0, maxLines)

  if (truncated.length) {
    const lastIndex = truncated.length - 1
    truncated[lastIndex] = truncated[lastIndex].replace(/[.,;:!?-]*$/, '').concat('...')
  }

  return truncated
}

function SvgParagraph({
  x,
  y,
  text,
  maxChars,
  maxLines,
  lineHeight = 15,
  center = false,
}: {
  x: number
  y: number
  text: string
  maxChars?: number
  maxLines?: number
  lineHeight?: number
  center?: boolean
}) {
  const lines = wrapTextLines(text, maxChars, maxLines)

  return (
    <text
      x={x}
      y={y}
      textAnchor={center ? 'middle' : 'start'}
      style={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
    >
      {lines.map((line, index) => (
        <tspan key={`${x}-${y}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-800">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function TocColumns({
  items,
}: Extract<EmpPreviewBlock, { type: 'toc_columns' }>) {
  return (
    <div className="emp-toc-columns grid grid-cols-2 gap-x-7 gap-y-0 rounded-md border border-slate-200 bg-white p-4">
      {items.map((item, index) => (
        <div
          key={`${item.ref}-${index}`}
          className="grid grid-cols-[62px_1fr_28px] items-start gap-3 border-b border-slate-200 py-1.5 text-[13px] leading-snug last:border-b-0"
        >
          <span className="font-semibold text-slate-500">{item.ref}</span>
          <span className="min-w-0 text-slate-900">{item.title}</span>
          {typeof item.page === 'number' ? (
            <span className="text-right font-semibold text-slate-500">{item.page}</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function MultiTable({
  title,
  headers,
  rows,
  compact,
  deploymentSchedule,
  blockIndex,
}: {
  title?: string
  headers: string[]
  rows: string[][]
  compact?: boolean
  deploymentSchedule?: boolean
  blockIndex: number
}) {
  const isRiskTable = headers.includes('Controls in this EMP')
  const isDeploymentMatrix = headers.includes('Friday Time') && headers.includes('Sunday Time')
  const isDetailedDeployment = deploymentSchedule || (headers.includes('Area') && headers.includes('Position') && headers.includes('Late'))
  const isCompactTable = compact || isRiskTable || isDeploymentMatrix || isDetailedDeployment
  const renderedHeaders = isDetailedDeployment
    ? ['Area', 'Position', 'Roles', 'Day staff', 'Day start', 'Day end', 'Night staff', 'Night start', 'Night end']
    : headers
  const renderedRows = isDetailedDeployment
    ? rows.map((row) => row.slice(0, renderedHeaders.length))
    : rows
  const isCoOpDeploymentRow = (row: string[] | undefined) => /^Coop\b/i.test(row?.[1] || '')
  const isBarsDeploymentRow = (row: string[] | undefined) => /^BARS$/i.test(row?.[0] || '')
  const isDeploymentGroupStart = (row: string[] | undefined, previousRow: string[] | undefined) =>
    (isBarsDeploymentRow(row) && !isBarsDeploymentRow(previousRow))
    || (isCoOpDeploymentRow(row) && !isCoOpDeploymentRow(previousRow))

  return (
    <div key={blockIndex} className={cn('overflow-hidden', title && 'space-y-2')}>
      {title ? (
        <h3
          className={cn(
            'text-[14px] font-semibold uppercase tracking-[0.18em] text-slate-500',
            isDetailedDeployment && 'text-[13px] tracking-[0.16em]'
          )}
        >
          {title}
        </h3>
      ) : null}
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table
          key={isDetailedDeployment ? `deployment-schedule-${blockIndex}` : `multi-table-${blockIndex}`}
          className={cn(
            'emp-block-table w-full border-collapse',
            isDetailedDeployment && 'emp-deployment-schedule-table table-fixed',
            isCompactTable ? 'text-[12px]' : 'text-[13px]'
          )}
        >
          <thead className="bg-slate-50">
            <tr>
              {renderedHeaders.map((header, headerIndex) => (
                <th
                  key={`${blockIndex}-${headerIndex}-${header}`}
                  className={cn(
                    'border-b border-slate-200 text-left font-semibold text-slate-700',
                    isDetailedDeployment && 'bg-slate-100 text-center align-middle text-[7.5px] uppercase leading-none',
                    isDetailedDeployment && headerIndex > 0 && 'border-l border-l-slate-200',
                    isDetailedDeployment && headerIndex === 6 && 'border-l-2 border-l-slate-400',
                    isDetailedDeployment ? 'px-1 py-1' : isCompactTable ? 'px-2 py-1.5 leading-[1.25]' : 'px-3 py-2'
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedRows.map((row, rowIndex) => (
              <tr
                key={`${blockIndex}-${rowIndex}`}
                className={cn(
                  'border-t border-slate-200 first:border-t-0',
                  isDetailedDeployment
                    && isDeploymentGroupStart(row, renderedRows[rowIndex - 1])
                    && 'border-t-2 border-t-black'
                )}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${blockIndex}-${rowIndex}-${cellIndex}`}
                    className={cn(
                      'whitespace-pre-wrap text-slate-700',
                      isDetailedDeployment && 'align-top text-[8.5px] leading-[1.1]',
                      isDetailedDeployment && cellIndex > 0 && 'border-l border-l-slate-200',
                      isDetailedDeployment && cellIndex >= 5 && 'text-center',
                      isDetailedDeployment && cellIndex === 6 && 'border-l-2 border-l-slate-400',
                      isDetailedDeployment ? 'px-1 py-1' : isCompactTable ? 'px-2 py-1.5 leading-[1.25]' : 'px-3 py-2'
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DiagramShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</div>
        <div className="mt-1 text-[13px] leading-6 text-slate-600">{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function RampDiagram({
  items,
}: Extract<EmpPreviewBlock, { type: 'diagram'; variant: 'ramp' }>) {
  const cards = [
    { x: 24, y: 18, fill: '#ecfeff', stroke: '#67e8f9', ...items[0] },
    { x: 380, y: 18, fill: '#f0fdf4', stroke: '#86efac', ...items[1] },
    { x: 24, y: 130, fill: '#fff7ed', stroke: '#fdba74', ...items[2] },
    { x: 380, y: 130, fill: '#fefce8', stroke: '#fde047', ...items[3] },
  ]

  return (
    <DiagramShell
      title="RAMP Analysis"
      subtitle="Routes, areas, movement, and profile are shown as a single operational planning view."
    >
      <svg viewBox="0 0 720 240" className="h-auto w-full">
        {cards.map((card, index) => (
          <g key={`${card.title}-${index}`}>
            <rect x={card.x} y={card.y} width="316" height="94" rx="12" fill={card.fill} stroke={card.stroke} />
            <text x={card.x + 18} y={card.y + 30} style={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }}>
              {card.title}
            </text>
            <SvgParagraph x={card.x + 18} y={card.y + 54} text={card.value} maxChars={37} maxLines={3} lineHeight={13} />
          </g>
        ))}

        <line x1="340" y1="65" x2="360" y2="65" stroke="#94a3b8" strokeWidth="2" />
        <line x1="360" y1="65" x2="380" y2="65" stroke="#94a3b8" strokeWidth="2" />
        <line x1="340" y1="177" x2="360" y2="177" stroke="#94a3b8" strokeWidth="2" />
        <line x1="360" y1="177" x2="380" y2="177" stroke="#94a3b8" strokeWidth="2" />
        <line x1="182" y1="112" x2="182" y2="130" stroke="#94a3b8" strokeWidth="2" />
        <line x1="538" y1="112" x2="538" y2="130" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="360" cy="121" r="38" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
        <text x="360" y="126" textAnchor="middle" style={{ fontSize: 18, fill: '#0f172a', fontWeight: 800 }}>
          RAMP
        </text>
      </svg>
    </DiagramShell>
  )
}

function CrowdFlowDiagram({
  stages,
}: Extract<EmpPreviewBlock, { type: 'diagram'; variant: 'crowd_flow' }>) {
  const stageWidth = 154
  const gap = 18

  return (
    <DiagramShell
      title="Crowd Flow"
      subtitle="The core route sequence is shown as a simplified flow so ingress, circulation, and dispersal peak-demand areas are easy to read."
    >
      <svg viewBox="0 0 700 220" className="h-auto w-full">
        <defs>
          <marker id="emp-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        {stages.map((stage, index) => {
          const x = 12 + index * (stageWidth + gap)
          const fill = ['#ecfeff', '#f0fdf4', '#fff7ed', '#f8fafc'][index % 4]
          const stroke = ['#67e8f9', '#86efac', '#fdba74', '#cbd5e1'][index % 4]
          return (
            <g key={`${stage.label}-${index}`}>
              <rect x={x} y="42" width={stageWidth} height="126" rx="16" fill={fill} stroke={stroke} />
              <text x={x + stageWidth / 2} y="72" textAnchor="middle" style={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }}>
                {stage.label}
              </text>
              <SvgParagraph x={x + stageWidth / 2} y={98} text={stage.note} maxChars={18} maxLines={5} center />
              {index < stages.length - 1 ? (
                <line
                  x1={x + stageWidth}
                  y1="105"
                  x2={x + stageWidth + gap - 6}
                  y2="105"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  markerEnd="url(#emp-arrow)"
                />
              ) : null}
            </g>
          )
        })}
      </svg>
    </DiagramShell>
  )
}

function BarQueueFlowDiagram({
  title,
  imageUrl,
  lanes,
  controls,
}: Extract<EmpPreviewBlock, { type: 'diagram'; variant: 'bar_queue_flow' }>) {
  const laneLabels = lanes.length
    ? lanes
    : ['Accessible / priority lane', 'Managed feeder lane A', 'Managed feeder lane B', 'Managed feeder lane C']
  const controlLabels = controls.length
    ? controls
    : ['Visible entry point', 'One-way lane flow', 'Refusal support point', 'Two managed exits']

  return (
    <DiagramShell
      title={title || 'Event / Area - Queue Management Plan'}
      subtitle="Customer flow, queue dividers, crowd-control barriers, accessible service area, staff access and managed exits."
    >
      <img
        src={imageUrl || '/emp-assets/bar-queue-flow-template.png'}
        alt={`${title || 'Event queue management plan'} showing customer flow, crowd-control barriers, queue divider, accessible service area and exits`}
        className="block h-auto w-full"
      />
      <div className="grid grid-cols-2 gap-3 text-[9px] leading-snug text-slate-700">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <span className="font-bold text-slate-900">Lanes: </span>
          {laneLabels.slice(0, 3).join(' / ')}
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <span className="font-bold text-slate-900">Controls: </span>
          {controlLabels.slice(0, 3).join(' / ')}
        </div>
      </div>
    </DiagramShell>
  )
}

function CommandDiagram({
  lead,
  control,
  supervisors,
  interfaces,
}: Extract<EmpPreviewBlock, { type: 'diagram'; variant: 'command' }>) {
  const supervisorBoxes = supervisors.slice(0, 4)
  const positions = [
    { x: 28, y: 238 },
    { x: 228, y: 238 },
    { x: 28, y: 330 },
    { x: 228, y: 330 },
  ]
  const roleLabelFor = (role: string) => {
    const normalized = role.toLowerCase()
    if (normalized.includes('kss head of security')) return 'KSS HEAD OF SECURITY'
    if (normalized.includes('kss operational lead')) return 'KSS OPERATIONAL LEAD'
    if (normalized.includes('kss operational support')) return 'KSS OPERATIONAL SUPPORT'
    if (normalized.includes('kss bar supervisor')) return 'KSS BAR SUPERVISORS'
    if (normalized.includes('event control')) return 'EVENT CONTROL'
    if (normalized.includes('festival director') || normalized.includes('venue dps')) return 'EVENT COMMAND'
    if (normalized.includes('gold') || normalized.includes('event director gold')) return 'STRATEGIC LEAD'
    if (normalized.includes('silver') || normalized.includes('event director silver')) return 'TACTICAL LEAD'
    if (normalized.includes('event manager')) return 'EVENT BRONZE'
    if (normalized.includes('assistant security')) return 'SECURITY SUPPORT'
    if (normalized.includes('head of security')) return 'SECURITY COMMAND'
    if (normalized.includes('security manager')) return 'SECURITY BRONZE'
    if (normalized.includes('licensing')) return 'LICENSING LEAD'
    return 'SUPERVISORY LEAD'
  }

  return (
    <DiagramShell
      title="Command and Control Structure"
      subtitle="The reporting chain, control node, and live interfaces are shown as a working command diagram for the event."
    >
      <svg viewBox="0 0 740 430" className="h-auto w-full">
        <rect x="250" y="18" width="220" height="76" rx="16" fill="#ecfdf5" stroke="#6ee7b7" />
        <text x="360" y="42" textAnchor="middle" style={{ fontSize: 11, fill: '#047857', fontWeight: 800 }}>
          {roleLabelFor(lead)}
        </text>
        <SvgParagraph x={360} y={64} text={lead} maxChars={24} maxLines={3} center />

        <rect x="250" y="126" width="220" height="82" rx="16" fill="#eff6ff" stroke="#93c5fd" />
        <text x="360" y="150" textAnchor="middle" style={{ fontSize: 11, fill: '#1d4ed8', fontWeight: 800 }}>
          {roleLabelFor(control)}
        </text>
        <SvgParagraph x={360} y={172} text={control} maxChars={24} maxLines={3} center />

        <line x1="360" y1="94" x2="360" y2="126" stroke="#94a3b8" strokeWidth="3" />
        <line x1="360" y1="208" x2="360" y2="226" stroke="#94a3b8" strokeWidth="3" />
        <line x1="120" y1="226" x2="360" y2="226" stroke="#94a3b8" strokeWidth="2" />
        <line x1="320" y1="226" x2="360" y2="226" stroke="#94a3b8" strokeWidth="2" />
        <line x1="120" y1="226" x2="120" y2="238" stroke="#94a3b8" strokeWidth="2" />
        <line x1="320" y1="226" x2="320" y2="238" stroke="#94a3b8" strokeWidth="2" />
        <line x1="120" y1="226" x2="120" y2="330" stroke="#94a3b8" strokeWidth="2" />
        <line x1="320" y1="226" x2="320" y2="330" stroke="#94a3b8" strokeWidth="2" />
        <line x1="470" y1="167" x2="504" y2="167" stroke="#94a3b8" strokeWidth="3" />

        {supervisorBoxes.map((supervisor, index) => {
          const position = positions[index]
          if (!position) return null
          return (
            <g key={`${supervisor}-${index}`}>
              <rect
                x={position.x}
                y={position.y}
                width="184"
                height="70"
                rx="14"
                fill="#fff7ed"
                stroke="#fdba74"
              />
              <text
                x={position.x + 92}
                y={position.y + 20}
                textAnchor="middle"
                style={{ fontSize: 10, fill: '#c2410c', fontWeight: 800 }}
              >
                {roleLabelFor(supervisor)}
              </text>
              <SvgParagraph x={position.x + 92} y={position.y + 40} text={supervisor} maxChars={20} maxLines={3} center />
            </g>
          )
        })}

        <rect x="504" y="126" width="208" height="274" rx="16" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="608" y="152" textAnchor="middle" style={{ fontSize: 11, fill: '#334155', fontWeight: 800 }}>
          LIVE INTERFACES
        </text>
        {interfaces.slice(0, 5).map((item, index) => (
          <g key={`${item}-${index}`}>
            <circle cx="526" cy={180 + index * 42} r="4" fill="#10b981" />
            <SvgParagraph x={540} y={184 + index * 42} text={item} maxChars={22} maxLines={2} />
          </g>
        ))}
      </svg>
    </DiagramShell>
  )
}

function ImageAttachment({
  title,
  caption,
  imageUrl,
  alt,
  landscape,
}: Extract<EmpPreviewBlock, { type: 'image' }>) {
  const isSitePlan = /site-plan|site[-_ ]?overview|map/i.test(imageUrl)

  return (
    <div className={cn(
      'emp-image-panel overflow-hidden rounded-lg border border-slate-200 bg-white',
      landscape && 'emp-image-panel--landscape',
      isSitePlan && 'emp-image-panel--site-plan'
    )}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</div>
        {caption ? <div className="mt-1 text-[13px] leading-6 text-slate-600">{caption}</div> : null}
      </div>
      <div className="bg-slate-50 p-3">
        <img
          src={imageUrl}
          alt={alt}
          className={cn(
            'w-full rounded-md border border-slate-200 bg-white object-contain',
            landscape ? 'max-h-[88mm]' : 'max-h-[390px]',
            isSitePlan && 'h-[460px] max-h-[460px]'
          )}
        />
      </div>
    </div>
  )
}

function ImageGridAttachment({
  title,
  caption,
  items,
}: Extract<EmpPreviewBlock, { type: 'image_grid' }>) {
  return (
    <div className="emp-image-grid-panel overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</div>
        {caption ? <div className="mt-1 text-[13px] leading-6 text-slate-600">{caption}</div> : null}
      </div>
      <div className="emp-image-grid grid grid-cols-2 gap-4 bg-slate-50 p-4">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="emp-image-panel overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.title}</div>
              {item.caption ? <div className="mt-1 text-[12px] leading-5 text-slate-600">{item.caption}</div> : null}
            </div>
            <div className="bg-slate-50 p-3">
              <img
                src={item.imageUrl}
                alt={item.alt}
                className="max-h-[360px] w-full rounded-md border border-slate-200 bg-white object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmergencyDiagram({
  cards,
}: Extract<EmpPreviewBlock, { type: 'diagram'; variant: 'emergency' }>) {
  const fills = {
    part_evac: ['#eff6ff', '#93c5fd'],
    full_evac: ['#fef2f2', '#fca5a5'],
    lockdown: ['#f5f3ff', '#c4b5fd'],
    shelter: ['#ecfeff', '#67e8f9'],
  } as const

  const renderIcon = (icon: (typeof cards)[number]['icon'], x: number, y: number) => {
    switch (icon) {
      case 'part_evac':
        return (
          <g>
            <rect x={x - 18} y={y - 14} width="36" height="28" rx="8" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <path d={`M ${x - 6} ${y} L ${x + 9} ${y}`} stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" />
            <path d={`M ${x + 1} ${y - 7} L ${x + 10} ${y} L ${x + 1} ${y + 7}`} fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      case 'full_evac':
        return (
          <g>
            <circle cx={x} cy={y} r="18" fill="#ffffff" stroke="#dc2626" strokeWidth="2" />
            <path d={`M ${x} ${y - 9} L ${x} ${y + 7}`} stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" />
            <path d={`M ${x - 7} ${y + 1} L ${x} ${y + 8} L ${x + 7} ${y + 1}`} fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      case 'lockdown':
        return (
          <g>
            <rect x={x - 16} y={y - 8} width="32" height="24" rx="6" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
            <path d={`M ${x - 10} ${y - 8} C ${x - 10} ${y - 22}, ${x + 10} ${y - 22}, ${x + 10} ${y - 8}`} fill="none" stroke="#7c3aed" strokeWidth="2.4" />
            <circle cx={x} cy={y + 4} r="2.5" fill="#7c3aed" />
          </g>
        )
      case 'shelter':
        return (
          <g>
            <path d={`M ${x - 18} ${y + 6} L ${x} ${y - 14} L ${x + 18} ${y + 6}`} fill="none" stroke="#0891b2" strokeWidth="2.4" strokeLinejoin="round" />
            <rect x={x - 12} y={y + 6} width="24" height="14" rx="4" fill="#ffffff" stroke="#0891b2" strokeWidth="2" />
          </g>
        )
      default:
        return null
    }
  }

  return (
    <DiagramShell
      title="Emergency Procedures"
      subtitle="Core emergency arrangements are shown as decision-ready action cards for the live event."
    >
      <svg viewBox="0 0 720 420" className="h-auto w-full">
        {cards.map((card, index) => {
          const x = 24 + (index % 2) * 344
          const y = 24 + Math.floor(index / 2) * 184
          const [fill, stroke] = fills[card.icon]
          return (
            <g key={`${card.title}-${index}`}>
              <rect x={x} y={y} width="328" height="160" rx="16" fill={fill} stroke={stroke} />
              {renderIcon(card.icon, x + 34, y + 36)}
              <text x={x + 66} y={y + 30} style={{ fontSize: 12, fill: '#0f172a', fontWeight: 800 }}>
                {card.title.toUpperCase()}
              </text>
              <SvgParagraph x={x + 24} y={y + 74} text={card.detail} maxChars={34} maxLines={5} />
            </g>
          )
        })}
      </svg>
    </DiagramShell>
  )
}

function CounterTerrorismDiagram({
  cards,
}: Extract<EmpPreviewBlock, { type: 'diagram'; variant: 'ct' }>) {
  const fills = {
    recon: ['#f8fafc', '#cbd5e1'],
    suspicious_item: ['#fff7ed', '#fdba74'],
    vehicle_threat: ['#eff6ff', '#93c5fd'],
    run_hide_tell: ['#f0fdf4', '#86efac'],
  } as const

  const renderIcon = (icon: (typeof cards)[number]['icon'], x: number, y: number) => {
    switch (icon) {
      case 'recon':
        return (
          <g>
            <ellipse cx={x} cy={y} rx="18" ry="11" fill="#ffffff" stroke="#334155" strokeWidth="2" />
            <circle cx={x} cy={y} r="5" fill="#334155" />
          </g>
        )
      case 'suspicious_item':
        return (
          <g>
            <rect x={x - 15} y={y - 10} width="30" height="24" rx="5" fill="#ffffff" stroke="#c2410c" strokeWidth="2" />
            <path d={`M ${x - 7} ${y - 10} C ${x - 7} ${y - 18}, ${x + 7} ${y - 18}, ${x + 7} ${y - 10}`} fill="none" stroke="#c2410c" strokeWidth="2" />
            <path d={`M ${x} ${y - 3} L ${x} ${y + 7}`} stroke="#c2410c" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx={x} cy={y + 11} r="1.8" fill="#c2410c" />
          </g>
        )
      case 'vehicle_threat':
        return (
          <g>
            <rect x={x - 18} y={y - 6} width="36" height="16" rx="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <circle cx={x - 10} cy={y + 12} r="4" fill="#2563eb" />
            <circle cx={x + 10} cy={y + 12} r="4" fill="#2563eb" />
          </g>
        )
      case 'run_hide_tell':
        return (
          <g>
            <circle cx={x - 10} cy={y - 8} r="5" fill="#16a34a" />
            <path d={`M ${x - 10} ${y - 3} L ${x - 4} ${y + 6} L ${x - 12} ${y + 18}`} stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d={`M ${x + 6} ${y - 10} L ${x + 16} ${y - 10} L ${x + 16} ${y + 14} L ${x + 6} ${y + 14}`} fill="none" stroke="#16a34a" strokeWidth="2.2" />
            <path d={`M ${x + 11} ${y + 2} L ${x + 18} ${y + 2}`} stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )
      default:
        return null
    }
  }

  return (
    <DiagramShell
      title="Counter-Terrorism"
      subtitle="Protect Duty and immediate protective actions are summarised visually so staff can read the section quickly during live operations."
    >
      <svg viewBox="0 0 720 420" className="h-auto w-full">
        {cards.map((card, index) => {
          const x = 24 + (index % 2) * 344
          const y = 24 + Math.floor(index / 2) * 184
          const [fill, stroke] = fills[card.icon]
          return (
            <g key={`${card.title}-${index}`}>
              <rect x={x} y={y} width="328" height="160" rx="16" fill={fill} stroke={stroke} />
              {renderIcon(card.icon, x + 34, y + 38)}
              <text x={x + 66} y={y + 30} style={{ fontSize: 12, fill: '#0f172a', fontWeight: 800 }}>
                {card.title.toUpperCase()}
              </text>
              <SvgParagraph x={x + 24} y={y + 74} text={card.detail} maxChars={34} maxLines={5} />
            </g>
          )
        })}
      </svg>
    </DiagramShell>
  )
}

function estimateTextUnits(text: string, maxCharsPerLine: number) {
  return wrapTextIntoLines(text, maxCharsPerLine).length
}

function splitTextForUnits(text: string, maxCharsPerLine: number, availableUnits: number) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return { head: '', tail: '' }
  }

  const maxLines = Math.max(0, Math.floor(availableUnits))
  if (maxLines < 3) {
    return { head: '', tail: normalized }
  }

  const words = normalized.split(' ')
  const headWords: string[] = []

  for (const word of words) {
    const candidate = headWords.length ? `${headWords.join(' ')} ${word}` : word
    const candidateLines = estimateTextUnits(candidate, maxCharsPerLine)
    if (candidateLines <= maxLines || headWords.length === 0) {
      headWords.push(word)
      continue
    }
    break
  }

  const head = headWords.join(' ').trim()
  const tail = words.slice(headWords.length).join(' ').trim()

  if (!head || !tail) {
    return { head: normalized, tail: '' }
  }

  return { head, tail }
}

function estimatePageIntroUnits(showHeading: boolean, description?: string) {
  let units = showHeading ? 4 : 1
  if (showHeading && description) {
    units += estimateTextUnits(description, 96) + 1
  }
  return units
}

function getMultiTableColumnBudgets(columnCount: number) {
  switch (columnCount) {
    case 9:
      return [19, 31, 7, 7, 8, 8, 8, 9, 9]
    case 8:
      return [20, 32, 7, 11, 8, 8, 9, 9]
    case 6:
      return [22, 38, 8, 10, 11, 11]
    case 11:
      return [18, 36, 7, 5, 6, 6, 4, 5, 6, 6, 4]
    case 13:
      return [13, 30, 12, 12, 7, 5, 6, 6, 4, 5, 6, 6, 4]
    case 2:
      return [24, 72]
    case 3:
      return [20, 20, 40]
    case 4:
      return [16, 16, 16, 32]
    case 5:
      return [10, 18, 16, 26, 34]
    default:
      return Array.from({ length: columnCount }, () => Math.max(16, Math.floor(96 / columnCount)))
  }
}

function estimateKeyValueRowUnits(row: { label: string; value: string }) {
  return Math.max(
    estimateTextUnits(row.label, 24),
    estimateTextUnits(row.value, 72)
  ) + 0.5
}

function scaleRowUnits(units: number, scale = 1) {
  return scale === 1 ? units : Math.max(0.85, units * scale)
}

function estimateMultiTableRowUnits(row: string[], compact = false, rowUnitScale = 1) {
  const budgets = getMultiTableColumnBudgets(row.length)
  const maxCellUnits = Math.max(
    ...row.map((cell, index) => estimateTextUnits(cell, budgets[index] || budgets[budgets.length - 1] || 20))
  )

  if (compact && row.length === 9) return scaleRowUnits(Math.max(0.42, maxCellUnits * 0.38), rowUnitScale)
  if (compact && (row.length === 6 || row.length === 8 || row.length === 11 || row.length === 13)) return scaleRowUnits(Math.max(1.05, maxCellUnits + 0.05), rowUnitScale)
  if (row.length === 5 && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(row[2] || '')) return scaleRowUnits(Math.max(1.2, maxCellUnits - 0.2), rowUnitScale)
  if (compact && row.length >= 5) return scaleRowUnits(Math.max(1.2, maxCellUnits + 0.1), rowUnitScale)
  if (compact && row.length === 3) return scaleRowUnits(Math.max(1.2, maxCellUnits + 0.65), rowUnitScale)
  if (row.length >= 5) return scaleRowUnits(maxCellUnits + 1.25, rowUnitScale)
  if (row.length === 3) return scaleRowUnits(maxCellUnits + 1.25, rowUnitScale)
  return scaleRowUnits(maxCellUnits + 0.5, rowUnitScale)
}

function estimateBulletItemUnits(item: string) {
  return Math.max(0.9, estimateTextUnits(item, 112) * 0.9)
}

function estimateMetricGridUnits(items: Array<{ label: string; value: string }>) {
  if (!items.length) return 0

  const cardHeights = items.map(
    (item) => Math.max(3, estimateTextUnits(item.label, 22) + estimateTextUnits(item.value, 28) + 2)
  )

  let total = 0
  for (let index = 0; index < cardHeights.length; index += 2) {
    total += Math.max(cardHeights[index] || 0, cardHeights[index + 1] || 0)
  }
  return total + Math.max(0, Math.ceil(items.length / 2) - 1)
}

function estimateBlockUnits(block: EmpPreviewBlock) {
  switch (block.type) {
    case 'paragraph':
      return estimateTextUnits(block.text, 96) + 1
    case 'subheading':
      return 1.5
    case 'bullet_list':
      return (
        block.items.reduce((sum, item) => sum + estimateBulletItemUnits(item), 0) +
        0.4
      )
    case 'table':
      return block.rows.reduce((sum, row) => sum + estimateKeyValueRowUnits(row), EMP_KEY_VALUE_HEADER_UNITS)
    case 'multi_table':
      const isCompactTable =
        block.compact
        || block.headers.includes('Controls in this EMP')
        || (block.headers.includes('Friday Time') && block.headers.includes('Sunday Time'))
      return block.rows.reduce(
        (sum, row) => sum + estimateMultiTableRowUnits(row, isCompactTable, block.rowUnitScale),
        EMP_MULTI_TABLE_HEADER_UNITS + (block.title ? 1.8 : 0)
      )
    case 'metric_grid':
      return estimateMetricGridUnits(block.items)
    case 'toc_columns':
      return Math.ceil(block.items.length / 2) * 1.25 + 2
    case 'image':
      if (block.landscape) return 22
      if (block.imageUrl.includes('r1bw26-site-overview-map')) return 14
      return 22
    case 'image_grid':
      return 28
    case 'diagram':
      switch (block.variant) {
        case 'ramp':
          return 13
        case 'crowd_flow':
          return 14
        case 'bar_queue_flow':
          return 20
        case 'command':
          return 22
        case 'emergency':
          return 22
        case 'ct':
          return 22
        default:
          return 16
      }
    default:
      return 0
  }
}

function takeParagraphChunk(
  block: Extract<EmpPreviewBlock, { type: 'paragraph' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  const { head, tail } = splitTextForUnits(block.text, 96, availableUnits - 1)
  if (!head || !tail) {
    return { chunk: null, remainder: block }
  }

  return {
    chunk: { ...block, text: head } satisfies EmpPreviewBlock,
    remainder: { ...block, text: tail, startOnNewPage: false, keepWithNext: false } satisfies EmpPreviewBlock,
  }
}

function takeBulletListChunk(
  block: Extract<EmpPreviewBlock, { type: 'bullet_list' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  let usedUnits = 1
  const items: string[] = []

  for (const item of block.items) {
    const itemUnits = estimateBulletItemUnits(item)
    if (usedUnits + itemUnits <= availableUnits || items.length === 0) {
      items.push(item)
      usedUnits += itemUnits
      continue
    }
    break
  }

  if (!items.length) {
    const { head, tail } = splitTextForUnits(block.items[0] || '', 88, availableUnits - 1)
    if (!head || !tail) {
      return { chunk: null, remainder: block }
    }
    return {
      chunk: { ...block, items: [head] } satisfies EmpPreviewBlock,
      remainder: {
        ...block,
        items: [tail, ...block.items.slice(1)],
        startOnNewPage: false,
        keepTogether: false,
      } satisfies EmpPreviewBlock,
    }
  }

  const remainderItems = block.items.slice(items.length)
  return {
    chunk: { ...block, items } satisfies EmpPreviewBlock,
    remainder: remainderItems.length
      ? ({ ...block, items: remainderItems, startOnNewPage: false, keepTogether: false } satisfies EmpPreviewBlock)
      : null,
  }
}

function takeTableChunk(
  block: Extract<EmpPreviewBlock, { type: 'table' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  let usedUnits = EMP_KEY_VALUE_HEADER_UNITS
  const rows: Array<{ label: string; value: string }> = []
  const remainingRows = [...block.rows]

  while (remainingRows.length) {
    const row = remainingRows[0]
    const rowUnits = estimateKeyValueRowUnits(row)

    if (usedUnits + rowUnits <= availableUnits || rows.length === 0) {
      if (usedUnits + rowUnits <= availableUnits) {
        rows.push(row)
        usedUnits += rowUnits
        remainingRows.shift()
        continue
      }

      const { head, tail } = splitTextForUnits(row.value, 72, availableUnits - usedUnits - 0.5)
      if (!head || !tail) {
        break
      }

      rows.push({ label: row.label, value: head })
      remainingRows[0] = { label: `${row.label} (continued)`, value: tail }
      usedUnits = availableUnits
      break
    }

    break
  }

  if (!rows.length) {
    return { chunk: null, remainder: block }
  }

  return {
    chunk: { type: 'table', rows } satisfies EmpPreviewBlock,
    remainder: remainingRows.length
      ? ({ type: 'table', rows: remainingRows } satisfies EmpPreviewBlock)
      : null,
  }
}

function takeMultiTableChunk(
  block: Extract<EmpPreviewBlock, { type: 'multi_table' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits && (!block.deploymentSchedule || block.rows.length <= EMP_DEPLOYMENT_MAX_ROWS_PER_TABLE)) {
    return { chunk: block, remainder: null }
  }

  const columnCount = block.headers.length
  const budgets = getMultiTableColumnBudgets(columnCount)
  const isCompactTable =
    block.compact
    || block.headers.includes('Controls in this EMP')
    || (block.headers.includes('Friday Time') && block.headers.includes('Sunday Time'))
  let usedUnits = EMP_MULTI_TABLE_HEADER_UNITS + (block.title ? 1.8 : 0)
  const rows: string[][] = []
  const remainingRows = [...block.rows]

  while (remainingRows.length) {
    if (block.deploymentSchedule && rows.length >= EMP_DEPLOYMENT_MAX_ROWS_PER_TABLE) {
      break
    }

    const row = remainingRows[0]
    const rowUnits = estimateMultiTableRowUnits(row, isCompactTable, block.rowUnitScale)

    if (usedUnits + rowUnits <= availableUnits || rows.length === 0) {
      if (usedUnits + rowUnits <= availableUnits) {
        rows.push(row)
        usedUnits += rowUnits
        remainingRows.shift()
        continue
      }

      if (block.avoidRowSplit) {
        break
      }

      const splitIndex = row.reduce((highestIndex, cell, index) => {
        const highestBudget = budgets[highestIndex] || budgets[budgets.length - 1] || 20
        const currentBudget = budgets[index] || budgets[budgets.length - 1] || 20
        return estimateTextUnits(cell, currentBudget) > estimateTextUnits(row[highestIndex] || '', highestBudget)
          ? index
          : highestIndex
      }, 0)
      const splitCell = row[splitIndex] || ''
      const splitUnits = Math.min(
        availableUnits - usedUnits - 0.5,
        columnCount >= 5 ? 28 : availableUnits - usedUnits - 0.5
      )
      const { head, tail } = splitTextForUnits(
        splitCell,
        budgets[splitIndex] || budgets[budgets.length - 1] || 40,
        splitUnits
      )

      if (!head || !tail) {
        break
      }

      rows.push(row.map((cell, index) => (index === splitIndex ? head : cell)))
      remainingRows[0] = row.map((cell, index) => {
        if (index === 0) return row[0] ? `${row[0]} (continued)` : 'Continued'
        if (index === splitIndex) return tail
        return ''
      })
      usedUnits = availableUnits
      break
    }

    break
  }

  if (!rows.length) {
    return { chunk: null, remainder: block }
  }

  return {
      chunk: {
        type: 'multi_table',
        title: block.title,
        headers: block.headers,
        rows,
        keepTogether: block.keepTogether,
        compact: block.compact,
        startOnNewPage: block.startOnNewPage,
        avoidRowSplit: block.avoidRowSplit,
        rowUnitScale: block.rowUnitScale,
        landscape: block.landscape,
        deploymentSchedule: block.deploymentSchedule,
      } satisfies EmpPreviewBlock,
    remainder: remainingRows.length
      ? ({
          type: 'multi_table',
          title: block.title,
          headers: block.headers,
          rows: remainingRows,
          keepTogether: block.keepTogether,
          compact: block.compact,
          startOnNewPage: false,
          avoidRowSplit: block.avoidRowSplit,
          rowUnitScale: block.rowUnitScale,
          landscape: block.landscape,
          deploymentSchedule: block.deploymentSchedule,
        } satisfies EmpPreviewBlock)
      : null,
  }
}

function takeMetricGridChunk(
  block: Extract<EmpPreviewBlock, { type: 'metric_grid' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  let count = Math.min(block.items.length, 4)
  while (count > 0) {
    const candidate = { type: 'metric_grid', items: block.items.slice(0, count) } as EmpPreviewBlock
    if (estimateBlockUnits(candidate) <= availableUnits) {
      return {
        chunk: candidate,
        remainder: block.items.length > count
          ? ({ type: 'metric_grid', items: block.items.slice(count) } satisfies EmpPreviewBlock)
          : null,
      }
    }
    count -= 1
  }

  return { chunk: null, remainder: block }
}

function takeBlockChunk(block: EmpPreviewBlock, availableUnits: number) {
  switch (block.type) {
    case 'paragraph':
      return takeParagraphChunk(block, availableUnits)
    case 'subheading':
      return estimateBlockUnits(block) <= availableUnits
        ? { chunk: block, remainder: null }
        : { chunk: null, remainder: block }
    case 'bullet_list':
      return takeBulletListChunk(block, availableUnits)
    case 'table':
      return takeTableChunk(block, availableUnits)
    case 'multi_table':
      return takeMultiTableChunk(block, availableUnits)
    case 'metric_grid':
      return takeMetricGridChunk(block, availableUnits)
    case 'toc_columns':
      return estimateBlockUnits(block) <= availableUnits
        ? { chunk: block, remainder: null }
        : { chunk: null, remainder: block }
    case 'image':
    case 'image_grid':
      return estimateBlockUnits(block) <= availableUnits
        ? { chunk: block, remainder: null }
        : { chunk: null, remainder: block }
    case 'diagram':
      return estimateBlockUnits(block) <= availableUnits
        ? { chunk: block, remainder: null }
        : { chunk: null, remainder: block }
    default:
      return { chunk: null, remainder: block }
  }
}

function estimateMinimumStartUnits(block: EmpPreviewBlock | undefined) {
  if (!block) return 0

  switch (block.type) {
    case 'paragraph':
      return Math.min(estimateBlockUnits(block), 5)
    case 'bullet_list':
      return Math.min(estimateBlockUnits(block), 3)
    case 'table':
      return block.rows[0]
        ? EMP_KEY_VALUE_HEADER_UNITS + estimateKeyValueRowUnits(block.rows[0])
        : estimateBlockUnits(block)
    case 'multi_table':
      return block.rows[0]
        ? EMP_MULTI_TABLE_HEADER_UNITS + estimateMultiTableRowUnits(block.rows[0], block.compact, block.rowUnitScale)
        : estimateBlockUnits(block)
    case 'metric_grid':
      return Math.min(estimateBlockUnits(block), 6)
    default:
      return estimateBlockUnits(block)
  }
}

function getBlockOrientation(block: EmpPreviewBlock | undefined): EmpContentPage['orientation'] {
  if (!block) return 'portrait'
  if (block.type === 'multi_table' && block.landscape) return 'landscape'
  if (block.type === 'subheading' && block.landscape) return 'landscape'
  if (block.type === 'image' && block.landscape) return 'landscape'
  return 'portrait'
}

function shouldStartBlockOnNewPage(block: EmpPreviewBlock) {
  return (
    (block.type === 'paragraph' && block.startOnNewPage)
    || (block.type === 'subheading' && block.startOnNewPage)
    || (block.type === 'bullet_list' && block.startOnNewPage)
    || (block.type === 'multi_table' && block.startOnNewPage)
  )
}

function shouldKeepFullBlockWithNext(
  block: EmpPreviewBlock,
  nextBlock: EmpPreviewBlock | undefined
) {
  if (!nextBlock) return false

  return (
    (block.type === 'paragraph' && block.keepWithNext)
    || (
      block.type === 'subheading'
      && (
        (nextBlock.type === 'multi_table' && nextBlock.deploymentSchedule)
        || (nextBlock.type === 'bullet_list' && nextBlock.keepTogether)
      )
    )
  )
}

function paginateEmpContent(
  keyPrefix: string,
  title: string,
  description: string | undefined,
  blocks: EmpPreviewBlock[]
) {
  const pages: EmpContentPage[] = []

  const createPage = (
    index: number,
    continuation: boolean,
    orientation: EmpContentPage['orientation'] = 'portrait'
  ): EmpContentPage => ({
    key: `${keyPrefix}-${index}`,
    title,
    description: continuation ? undefined : description,
    continuation,
    showHeading: !continuation,
    orientation,
    blocks: [],
  })

  let page = createPage(0, false)
  let availableUnits = getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const originalBlock = blocks[blockIndex]
    const nextBlock = blocks[blockIndex + 1]
    let currentBlock: EmpPreviewBlock | null = originalBlock

    while (currentBlock) {
      const desiredOrientation = getBlockOrientation(currentBlock)
      const shouldKeepWithNext = shouldKeepFullBlockWithNext(currentBlock, nextBlock)
      const keepWithNextUnits = shouldKeepWithNext
        ? estimateBlockUnits(currentBlock) + EMP_BLOCK_GAP_UNITS + estimateBlockUnits(nextBlock)
        : 0

      if (desiredOrientation !== page.orientation && page.blocks.length > 0) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      } else if (desiredOrientation !== page.orientation && page.blocks.length === 0) {
        page.orientation = desiredOrientation
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      if (
        shouldKeepWithNext
        && page.blocks.length > 0
        && keepWithNextUnits > availableUnits
      ) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      if (
        shouldStartBlockOnNewPage(currentBlock)
        && page.blocks.length > 0
      ) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      if (
        currentBlock.type === 'subheading'
        && nextBlock
        && page.blocks.length > 0
        && estimateBlockUnits(currentBlock) + EMP_BLOCK_GAP_UNITS + estimateMinimumStartUnits(nextBlock) > availableUnits
      ) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      if (
        currentBlock.type === 'multi_table'
        && currentBlock.deploymentSchedule
        && page.blocks.length > 0
        && countDeploymentRows(page.blocks) > 0
        && countDeploymentRows(page.blocks) + currentBlock.rows.length > EMP_DEPLOYMENT_MAX_ROWS_PER_TABLE
      ) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      if (
        currentBlock.type === 'multi_table'
        && currentBlock.keepTogether
        && page.blocks.length > 0
        && estimateBlockUnits(currentBlock) > availableUnits
        && estimateBlockUnits(currentBlock) <= getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(false)
      ) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      if (
        currentBlock.type === 'bullet_list'
        && currentBlock.keepTogether
        && page.blocks.length > 0
        && estimateBlockUnits(currentBlock) > availableUnits
        && estimateBlockUnits(currentBlock) <= getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(false)
      ) {
        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      }

      const blockUnits = estimateBlockUnits(currentBlock)
      const fitted = takeBlockChunk(currentBlock, availableUnits)

      if (!fitted.chunk) {
        if (page.blocks.length === 0) {
          page.blocks.push(currentBlock)
          availableUnits = 0
          break
        }

        pages.push(page)
        page = createPage(pages.length, true, desiredOrientation)
        availableUnits =
          getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
        continue
      }

      page.blocks.push(fitted.chunk)
      availableUnits -= estimateBlockUnits(fitted.chunk)
      if (!fitted.remainder) {
        availableUnits -= EMP_BLOCK_GAP_UNITS
        break
      }

      pages.push(page)
      page = createPage(pages.length, true, getBlockOrientation(fitted.remainder || currentBlock))
      availableUnits =
        getPageCapacityUnits(page.orientation) - estimatePageIntroUnits(page.showHeading, page.description)
      currentBlock = fitted.remainder

      if (blockUnits <= getPageCapacityUnits(page.orientation) && availableUnits < 0) {
        break
      }
    }
  }

  pages.push(page)

  return pages.filter((contentPage) => contentPage.blocks.length > 0 || contentPage.showHeading)
}

function withTocPageNumbers(
  model: EmpPreviewModel,
  sectionPages: EmpContentPage[],
  annexPages: EmpContentPage[]
): EmpPreviewModel {
  const sectionStartPages = new Map<string, number>()
  const annexStartPages = new Map<string, number>()

  model.sections.forEach((section) => {
    const firstIndex = sectionPages.findIndex((page) => page.key.startsWith(`${section.key}-`))
    if (firstIndex >= 0) {
      sectionStartPages.set(section.title, firstIndex + 2)
    }
  })

  model.annexes.forEach((annex) => {
    const firstIndex = annexPages.findIndex((page) => page.key.startsWith(`annex-${annex.key}-`))
    if (firstIndex >= 0) {
      annexStartPages.set(annex.title, firstIndex + 2 + sectionPages.length)
    }
  })

  return {
    ...model,
    sections: model.sections.map((section) => {
      if (section.key !== 'table_of_contents') return section
      return {
        ...section,
        blocks: section.blocks.map((block) => {
          if (block.type !== 'toc_columns') return block
          return {
            ...block,
            items: block.items.map((item) => ({
              ...item,
              page: item.ref.startsWith('Annex')
                ? annexStartPages.get(item.title)
                : sectionStartPages.get(item.title),
            })),
          }
        }),
      }
    }),
  }
}

function renderBlock(block: EmpPreviewBlock, blockIndex: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={blockIndex} className="whitespace-pre-wrap text-[13px] leading-6 text-slate-700">
          {block.text}
        </p>
      )
    case 'subheading':
      return (
        <h3 key={blockIndex} className="text-[14px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {block.text}
        </h3>
      )
    case 'bullet_list':
      return (
        <ul key={blockIndex} className="list-disc space-y-1 pl-5 text-[13px] leading-6 text-slate-700">
          {block.items.map((item, index) => (
            <li key={`${blockIndex}-${index}`}>{item}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div key={blockIndex} className="overflow-hidden rounded-md border border-slate-200">
          <table className="emp-block-table w-full border-collapse text-[13px]">
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={`${blockIndex}-${index}`} className="border-t border-slate-200 first:border-t-0">
                  <th className="w-[32%] bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                    {row.label}
                  </th>
                  <td className="whitespace-pre-wrap px-3 py-2 text-slate-700">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'multi_table':
      return (
        <MultiTable
          key={blockIndex}
          title={block.title}
          headers={block.headers}
          rows={block.rows}
          compact={block.compact}
          deploymentSchedule={block.deploymentSchedule}
          blockIndex={blockIndex}
        />
      )
    case 'metric_grid':
      return <MetricGrid key={blockIndex} items={block.items} />
    case 'toc_columns':
      return <TocColumns key={blockIndex} {...block} />
    case 'image':
      return <ImageAttachment key={blockIndex} {...block} />
    case 'image_grid':
      return <ImageGridAttachment key={blockIndex} {...block} />
    case 'diagram':
      switch (block.variant) {
        case 'ramp':
          return <RampDiagram key={blockIndex} {...block} />
        case 'crowd_flow':
          return <CrowdFlowDiagram key={blockIndex} {...block} />
        case 'bar_queue_flow':
          return <BarQueueFlowDiagram key={blockIndex} {...block} />
        case 'command':
          return <CommandDiagram key={blockIndex} {...block} />
        case 'emergency':
          return <EmergencyDiagram key={blockIndex} {...block} />
        case 'ct':
          return <CounterTerrorismDiagram key={blockIndex} {...block} />
        default:
          return null
      }
    default:
      return null
  }
}

function PageHeader({
  title,
  documentLabel,
}: {
  title: string
  documentLabel: string
}) {
  return (
    <div className="emp-page-header mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
      <img src="/kss-logo.png" alt="KSS NW LTD" className="emp-kss-logo-header h-8 w-auto object-contain" />
      <div className="px-4 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {documentLabel}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="text-right text-xs text-slate-500">
        <div>Controlled Copy</div>
        <div>Operational Plan</div>
      </div>
    </div>
  )
}

function PageFooter({
  pageNumber,
  totalPages,
  documentLabel,
}: {
  pageNumber: number
  totalPages: number
  documentLabel: string
}) {
  return (
    <div className="emp-page-footer mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
      <span>KSS NW LTD - {documentLabel} - Controlled operational document</span>
      <span>
        Page {pageNumber} of {totalPages}
      </span>
    </div>
  )
}

function SectionPage({
  page,
  mode,
  pageNumber,
  totalPages,
  documentLabel,
}: {
  page: EmpContentPage
  mode: 'preview' | 'print'
  pageNumber: number
  totalPages: number
  documentLabel: string
}) {
  return (
    <section
      className={cn(
        'emp-a4-page emp-print-page flex flex-col overflow-hidden bg-white',
        page.orientation === 'landscape' && 'emp-page--landscape',
        mode === 'preview' && (page.orientation === 'landscape' ? 'w-[297mm] min-h-[210mm]' : 'w-[180mm] min-h-[267mm]'),
        mode === 'preview' && 'shadow-sm'
      )}
    >
      <PageHeader title={page.title} documentLabel={documentLabel} />
      <div className="emp-page-body flex-1 space-y-4">
        {page.showHeading ? (
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-950">{page.title}</h2>
        ) : page.continuation ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Continued
          </div>
        ) : null}
        {page.description ? (
          <p className="whitespace-pre-wrap text-[13px] leading-6 text-slate-600">{page.description}</p>
        ) : null}
        <div className="space-y-4">{page.blocks.map(renderBlock)}</div>
      </div>
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} documentLabel={documentLabel} />
    </section>
  )
}

function AnnexPage({
  page,
  mode,
  pageNumber,
  totalPages,
  documentLabel,
}: {
  page: EmpContentPage
  mode: 'preview' | 'print'
  pageNumber: number
  totalPages: number
  documentLabel: string
}) {
  return (
    <section
      className={cn(
        'emp-a4-page emp-print-page flex flex-col overflow-hidden bg-white',
        page.orientation === 'landscape' && 'emp-page--landscape',
        mode === 'preview' && (page.orientation === 'landscape' ? 'w-[297mm] min-h-[210mm]' : 'w-[180mm] min-h-[267mm]'),
        mode === 'preview' && 'shadow-sm'
      )}
    >
      <PageHeader title={`Annex: ${page.title}`} documentLabel={documentLabel} />
      <div className="emp-page-body flex-1 space-y-4">
        {page.showHeading ? (
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-950">Annex: {page.title}</h2>
        ) : page.continuation ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Annex Continued
          </div>
        ) : null}
        {page.description ? (
          <p className="whitespace-pre-wrap text-[13px] leading-6 text-slate-600">{page.description}</p>
        ) : null}
        <div className="space-y-4">{page.blocks.map(renderBlock)}</div>
      </div>
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} documentLabel={documentLabel} />
    </section>
  )
}

function RiskAssessmentRatingCell({ rating }: { rating: EmpRiskAssessmentRow['rating'] }) {
  const className = rating.includes('Red')
    ? 'emp-ra-rating emp-ra-rating--red'
    : rating.includes('Amber')
      ? 'emp-ra-rating emp-ra-rating--amber'
      : 'emp-ra-rating emp-ra-rating--green'

  return <td className={className}>{rating}</td>
}

function RiskAssessmentSeverityCell({ value }: { value: EmpRiskAssessmentRow['severity'] }) {
  return <td className={cn('emp-ra-score', value === '3' ? 'emp-ra-score--high' : value === '2' ? 'emp-ra-score--medium' : 'emp-ra-score--low')}>{value}</td>
}

function RiskAssessmentRowsTable({ rows }: { rows: EmpRiskAssessmentRow[] }) {
  return (
    <table className="emp-ra-table emp-ra-hazard-table">
      <thead>
        <tr>
          <th>Hazard / Activity</th>
          <th>Location</th>
          <th>Severity</th>
          <th>Persons Affected</th>
          <th>Control Measures</th>
          <th>Likelihood</th>
          <th>RPN</th>
          <th>Risk Rating</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.hazard}-${index}`}>
            <td>{row.hazard}</td>
            <td>{row.location}</td>
            <RiskAssessmentSeverityCell value={row.severity} />
            <td>{row.personsAffected}</td>
            <td>{row.controlMeasures}</td>
            <td className="emp-ra-number">{row.likelihood}</td>
            <td className="emp-ra-number">{row.rpn}</td>
            <RiskAssessmentRatingCell rating={row.rating} />
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RiskAssessmentFooter({
  riskAssessment,
  pageNumber,
}: {
  riskAssessment: EmpRiskAssessmentModel
  pageNumber: number
}) {
  return (
    <div className="emp-ra-footer">
      <span>{riskAssessment.footerTitle}</span>
      <span>{pageNumber}</span>
    </div>
  )
}

function RiskAssessmentMeta({ riskAssessment }: { riskAssessment: EmpRiskAssessmentModel }) {
  return (
    <table className="emp-ra-table emp-ra-meta-table">
      <tbody>
        <tr>
          <th>Activity</th>
          <td>{riskAssessment.activity}</td>
          <th>Reference No:</th>
          <td>{riskAssessment.referenceNo}</td>
        </tr>
        <tr>
          <th>Location</th>
          <td>{riskAssessment.location}</td>
          <th>Date</th>
          <td>{riskAssessment.assessmentDate}</td>
        </tr>
        <tr>
          <th>Assessor(s)</th>
          <td>{riskAssessment.assessors}</td>
          <th>Review Date (12 months from assessment date)</th>
          <td>{riskAssessment.reviewDate}</td>
        </tr>
        {riskAssessment.scopeNote ? (
          <tr>
            <th>Scope note</th>
            <td colSpan={3}>{riskAssessment.scopeNote}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

function riskAssessmentFirstPageRowCount(riskAssessment: EmpRiskAssessmentModel) {
  return riskAssessment.scopeNote ? 16 : 18
}

function RiskAssessmentScoringSummary() {
  return (
    <div className="emp-ra-scoring-summary">
      <div className="emp-ra-scoring-title">Risk Assessment Scoring</div>
      <table className="emp-ra-table emp-ra-score-table">
        <tbody>
          <tr>
            <td>S x L = RPN</td>
            <td>S - Severity of hazard</td>
            <td>L - Likelihood of Occurrence</td>
            <td>RPN - Risk Priority Number</td>
          </tr>
          <tr>
            <td>3 High - extremely harmful consequences</td>
            <td>3 High - Daily or weekly opportunities</td>
            <td>3</td>
            <td>6</td>
            <td>9</td>
          </tr>
          <tr>
            <td>2 Medium - harmful consequences</td>
            <td>2 Medium - Opportunities in next 6-12 months</td>
            <td>2</td>
            <td>4</td>
            <td>6</td>
          </tr>
          <tr>
            <td>1 Low - slightly harmful consequences</td>
            <td>1 Low - not expected in the next 12-month period</td>
            <td>1</td>
            <td>2</td>
            <td>3</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RiskAssessmentScoringPage({
  riskAssessment,
  mode,
  pageNumber,
}: {
  riskAssessment: EmpRiskAssessmentModel
  mode: 'preview' | 'print'
  pageNumber: number
}) {
  return (
    <section
      className={cn(
        'emp-a4-page emp-print-page emp-ra-page emp-ra-page--portrait bg-white',
        mode === 'preview' && 'shadow-sm'
      )}
      aria-label="Risk assessment scoring"
    >
      <table className="emp-ra-table emp-ra-scoring-full">
        <tbody>
          <tr><th colSpan={4} className="emp-ra-scoring-main-title">RISK ASSESSMENT SCORING</th></tr>
          <tr><th colSpan={4} className="emp-ra-band-red">Severity Score Table</th></tr>
          <tr>
            <td className="emp-ra-score-index">3</td>
            <td colSpan={3}><strong>High Hazard - extremely harmful consequences</strong><br />Major notifiable RIDDOR injury or fatality. Permanent disability. Severe life threatening reportable diseases and illnesses. Extensive loss of plant or major damage to equipment, property or the environment. Would attract a prohibition notice from the HSE.</td>
          </tr>
          <tr>
            <td className="emp-ra-score-index">2</td>
            <td colSpan={3}><strong>Medium Hazard - harmful consequences</strong><br />RIDDOR reportable lost time incident. Temporary disability, lacerations, serious cuts and bruises, burns, concussion, serious sprains and strains or minor fractures. Serious damage disrupting normal activities. Would attract an improvement notice from the HSE.</td>
          </tr>
          <tr>
            <td className="emp-ra-score-index">1</td>
            <td colSpan={3}><strong>Low Hazard Severity - slightly harmful consequences</strong><br />Minor injuries and ill health including minor sprains and strains, cuts and bruises, eye irritation or nuisance. Minor damage to equipment, property or the environment.</td>
          </tr>
          <tr><th colSpan={4} className="emp-ra-band-blue">Likelihood of Occurrence Table</th></tr>
          <tr><td className="emp-ra-score-index">3</td><td><strong>High (highly likely)</strong></td><td colSpan={2}>Daily or weekly opportunities for the hazard to be realised. Continuous or almost continuous presence of the hazard.</td></tr>
          <tr><td className="emp-ra-score-index">2</td><td><strong>Medium (likely)</strong></td><td colSpan={2}>Opportunities for hazard to be realised are possible within the next 6-12 month period.</td></tr>
          <tr><td className="emp-ra-score-index">1</td><td><strong>Low (unlikely)</strong></td><td colSpan={2}>Opportunities for hazard to be realised are infrequent and possible, but not expected in the next 12-month period.</td></tr>
          <tr><th colSpan={4} className="emp-ra-scoring-main-title">RISK ASSESSMENT MATRIX TABLE</th></tr>
          <tr>
            <td colSpan={2}>
              <table className="emp-ra-table emp-ra-mini-matrix">
                <tbody>
                  <tr><th colSpan={4}>RISK PRIORITY NUMBER</th></tr>
                  <tr><td>3</td><td className="emp-ra-cell-yellow">3</td><td className="emp-ra-cell-amber">6</td><td className="emp-ra-cell-red">9</td></tr>
                  <tr><td>2</td><td className="emp-ra-cell-green">2</td><td className="emp-ra-cell-yellow">4</td><td className="emp-ra-cell-amber">6</td></tr>
                  <tr><td>1</td><td className="emp-ra-cell-green">1</td><td className="emp-ra-cell-green">2</td><td className="emp-ra-cell-yellow">3</td></tr>
                  <tr><td></td><td>1</td><td>2</td><td>3</td></tr>
                  <tr><th colSpan={4}>Likelihood (L)</th></tr>
                </tbody>
              </table>
            </td>
            <td>
              <table className="emp-ra-table emp-ra-mini-table">
                <tbody>
                  <tr><th colSpan={2}>SEVERITY</th></tr>
                  <tr><td>3</td><td>High</td></tr>
                  <tr><td>2</td><td>Medium</td></tr>
                  <tr><td>1</td><td>Low</td></tr>
                </tbody>
              </table>
            </td>
            <td>
              <table className="emp-ra-table emp-ra-mini-table">
                <tbody>
                  <tr><th colSpan={2}>LIKELIHOOD</th></tr>
                  <tr><td>3</td><td>High</td></tr>
                  <tr><td>2</td><td>Medium</td></tr>
                  <tr><td>1</td><td>Low</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr><th colSpan={4}>Risk Priority Number (RPN) = Severity (S) x Likelihood (L)</th></tr>
          <tr><th>Risk Priority Number</th><th colSpan={3}>Action and Timescale</th></tr>
          <tr><td className="emp-ra-cell-green"><strong>Trivial / Low:<br />RPN = 1 or 2</strong></td><td colSpan={3}>No further action required.</td></tr>
          <tr><td className="emp-ra-cell-yellow"><strong>Moderate:<br />RPN = 3 or 4</strong></td><td colSpan={3}>Take action to reduce the risk level within 3 - 6 months. Think reasonably practicable - risk vs. cost. Use severity and consequences as a guide when making decisions about benefit.</td></tr>
          <tr><td className="emp-ra-cell-amber"><strong>Substantial:<br />RPN = 6</strong></td><td colSpan={3}>Take action to reduce the risk level within 1 month. Enforcement risk - possible HSE Improvement Notice.</td></tr>
          <tr><td className="emp-ra-cell-red"><strong>Intolerable:<br />RPN = 9</strong></td><td colSpan={3}>Stop activity immediately or do not start until action has been taken to reduce the level of risk. Enforcement risk - possible HSE Prohibition Notice.</td></tr>
        </tbody>
      </table>
      <RiskAssessmentFooter riskAssessment={riskAssessment} pageNumber={pageNumber} />
    </section>
  )
}

function RiskAssessmentPages({
  riskAssessment,
  mode,
}: {
  riskAssessment: EmpRiskAssessmentModel
  mode: 'preview' | 'print'
}) {
  const firstPageRowCount = riskAssessmentFirstPageRowCount(riskAssessment)
  const firstPageRows = riskAssessment.rows.slice(0, firstPageRowCount)
  const remainingRowChunks = chunkItems(riskAssessment.rows.slice(firstPageRowCount), 22)

  return (
    <>
      <section
        className={cn(
          'emp-a4-page emp-print-page emp-ra-page emp-ra-page--landscape bg-white',
          mode === 'preview' && 'shadow-sm'
        )}
        aria-label="Operational risk assessment"
      >
        <RiskAssessmentMeta riskAssessment={riskAssessment} />
        <RiskAssessmentRowsTable rows={firstPageRows} />
        <RiskAssessmentFooter riskAssessment={riskAssessment} pageNumber={1} />
      </section>
      {remainingRowChunks.map((rows, index) => (
        <section
          key={`risk-assessment-continued-${index}`}
          className={cn(
            'emp-a4-page emp-print-page emp-ra-page emp-ra-page--landscape bg-white',
            mode === 'preview' && 'shadow-sm'
          )}
          aria-label="Operational risk assessment continued"
        >
          <table className="emp-ra-table emp-ra-compact-meta">
            <tbody>
              <tr>
                <th>Activity</th>
                <td>{riskAssessment.activity}</td>
                <th>Reference No:</th>
                <td>{riskAssessment.referenceNo}</td>
              </tr>
            </tbody>
          </table>
          <RiskAssessmentRowsTable rows={rows} />
          <RiskAssessmentFooter riskAssessment={riskAssessment} pageNumber={index + 2} />
        </section>
      ))}
      <RiskAssessmentScoringPage
        riskAssessment={riskAssessment}
        mode={mode}
        pageNumber={remainingRowChunks.length + 2}
      />
    </>
  )
}

function displayModelRiskAssessment(
  model: EmpPreviewModel,
  output: 'full' | 'risk-assessment'
) {
  if (output === 'risk-assessment') return model.riskAssessment
  return model.riskAssessment
}

export function EmpPreviewDocument({
  model,
  mode = 'preview',
  output = 'full',
}: {
  model: EmpPreviewModel
  mode?: 'preview' | 'print'
  output?: 'full' | 'risk-assessment'
}) {
  const renderEmpPages = output === 'full'
  const initialSectionPages = model.sections.flatMap((section) =>
    paginateEmpContent(section.key, section.title, section.description, section.blocks)
  )
  const initialAnnexPages = model.annexes.flatMap((annex) =>
    paginateEmpContent(`annex-${annex.key}`, annex.title, annex.description, annex.blocks)
  )
  const displayModel = withTocPageNumbers(model, initialSectionPages, initialAnnexPages)
  const sectionPages = displayModel.sections.flatMap((section) =>
    paginateEmpContent(section.key, section.title, section.description, section.blocks)
  )
  const annexPages = displayModel.annexes.flatMap((annex) =>
    paginateEmpContent(`annex-${annex.key}`, annex.title, annex.description, annex.blocks)
  )
  const riskAssessment = displayModelRiskAssessment(displayModel, output)
  const riskAssessmentPageCount = riskAssessment
    ? 2 + Math.ceil(Math.max(0, riskAssessment.rows.length - riskAssessmentFirstPageRowCount(riskAssessment)) / 22)
    : 0
  const totalPages = (renderEmpPages ? 1 + sectionPages.length + annexPages.length : 0) + riskAssessmentPageCount
  const coverRowPairs = chunkItems(displayModel.coverRows, 2)
  const pdfTitle = output === 'risk-assessment'
    ? `${displayModel.coverRows.find((row) => row.label === 'Event')?.value || displayModel.title} - Operational Risk Assessment`
    : displayModel.title

  return (
    <div
      id="print-root"
      className={cn(
        'emp-report-print-wrapper',
        mode === 'preview'
          ? 'emp-report-preview mx-auto flex flex-col items-center gap-6'
          : 'emp-report-print-content'
      )}
      data-pdf-title={pdfTitle}
      data-pdf-event={displayModel.coverRows.find((row) => row.label === 'Event')?.value || ''}
      data-pdf-date={displayModel.coverRows.find((row) => row.label === 'Show dates')?.value || ''}
      data-pdf-venue={displayModel.coverRows.find((row) => row.label === 'Venue')?.value || ''}
    >
      {renderEmpPages ? <section
        className={cn(
          'emp-a4-page emp-print-page emp-front-page bg-white',
          mode === 'preview' && 'w-[180mm] min-h-[267mm]',
          mode === 'preview' && 'shadow-sm'
        )}
      >
        <div className="emp-front-page-body flex min-h-full flex-col">
          <div className="flex items-center justify-between">
            <img src="/kss-logo.png" alt="KSS NW LTD" className="emp-kss-logo-cover h-12 w-auto object-contain" />
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Controlled Copy
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-7 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Operational Planning Document
            </p>
            <h1 className="mt-3 max-w-4xl text-[32px] font-semibold leading-tight tracking-tight text-slate-950">
              {displayModel.title}
            </h1>
            {displayModel.subtitle ? (
              <p className="mt-4 max-w-4xl text-[15px] leading-7 text-slate-600">{displayModel.subtitle}</p>
            ) : null}
            <p className="mt-4 max-w-3xl text-[13px] leading-6 text-slate-700">
              {displayModel.coverSummary}
            </p>
          </div>

          {coverRowPairs.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="emp-block-table w-full border-collapse text-[11px] leading-snug">
                <tbody>
                  {coverRowPairs.map((pair, pairIndex) => (
                    <tr key={`cover-row-${pairIndex}`} className="border-t border-slate-200 first:border-t-0">
                      {pair.map((row) => (
                        <React.Fragment key={row.label}>
                          <th className="w-[18%] bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-700">
                            {row.label}
                          </th>
                          <td className="w-[32%] whitespace-pre-wrap px-3 py-1.5 text-slate-700">
                            {row.value}
                          </td>
                        </React.Fragment>
                      ))}
                      {pair.length === 1 ? (
                        <>
                          <th className="w-[18%] bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-700" />
                          <td className="w-[32%] px-3 py-1.5 text-slate-700" />
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-5 py-3">
            <p className="text-[13px] leading-6 text-slate-700">
              This plan is a controlled operational document. Event-specific details, named personnel,
              capacities, route widths, emergency points, and deployment numbers must be confirmed
              against the latest approved event information before issue.
            </p>
          </div>

          <div className="mt-auto pt-8">
            <PageFooter pageNumber={1} totalPages={totalPages} documentLabel={displayModel.documentLabel} />
          </div>
        </div>
      </section> : null}

      {renderEmpPages ? sectionPages.map((page, index) => (
        <SectionPage
          key={page.key}
          page={page}
          mode={mode}
          pageNumber={index + 2}
          totalPages={totalPages}
          documentLabel={displayModel.documentLabel}
        />
      )) : null}

      {renderEmpPages ? annexPages.map((page, index) => (
        <AnnexPage
          key={page.key}
          page={page}
          mode={mode}
          pageNumber={sectionPages.length + index + 2}
          totalPages={totalPages}
          documentLabel={displayModel.documentLabel}
        />
      )) : null}

      {riskAssessment ? (
        <RiskAssessmentPages riskAssessment={riskAssessment} mode={mode} />
      ) : null}
    </div>
  )
}
