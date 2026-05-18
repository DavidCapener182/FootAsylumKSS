import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLatestHSAuditForStore } from '@/app/actions/fra-reports'
import { getAuditInstance } from '@/app/actions/safehub'
import { getStoreDataFromGoogleSearch } from '@/lib/fra/google-store-data-search'
import { getOpeningHoursFromSearch } from '@/lib/fra/opening-hours-search'
import {
  ensureLockedFraParserVariant,
  extractFraPdfDataFromText,
  type FraPdfExtractedData,
} from '@/lib/fra/pdf-parser'

export const dynamic = 'force-dynamic'

const SOURCE_QUESTIONS: Record<string, string> = {
  storeManager: 'Signature of Person in Charge of store at time of assessment.',
  conductedDate: 'Conducted on',
  assessmentStartTime: 'Conducted on (time portion, if present)',
  numberOfFloors: 'Number of floors (list ie Basement; Ground; 1st, 2nd in comments section)',
  squareFootage: 'Square Footage or Square Meterage of site',
  operatingHours: 'Web search from store details (not from H&S audit PDF)',
  firePanelLocation: 'Location of Fire Panel',
  firePanelFaults: 'Is panel free of faults',
  emergencyLightingSwitch: 'Location of Emergency Lighting Test Switch (Photograph)',
  escapeRoutesEvidence: 'Fire exit routes clear and unobstructed?',
  combustibleStorageEscapeCompromise: 'Combustible materials are stored correctly?',
  fireSafetyTrainingNarrative: 'H&S induction training onboarding up to date and at 100%? + H&S toolbox refresher training completed in the last 12 months...',
  fireDoorsCondition: 'Fire doors in a good condition? / Are fire door intumescent strips in place and intact? / Fire doors closed and not held open? / Fire doors are kept shut and not held open?',
  weeklyFireTests: 'Weekly Fire Tests carried out and documented?',
  emergencyLightingMonthlyTest: 'Evidence of Monthly Emergency Lighting test being conducted?',
  fireExtinguisherService: 'Fire Extinguisher Service?',
  managementReviewStatement: 'Management review statement / explicit sentence (e.g., "This assessment has been informed by...")',
  numberOfFireExits: 'Number of Fire Exits',
  totalStaffEmployed: 'Number of Staff employed at the site',
  maxStaffOnSite: 'Maximum number of staff working on site at any one time',
  youngPersonsCount: 'Number of Young persons (under the age of 18 yrs) employed at the site',
  fireDrillDate: 'Fire drill has been carried out in the past 6 months and records available on site?',
  patTestingStatus: 'PAT?',
  fixedWireTestDate: 'Fixed Electrical Wiring?',
  exitSignageCondition: 'Fire exit signage / exit sign condition statements in the audit PDF',
  compartmentationStatus: 'Structure found to be in a good condition... (missing ceiling tiles / gaps from area to area?)',
  extinguisherServiceDate: 'Fire Extinguisher Service?',
  callPointAccessibility: 'Are all call points clear and easily accessible',
}

async function getDirectPdfText(
  supabase: ReturnType<typeof createClient>,
  instanceId: string
): Promise<string | null> {
  const { data: responses } = await supabase
    .from('fa_audit_responses')
    .select('response_json')
    .eq('audit_instance_id', instanceId)

  for (const response of responses || []) {
    const text = response?.response_json?.fra_pdf_text
    if (typeof text === 'string' && text.trim()) {
      return text
    }
  }

  return null
}

async function getStoredFraData(
  supabase: ReturnType<typeof createClient>,
  instanceId: string
): Promise<{ extractedData: Record<string, any>; customData: Record<string, any>; variant: string | null }> {
  const { data: responses } = await supabase
    .from('fa_audit_responses')
    .select('response_json, created_at')
    .eq('audit_instance_id', instanceId)
    .order('created_at', { ascending: false })

  for (const response of responses || []) {
    const responseJson = response?.response_json || {}
    const extractedData = responseJson.fra_extracted_data
    const customData = responseJson.fra_custom_data
    const variant = responseJson.fra_template_variant || extractedData?.fra_template_variant || customData?.fra_template_variant || null
    if (extractedData || customData || variant) {
      return {
        extractedData: extractedData && typeof extractedData === 'object' ? extractedData : {},
        customData: customData && typeof customData === 'object' ? customData : {},
        variant: typeof variant === 'string' ? variant : null,
      }
    }
  }

  return { extractedData: {}, customData: {}, variant: null }
}

async function enrichStoreFallbacks(
  extracted: FraPdfExtractedData,
  store: { store_name?: string | null; address_line_1?: string | null; city?: string | null } | null
) {
  if (!store?.store_name) return extracted

  try {
    const googleData = await getStoreDataFromGoogleSearch({
      storeName: store.store_name,
      address: store.address_line_1 || '',
      city: store.city || '',
    })

    let operatingHours = googleData.openingTimes
    if (!operatingHours) {
      operatingHours = await getOpeningHoursFromSearch({
        storeName: store.store_name,
        address: store.address_line_1 || '',
        city: store.city || '',
      })
    }

    extracted.operatingHours = operatingHours || null
    if (!extracted.squareFootage && googleData.squareFootage) {
      extracted.squareFootage = googleData.squareFootage
      extracted.squareFootageSource = 'WEB_SEARCH'
    }
  } catch (error) {
    console.error('[EXTRACT] Store search fallback failed:', error)
  }

  return extracted
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    const fraInstance = await getAuditInstance(instanceId)
    if (!fraInstance || (fraInstance.fa_audit_templates as any)?.category !== 'fire_risk_assessment') {
      return NextResponse.json({ error: 'Invalid FRA audit instance' }, { status: 400 })
    }

    const store = fraInstance.fa_stores as any
    const storeId = store.id

    const directPdfText = await getDirectPdfText(supabase, instanceId)
    const storedFraData = await getStoredFraData(supabase, instanceId)
    const storedExtractedData = storedFraData.extractedData
    const storedSource = storedFraData.variant === 'new_store_pre_opening' ? 'PRE_OPENING' : 'REVIEW'
    const pickValue = (key: string, pdfValue: string | null | undefined = null) =>
      storedExtractedData[key] ?? pdfValue ?? null
    const sourceValue = (key: string, pdfValue: string | null | undefined = null, fallbackSource = 'NOT_FOUND') =>
      storedExtractedData[key] ? storedSource : (pdfValue ? 'PDF' : fallbackSource)
    const hsAuditResult = await getLatestHSAuditForStore(storeId, instanceId)
    const pdfText = directPdfText || hsAuditResult.pdfText

    let pdfExtractedData: FraPdfExtractedData = {}
    if (pdfText) {
      const parserVariant = await ensureLockedFraParserVariant({
        supabase,
        instanceId,
        userId: user.id,
        pdfText,
      })
      pdfExtractedData = extractFraPdfDataFromText(pdfText, { variant: parserVariant })
      pdfExtractedData = await enrichStoreFallbacks(pdfExtractedData, store)
    }

    const extractedData = {
      fra_template_variant: storedFraData.variant,
      assessmentContext: storedExtractedData.assessmentContext || storedFraData.customData.assessmentContext || null,
      storeManager: pickValue('storeManager', pdfExtractedData.storeManager),
      assessmentStartTime: pickValue('assessmentStartTime', pdfExtractedData.assessmentStartTime),
      firePanelLocation: pickValue('firePanelLocation', pdfExtractedData.firePanelLocation),
      firePanelFaults: pickValue('firePanelFaults', pdfExtractedData.firePanelFaults),
      emergencyLightingSwitch: pickValue('emergencyLightingSwitch', pdfExtractedData.emergencyLightingSwitch),
      numberOfFloors: pickValue('numberOfFloors', pdfExtractedData.numberOfFloors),
      operatingHours: pickValue('operatingHours', pdfExtractedData.operatingHours),
      conductedDate: pickValue('conductedDate', pdfExtractedData.conductedDate),
      squareFootage: pickValue('squareFootage', pdfExtractedData.squareFootage),
      escapeRoutesEvidence: pickValue('escapeRoutesEvidence', pdfExtractedData.escapeRoutesEvidence),
      combustibleStorageEscapeCompromise: pickValue('combustibleStorageEscapeCompromise', pdfExtractedData.combustibleStorageEscapeCompromise),
      fireSafetyTrainingNarrative: pickValue('fireSafetyTrainingNarrative', pdfExtractedData.fireSafetyTrainingNarrative),
      fireDoorsCondition: pickValue('fireDoorsCondition', pdfExtractedData.fireDoorsCondition),
      weeklyFireTests: pickValue('weeklyFireTests', pdfExtractedData.weeklyFireTests),
      emergencyLightingMonthlyTest: pickValue('emergencyLightingMonthlyTest', pdfExtractedData.emergencyLightingMonthlyTest),
      fireExtinguisherService: pickValue('fireExtinguisherService', pdfExtractedData.fireExtinguisherService),
      managementReviewStatement: pickValue('managementReviewStatement', pdfExtractedData.managementReviewStatement),
      numberOfFireExits: pickValue('numberOfFireExits', pdfExtractedData.numberOfFireExits),
      totalStaffEmployed: pickValue('totalStaffEmployed', pdfExtractedData.totalStaffEmployed),
      maxStaffOnSite: pickValue('maxStaffOnSite', pdfExtractedData.maxStaffOnSite),
      youngPersonsCount: pickValue('youngPersonsCount', pdfExtractedData.youngPersonsCount),
      fireDrillDate: pickValue('fireDrillDate', pdfExtractedData.fireDrillDate),
      patTestingStatus: pickValue('patTestingStatus', pdfExtractedData.patTestingStatus),
      fixedWireTestDate: pickValue('fixedWireTestDate', pdfExtractedData.fixedWireTestDate),
      exitSignageCondition: pickValue('exitSignageCondition', pdfExtractedData.exitSignageCondition),
      compartmentationStatus: pickValue('compartmentationStatus', pdfExtractedData.compartmentationStatus),
      extinguisherServiceDate: pickValue('extinguisherServiceDate', pdfExtractedData.extinguisherServiceDate),
      callPointAccessibility: pickValue('callPointAccessibility', pdfExtractedData.callPointAccessibility),
      sources: {
        storeManager: sourceValue('storeManager', pdfExtractedData.storeManager),
        assessmentStartTime: sourceValue('assessmentStartTime', pdfExtractedData.assessmentStartTime),
        firePanelLocation: sourceValue('firePanelLocation', pdfExtractedData.firePanelLocation),
        firePanelFaults: sourceValue('firePanelFaults', pdfExtractedData.firePanelFaults),
        emergencyLightingSwitch: sourceValue('emergencyLightingSwitch', pdfExtractedData.emergencyLightingSwitch),
        numberOfFloors: sourceValue('numberOfFloors', pdfExtractedData.numberOfFloors),
        operatingHours: sourceValue('operatingHours', pdfExtractedData.operatingHours),
        conductedDate: sourceValue('conductedDate', pdfExtractedData.conductedDate),
        squareFootage:
          storedExtractedData.squareFootage
          ? storedSource
          :
          pdfExtractedData.squareFootageSource
          || (pdfExtractedData.squareFootage ? 'PDF' : 'NOT_FOUND'),
        escapeRoutesEvidence: sourceValue('escapeRoutesEvidence', pdfExtractedData.escapeRoutesEvidence),
        combustibleStorageEscapeCompromise: sourceValue('combustibleStorageEscapeCompromise', pdfExtractedData.combustibleStorageEscapeCompromise),
        fireSafetyTrainingNarrative: sourceValue('fireSafetyTrainingNarrative', pdfExtractedData.fireSafetyTrainingNarrative),
        fireDoorsCondition: sourceValue('fireDoorsCondition', pdfExtractedData.fireDoorsCondition),
        weeklyFireTests: sourceValue('weeklyFireTests', pdfExtractedData.weeklyFireTests),
        emergencyLightingMonthlyTest: sourceValue('emergencyLightingMonthlyTest', pdfExtractedData.emergencyLightingMonthlyTest),
        fireExtinguisherService: sourceValue('fireExtinguisherService', pdfExtractedData.fireExtinguisherService),
        managementReviewStatement:
          storedExtractedData.managementReviewStatement
          ? storedSource
          :
          pdfExtractedData.managementReviewStatementSource
          || (pdfExtractedData.managementReviewStatement ? 'PDF' : 'NOT_FOUND'),
        numberOfFireExits: sourceValue('numberOfFireExits', pdfExtractedData.numberOfFireExits),
        totalStaffEmployed: sourceValue('totalStaffEmployed', pdfExtractedData.totalStaffEmployed),
        maxStaffOnSite: sourceValue('maxStaffOnSite', pdfExtractedData.maxStaffOnSite),
        youngPersonsCount: sourceValue('youngPersonsCount', pdfExtractedData.youngPersonsCount),
        fireDrillDate: sourceValue('fireDrillDate', pdfExtractedData.fireDrillDate),
        patTestingStatus: sourceValue('patTestingStatus', pdfExtractedData.patTestingStatus),
        fixedWireTestDate: sourceValue('fixedWireTestDate', pdfExtractedData.fixedWireTestDate),
        exitSignageCondition: sourceValue('exitSignageCondition', pdfExtractedData.exitSignageCondition),
        compartmentationStatus: sourceValue('compartmentationStatus', pdfExtractedData.compartmentationStatus),
        extinguisherServiceDate: sourceValue('extinguisherServiceDate', pdfExtractedData.extinguisherServiceDate),
        callPointAccessibility: sourceValue('callPointAccessibility', pdfExtractedData.callPointAccessibility),
      },
      sourceQuestions: SOURCE_QUESTIONS,
      hasPdfText: !!pdfText,
      hasDatabaseAudit: Object.keys(storedExtractedData).length > 0,
      hasPreOpeningData: storedFraData.variant === 'new_store_pre_opening',
      pdfTextLength: pdfText?.length || 0,
      pdfExtractedCount: Object.keys({ ...pdfExtractedData, ...storedExtractedData }).filter((key) => ({ ...pdfExtractedData, ...storedExtractedData } as Record<string, unknown>)[key] != null).length,
      dbExtractedCount: 0,
    }

    return NextResponse.json({
      ...extractedData,
      rawPdfText: pdfText ? pdfText.substring(0, 5000) + (pdfText.length > 5000 ? '...' : '') : null,
    })
  } catch (error: any) {
    console.error('Error extracting FRA data:', error)
    return NextResponse.json(
      { error: 'Failed to extract FRA data', details: error.message },
      { status: 500 }
    )
  }
}
