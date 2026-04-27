'use client'

import { useState } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { DeleteActionButton } from '@/components/shared/delete-action-button'
import { CloseActionButton } from '@/components/shared/close-action-button'
import { ViewActionModal } from '@/components/shared/view-action-modal'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { getStoreActionListTitle } from '@/components/shared/store-action-title'

interface ActionsTableRowProps {
  action: any
  canManageActions?: boolean
}

export function ActionsTableRow({ action, canManageActions = true }: ActionsTableRowProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const isStoreAction = action.source_type === 'store' || !action.incident_id
  const displayTitle = isStoreAction ? getStoreActionListTitle(action) : action.title
  const isOverdue = new Date(action.due_date) < new Date() && 
    !['complete', 'cancelled'].includes(action.status)
  const assigneeName = action.assigned_to?.full_name?.trim() || ''
  const assigneeInitials = assigneeName
    ? assigneeName.includes(' ')
      ? assigneeName
          .split(' ')
          .filter(Boolean)
          .map((part: string) => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : assigneeName.toUpperCase().slice(0, 2)
    : ''

  return (
    <>
      <TableRow
        key={action.id}
        onClick={() => setModalOpen(true)}
        className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-rose-50/50' : ''}`}
      >
        <TableCell className="font-medium text-slate-900" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          {displayTitle}
        </TableCell>
        <TableCell style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          {isStoreAction ? (
            <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {action.incident?.reference_no || 'Store Action'}
            </span>
          ) : (
            <Link
              href={`/incidents/${action.incident_id}`}
              className="hover:text-indigo-600 transition-colors"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {action.incident?.reference_no || 'Unknown'}
              </span>
            </Link>
          )}
        </TableCell>
        <TableCell style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          {assigneeName ? (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                {assigneeInitials}
              </div>
              <span className="text-sm text-slate-600 truncate">{assigneeName}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">Unassigned</span>
          )}
        </TableCell>
        <TableCell style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          <StatusBadge status={action.priority} type="severity" />
        </TableCell>
        <TableCell className={`text-sm ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-600'}`} style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          {format(new Date(action.due_date), 'dd MMM yyyy')}
          {isOverdue && (
            <span className="ml-1.5 text-xs text-rose-600 font-medium">(Overdue)</span>
          )}
        </TableCell>
        <TableCell style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          <StatusBadge status={action.status} type="action" />
        </TableCell>
        <TableCell className="text-right" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          <div className="flex items-center justify-end gap-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
              onClick={(event) => {
                event.stopPropagation()
                setModalOpen(true)
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View
            </Button>
            {!isStoreAction && canManageActions ? (
              <>
                <div onClick={(event) => event.stopPropagation()}>
                  <CloseActionButton actionId={action.id} actionTitle={action.title} currentStatus={action.status} />
                </div>
                <div onClick={(event) => event.stopPropagation()}>
                  <DeleteActionButton actionId={action.id} actionTitle={action.title} />
                </div>
              </>
            ) : null}
          </div>
        </TableCell>
      </TableRow>
      <ViewActionModal 
        action={action} 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        onActionUpdated={() => {
          setModalOpen(false)
        }}
      />
    </>
  )
}
