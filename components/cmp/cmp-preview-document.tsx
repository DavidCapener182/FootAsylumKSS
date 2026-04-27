import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type {
  CmpPreviewBlock,
  CmpPreviewModel,
} from '@/lib/cmp/preview'

interface CmpContentPage {
  key: string
  title: string
  description?: string
  continuation: boolean
  showHeading: boolean
  blocks: CmpPreviewBlock[]
}

const CMP_PAGE_CAPACITY_UNITS = 34
const CMP_BLOCK_GAP_UNITS = 1
const CMP_KEY_VALUE_HEADER_UNITS = 1.5
const CMP_MULTI_TABLE_HEADER_UNITS = 1.5

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
}: Extract<CmpPreviewBlock, { type: 'toc_columns' }>) {
  return (
    <div className="cmp-toc-columns grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-slate-200 bg-white p-4">
      {items.map((item, index) => (
        <div
          key={`${item.ref}-${index}`}
          className="flex items-start gap-3 border-b border-slate-200 py-2 text-[13px] last:border-b-0"
        >
          <span className="min-w-[58px] font-semibold text-slate-500">{item.ref}</span>
          <span className="text-slate-800">{item.title}</span>
        </div>
      ))}
    </div>
  )
}

function MultiTable({
  headers,
  rows,
  blockIndex,
}: {
  headers: string[]
  rows: string[][]
  blockIndex: number
}) {
  return (
    <div key={blockIndex} className="overflow-hidden rounded-md border border-slate-200">
      <table className="cmp-block-table w-full border-collapse text-[13px]">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={`${blockIndex}-${header}`}
                className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${blockIndex}-${rowIndex}`} className="border-t border-slate-200 first:border-t-0">
              {row.map((cell, cellIndex) => (
                <td key={`${blockIndex}-${rowIndex}-${cellIndex}`} className="whitespace-pre-wrap px-3 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
}: Extract<CmpPreviewBlock, { type: 'diagram'; variant: 'ramp' }>) {
  const cards = [
    { x: 24, y: 24, fill: '#ecfeff', stroke: '#67e8f9', ...items[0] },
    { x: 380, y: 24, fill: '#f0fdf4', stroke: '#86efac', ...items[1] },
    { x: 24, y: 188, fill: '#fff7ed', stroke: '#fdba74', ...items[2] },
    { x: 380, y: 188, fill: '#fefce8', stroke: '#fde047', ...items[3] },
  ]

  return (
    <DiagramShell
      title="RAMP Analysis"
      subtitle="Routes, arrival, movement, and profile are shown as a single operational planning view."
    >
      <svg viewBox="0 0 720 344" className="h-auto w-full">
        {cards.map((card, index) => (
          <g key={`${card.title}-${index}`}>
            <rect x={card.x} y={card.y} width="316" height="132" rx="14" fill={card.fill} stroke={card.stroke} />
            <text x={card.x + 18} y={card.y + 30} style={{ fontSize: 12, fill: '#0f172a', fontWeight: 700 }}>
              {card.title}
            </text>
            <SvgParagraph x={card.x + 18} y={card.y + 56} text={card.value} maxChars={35} maxLines={5} />
          </g>
        ))}

        <line x1="340" y1="90" x2="360" y2="90" stroke="#94a3b8" strokeWidth="2" />
        <line x1="360" y1="90" x2="380" y2="90" stroke="#94a3b8" strokeWidth="2" />
        <line x1="340" y1="254" x2="360" y2="254" stroke="#94a3b8" strokeWidth="2" />
        <line x1="360" y1="254" x2="380" y2="254" stroke="#94a3b8" strokeWidth="2" />
        <line x1="182" y1="156" x2="182" y2="188" stroke="#94a3b8" strokeWidth="2" />
        <line x1="538" y1="156" x2="538" y2="188" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="360" cy="172" r="48" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
        <text x="360" y="167" textAnchor="middle" style={{ fontSize: 18, fill: '#0f172a', fontWeight: 800 }}>
          RAMP
        </text>
        <text x="360" y="190" textAnchor="middle" style={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}>
          CROWD REVIEW
        </text>
      </svg>
    </DiagramShell>
  )
}

function CrowdFlowDiagram({
  stages,
}: Extract<CmpPreviewBlock, { type: 'diagram'; variant: 'crowd_flow' }>) {
  const stageWidth = 154
  const gap = 18

  return (
    <DiagramShell
      title="Crowd Flow"
      subtitle="The core route sequence is shown as a simplified flow so ingress, circulation, and dispersal pressure points are easy to read."
    >
      <svg viewBox="0 0 700 220" className="h-auto w-full">
        <defs>
          <marker id="cmp-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
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
                  markerEnd="url(#cmp-arrow)"
                />
              ) : null}
            </g>
          )
        })}
      </svg>
    </DiagramShell>
  )
}

function CommandDiagram({
  lead,
  control,
  supervisors,
  interfaces,
}: Extract<CmpPreviewBlock, { type: 'diagram'; variant: 'command' }>) {
  const supervisorBoxes = supervisors.slice(0, 4)
  const positions = [
    { x: 28, y: 238 },
    { x: 228, y: 238 },
    { x: 28, y: 330 },
    { x: 228, y: 330 },
  ]

  return (
    <DiagramShell
      title="Command and Control Structure"
      subtitle="The reporting chain, control node, and live interfaces are shown as a working command diagram for the event."
    >
      <svg viewBox="0 0 740 430" className="h-auto w-full">
        <rect x="250" y="18" width="220" height="76" rx="16" fill="#ecfdf5" stroke="#6ee7b7" />
        <text x="360" y="42" textAnchor="middle" style={{ fontSize: 11, fill: '#047857', fontWeight: 800 }}>
          OPERATIONAL LEAD
        </text>
        <SvgParagraph x={360} y={64} text={lead} maxChars={24} maxLines={3} center />

        <rect x="250" y="126" width="220" height="82" rx="16" fill="#eff6ff" stroke="#93c5fd" />
        <text x="360" y="150" textAnchor="middle" style={{ fontSize: 11, fill: '#1d4ed8', fontWeight: 800 }}>
          EVENT CONTROL
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
                SUPERVISOR
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
}: Extract<CmpPreviewBlock, { type: 'image' }>) {
  return (
    <div className="cmp-image-panel overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</div>
        {caption ? <div className="mt-1 text-[13px] leading-6 text-slate-600">{caption}</div> : null}
      </div>
      <div className="bg-slate-50 p-4">
        <img src={imageUrl} alt={alt} className="max-h-[360px] w-full rounded-md border border-slate-200 bg-white object-contain" />
      </div>
    </div>
  )
}

function ImageGridAttachment({
  title,
  caption,
  items,
}: Extract<CmpPreviewBlock, { type: 'image_grid' }>) {
  return (
    <div className="cmp-image-grid-panel overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</div>
        {caption ? <div className="mt-1 text-[13px] leading-6 text-slate-600">{caption}</div> : null}
      </div>
      <div className="cmp-image-grid grid grid-cols-2 gap-4 bg-slate-50 p-4">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="cmp-image-panel overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.title}</div>
              {item.caption ? <div className="mt-1 text-[12px] leading-5 text-slate-600">{item.caption}</div> : null}
            </div>
            <div className="bg-slate-50 p-3">
              <img
                src={item.imageUrl}
                alt={item.alt}
                className="max-h-[440px] w-full rounded-md border border-slate-200 bg-white object-contain"
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
}: Extract<CmpPreviewBlock, { type: 'diagram'; variant: 'emergency' }>) {
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
}: Extract<CmpPreviewBlock, { type: 'diagram'; variant: 'ct' }>) {
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
      subtitle="Protect Duty and immediate protective actions are summarised visually so staff can read the section quickly under pressure."
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
    case 2:
      return [24, 72]
    case 3:
      return [20, 20, 40]
    case 4:
      return [16, 16, 16, 32]
    case 5:
      return [18, 18, 18, 30, 12]
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

function estimateMultiTableRowUnits(row: string[]) {
  const budgets = getMultiTableColumnBudgets(row.length)
  return (
    Math.max(
      ...row.map((cell, index) => estimateTextUnits(cell, budgets[index] || budgets[budgets.length - 1] || 20))
    ) + 0.5
  )
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

function estimateBlockUnits(block: CmpPreviewBlock) {
  switch (block.type) {
    case 'paragraph':
      return estimateTextUnits(block.text, 96) + 1
    case 'bullet_list':
      return (
        block.items.reduce((sum, item) => sum + Math.max(1, estimateTextUnits(item, 88)), 0) +
        1
      )
    case 'table':
      return block.rows.reduce((sum, row) => sum + estimateKeyValueRowUnits(row), CMP_KEY_VALUE_HEADER_UNITS)
    case 'multi_table':
      return block.rows.reduce(
        (sum, row) => sum + estimateMultiTableRowUnits(row),
        CMP_MULTI_TABLE_HEADER_UNITS
      )
    case 'metric_grid':
      return estimateMetricGridUnits(block.items)
    case 'toc_columns':
      return Math.ceil(block.items.length / 2) * 1.25 + 2
    case 'image':
      return 18
    case 'image_grid':
      return 21
    case 'diagram':
      switch (block.variant) {
        case 'ramp':
          return 18
        case 'crowd_flow':
          return 14
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
  block: Extract<CmpPreviewBlock, { type: 'paragraph' }>,
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
    chunk: { ...block, text: head } satisfies CmpPreviewBlock,
    remainder: { ...block, text: tail } satisfies CmpPreviewBlock,
  }
}

function takeBulletListChunk(
  block: Extract<CmpPreviewBlock, { type: 'bullet_list' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  let usedUnits = 1
  const items: string[] = []

  for (const item of block.items) {
    const itemUnits = Math.max(1, estimateTextUnits(item, 88))
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
      chunk: { type: 'bullet_list', items: [head] } satisfies CmpPreviewBlock,
      remainder: { type: 'bullet_list', items: [tail, ...block.items.slice(1)] } satisfies CmpPreviewBlock,
    }
  }

  const remainderItems = block.items.slice(items.length)
  return {
    chunk: { type: 'bullet_list', items } satisfies CmpPreviewBlock,
    remainder: remainderItems.length
      ? ({ type: 'bullet_list', items: remainderItems } satisfies CmpPreviewBlock)
      : null,
  }
}

function takeTableChunk(
  block: Extract<CmpPreviewBlock, { type: 'table' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  let usedUnits = CMP_KEY_VALUE_HEADER_UNITS
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
    chunk: { type: 'table', rows } satisfies CmpPreviewBlock,
    remainder: remainingRows.length
      ? ({ type: 'table', rows: remainingRows } satisfies CmpPreviewBlock)
      : null,
  }
}

function takeMultiTableChunk(
  block: Extract<CmpPreviewBlock, { type: 'multi_table' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  const columnCount = block.headers.length
  const budgets = getMultiTableColumnBudgets(columnCount)
  let usedUnits = CMP_MULTI_TABLE_HEADER_UNITS
  const rows: string[][] = []
  const remainingRows = [...block.rows]

  while (remainingRows.length) {
    const row = remainingRows[0]
    const rowUnits = estimateMultiTableRowUnits(row)

    if (usedUnits + rowUnits <= availableUnits || rows.length === 0) {
      if (usedUnits + rowUnits <= availableUnits) {
        rows.push(row)
        usedUnits += rowUnits
        remainingRows.shift()
        continue
      }

      const lastCell = row[row.length - 1] || ''
      const { head, tail } = splitTextForUnits(
        lastCell,
        budgets[budgets.length - 1] || 40,
        availableUnits - usedUnits - 0.5
      )

      if (!head || !tail) {
        break
      }

      rows.push([...row.slice(0, -1), head])
      remainingRows[0] = [
        row[0] ? `${row[0]} (continued)` : 'Continued',
        ...Array.from({ length: Math.max(0, columnCount - 2) }, () => ''),
        tail,
      ]
      usedUnits = availableUnits
      break
    }

    break
  }

  if (!rows.length) {
    return { chunk: null, remainder: block }
  }

  return {
    chunk: { type: 'multi_table', headers: block.headers, rows } satisfies CmpPreviewBlock,
    remainder: remainingRows.length
      ? ({ type: 'multi_table', headers: block.headers, rows: remainingRows } satisfies CmpPreviewBlock)
      : null,
  }
}

function takeMetricGridChunk(
  block: Extract<CmpPreviewBlock, { type: 'metric_grid' }>,
  availableUnits: number
) {
  const blockUnits = estimateBlockUnits(block)
  if (blockUnits <= availableUnits) {
    return { chunk: block, remainder: null }
  }

  let count = Math.min(block.items.length, 4)
  while (count > 0) {
    const candidate = { type: 'metric_grid', items: block.items.slice(0, count) } as CmpPreviewBlock
    if (estimateBlockUnits(candidate) <= availableUnits) {
      return {
        chunk: candidate,
        remainder: block.items.length > count
          ? ({ type: 'metric_grid', items: block.items.slice(count) } satisfies CmpPreviewBlock)
          : null,
      }
    }
    count -= 1
  }

  return { chunk: null, remainder: block }
}

function takeBlockChunk(block: CmpPreviewBlock, availableUnits: number) {
  switch (block.type) {
    case 'paragraph':
      return takeParagraphChunk(block, availableUnits)
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

function paginateCmpContent(
  keyPrefix: string,
  title: string,
  description: string | undefined,
  blocks: CmpPreviewBlock[]
) {
  const pages: CmpContentPage[] = []

  const createPage = (index: number, continuation: boolean): CmpContentPage => ({
    key: `${keyPrefix}-${index}`,
    title,
    description: continuation ? undefined : description,
    continuation,
    showHeading: !continuation,
    blocks: [],
  })

  let page = createPage(0, false)
  let availableUnits = CMP_PAGE_CAPACITY_UNITS - estimatePageIntroUnits(page.showHeading, page.description)

  for (const originalBlock of blocks) {
    let currentBlock: CmpPreviewBlock | null = originalBlock

    while (currentBlock) {
      const blockUnits = estimateBlockUnits(currentBlock)
      const fitted = takeBlockChunk(currentBlock, availableUnits)

      if (!fitted.chunk) {
        if (page.blocks.length === 0) {
          page.blocks.push(currentBlock)
          availableUnits = 0
          break
        }

        pages.push(page)
        page = createPage(pages.length, true)
        availableUnits =
          CMP_PAGE_CAPACITY_UNITS - estimatePageIntroUnits(page.showHeading, page.description)
        continue
      }

      page.blocks.push(fitted.chunk)
      availableUnits -= estimateBlockUnits(fitted.chunk)
      if (!fitted.remainder) {
        availableUnits -= CMP_BLOCK_GAP_UNITS
        break
      }

      pages.push(page)
      page = createPage(pages.length, true)
      availableUnits =
        CMP_PAGE_CAPACITY_UNITS - estimatePageIntroUnits(page.showHeading, page.description)
      currentBlock = fitted.remainder

      if (blockUnits <= CMP_PAGE_CAPACITY_UNITS && availableUnits < 0) {
        break
      }
    }
  }

  pages.push(page)

  return pages.filter((contentPage) => contentPage.blocks.length > 0 || contentPage.showHeading)
}

function renderBlock(block: CmpPreviewBlock, blockIndex: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={blockIndex} className="whitespace-pre-wrap text-[13px] leading-6 text-slate-700">
          {block.text}
        </p>
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
          <table className="cmp-block-table w-full border-collapse text-[13px]">
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
      return <MultiTable key={blockIndex} headers={block.headers} rows={block.rows} blockIndex={blockIndex} />
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
}: {
  title: string
}) {
  return (
    <div className="cmp-page-header mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
      <img src="/kss-logo.png" alt="KSS NW LTD" className="cmp-kss-logo-header h-8 w-auto object-contain" />
      <div className="px-4 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Crowd Management and Security Operations Plan
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="text-right text-xs text-slate-500">
        <div>Controlled Copy</div>
        <div>Operational Report</div>
      </div>
    </div>
  )
}

function PageFooter({
  pageNumber,
  totalPages,
}: {
  pageNumber: number
  totalPages: number
}) {
  return (
    <div className="cmp-page-footer mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500">
      <span>KSS NW LTD - Crowd Management and Security Operations Plan - Controlled operational document</span>
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
}: {
  page: CmpContentPage
  mode: 'preview' | 'print'
  pageNumber: number
  totalPages: number
}) {
  return (
    <section
      className={cn(
        'cmp-a4-page cmp-print-page flex flex-col overflow-hidden bg-white',
        mode === 'preview' && 'w-[180mm] min-h-[267mm]',
        mode === 'preview' && 'shadow-sm'
      )}
    >
      <PageHeader title={page.title} />
      <div className="cmp-page-body flex-1 space-y-4">
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
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </section>
  )
}

function AnnexPage({
  page,
  mode,
  pageNumber,
  totalPages,
}: {
  page: CmpContentPage
  mode: 'preview' | 'print'
  pageNumber: number
  totalPages: number
}) {
  return (
    <section
      className={cn(
        'cmp-a4-page cmp-print-page flex flex-col overflow-hidden bg-white',
        mode === 'preview' && 'w-[180mm] min-h-[267mm]',
        mode === 'preview' && 'shadow-sm'
      )}
    >
      <PageHeader title={`Annex: ${page.title}`} />
      <div className="cmp-page-body flex-1 space-y-4">
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
      <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </section>
  )
}

export function CmpPreviewDocument({
  model,
  mode = 'preview',
}: {
  model: CmpPreviewModel
  mode?: 'preview' | 'print'
}) {
  const sectionPages = model.sections.flatMap((section) =>
    paginateCmpContent(section.key, section.title, section.description, section.blocks)
  )
  const annexPages = model.annexes.flatMap((annex) =>
    paginateCmpContent(`annex-${annex.key}`, annex.title, annex.description, annex.blocks)
  )
  const totalPages = 1 + sectionPages.length + annexPages.length
  const coverRowPairs = chunkItems(model.coverRows, 2)

  return (
    <div
      id="print-root"
      className={cn(
        'cmp-report-print-wrapper',
        mode === 'preview'
          ? 'cmp-report-preview mx-auto flex flex-col items-center gap-6'
          : 'cmp-report-print-content'
      )}
      data-pdf-title={model.title}
      data-pdf-event={model.coverRows.find((row) => row.label === 'Event')?.value || ''}
      data-pdf-date={model.coverRows.find((row) => row.label === 'Show dates')?.value || ''}
      data-pdf-venue={model.coverRows.find((row) => row.label === 'Venue')?.value || ''}
    >
      <section
        className={cn(
          'cmp-a4-page cmp-print-page cmp-front-page bg-white',
          mode === 'preview' && 'w-[180mm] min-h-[267mm]',
          mode === 'preview' && 'shadow-sm'
        )}
      >
        <div className="cmp-front-page-body flex min-h-full flex-col">
          <div className="flex items-center justify-between">
            <img src="/kss-logo.png" alt="KSS NW LTD" className="cmp-kss-logo-cover h-12 w-auto object-contain" />
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Controlled Copy
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 px-7 py-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Operational Planning Document
            </p>
            <h1 className="mt-3 max-w-4xl text-[34px] font-semibold leading-tight tracking-tight text-slate-950">
              {model.title}
            </h1>
            {model.subtitle ? (
              <p className="mt-4 max-w-4xl text-[15px] leading-7 text-slate-600">{model.subtitle}</p>
            ) : null}
            <p className="mt-5 max-w-3xl text-[13px] leading-6 text-slate-700">
              This document records the crowd management and security operations arrangements for the
              named event. It is intended to be read alongside the Event Management Plan, risk
              assessments, emergency procedures, licensing documentation, deployment schedules, and
              current site plans.
            </p>
          </div>

          {coverRowPairs.length ? (
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="cmp-block-table w-full border-collapse text-[12px]">
                <tbody>
                  {coverRowPairs.map((pair, pairIndex) => (
                    <tr key={`cover-row-${pairIndex}`} className="border-t border-slate-200 first:border-t-0">
                      {pair.map((row) => (
                        <React.Fragment key={row.label}>
                          <th className="w-[18%] bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                            {row.label}
                          </th>
                          <td className="w-[32%] whitespace-pre-wrap px-3 py-2 text-slate-700">
                            {row.value}
                          </td>
                        </React.Fragment>
                      ))}
                      {pair.length === 1 ? (
                        <>
                          <th className="w-[18%] bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700" />
                          <td className="w-[32%] px-3 py-2 text-slate-700" />
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-[13px] leading-6 text-slate-700">
              This plan is a controlled operational document. Event-specific details, named personnel,
              capacities, route widths, emergency points, and deployment numbers must be confirmed
              against the latest approved event information before issue.
            </p>
          </div>

          <div className="mt-auto pt-8">
            <PageFooter pageNumber={1} totalPages={totalPages} />
          </div>
        </div>
      </section>

      {sectionPages.map((page, index) => (
        <SectionPage
          key={page.key}
          page={page}
          mode={mode}
          pageNumber={index + 2}
          totalPages={totalPages}
        />
      ))}

      {annexPages.map((page, index) => (
        <AnnexPage
          key={page.key}
          page={page}
          mode={mode}
          pageNumber={sectionPages.length + index + 2}
          totalPages={totalPages}
        />
      ))}
    </div>
  )
}
