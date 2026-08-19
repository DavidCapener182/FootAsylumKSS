import React, { type ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type DataTableColumn<Row> = {
  id: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  className?: string
}

export function DataTable<Row>({
  rows,
  columns,
  getRowKey,
  caption,
  emptyState,
  className,
}: {
  rows: Row[]
  columns: DataTableColumn<Row>[]
  getRowKey: (row: Row) => string
  caption: string
  emptyState?: ReactNode
  className?: string
}) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200 bg-white', className)}>
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {columns.map((column) => <TableHead key={column.id} className={column.className}>{column.header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => <TableCell key={column.id} className={column.className}>{column.cell(row)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
