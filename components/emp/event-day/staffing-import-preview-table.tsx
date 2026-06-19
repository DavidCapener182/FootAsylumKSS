import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EmpEventStaffingImportPreview } from '@/lib/emp/event-day-import'

export function StaffingImportPreviewTable({ preview }: { preview: EmpEventStaffingImportPreview }) {
  if (preview.rows.length === 0) {
    return <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">No rows found.</div>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Row</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Validation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.rows.slice(0, 25).map((row) => (
            <TableRow key={row.rowNumber}>
              <TableCell>{row.rowNumber}</TableCell>
              <TableCell className="font-medium">{row.row?.staffName || row.raw[preview.mapping.staffName] || '-'}</TableCell>
              <TableCell>{row.row?.agency || '-'}</TableCell>
              <TableCell>{row.row?.position || '-'}</TableCell>
              <TableCell className="text-xs text-slate-500">
                {row.row?.shiftStart || '-'}<br />
                {row.row?.shiftEnd || '-'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {row.errors.length === 0 ? <Badge className="bg-emerald-700">Valid</Badge> : null}
                  {row.errors.map((error) => <Badge key={error} variant="destructive">{error}</Badge>)}
                  {row.warnings.map((warning) => <Badge key={warning} variant="outline">{warning}</Badge>)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {preview.rows.length > 25 ? (
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Showing first 25 of {preview.rows.length} rows.
        </div>
      ) : null}
    </div>
  )
}
