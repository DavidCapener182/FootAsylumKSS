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
