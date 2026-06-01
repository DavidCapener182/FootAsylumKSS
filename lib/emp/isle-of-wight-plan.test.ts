import { describe, expect, it } from 'vitest'
import {
  EMP_ISLE_OF_WIGHT_EVENT_NAME,
  EMP_ISLE_OF_WIGHT_DEPLOYMENT_ROWS,
  EMP_ISLE_OF_WIGHT_PLAN_TITLE,
  EMP_ISLE_OF_WIGHT_PLAN_VALUES,
  EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES,
} from '@/lib/emp/isle-of-wight-plan'
import { EMP_DOWNLOAD_SELECTED_ANNEXES } from '@/lib/emp/download-plan'

describe('Isle of Wight EMP seed plan', () => {
  it('creates an Isle of Wight plan scope from the Download scaffold', () => {
    expect(EMP_ISLE_OF_WIGHT_EVENT_NAME).toBe('Isle of Wight Festival 2026')
    expect(EMP_ISLE_OF_WIGHT_PLAN_TITLE).toContain('Isle of Wight Festival 2026')
    expect(EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES).toEqual(
      EMP_DOWNLOAD_SELECTED_ANNEXES.filter((annexKey) => annexKey !== 'search_screening')
    )
    expect(EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES).not.toBe(EMP_DOWNLOAD_SELECTED_ANNEXES)
    expect(EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES).not.toContain('search_screening')
    expect(EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES).toContain('camping_security')
  })

  it('updates the core event identity from the supplied IWF source documents', () => {
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.event_name).toBe('Isle of Wight Festival 2026')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.document_status).toBe('V1')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.venue_name).toBe('Seaclose Park')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.venue_address).toBe(
      'Seaclose Park, Medina College playing fields and adjoining North Fairlee Farm fields, Newport, Isle of Wight'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.show_dates).toBe('18 June 2026 to 21 June 2026')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.licensed_capacity).toContain('89,999')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.expected_attendance).toContain('60,000')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.expected_attendance).toContain('55,000')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.expected_attendance).toContain('57,000')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.expected_attendance).toContain('3,000')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.service_delivery_scope).toContain('Pink Moon campsite security')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.service_delivery_scope).toContain('Event Control')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.related_documents).toContain('E06 Master - IOW26 Security Schedule V1')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.staff_and_contractor_count).toContain('469 KSS staff-shifts')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.staff_and_contractor_count).toContain('5,285.5 scheduled hours')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.staff_and_contractor_count).toContain('285 aggregated EMP deployment rows')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.staff_and_contractor_count).toContain('peaking at 112')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.named_command_roles).toContain(
      'Festival Silver (Days) - Matt Williams'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.named_command_roles).toContain(
      'Security Coordinator (Days) - Gerry Broadbent'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.named_command_roles).toContain(
      'KSS Deputy / Escalation Lead - Callum Keegan'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.named_command_roles).not.toContain(
      'KSS Deputy / Escalation Lead - David Capener'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.operational_hours).toContain(
      'Event Control source rota: runs from the evening before public opening through Monday close with day shifts 07:00-19:00'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.contact_directory).toContain(
      'Designated Premises Supervisor - Liam Whittaker'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.challenge_policy).toBe('Challenge 25')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.search_screening_roles).toContain(
      'No planned KSS search or screening role'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.camping_security_roles).toContain('KSS campsite scope is Pink Moon only')
  })

  it('includes the supplied KSS deployment schedule in the detailed Download table format', () => {
    const deploymentRows = EMP_ISLE_OF_WIGHT_PLAN_VALUES.staffing_by_zone_and_time.split('\n')

    const scheduledStaff = deploymentRows.reduce((total, row) => {
      const parts = row.split('|')
      return total + Number(parts[6] || 0) + Number(parts[10] || 0)
    }, 0)

    expect(EMP_ISLE_OF_WIGHT_DEPLOYMENT_ROWS).toHaveLength(285)
    expect(scheduledStaff).toBe(469)
    expect(deploymentRows).toEqual(EMP_ISLE_OF_WIGHT_DEPLOYMENT_ROWS)
    expect(deploymentRows.every((row) => row.split('|').length === 14)).toBe(true)
    expect(deploymentRows).toContain(
      'Saturday 13 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA - NIGHT|||||1|19:00|07:00|12.00'
    )
    expect(deploymentRows).toContain(
      'Thursday 18 June|BAR DEPLOYMENTS|BARS MANAGEMENT|||SUPERVISOR|2|08:00|20:00|12.00||||'
    )
    expect(deploymentRows).toContain(
      'Friday 19 June|BAR DEPLOYMENTS|BAR 1 - STAGE RIGHT - FOH||HDT|SIA|5|14:00|00:00|10.00||||'
    )
    expect(deploymentRows).toContain(
      'Saturday 20 June|OTHER DEPLOYMENTS|PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE||AEGAUS|SIA|2|08:00|20:00|12.00||||'
    )
    expect(deploymentRows).toContain(
      'Monday 22 June|OTHER DEPLOYMENTS|COOP - STORE GUARD||EAGLE|SIA|1|07:00|13:00|6.00||||'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.staffing_by_zone_and_time).not.toContain(
      'Deployment source pending'
    )
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.staffing_by_zone_and_time).not.toContain(
      'SPONSORS (RECHARGE)'
    )
  })

  it('removes obvious Download and Donington identifiers from the draft text', () => {
    const planText = Object.values(EMP_ISLE_OF_WIGHT_PLAN_VALUES).join('\n')

    expect(planText).not.toContain('Download')
    expect(planText).not.toContain('DLF26')
    expect(planText).not.toContain('Donington')
    expect(planText).not.toContain('Leicestershire Police')
    expect(planText).not.toContain('Pit Lane Suites')
    expect(planText).not.toContain('Accessible Campsite A4')
    expect(planText).not.toContain('Accessible Campsite D')
    expect(planText).not.toContain('accessibility campsite search')
    expect(planText).not.toContain('Co-Op shop')
    expect(planText).not.toContain('Co-op shop')
    expect(planText).not.toContain('Paddock')
    expect(planText).not.toContain('District X')
    expect(planText).not.toContain('Search and Screening annex')
  })

  it('defines RAMP areas as static and dynamic gathering spaces', () => {
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.ramp_arrival).toContain('Static and dynamic gathering spaces')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('arrival')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.ramp_arrival.toLowerCase()).not.toContain('pressure')
    expect(EMP_ISLE_OF_WIGHT_PLAN_VALUES.ramp_movement.toLowerCase()).not.toContain('pressure')
  })
})
