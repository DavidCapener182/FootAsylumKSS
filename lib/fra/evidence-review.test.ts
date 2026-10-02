import { describe, expect, it } from 'vitest'
import { applyFRAEvidenceReview } from './evidence-review'
describe('reviewed PDF evidence', () => {
  it('does not turn missing certification into an L1 or compliant travel-distance claim', () => {
    const result = applyFRAEvidenceReview({ fireAlarmDescription: 'Grade A Category L1', emergencyLightingDescription: 'observed operational', internalFireDoors: 'appropriate fire resistance', historyOfFires: 'No incidents' }, null, true)
    expect(result.fireAlarmDescription).not.toContain('L1')
    expect(result.emergencyLightingDescription).not.toContain('observed operational')
    expect(result.internalFireDoors).not.toContain('appropriate fire resistance')
    expect(result.historyOfFires).toContain('No fire-incident history is provided')
    expect(result.travelDistancesEvidence).toContain('not measured')
  })
  it('preserves the June observations, service dates and sprinkler presence', () => {
    const result = applyFRAEvidenceReview({ hasSprinklers: false, fireAlarmDescription: 'default', fireAlarmMaintenance: 'six monthly', internalFireDoors: 'default' }, { hasSprinklers: true, alarmSystemDescription: 'Alarm present; category unconfirmed', weeklyFireTests: 'Yes answer cites 20 January 2026', fireDoorsCondition: 'Doors replaced by June and close properly' }, true)
    expect(result.hasSprinklers).toBe(true)
    expect(result.fireAlarmDescription).toBe('Alarm present; category unconfirmed')
    expect(result.fireAlarmMaintenance).toContain('20 January 2026')
    expect(result.internalFireDoors).toContain('replaced by June')
  })
})
