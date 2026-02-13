export type FRARiskLikelihood = 'Low' | 'Normal' | 'High'
export type FRARiskConsequence = 'Slight Harm' | 'Moderate Harm' | 'Extreme Harm'
export type FRAOverallRisk = 'Tolerable' | 'Moderate' | 'Substantial' | 'Intolerable'

export type FRARiskFindings = {
  escape_routes_obstructed: boolean
  fire_exits_obstructed: boolean
  fire_doors_held_open: boolean
  fire_doors_blocked: boolean
  combustibles_in_escape_routes: boolean
  combustibles_poorly_stored: boolean
  fire_panel_access_obstructed: boolean
  fire_door_integrity_issues: boolean
  housekeeping_poor_back_of_house: boolean
  housekeeping_good: boolean
  training_completion_rate: number | null
  recent_fire_drill_within_6_months: boolean | null
  emergency_lighting_tests_current: boolean | null
  fire_alarm_tests_current: boolean | null
  extinguishers_serviced_current: boolean | null
}

export type FRARiskRatingResult = {
  likelihood: FRARiskLikelihood
  consequence: FRARiskConsequence
  overall: FRAOverallRisk
  rationale: string[]
}

export type FRAConsistencyNarratives = {
  escapeRoutesStatement: string
  fireDoorsStatement: string
  firePanelAccessStatement: string | null
  trainingStatement: string | null
  controlsOverallStatement: string
  stage3EscapeRoutesBullet: string
  stage3FireDoorsBullet: string
  evacuationStatement: string
}

export const FRA_RISK_MATRIX: Record<FRARiskLikelihood, Record<FRARiskConsequence, FRAOverallRisk>> = {
  Low: {
    'Slight Harm': 'Tolerable',
    'Moderate Harm': 'Tolerable',
    'Extreme Harm': 'Moderate',
  },
  Normal: {
    'Slight Harm': 'Tolerable',
    'Moderate Harm': 'Moderate',
    'Extreme Harm': 'Substantial',
  },
  High: {
    'Slight Harm': 'Moderate',
    'Moderate Harm': 'Substantial',
    'Extreme Harm': 'Intolerable',
  },
}

export const FRA_RISK_LIKELIHOOD_ORDER: FRARiskLikelihood[] = ['High', 'Normal', 'Low']
export const FRA_RISK_CONSEQUENCE_ORDER: FRARiskConsequence[] = ['Slight Harm', 'Moderate Harm', 'Extreme Harm']

function hasHighLikelihoodTriggers(findings: FRARiskFindings): boolean {
  return (
    findings.escape_routes_obstructed
    || findings.fire_exits_obstructed
    || findings.combustibles_in_escape_routes
    || findings.fire_doors_held_open
    || findings.fire_doors_blocked
  )
}

function hasExtremeConsequenceTriggers(findings: FRARiskFindings): boolean {
  const routeCompromise = findings.escape_routes_obstructed || findings.fire_exits_obstructed
  const fireDoorCompromise = findings.fire_doors_held_open || findings.fire_doors_blocked
  const criticalLifeSafetyFailures = [
    findings.fire_exits_obstructed, // unusable/compromised final exits
    findings.fire_alarm_tests_current === false, // detection/alarm assurance not current
    findings.emergency_lighting_tests_current === false, // escape lighting assurance not current
    findings.extinguishers_serviced_current === false, // first response equipment assurance not current
    findings.fire_door_integrity_issues, // compartmentation integrity concerns
    findings.fire_panel_access_obstructed, // delayed panel control access
  ].filter(Boolean).length

  // Extreme consequence should only apply where route/door compromise exists
  // alongside multiple additional life-safety critical failures.
  return routeCompromise && fireDoorCompromise && criticalLifeSafetyFailures >= 2
}

export function computeFRARiskRating(findings: FRARiskFindings): FRARiskRatingResult {
  const highLikelihoodTriggers = hasHighLikelihoodTriggers(findings)

  let likelihood: FRARiskLikelihood = 'Normal'
  if (highLikelihoodTriggers) {
    likelihood = 'High'
  } else if (findings.combustibles_poorly_stored || findings.housekeeping_poor_back_of_house) {
    likelihood = 'Normal'
  } else if (findings.housekeeping_good) {
    likelihood = 'Low'
  } else {
    likelihood = 'Normal'
  }

  let consequence: FRARiskConsequence = 'Slight Harm'
  if (hasExtremeConsequenceTriggers(findings)) {
    consequence = 'Extreme Harm'
  } else if (
    findings.escape_routes_obstructed
    || findings.fire_exits_obstructed
    || findings.fire_doors_held_open
    || findings.fire_doors_blocked
    || findings.combustibles_in_escape_routes
  ) {
    consequence = 'Moderate Harm'
  } else {
    consequence = 'Slight Harm'
  }

  const rationale: string[] = []
  const obstructedRoutesPhrase = findings.fire_exits_obstructed
    ? 'Escape routes and/or fire exits were obstructed at the time of assessment.'
    : 'Escape routes and/or back-of-house circulation routes were obstructed at the time of assessment.'

  if (findings.escape_routes_obstructed || findings.fire_exits_obstructed) {
    rationale.push(obstructedRoutesPhrase)
  }
  if (findings.fire_doors_held_open || findings.fire_doors_blocked) {
    rationale.push('Fire doors were found held open and/or physically obstructed, weakening compartmentation controls.')
  }
  if (findings.combustibles_in_escape_routes) {
    rationale.push('Combustible materials were present in escape routes, increasing evacuation difficulty and fire spread potential.')
  }
  if (findings.combustibles_poorly_stored || findings.housekeeping_poor_back_of_house) {
    rationale.push('Back-of-house housekeeping and combustible storage standards require improvement.')
  }
  if (findings.fire_panel_access_obstructed) {
    rationale.push('Access to the fire alarm panel was impeded and should be kept clear at all times.')
  }
  if (findings.fire_door_integrity_issues) {
    rationale.push('Fire door integrity issues were identified and require corrective maintenance.')
  }

  if (findings.fire_alarm_tests_current === false) {
    rationale.push('Weekly fire alarm testing was not confirmed as current.')
  }
  if (findings.emergency_lighting_tests_current === false) {
    rationale.push('Monthly emergency lighting testing was not confirmed as current.')
  }
  if (findings.extinguishers_serviced_current === false) {
    rationale.push('Fire extinguisher servicing status was not confirmed as current.')
  }
  if (findings.recent_fire_drill_within_6_months === false) {
    rationale.push('A compliant fire drill within the last six months was not evidenced.')
  }

  if (rationale.length === 0) {
    rationale.push('No material evacuation, compartmentation, or fire safety management deficiencies were identified in the available evidence.')
  }

  const overall = FRA_RISK_MATRIX[likelihood][consequence]
  return { likelihood, consequence, overall, rationale }
}

function humanizeList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

export function buildFRARiskSummary(
  findings: FRARiskFindings,
  result: FRARiskRatingResult
): string {
  const keyFactors: string[] = []
  if (findings.escape_routes_obstructed || findings.fire_exits_obstructed) {
    keyFactors.push(
      findings.fire_exits_obstructed
        ? 'obstructed escape routes/fire exits'
        : 'obstructed escape routes/back-of-house circulation routes'
    )
  }
  if (findings.fire_doors_held_open || findings.fire_doors_blocked) {
    keyFactors.push('fire doors held open/blocked')
  }
  if (findings.fire_door_integrity_issues && !(findings.fire_doors_held_open || findings.fire_doors_blocked)) {
    keyFactors.push('fire door integrity deficiencies')
  }
  if (findings.combustibles_in_escape_routes) {
    keyFactors.push('combustibles in escape routes')
  }
  if (findings.combustibles_poorly_stored || findings.housekeeping_poor_back_of_house) {
    keyFactors.push('poor stockroom housekeeping/combustible storage')
  }
  if (findings.fire_panel_access_obstructed) {
    keyFactors.push('restricted fire panel access')
  }

  const leadingStatement =
    keyFactors.length > 0
      ? `The combination of ${humanizeList(keyFactors)} supports this risk profile.`
      : 'No route obstruction, door-management, or combustible-route deficiencies were evidenced in the available audit text at the time of assessment.'

  const controlStatement =
    result.overall === 'Intolerable'
      ? 'Immediate corrective action is required to restore control of fire safety arrangements.'
      : result.overall === 'Substantial'
        ? 'Urgent management action is required to reduce risk to a tolerable level.'
        : result.overall === 'Moderate'
          ? 'Planned improvement actions are required to strengthen management controls.'
          : 'Existing controls are generally adequate, subject to routine monitoring and review.'

  return `${leadingStatement} Likelihood is assessed as ${result.likelihood}, consequence as ${result.consequence}, and overall fire risk as ${result.overall}. ${controlStatement}`
}

export function buildFRAConsistencyNarratives(
  findings: FRARiskFindings,
  overall: FRAOverallRisk
): FRAConsistencyNarratives {
  const routeCompromise = findings.escape_routes_obstructed || findings.fire_exits_obstructed
  const fireDoorCompromise = findings.fire_doors_held_open || findings.fire_doors_blocked
  const highTriggers = routeCompromise || fireDoorCompromise || findings.combustibles_in_escape_routes
  const obstructedRoutesScope = findings.fire_exits_obstructed
    ? 'Escape routes and/or fire exits'
    : 'Escape routes and/or back-of-house circulation routes'

  const escapeRoutesStatement = routeCompromise
    ? `${obstructedRoutesScope} were found obstructed during inspection. Immediate corrective action is required to remove obstructions and maintain compliant evacuation routes.`
    : 'Escape routes, including back-of-house circulation routes, were observed clear and unobstructed at the time of inspection and must remain so during deliveries, replenishment, and peak trade.'

  const fireDoorsStatement = fireDoorCompromise
    ? 'Fire doors were found held open and/or obstructed, which compromises smoke and fire containment. Fire doors should be kept closed and unobstructed unless released by compliant automatic devices.'
    : findings.fire_door_integrity_issues
      ? 'Fire door integrity issues were identified. Corrective maintenance is required to ensure compartmentation performance.'
      : 'Fire doors were generally in serviceable condition at the time of assessment and should remain closed and unobstructed in normal operation.'

  const firePanelAccessStatement = findings.fire_panel_access_obstructed
    ? 'Access to the fire alarm panel was impeded. This should be rectified to ensure immediate access during alarm activation, fault response, or emergency attendance.'
    : null

  const trainingStatement: string | null = null

  const controlsOverallStatement =
    (overall === 'Substantial' || overall === 'Intolerable' || highTriggers)
      ? 'Fire management controls are generally in place; however, material operational deficiencies require urgent corrective action and close management oversight to maintain compliance.'
      : overall === 'Moderate'
        ? 'Fire management controls are generally in place with improvement actions required to maintain consistent compliance standards.'
        : 'The fire management controls in the site are good with minor observations, and should continue to be monitored through routine checks and review.'

  const stage3EscapeRoutesBullet = routeCompromise
    ? 'Escape route management requires immediate improvement; obstructions were identified and must be removed and controlled.'
    : 'Escape routes and back-of-house circulation routes were observed clear and unobstructed and should continue to be monitored.'

  const stage3FireDoorsBullet = fireDoorCompromise
    ? 'Fire door management requires corrective action to prevent doors being held open or blocked.'
    : findings.fire_door_integrity_issues
      ? 'Fire door integrity maintenance actions are required to sustain compartmentation.'
      : 'Fire-resisting construction and internal fire doors remain in place to limit fire and smoke spread.'

  const evacuationStatement = routeCompromise
    ? 'All persons within the premises must evacuate immediately via the nearest available unobstructed route. Management must ensure route obstructions are removed and prevented before and during trading.'
    : 'All persons within the premises will be instructed to evacuate immediately via the nearest available fire exit upon activation of the fire alarm. Escape routes are clearly identified and lead to a place of relative safety.'

  return {
    escapeRoutesStatement,
    fireDoorsStatement,
    firePanelAccessStatement,
    trainingStatement,
    controlsOverallStatement,
    stage3EscapeRoutesBullet,
    stage3FireDoorsBullet,
    evacuationStatement,
  }
}
