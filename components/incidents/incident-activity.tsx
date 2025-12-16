import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

interface IncidentActivityProps {
  activityLog: any[]
}

export function IncidentActivity({ activityLog }: IncidentActivityProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <p className="text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {activityLog.map((activity) => (
                <div key={activity.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{activity.action}</div>
                      <div className="text-sm text-muted-foreground">
                        by {activity.performed_by?.full_name || 'Unknown'} • {format(new Date(activity.created_at), 'dd MMM yyyy HH:mm')}
                      </div>
                    </div>
                  </div>
                  {activity.details && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

