import { getStoreActionQuestion } from '@/lib/store-action-titles'

// Report groupings use the flagged check itself, so unrelated findings never
// disappear inside a generic "control gaps" bucket. This does not change task severity.
const groups = [
  { key: 'fire', topic: 'Fire precautions and escape routes', match: /fire|combustible|sprinkler|emergency lighting|call points|ceiling tiles/i, prompt: 'Review each listed fire-safety finding with the store, arrange the required correction or maintenance, and record evidence against the action.' },
  { key: 'electrical', topic: 'Electrical equipment and inspection', match: /electrical|\bPAT\b|plugs|extension leads/i, prompt: 'Check the specific electrical finding, arrange competent inspection or correction where needed, and retain the supporting record.' },
  { key: 'height', topic: 'Ladders and work at height', match: /ladder|working at height|work at height/i, prompt: 'Confirm equipment condition, identification and recorded checks for the findings below; arrange correction and evidence completion.' },
  { key: 'handling', topic: 'Manual handling and safe storage', match: /manual handling|goods stored/i, prompt: 'Review the flagged handling or storage arrangement with the store team and record the corrective change.' },
  { key: 'training', topic: 'Induction and refresher training', match: /training|induction|onboarding|toolbox/i, prompt: 'Identify the missing training or records for each affected store, complete the required follow-up and retain evidence.' },
  { key: 'housekeeping', topic: 'Stockrooms, housekeeping and premises', match: /stock rooms|stockrooms|goods in areas|floor surfaces|slips|trips|clean|premises|fixtures|customer areas/i, prompt: 'Address the specific premises or housekeeping finding and confirm the area is safe, with evidence recorded on the action.' },
  { key: 'chemicals', topic: 'Chemicals and COSHH records', match: /chemical|COSHH/i, prompt: 'Check the listed chemical control or record gap and provide the required correction and supporting documentation.' },
  { key: 'contractors', topic: 'Contractor and visitor controls', match: /contractor|visitor|permit to work/i, prompt: 'Resolve the identified signing-in or contractor-control gap and confirm the process is being followed.' },
  { key: 'policy', topic: 'Policy and risk assessment records', match: /policy|risk assessment|young persons|expectant mothers/i, prompt: 'Review the missing or incomplete document, update it as required and confirm availability to the store team.' },
  { key: 'first-aid', topic: 'First aid and incident records', match: /first aid|accident|incident/i, prompt: 'Resolve the specific first-aid provision or incident-record finding and retain evidence of completion.' },
]

export function reportActionFocus(action: { title: string | null; source_flagged_item: string | null }) {
  const question = getStoreActionQuestion(action) || action.title || action.source_flagged_item || 'Review recorded audit finding'
  // Training questions can name fire safety or ladders; keep the full training check together.
  const group = /training|induction|onboarding|toolbox/i.test(question)
    ? groups.find((item) => item.key === 'training')
    : groups.find((item) => item.match.test(question))
  return {
    key: group?.key || question,
    topic: group?.topic || question,
    managerPrompt: group?.prompt || 'Review this specific flagged check, agree the corrective action with the store and record evidence of completion.',
    question,
    order: group ? groups.indexOf(group) : groups.length,
  }
}

// Corrective wording is derived from the failed check, not a new deadline or severity.
const corrections: Array<[RegExp, string]> = [
  [/first aid boxes/i, 'Replenish the first-aid boxes and confirm that staff know where they are.'],
  [/extinguishers clear/i, 'Clear access to the fire extinguishers and keep them accessible.'],
  [/call points clear/i, 'Clear access to the call points and keep them accessible.'],
  [/ladders clearly numbered/i, 'Number the ladders so each can be identified in the inspection records.'],
  [/chemicals stored/i, 'Correct the chemical storage issues identified in the audit.'],
  [/contractors managed/i, 'Put the missing contractor sign-in/out and permit controls in place.'],
  [/intumescent strips/i, 'Arrange correction of the missing or damaged fire-door intumescent strips.'],
  [/fixtures and fittings/i, 'Make safe and repair the fixtures or fittings identified in the audit.'],
  [/goods stored/i, 'Reorganise the identified stock so it can be handled safely.'],
  [/plugs and extension/i, 'Correct the plug and extension-lead arrangements identified in the audit, including any overloading.'],
  [/welfare facilities/i, 'Resolve the welfare-facility cleanliness or water provision issues recorded in the audit.'],
  [/demonstrate their knowledge/i, 'Brief the team on the relevant risk assessment and confirm their understanding.'],
  [/combustible materials/i, 'Correct the storage of combustible materials identified in the audit.'],
  [/monthly emergency lighting/i, 'Complete and record the missing monthly emergency-lighting test.'],
  [/emergency lighting maintenance/i, 'Arrange the outstanding emergency-lighting maintenance or obtain the missing maintenance record.'],
  [/FRA available/i, 'Make the FRA available and address, evidence and sign off its outstanding actions.'],
  [/fire alarm maintenance/i, 'Arrange the outstanding fire-alarm maintenance or obtain the missing maintenance record.'],
  [/fire extinguisher service/i, 'Arrange the outstanding extinguisher service or obtain the missing service record.'],
  [/fire doors closed/i, 'Stop fire doors being held open and ensure they close as intended.'],
  [/fire doors in a good condition/i, 'Arrange repair of the fire-door defects recorded in the audit.'],
  [/fire drill/i, 'Complete the outstanding fire drill and retain the record on site.'],
  [/fire exit routes/i, 'Remove the obstructions from fire-exit routes and keep the routes clear.'],
  [/fixed electrical wiring/i, 'Resolve the fixed-wiring inspection or documentation gap identified in the audit.'],
  [/goods in areas/i, 'Remove the hazards identified in the goods-in area.'],
  [/induction training/i, 'Complete the outstanding H&S inductions and bring the onboarding records up to date.'],
  [/toolbox refresher/i, 'Complete the outstanding manual-handling, housekeeping, fire-safety and stepladder refresher training and update the records.'],
  [/statement been signed/i, 'Arrange review and signature of the H&S policy statement and retain the current version.'],
  [/lighting in a good condition/i, 'Repair or replace the lighting identified as defective or inadequate in the audit.'],
  [/manual handling being/i, 'Correct the unsafe handling practices identified in the audit and display the required guidance.'],
  [/panel free of faults/i, 'Confirm the recorded panel finding and arrange correction of any verified fault.'],
  [/statement on display/i, 'Display the current H&S policy statement.'],
  [/policy available on site/i, 'Make the current H&S policy available on site.'],
  [/other significant risks/i, 'Address the specific additional risks described in the original audit finding.'],
  [/delivery management/i, 'Correct the delivery-management arrangements and retain evidence of the controls in use.'],
  [/ladder checks/i, 'Complete the ladder checks and record them in the weekly H&S checks.'],
  [/^Lift\?/i, 'Resolve the lift inspection, maintenance or documentation gap recorded in the audit.'],
  [/^PAT\?/i, 'Resolve the portable-appliance testing or documentation gap recorded in the audit.'],
  [/sprinkler system/i, 'Resolve the sprinkler-system maintenance or documentation gap recorded in the audit.'],
  [/stock rooms/i, 'Remove the hazards identified in the clothing and shoe stockrooms and restore safe access and storage.'],
  [/structure found/i, 'Arrange repair of the structural defects identified as compromising fire safety.'],
  [/working at height/i, 'Correct the ladder or work-at-height practices identified in the audit.'],
  [/young persons/i, 'Complete or update the young-person risk assessment identified as missing or incomplete.'],
]

export function correctiveActionForCheck(question: string): string {
  return corrections.find(([pattern]) => pattern.test(question))?.[1]
    || 'Address the failure described in the original audit finding and record evidence of the correction.'
}
