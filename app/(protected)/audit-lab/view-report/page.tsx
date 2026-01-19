import Link from 'next/link'

export default function AuditReportViewPage({
  searchParams,
}: {
  searchParams: { instanceId?: string }
}) {
  const instanceId = searchParams?.instanceId
  const pdfUrl = instanceId
    ? `/api/audit-pdfs/generate?instanceId=${instanceId}&mode=view`
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-slate-900 text-white px-4 py-3 shadow">
        <Link href="/audit-lab" className="text-sm font-semibold uppercase tracking-wide">
          ← Back to Audits
        </Link>
        <span className="text-xs text-slate-300">
          View Report
        </span>
      </div>
      <div className="h-[calc(100vh-48px)]">
        {pdfUrl ? (
          <iframe
            title="Audit Report PDF"
            src={pdfUrl}
            className="w-full h-full border-0 bg-white"
          />
        ) : (
          <div className="p-6 text-sm text-slate-600">Missing audit instance.</div>
        )}
      </div>
    </div>
  )
}
