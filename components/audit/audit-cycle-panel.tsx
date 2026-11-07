'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { AuditRow } from './audit-table-helpers'
import { auditLabel, auditPairLabel } from '@/lib/audit/cycles'
import { cycleRecords, type CycleRecord } from '@/lib/audit/cycle-records'
import { getAuditPDFDownloadUrl } from '@/app/actions/audit-pdfs'
import { formatAppDate } from '@/lib/utils'

export function AuditCyclePanel({ stores, history, canManage }: { stores: AuditRow[]; history: CycleRecord[]; canManage: boolean }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const records = useMemo(() => cycleRecords(stores, history), [stores, history])
  const years = [...new Set([currentYear, currentYear + 1, ...records.map(record => record.audit_year)])].sort((a,b) => b-a)
  const visible = stores.filter(store => store.is_active && `${store.store_name} ${store.store_code}`.toLowerCase().includes(search.toLowerCase()))
  const openReport = async (path: string) => {
    setError('')
    const reportWindow = window.open('about:blank', '_blank')
    if (reportWindow) reportWindow.opener = null
    try {
      const url = path.startsWith('https://') ? path : await getAuditPDFDownloadUrl(path)
      if (url && reportWindow) reportWindow.location.href = url
      else { reportWindow?.close(); setError('This report could not be opened. Allow pop-ups and retry.') }
    } catch { reportWindow?.close(); setError('This report could not be opened. Please retry.') }
  }
  const renderRecord = (record?: CycleRecord) => record ? <div className="space-y-1">
    <p className="font-semibold">{record.percentage == null ? 'Awaiting result' : `${record.percentage.toFixed(1)}%`}</p>
    <p className="text-xs text-slate-500">{formatAppDate(record.visit_date)}</p>
    {record.pdf_path && <button className="text-xs font-semibold underline" onClick={() => openReport(record.pdf_path!)}>View report</button>}
  </div> : <span className="text-sm text-slate-500">Not completed</span>
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-xl font-bold">Audit cycles</h2><p className="mt-1 text-sm text-slate-600">Two audits each year, numbered continuously. Select a year to show its pair; earlier reports remain in history.</p></div>
      <label className="text-sm font-semibold">Audit year<select className="ml-3 min-h-[44px] rounded-lg border p-2" value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{auditPairLabel(value)}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap gap-3"><input className="min-h-[44px] rounded-lg border p-2" aria-label="Search audit cycles" placeholder="Search store…" value={search} onChange={event => setSearch(event.target.value)} />{canManage && <Link href={`/route-planning?year=${year}`} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Book next audit</Link>}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Store</th><th className="p-3">{auditLabel(year, 1)}</th><th className="p-3">{auditLabel(year, 2)}</th><th className="p-3">History</th></tr></thead><tbody>
      {visible.map(store => {
        const all = records.filter(record => record.store_id === store.id)
        const previous = all.filter(record => record.audit_year !== year || (record.audit_number || 0) > 2).sort((a,b) => b.visit_date.localeCompare(a.visit_date))
        return <tr key={store.id} className="border-b align-top"><th className="p-3"><Link href={`/stores/${store.id}`} className="hover:underline">{store.store_name}</Link><p className="text-xs font-normal text-slate-500">{store.store_code}</p></th>{[1,2].map(round => <td className="p-3" key={round}>{renderRecord(all.find(record => record.audit_year === year && record.audit_number === round))}{store.compliance_audit_2_planned_date?.startsWith(`${year}-`) && !all.some(record => record.audit_year === year && record.audit_number === round && record.percentage != null) && round === (all.some(record => record.audit_year === year && record.audit_number === 1 && record.percentage != null) ? 2 : 1) && <p className="mt-2 text-xs font-semibold text-blue-700">Booked {formatAppDate(store.compliance_audit_2_planned_date)}</p>}</td>)}<td className="p-3">{previous.length ? <details><summary className="cursor-pointer">{previous.length} earlier / other visits</summary><div className="mt-3 space-y-3">{previous.map(record => <div key={record.id}><p className="font-semibold">{auditLabel(record.audit_year, record.audit_number || 1)} · {record.audit_year}</p>{renderRecord(record)}</div>)}</div></details> : <span className="text-slate-500">—</span>}</td></tr>
      })}
    </tbody></table></div>
    {!visible.length && <p className="py-5 text-sm text-slate-500">No stores match your search.</p>}
  </section>
}
