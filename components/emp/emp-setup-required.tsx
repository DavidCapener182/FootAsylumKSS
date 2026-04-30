import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function EmpSetupRequired({ details }: { details?: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border border-amber-200 bg-amber-50/70 shadow-none">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle>EMP database setup required</CardTitle>
          <CardDescription className="text-sm text-amber-900/80">
            Apply <span className="font-mono">supabase/migrations/048_add_emp_module.sql</span> to
            the connected Supabase project, then refresh this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-950">
          <p>
            This migration creates the <span className="font-mono">emp_</span> tables, row-level
            security policies, and the <span className="font-mono">emp-documents</span> storage
            bucket used by the Event Management Plan module.
          </p>
          {details ? (
            <p className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 font-mono text-xs text-amber-950">
              {details}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
