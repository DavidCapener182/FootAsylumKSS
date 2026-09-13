import React from 'react'
import type { NewsletterAreaStoreRow } from '@/lib/reports/monthly-newsletter-types'
import { auditMovement } from '@/lib/reports/audit-comparison'

const score = (value: number | null | undefined) => value == null ? 'Pending' : `${value.toFixed(2)}%`
const change = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)} pp`

export function AreaAuditComparison({ stores }: { stores: NewsletterAreaStoreRow[] }) {
  const ranked = [...stores].sort((a,b) => (b.audit2Score ?? b.audit1Score ?? -1) - (a.audit2Score ?? a.audit1Score ?? -1) || a.storeName.localeCompare(b.storeName))
  const comparable = stores.filter(s => s.auditChange != null)
  const improved = comparable.filter(s => s.auditChange! > 0).sort((a,b) => b.auditChange! - a.auditChange!)
  const declined = comparable.filter(s => s.auditChange! < 0).sort((a,b) => a.auditChange! - b.auditChange!)
  return <section className="mb-6 space-y-4" aria-label="Area audit comparison">
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h5 className="font-bold text-slate-900">Area League Table — Audit 1 to Audit 2</h5>
      <p className="my-2 text-xs text-slate-600">Ranked by Audit 2 where completed, otherwise Audit 1. Changes are percentage points (pp). {comparable.length} of {stores.length} stores have both audits; {comparable.filter(s => s.auditChange === 0).length} unchanged.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b bg-slate-50"><th className="p-2">Rank</th><th className="p-2">Store</th><th className="p-2">Audit 1</th><th className="p-2">Audit 2</th><th className="p-2">Change</th></tr></thead>
          <tbody>{ranked.map((s) => {
            const value = s.audit2Score ?? s.audit1Score
            const rank = value == null ? '—' : ranked.findIndex(r => (r.audit2Score ?? r.audit1Score) === value) + 1
            return <tr key={`${s.storeCode}-${s.storeName}`} className="border-b" style={{breakInside:'avoid'}}>
              <td className="p-2">{rank}</td><th className="p-2 font-semibold">{s.storeName}<span className="block font-normal text-slate-500">{s.storeCode}</span></th>
              <td className="p-2 whitespace-nowrap">{score(s.audit1Score)}<span className="block text-[10px] text-slate-500">{s.audit1Date}</span></td>
              <td className="p-2 whitespace-nowrap">{score(s.audit2Score)}<span className="block text-[10px] text-slate-500">{s.audit2Score == null ? 'Awaiting Audit 2' : s.audit2Date}</span></td>
              <td className="p-2"><span className="font-semibold">{s.auditChange == null ? '—' : change(s.auditChange)}</span><span className="block text-[10px]">{auditMovement(s.auditChange)}</span></td>
            </tr>
          })}</tbody>
        </table>
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">{[{title:'Improved',rows:improved,style:'border-emerald-200 bg-emerald-50'}, {title:'Declined',rows:declined,style:'border-rose-200 bg-rose-50'}].map(group => <div key={group.title} className={`rounded-2xl border p-4 ${group.style}`}>
      <h5 className="font-bold text-slate-900">{group.title} ({group.rows.length})</h5>
      {group.rows.length ? <ul className="mt-2 space-y-2 text-sm">{group.rows.map(s => <li key={`${s.storeCode}-${s.storeName}`} style={{breakInside:'avoid'}}><strong>{s.storeName}</strong> — {change(s.auditChange!)}<span className="block text-xs">{score(s.audit1Score)} → {score(s.audit2Score)}</span></li>)}</ul> : <p className="mt-2 text-sm">No {group.title.toLowerCase()} stores with both audits available.</p>}
    </div>)}</div>
  </section>
}
