import { FRA_TEMPLATE_VARIANTS } from './template-profiles'
import { normalizeFRAManualRiskRatingOverride } from './risk-rating'

export function isPreOpeningReviewData(data: any): boolean {
  if (data?.fra_template_variant === FRA_TEMPLATE_VARIANTS.BREMONT_WATCHES || data?.hasBremontData) return false
  return !!(data?.hasPreOpeningData || data?.fra_template_variant === FRA_TEMPLATE_VARIANTS.NEW_STORE_PRE_OPENING || data?.assessmentContext === 'pre_opening')
}

/** Validate explicit selections only; never infer a matrix input from an overall rating. */
export function prepareReviewedFraData(data: any, isPreOpening: boolean) {
  if (!isPreOpening) return data
  const value = data.manualRiskRatingOverride
  if (value == null || (typeof value === 'object' && !value.likelihood && !value.consequence && !String(value.reason || '').trim())) {
    return { ...data, manualRiskRatingOverride: null }
  }
  const validated = normalizeFRAManualRiskRatingOverride(value)
  if (!validated) throw new Error('Choose both likelihood and consequence and enter the assessor rationale, or clear all three fields to retain the automatic provisional rating.')
  return { ...data, manualRiskRatingOverride: validated }
}

export function buildEditedDataFromExtracted(data: any) {
  return {
    fra_template_variant: data.fra_template_variant || '',
    assessmentContext: data.assessmentContext || '',
    ...(isPreOpeningReviewData(data) ? { manualRiskRatingOverride: normalizeFRAManualRiskRatingOverride(data.manualRiskRatingOverride) } : {}),
    storeManager: data.storeManager || '',
    firePanelLocation: data.firePanelLocation || '',
    firePanelFaults: data.firePanelFaults || '',
    emergencyLightingSwitch: data.emergencyLightingSwitch || '',
    numberOfFloors: data.numberOfFloors || '',
    operatingHours: data.operatingHours || '',
    conductedDate: data.conductedDate || '',
    assessmentStartTime: data.assessmentStartTime || '',
    squareFootage: data.squareFootage || '',
    escapeRoutesEvidence: data.escapeRoutesEvidence || '',
    combustibleStorageEscapeCompromise: data.combustibleStorageEscapeCompromise || '',
    fireSafetyTrainingNarrative: data.fireSafetyTrainingNarrative || '',
    fireDoorsCondition: data.fireDoorsCondition || '',
    weeklyFireTests: data.weeklyFireTests || '',
    emergencyLightingMonthlyTest: data.emergencyLightingMonthlyTest || '',
    fireExtinguisherService: data.fireExtinguisherService || '',
    managementReviewStatement: data.managementReviewStatement || '',
    // High priority fields
    numberOfFireExits: data.numberOfFireExits || '',
    totalStaffEmployed: data.totalStaffEmployed || '',
    maxStaffOnSite: data.maxStaffOnSite || '',
    youngPersonsCount: data.youngPersonsCount || '',
    fireDrillDate: data.fireDrillDate || '',
    patTestingStatus: data.patTestingStatus || '',
    fixedWireTestDate: data.fixedWireTestDate || '',
    // Medium priority fields
    exitSignageCondition: data.exitSignageCondition || '',
    compartmentationStatus: data.compartmentationStatus || '',
    extinguisherServiceDate: data.extinguisherServiceDate || '',
    callPointAccessibility: data.callPointAccessibility || '',
  }
}
