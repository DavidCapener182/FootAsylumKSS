import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { instanceId, customData } = body

    if (!instanceId || !customData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the instance exists and user has access
    const { data: instance, error: instanceError } = await supabase
      .from('fa_audit_instances')
      .select('id, template_id, fa_audit_templates!inner(category)')
      .eq('id', instanceId)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'Audit instance not found' }, { status: 404 })
    }

    // Verify it's an FRA template
    if ((instance.fa_audit_templates as any)?.category !== 'fire_risk_assessment') {
      return NextResponse.json({ error: 'This endpoint is only for FRA audits' }, { status: 400 })
    }

    // Store custom data by finding or creating a special metadata response
    // We'll use the template's first question as a placeholder for metadata storage
    // Get the first question from the template
    const { data: firstSection } = await supabase
      .from('fa_audit_template_sections')
      .select('id')
      .eq('template_id', instance.template_id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    let questionIdForMetadata: string | null = null
    
    if (firstSection) {
      const { data: firstQuestion } = await supabase
        .from('fa_audit_template_questions')
        .select('id')
        .eq('section_id', firstSection.id)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      questionIdForMetadata = firstQuestion?.id || null
    }

    // If no questions exist, we can't store metadata this way
    // In that case, we'll need to create a dummy question or use a different approach
    if (!questionIdForMetadata) {
      return NextResponse.json({ error: 'Template has no questions to store metadata' }, { status: 400 })
    }

    // Check if there's already a metadata response for this question
    const { data: existingResponse } = await supabase
      .from('fa_audit_responses')
      .select('id, response_value, response_json')
      .eq('audit_instance_id', instanceId)
      .eq('question_id', questionIdForMetadata)
      .maybeSingle()

    const existing = existingResponse as { id: string; response_value?: unknown; response_json?: unknown } | null
    const metadataResponse = {
      response_value: existing?.response_value ?? null,
      response_json: {
        ...(existing?.response_json && typeof existing.response_json === 'object' 
          ? existing.response_json 
          : {}),
        fra_custom_data: {
          floorArea: customData.floorArea,
          occupancy: customData.occupancy,
          operatingHours: customData.operatingHours,
          buildDate: customData.buildDate,
          updated_at: new Date().toISOString(),
        },
      },
    }

    if (existingResponse) {
      // Update existing response, preserving other data
      const { error: updateError } = await supabase
        .from('fa_audit_responses')
        .update(metadataResponse)
        .eq('id', existingResponse.id)

      if (updateError) {
        throw new Error(`Failed to update custom data: ${updateError.message}`)
      }
    } else {
      // Create new response with metadata
      const { error: insertError } = await supabase
        .from('fa_audit_responses')
        .insert({
          audit_instance_id: instanceId,
          question_id: questionIdForMetadata,
          ...metadataResponse,
        })

      if (insertError) {
        throw new Error(`Failed to save custom data: ${insertError.message}`)
      }
    }

    return NextResponse.json({ success: true, message: 'Custom data saved successfully' })
  } catch (error: any) {
    console.error('Error saving custom FRA data:', error)
    return NextResponse.json(
      { error: 'Failed to save custom data', details: error.message },
      { status: 500 }
    )
  }
}
