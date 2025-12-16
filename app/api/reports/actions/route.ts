import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: actions, error } = await supabase
    .from('fa_actions')
    .select(`
      *,
      assigned_to:fa_profiles!fa_actions_assigned_to_user_id_fkey(full_name),
      incident:fa_incidents!fa_actions_incident_id_fkey(reference_no)
    `)
    .order('due_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: `Failed to fetch actions: ${error.message}` }, { status: 500 })
  }

  // Convert to CSV
  const headers = [
    'Title',
    'Incident Reference',
    'Assigned To',
    'Priority',
    'Status',
    'Due Date',
    'Completed At',
    'Evidence Required',
  ]

  const rows = actions?.map((action: any) => [
    action.title.replace(/"/g, '""'),
    action.incident?.reference_no || '',
    action.assigned_to?.full_name || '',
    action.priority,
    action.status,
    action.due_date,
    action.completed_at || '',
    action.evidence_required ? 'Yes' : 'No',
  ]) || []

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Return as downloadable file
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="actions-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

