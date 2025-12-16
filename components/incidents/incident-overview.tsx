import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { format } from 'date-fns'

interface IncidentOverviewProps {
  incident: any
}

export function IncidentOverview({ incident }: IncidentOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={incident.status} type="incident" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={incident.severity} type="severity" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="font-medium">{incident.fa_stores?.store_name}</div>
              {incident.fa_stores?.store_code && (
                <div className="text-sm text-muted-foreground">Code: {incident.fa_stores.store_code}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Category</CardTitle>
          </CardHeader>
          <CardContent>
            {incident.incident_category.split('_').map((w: string) => 
              w.charAt(0).toUpperCase() + w.slice(1)
            ).join(' ')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Occurred At</CardTitle>
          </CardHeader>
          <CardContent>
            {format(new Date(incident.occurred_at), 'dd MMM yyyy HH:mm')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reported At</CardTitle>
          </CardHeader>
          <CardContent>
            {format(new Date(incident.reported_at), 'dd MMM yyyy HH:mm')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Reported By</CardTitle>
          </CardHeader>
          <CardContent>
            {incident.reporter?.full_name || 'Unknown'}
          </CardContent>
        </Card>

        {incident.assigned_investigator_user_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Investigator</CardTitle>
            </CardHeader>
            <CardContent>
              {incident.investigator?.full_name || 'Unknown'}
            </CardContent>
          </Card>
        )}

        {incident.riddor_reportable && (
          <Card className="col-span-2 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-red-800">RIDDOR Reportable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-700">This incident is RIDDOR reportable</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{incident.description || 'No description provided'}</p>
        </CardContent>
      </Card>

      {incident.persons_involved && (
        <Card>
          <CardHeader>
            <CardTitle>Persons Involved</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{JSON.stringify(incident.persons_involved, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {incident.injury_details && (
        <Card>
          <CardHeader>
            <CardTitle>Injury Details</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{JSON.stringify(incident.injury_details, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {incident.witnesses && (
        <Card>
          <CardHeader>
            <CardTitle>Witnesses</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{JSON.stringify(incident.witnesses, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {incident.closure_summary && (
        <Card>
          <CardHeader>
            <CardTitle>Closure Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{incident.closure_summary}</p>
            {incident.closed_at && (
              <p className="text-sm text-muted-foreground mt-2">
                Closed: {format(new Date(incident.closed_at), 'dd MMM yyyy HH:mm')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

