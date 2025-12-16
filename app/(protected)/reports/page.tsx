import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { exportIncidentsCSV, exportActionsCSV } from '@/app/actions/reports'

export default async function ReportsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Export data for analysis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incidents Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export incidents data as CSV file. You can filter by date range after clicking export.
            </p>
            <form action={exportIncidentsCSV}>
              <Button type="submit">
                <Download className="h-4 w-4 mr-2" />
                Export Incidents (CSV)
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export actions data as CSV file. You can filter by date range after clicking export.
            </p>
            <form action={exportActionsCSV}>
              <Button type="submit">
                <Download className="h-4 w-4 mr-2" />
                Export Actions (CSV)
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

