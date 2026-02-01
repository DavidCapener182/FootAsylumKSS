import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapHSAuditToFRAData } from '@/app/actions/fra-reports'
import createReport from 'docx-templates'
import * as fs from 'fs'
import * as path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Load FRA placeholder photos from storage (same as generate-docx). */
async function loadPlaceholderPhotoBuffers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instanceId: string
): Promise<{ data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' }[]> {
  const result: { data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' }[] = []
  const prefix = `fra/${instanceId}/photos`
  const { data: placeholders } = await supabase.storage.from('fa-attachments').list(prefix, { limit: 50 })
  if (!placeholders?.length) return result

  for (const item of placeholders) {
    const placeholderId = item.name
    if (!placeholderId || placeholderId.includes('/')) continue
    const folderPath = `${prefix}/${placeholderId}`
    const { data: files } = await supabase.storage.from('fa-attachments').list(folderPath, { limit: 20 })
    if (!files?.length) continue

    for (const f of files) {
      if (!f.name) continue
      const filePath = `${folderPath}/${f.name}`
      const ext = f.name.split('.').pop()?.toLowerCase()
      const type = (ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : ext === 'bmp' ? 'bmp' : 'jpg') as 'jpg' | 'png' | 'gif' | 'bmp'
      const { data: blob } = await supabase.storage.from('fa-attachments').download(filePath)
      if (!blob) continue
      result.push({ data: Buffer.from(await blob.arrayBuffer()), type })
    }
  }
  return result
}

/** Map FRAData to flat placeholder object for docx-templates. */
function mapFraDataToTemplateData(
  data: Awaited<ReturnType<typeof mapHSAuditToFRAData>>,
  instanceId: string
): Record<string, unknown> {
  const d = data as Record<string, unknown>
  return {
    STORE_NAME: data.premises ?? '—',
    CLIENT_NAME: data.clientName ?? '—',
    ADDRESS: data.address ?? '—',
    RESPONSIBLE_PERSON: data.responsiblePerson ?? '—',
    ULTIMATE_RESPONSIBLE_PERSON: data.ultimateResponsiblePerson ?? '—',
    APPOINTED_PERSON: data.appointedPerson ?? '—',
    ASSESSOR_NAME: data.assessorName ?? '—',
    ASSESSMENT_DATE: data.assessmentDate ?? 'Not specified',
    ASSESSMENT_START_TIME: data.assessmentStartTime ?? '—',
    ASSESSMENT_END_TIME: data.assessmentEndTime ?? '—',
    FIRE_PANEL_LOCATION: data.fireAlarmPanelLocation ?? '—',
    EMERGENCY_LIGHTING_SWITCH:
      (d.emergencyLightingTestSwitchLocation as string) ?? '—',
    BUILD_DATE: data.buildDate ?? '—',
    PROPERTY_TYPE: data.propertyType ?? '—',
    DESCRIPTION: data.description ?? '—',
    NUMBER_OF_FLOORS: data.numberOfFloors ?? '—',
    FLOOR_AREA: data.floorArea ?? '—',
    OCCUPANCY: data.occupancy ?? '—',
    OPERATING_HOURS: data.operatingHours ?? '—',
    FIRE_ALARM_DESCRIPTION: data.fireAlarmDescription ?? '—',
    EMERGENCY_LIGHTING_DESCRIPTION: data.emergencyLightingDescription ?? '—',
    FIRE_EXTINGUISHERS_DESCRIPTION: data.fireExtinguishersDescription ?? '—',
    SOURCES_OF_IGNITION: Array.isArray(data.sourcesOfIgnition)
      ? data.sourcesOfIgnition.join('; ')
      : '—',
    SOURCES_OF_FUEL: Array.isArray(data.sourcesOfFuel)
      ? data.sourcesOfFuel.join('; ')
      : '—',
    PEOPLE_AT_RISK: Array.isArray(data.peopleAtRisk) ? data.peopleAtRisk.join('; ') : '—',
    SIGNIFICANT_FINDINGS: Array.isArray(data.significantFindings)
      ? data.significantFindings.join('; ')
      : '—',
    RECOMMENDED_CONTROLS: Array.isArray(data.recommendedControls)
      ? data.recommendedControls.join('; ')
      : '—',
    RISK_LIKELIHOOD: data.riskRatingLikelihood ?? '—',
    RISK_CONSEQUENCES: data.riskRatingConsequences ?? '—',
    RISK_SUMMARY: data.summaryOfRiskRating ?? '—',
    ACTION_PLAN_ITEMS: Array.isArray(data.actionPlanItems) ? data.actionPlanItems : [],
    GENERATED_TIMESTAMP: new Date().toISOString(),
    INSTANCE_ID: instanceId,
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const instanceId = request.nextUrl.searchParams.get('instanceId')
    if (!instanceId) return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })

    const templatePath = path.join(process.cwd(), 'templates', 'FRA_Template.docx')
    if (!fs.existsSync(templatePath)) {
      console.error('[DOCX-TEMPLATE] Template not found:', templatePath)
      return NextResponse.json(
        { error: 'FRA template not found. Run: npm run seed-fra-template' },
        { status: 500 }
      )
    }

    const template = fs.readFileSync(templatePath)
    const fraData = await mapHSAuditToFRAData(instanceId)
    const premises = fraData.premises ?? 'Report'
    const sitePhotos = await loadPlaceholderPhotoBuffers(supabase, instanceId)

    const categoryLPath = path.join(process.cwd(), 'public', 'fra-category-l-fire-alarm-systems.png')

    const buffer = await createReport({
      template,
      data: mapFraDataToTemplateData(fraData, instanceId),
      cmdDelimiter: ['{', '}'],
      additionalJsContext: {
        getCategoryLImage: () => {
          try {
            const buf = fs.readFileSync(categoryLPath)
            return {
              width: 12,
              height: 8,
              data: buf,
              extension: '.png',
            }
          } catch {
            return null
          }
        },
        getSitePhotos: () => sitePhotos.map((p) => ({
          width: 8,
          height: 6,
          data: p.data,
          extension: p.type === 'png' ? '.png' : p.type === 'gif' ? '.gif' : '.jpg',
        })),
      },
    })

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeName = premises.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
    const filename = `FRA-Template-${safeName}-${stamp}.docx`

    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error: any) {
    console.error('Error generating DOCX from template:', error)
    return NextResponse.json(
      { error: 'Failed to generate DOCX', details: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
