import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: incidents, error } = await supabase
    .from('fa_incidents')
    .select(`
      *,
      fa_stores(store_name, store_code),
      reporter:fa_profiles!fa_incidents_reported_by_user_id_fkey(full_name),
      investigator:fa_profiles!fa_incidents_assigned_investigator_user_id_fkey(full_name)
    `)
    .order('occurred_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: `Failed to fetch incidents: ${error.message}` }, { status: 500 })
  }

  // Convert to CSV
  const headers = [
    'Reference No',
    'Store',
    'Store Code',
    'Category',
    'Severity',
    'Status',
    'Summary',
    'Occurred At',
    'Reported At',
    'Reported By',
    'Investigator',
    'RIDDOR Reportable',
  ]

  const rows = incidents?.map((incident: any) => [
    incident.reference_no,
    incident.fa_stores?.store_name || '',
    incident.fa_stores?.store_code || '',
    incident.incident_category,
    incident.severity,
    incident.status,
    incident.summary.replace(/"/g, '""'), // Escape quotes
    incident.occurred_at,
    incident.reported_at,
    incident.reporter?.full_name || '',
    incident.investigator?.full_name || '',
    incident.riddor_reportable ? 'Yes' : 'No',
  ]) || []

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Return as downloadable file
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="incidents-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

