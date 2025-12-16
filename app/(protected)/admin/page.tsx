import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-1">Administrative functions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Admin functions will be available here. This includes user management, store management, and system configuration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

