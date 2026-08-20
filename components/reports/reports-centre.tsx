'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BarChart3, CalendarRange, FileDown, FileSpreadsheet, History, Newspaper } from 'lucide-react'

import type { ReportVersion } from '@/features/reports/query-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const LegacyReportBuilder = dynamic(() => import('@/app/(protected)/reports/reports-client'), { loading: () => <p className="p-6 text-sm text-slate-500">Loading report builder…</p> })

const catalogue = [
  { title: 'Monthly area briefings', description: 'Area audit, FRA, action and predicted-revisit dashboards.', icon: Newspaper, tab: 'build' },
  { title: 'Incident register', description: 'Role-scoped incident data cut with investigation and RIDDOR fields.', icon: FileSpreadsheet, tab: 'build' },
  { title: 'Action register', description: 'Incident and store action exports with due-date and evidence status.', icon: FileDown, tab: 'build' },
  { title: 'Audit performance', description: 'Store and area score reporting from the authoritative audit dataset.', icon: BarChart3, tab: 'build' },
  { title: 'Weekly operations digest', description: 'A controlled seven-day operational summary for managers.', icon: CalendarRange, tab: 'build' },
]

export function ReportsCentre({ versions }: { versions: ReportVersion[] }) {
  const searchParams = useSearchParams()
  const workspace = searchParams?.get('workspace')
  const defaultWorkspace = workspace === 'build' ? 'build' : workspace === 'recent' ? 'recent' : 'catalogue'
  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-600">Controlled reporting</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Reports Centre</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Choose a report, build it from live role-scoped data, and retain an exact generation record with its data cut-off.</p>
        </div>

        <Tabs defaultValue={defaultWorkspace} key={defaultWorkspace}>
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-slate-200/70 p-1 sm:w-[520px]">
            <TabsTrigger value="catalogue" className="min-h-[44px] rounded-xl">Catalogue</TabsTrigger>
            <TabsTrigger value="recent" className="min-h-[44px] rounded-xl">Recent</TabsTrigger>
            <TabsTrigger value="build" className="min-h-[44px] rounded-xl">Build</TabsTrigger>
          </TabsList>
          <TabsContent value="catalogue" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalogue.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="border-slate-200 shadow-sm">
                <CardHeader><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lime-300"><Icon className="h-5 w-5" /></div><CardTitle className="pt-2 text-base">{title}</CardTitle></CardHeader>
                <CardContent><p className="min-h-10 text-sm text-slate-600">{description}</p><Button asChild variant="outline" className="mt-4 min-h-[44px] w-full"><Link href="/reports?workspace=build">Open builder</Link></Button></CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="recent" className="mt-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Generation history</CardTitle></CardHeader><CardContent className="space-y-2">
              {versions.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No report versions have been recorded yet.</p> : versions.map((version) => {
                const generatedBy = Array.isArray(version.generated_by) ? version.generated_by[0] : version.generated_by
                return <div key={version.id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900">{version.file_name || version.report_type}</p><p className="text-xs text-slate-500">Data cut-off {new Date(version.data_cutoff_at).toLocaleString()} · {generatedBy?.full_name || 'KSS user'}</p></div><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{version.status}</span></div>
              })}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="build" className="mt-4"><LegacyReportBuilder /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
