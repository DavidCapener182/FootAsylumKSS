import { requirePermission } from '@/lib/permissions'
import { FY27_AREA_CHANGES } from '@/lib/retail-structure-fy27'
import { getReportingAreaDisplayName } from '@/lib/areas'
import { applyFY27RetailStructure } from '@/app/actions/retail-structure'

export const dynamic = 'force-dynamic'

export default async function RetailStructurePage() {
  const { supabase } = await requirePermission('adminUsers')
  const { data: stores, error } = await supabase.from('fa_stores')
    .select('store_code, reporting_area, reporting_area_manager_name, reporting_area_manager_email')
    .in('store_code', FY27_AREA_CHANGES.map(change => change.code))
  if (error) throw new Error('Unable to load current reporting areas')
  const complete = FY27_AREA_CHANGES.every(change =>
    stores?.find(store => store.store_code === change.code)?.reporting_area === change.after)
  return <main className="mx-auto max-w-4xl space-y-6 p-6">
    <h1 className="text-2xl font-bold">FY27 retail structure</h1>
    <p>Checked against the structure supplied on 15 September 2026. Photo Studio, Heywood and Middleton have their own reporting group.</p>
    <div className="overflow-x-auto"><table className="w-full text-left">
      <thead><tr><th className="p-3">Site</th><th className="p-3">Current area</th><th className="p-3">New area</th></tr></thead>
      <tbody>{FY27_AREA_CHANGES.map(change => <tr key={change.code} className="border-t">
        <td className="p-3">{change.name}</td>
        <td className="p-3">{getReportingAreaDisplayName(stores?.find(store => store.store_code === change.code)?.reporting_area)}</td>
        <td className="p-3">{getReportingAreaDisplayName(change.after)}</td>
      </tr>)}</tbody>
    </table></div>
    <p>Internal audit regions, store codes and audit history are preserved. Sites absent from the chart need separate review.</p>
    {complete ? <p className="font-semibold text-green-700">All seven reporting assignments are up to date.</p> :
      <form action={applyFY27RetailStructure}><button className="rounded bg-slate-900 px-4 py-3 font-semibold text-white" type="submit">Apply seven reviewed area changes</button></form>}
    <a className="block underline" href="/reports">Open reports</a>
  </main>
}
