/** Preserve reviewed audit evidence in every report render path. */
export function applyFRAEvidenceReview<T extends Record<string, any>>(data: T, review: Record<string, any> | null, fromPdf: boolean): T & { travelDistancesEvidence: string; fireAlarmCategoryEvidence: string } {
  const result = { ...data, travelDistancesEvidence: 'Travel distances were not measured in the supplied assessment evidence. Measure the escape routes and compare them with the guidance above.', fireAlarmCategoryEvidence: 'The installed alarm category is not established by the supplied assessment evidence. Confirm the category and coverage from the system design and commissioning records.' }
  const fields: Record<string, string> = {
    alarmSystemDescription: 'fireAlarmDescription', fireAlarmDescription: 'fireAlarmDescription',
    emergencyLightingDescription: 'emergencyLightingDescription', fireExtinguishersDescription: 'fireExtinguishersDescription',
    fireExtinguisherService: 'fireExtinguisherService', fireDoorsCondition: 'internalFireDoors',
    sprinklerDescription: 'sprinklerDescription', sprinklerClearance: 'sprinklerClearance',
    weeklyFireTests: 'fireAlarmMaintenance', emergencyLightingMonthlyTest: 'emergencyLightingMaintenance',
    travelDistancesEvidence: 'travelDistancesEvidence', fireAlarmCategoryEvidence: 'fireAlarmCategoryEvidence',
  }
  if (fromPdf) {
    Object.assign(result, {
      fireAlarmDescription: 'A fire alarm and manual call points are recorded in the audit. System category, coverage and certification should be confirmed from the installation records.',
      emergencyLightingDescription: 'Emergency lighting is recorded in the audit. Coverage and performance should be checked against the system documentation and test records.',
      internalFireDoors: 'Fire doors are recorded in the audit. Their condition and fire resistance should be checked against the recorded observations and installation documentation.',
      historyOfFires: 'No fire-incident history is provided in the supplied audit.',
    })
  }
  for (const [source, target] of Object.entries(fields)) {
    const value = review?.[source]
    if (typeof value === 'string' && value.trim()) Object.assign(result, { [target]: value.trim() })
  }
  if (typeof review?.hasSprinklers === 'boolean') Object.assign(result, { hasSprinklers: review.hasSprinklers })
  return result
}
