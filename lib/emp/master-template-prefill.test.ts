import { describe, expect, it } from 'vitest'
import {
  applyDeploymentMatrixSourcePageOverrides,
  buildDeploymentMatrixSourcePageOverrides,
  buildEmpMasterTemplatePrefillFromFieldValues,
  buildSupervisorDeploymentTablePagesFromDeploymentCells,
  buildSupervisorDeploymentTablePagesFromDeploymentMatrixOverrides,
  extractEmpTemplateIsoDates,
  extractFirstEmpTemplateIsoDate,
  normalizeStaffSignInTablePages,
  syncDeploymentMatrixEventPagesFromSourcePages,
} from '@/lib/emp/master-template-prefill'
import { EMP_DOWNLOAD_PLAN_TITLE } from '@/lib/emp/download-plan'
import { EMP_ISLE_OF_WIGHT_PLAN_VALUES } from '@/lib/emp/isle-of-wight-plan'
import { EMP_PARKLIFE_PLAN_TITLE } from '@/lib/emp/parklife-plan'

describe('emp master template prefill', () => {
  it('extracts the first usable event date from common EMP date formats', () => {
    expect(extractFirstEmpTemplateIsoDate('22 May 2026 to 24 May 2026')).toBe('2026-05-22')
    expect(extractFirstEmpTemplateIsoDate('22-24 May 2026')).toBe('2026-05-22')
    expect(extractFirstEmpTemplateIsoDate('22/05/2026')).toBe('2026-05-22')
    expect(extractFirstEmpTemplateIsoDate('2026-05-22')).toBe('2026-05-22')
    expect(extractEmpTemplateIsoDates('22 May 2026 to 24 May 2026')).toEqual([
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
    ])
  })

  it('builds BBC Radio One document prefill values from plan fields', () => {
    const prefill = buildEmpMasterTemplatePrefillFromFieldValues({
      event_name: "BBC Radio 1's Big Weekend Sunderland 2026",
      show_dates: '22 May 2026 to 24 May 2026',
      venue_name: 'Herrington Country Park',
      venue_address: 'Herrington Country Park, Sunderland, DH4 7EL',
      venue_reference: 'R1BW26 site',
      issue_date: '2026-05-06',
      review_date: '2026-05-20',
      event_type: 'Music festival',
      expected_attendance: '39,999',
      audience_age_profile: 'BBC Radio 1 target demographic, with Friday and VIP 18+.',
      key_zones: 'Bars and licensed service areas',
      peak_periods: 'Public opening, headline changeovers, final bar service.',
      historic_issues: 'High-volume queues and welfare demand around headline periods.',
      named_command_roles:
        'KSS Operational Lead - Floyd Allen - Overall KSS operational lead\nKSS Event Control / Logger - David Capener - KSS log and close-down status',
      staffing_by_zone_and_time:
        'D1 Fri 22 May 13:00-21:45 - Management - Manager x1\nResponse - Supervisor x1; SIA support x4 - D1 Fri 22 May 13:00-21:45\nBar 1 - Supervisor x1; SIA x5; Steward x2 - D1 Fri 22 May 13:00-21:45',
    }, {
      riskAssessmentRows: [
        {
          hazard: 'High-volume queuing and congestion',
          personsAffected: 'Public, bar staff, KSS staff',
          controlMeasures: 'Queue lanes, supervisors, escalation triggers and Event Control logging.',
          rating: 'Medium (Amber)',
        },
      ],
    })

    expect(prefill.eventName).toBe("BBC Radio 1's Big Weekend Sunderland 2026")
    expect(prefill.eventDate).toBe('2026-05-22')
    expect(prefill.templateFieldValues['staff-sign-in-sign-out-sheet']).toMatchObject({
      'Event Name / Code': "BBC Radio 1's Big Weekend Sunderland 2026",
      'Location / Venue': 'Herrington Country Park, Sunderland, DH4 7EL',
    })
    expect(prefill.templateTablePageValues?.['staff-sign-in-sign-out-sheet']).toHaveLength(15)
    expect(prefill.templateTablePageValues?.['staff-sign-in-sign-out-sheet']?.[0]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
        Company: 'KSS',
      },
      tableCells: {
        '0:staff_name': 'Floyd Allen',
        '0:sia_badge_number': '1017 7734 6945 7253',
        '0:expiry_date': '20/01/2028',
      },
    })
    expect(prefill.templateTablePageValues?.['staff-sign-in-sign-out-sheet']?.[4]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
        Company: 'HDT (continued)',
      },
    })
    expect(prefill.templateTablePageValues?.['staff-sign-in-sign-out-sheet']?.[5]).toMatchObject({
      fields: {
        Date: 'Saturday 23/05/2026',
        Company: 'KSS',
      },
    })
    expect(prefill.templateTablePageValues?.['uniform-ppe-allocation-log']).toHaveLength(6)
    expect(prefill.templateTablePageValues?.['uniform-ppe-allocation-log']?.[0]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
      },
      tableCells: {},
    })
    expect(prefill.templateTablePageValues?.['uniform-ppe-allocation-log']?.[0].fields).not.toHaveProperty('Company')
    expect(prefill.templateFieldValues['uniform-ppe-allocation-log']).not.toHaveProperty('Sheet Managed By')
    expect(prefill.templateTablePageValues?.['radio-kit-sign-out-sheet']).toHaveLength(6)
    expect(prefill.templateTablePageValues?.['radio-kit-sign-out-sheet']?.[2]).toMatchObject({
      fields: {
        Date: 'Saturday 23/05/2026',
      },
      tableCells: {},
    })
    expect(prefill.templateTablePageValues?.['radio-kit-sign-out-sheet']?.[2].fields).not.toHaveProperty('Company')
    expect(prefill.templateFieldValues['radio-kit-sign-out-sheet']).not.toHaveProperty('Comms Manager')
    expect(prefill.templateFieldValues['incident-accident-form']).toMatchObject({
      'Exact Location / Zone': 'Herrington Country Park, Sunderland, DH4 7EL',
    })
    expect(prefill.templateFieldValues['incident-accident-form']).not.toHaveProperty('Reported By (Staff)')
    expect(prefill.templateFieldValues['incident-accident-form']).not.toHaveProperty('Date of Incident')
    expect(prefill.templateFieldValues['refusal-of-entry-ejection-log']).toMatchObject({
      'Gate / Zone': 'Herrington Country Park, Sunderland, DH4 7EL',
    })
    expect(prefill.templateFieldValues['refusal-of-entry-ejection-log']).not.toHaveProperty('Supervisor')
    expect(prefill.templateFieldValues['suspicious-item-concern-report']).toMatchObject({
      'Exact Location': 'Herrington Country Park, Sunderland, DH4 7EL',
    })
    expect(prefill.templateFieldValues['suspicious-item-concern-report']).not.toHaveProperty('Reported By')
    expect(prefill.templateFieldValues['suspicious-item-concern-report']).not.toHaveProperty('Date / Time')
    expect(prefill.templateFieldValues['daily-security-brief']).toMatchObject({
      'Event Name & Date': "BBC Radio 1's Big Weekend Sunderland 2026",
      '3. Site Updates, Hot Spots & Queue Peak Times': expect.stringContaining('Bars and licensed service areas'),
    })
    expect(prefill.templateFieldValues['daily-security-brief']).not.toHaveProperty('Duty Security Manager')
    expect(prefill.templateFieldValues['duty-manager-debrief']).toMatchObject({
      'Event Name & Date': "BBC Radio 1's Big Weekend Sunderland 2026",
    })
    expect(prefill.templateFieldValues['duty-manager-debrief']).not.toHaveProperty('Completed By')
    expect(prefill.templateFieldValues['security-risk-assessment']).toMatchObject({
      'Assessor Name': 'David Capener',
    })
    expect(prefill.templateFieldValues['emergency-action-plan-cover']).toMatchObject({
      'Security Lead': 'Floyd Allen',
    })
    expect(prefill.templateFieldValues['emergency-action-plan-cover']).not.toHaveProperty('Emergency RV Point (RVP)')
    expect(prefill.templateTableCellValues['contact-and-cascade-list']).toMatchObject({
      '0:role': 'KSS Operational Lead',
      '0:name': 'Floyd Allen',
      '0:mobile': '07572845670',
      '1:role': 'KSS Event Control / Logger',
      '1:name': 'David Capener',
      '1:mobile': '07927885481',
    })
    expect(prefill.templateTableCellValues['deployment-matrix']).toMatchObject({
      '0:zone': 'Management',
      '0:position': 'Manager',
      '0:start': '13:00',
      '0:end': '21:45',
      '1:zone': 'Response',
      '1:position': 'Supervisor',
      '2:zone': 'Response',
      '2:position': 'SIA support',
      '6:zone': 'Bar 1',
      '6:position': 'Supervisor',
      '7:zone': 'Bar 1',
      '7:position': 'SIA',
      '11:zone': 'Bar 1',
      '11:position': 'SIA',
      '12:zone': 'Bar 1',
      '12:position': 'Steward',
      '13:zone': 'Bar 1',
      '13:position': 'Steward',
    })
    expect(prefill.templateFieldValues['deployment-matrix']).toMatchObject({
      'Prepared By': 'David Capener',
    })
    expect(Object.keys(prefill.templateTableCellValues['deployment-matrix'])).not.toContain('0:notes')
    expect(Object.keys(prefill.templateTableCellValues['deployment-matrix'])).not.toContain('0:required')
    expect(prefill.templateTablePageValues?.['deployment-matrix']).toHaveLength(3)
    expect(prefill.templateTablePageValues?.['deployment-matrix']?.[0]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
        'Prepared By': 'David Capener',
      },
      tableCells: {
        '0:zone': 'Management',
        '0:position': 'Manager',
        '13:zone': 'Bar 1',
        '13:position': 'Steward',
      },
    })
    expect(prefill.templateTablePageValues?.['deployment-matrix']?.[2]).toMatchObject({
      fields: {
        Date: 'Sunday 24/05/2026',
      },
    })
    expect(prefill.templateTablePageValues?.['supervisor-deployment']).toHaveLength(6)
    expect(prefill.templateTablePageValues?.['supervisor-deployment']?.[0]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
        'Supervisor / Zone': 'Response Supervisor',
        'Prepared By': 'David Capener',
      },
      tableCells: {
        '0:position': 'Supervisor',
        '1:position': 'SIA support',
        '2:position': 'SIA support',
        '4:position': 'SIA support',
      },
    })
    expect(prefill.templateTablePageValues?.['supervisor-deployment']?.[1]).toMatchObject({
      fields: {
        'Supervisor / Zone': 'Bar 1 Supervisor',
      },
      tableCells: {
        '0:position': 'Supervisor',
        '1:position': 'SIA',
        '5:position': 'SIA',
        '6:position': 'Steward',
        '7:position': 'Steward',
      },
    })
    expect(prefill.templateTablePageValues?.['supervisor-deployment']?.[2]).toMatchObject({
      fields: {
        Date: 'Saturday 23/05/2026',
        'Supervisor / Zone': 'Response Supervisor',
      },
    })
    expect(prefill.templateTablePageValues?.['supervisor-deployment']?.[4]).toMatchObject({
      fields: {
        Date: 'Sunday 24/05/2026',
        'Supervisor / Zone': 'Response Supervisor',
      },
    })
    expect(prefill.templateTableCellValues['security-risk-assessment']).toMatchObject({
      '0:hazard': 'High-volume queuing and congestion',
      '0:who': 'Public, bar staff, KSS staff',
      '0:controls': 'Queue lanes, supervisors, escalation triggers and Event Control logging.',
      '0:risk': 'Medium (Amber)',
      '0:action_required': 'Monitor live conditions and escalate if triggers are reached.',
    })
  })

  it('builds Download Festival sign-in pages from the contractor PNC sheet data', () => {
    const prefill = buildEmpMasterTemplatePrefillFromFieldValues({
      event_name: 'Download Festival 2026',
      show_dates: '10 June 2026 to 15 June 2026',
      venue_name: 'Donington Park',
      venue_address: 'Donington Park, Castle Donington, Derby, DE74 2RP',
      issue_date: '2026-05-07',
    }, {
      planTitle: EMP_DOWNLOAD_PLAN_TITLE,
    })

    const staffPages = prefill.templateTablePageValues?.['staff-sign-in-sign-out-sheet'] || []

    expect(staffPages).toHaveLength(84)
    expect(staffPages[0]).toMatchObject({
      fields: {
        'Event Name / Code': 'Download Festival 2026',
        Date: 'Wednesday 10/06/2026',
        'Location / Venue': 'Donington Park, Castle Donington, Derby, DE74 2RP',
        Company: 'KSS',
      },
      tableCells: {
        '0:staff_name': 'Jack Longthorne',
        '1:staff_name': 'Floyd Allen',
        '1:sia_badge_number': '1017 7734 6945 7253',
        '1:expiry_date': '20/01/2028',
      },
    })
    expect(staffPages[5]).toMatchObject({
      fields: {
        Date: 'Wednesday 10/06/2026',
        Company: 'PNC',
      },
      tableCells: {
        '0:staff_name': 'Sanchez Tyrone Webb',
        '0:sia_badge_number': '1014 0860 3643 6606',
      },
    })
    expect(staffPages[2]).toMatchObject({
      fields: {
        Date: 'Wednesday 10/06/2026',
        Company: 'AEGEUS (continued)',
      },
      tableCells: {
        '5:staff_name': 'Martin Foster',
        '5:sia_badge_number': 'STEWARD',
        '5:expiry_date': 'N/A',
      },
    })
    expect(staffPages[13]).toMatchObject({
      fields: {
        Date: 'Wednesday 10/06/2026',
        Company: 'HDT (continued)',
      },
      tableCells: {
        '9:staff_name': 'Robert Harris',
        '9:sia_badge_number': 'STEWARD',
        '9:expiry_date': 'N/A',
      },
    })
    expect(JSON.stringify(staffPages)).not.toMatch(/waiting/i)
    expect(staffPages[14]).toMatchObject({
      fields: {
        Date: 'Thursday 11/06/2026',
        Company: 'KSS',
      },
    })
    expect(prefill.templateTablePageValues?.['uniform-ppe-allocation-log']).toHaveLength(12)
    expect(prefill.templateTablePageValues?.['radio-kit-sign-out-sheet']).toHaveLength(12)
  })

  it('builds Parklife sign-in pages from the supplied PNC sheet data', () => {
    const prefill = buildEmpMasterTemplatePrefillFromFieldValues({
      event_name: 'Parklife Festival 2026',
      show_dates: '20 June 2026 to 21 June 2026',
      venue_name: 'Heaton Park',
      venue_address: 'Heaton Park, Middleton Road, Manchester, M25 2SW',
      issue_date: '2026-06-03',
    }, {
      planTitle: EMP_PARKLIFE_PLAN_TITLE,
    })

    const staffPages = prefill.templateTablePageValues?.['staff-sign-in-sign-out-sheet'] || []

    expect(staffPages).toHaveLength(14)
    expect(staffPages[0]).toMatchObject({
      fields: {
        'Event Name / Code': 'Parklife Festival 2026',
        Date: 'Saturday 20/06/2026',
        'Location / Venue': 'Heaton Park, Middleton Road, Manchester, M25 2SW',
        Company: 'KSS',
      },
      tableCells: {
        '0:staff_name': 'Jack Longthorne',
        '1:staff_name': 'David Capener',
        '1:sia_badge_number': '1014 8888 7483 7254',
        '1:expiry_date': '26/02/2029',
        '2:staff_name': 'Laura Parker',
      },
    })
    expect(staffPages[1]).toMatchObject({
      fields: {
        Date: 'Saturday 20/06/2026',
        Company: 'STRAZA',
      },
      tableCells: {
        '0:staff_name': 'Abdur Rehman',
        '0:sia_badge_number': '1014 7982 6493 8600',
      },
    })
    expect(staffPages[3]).toMatchObject({
      fields: {
        Date: 'Saturday 20/06/2026',
        Company: 'GUARD-EX',
      },
      tableCells: {
        '11:staff_name': 'Allston Andrew',
        '11:sia_badge_number': 'ST',
        '11:expiry_date': 'N/A',
      },
    })
    expect(staffPages[6]).toMatchObject({
      fields: {
        Date: 'Saturday 20/06/2026',
        Company: 'CJL (continued)',
      },
      tableCells: {
        '0:staff_name': 'Paolo Osei',
        '1:staff_name': 'Luis Felton',
        '1:sia_badge_number': 'ST',
        '1:expiry_date': 'N/A',
      },
    })
    expect(staffPages[7]).toMatchObject({
      fields: {
        Date: 'Sunday 21/06/2026',
        Company: 'KSS',
      },
    })
    expect(prefill.templateTablePageValues?.['uniform-ppe-allocation-log']).toHaveLength(4)
    expect(prefill.templateTablePageValues?.['radio-kit-sign-out-sheet']).toHaveLength(4)
  })

  it('normalizes stale waiting licence values on staff sign-in table pages', () => {
    const pages = normalizeStaffSignInTablePages([
      {
        fields: { Company: 'AEGEUS' },
        tableCells: {
          '0:staff_name': 'Martin Foster',
          '0:sia_badge_number': 'WAITING FOR LICENCE APPROVAL',
          '0:expiry_date': 'WAITING FOR LICENCE APPROVAL',
          '1:staff_name': 'Robert Harris',
          '1:sia_badge_number': 'WAITING FOR RENEWAL',
          '1:expiry_date': 'N/A',
        },
      },
    ])

    expect(pages[0].tableCells).toMatchObject({
      '0:staff_name': 'Martin Foster',
      '0:sia_badge_number': 'STEWARD',
      '0:expiry_date': 'N/A',
      '1:staff_name': 'Robert Harris',
      '1:sia_badge_number': 'STEWARD',
      '1:expiry_date': 'N/A',
    })
    expect(JSON.stringify(pages)).not.toMatch(/waiting/i)
  })

  it('rebuilds supervisor deployment pages from deployment matrix assignments', () => {
    const pages = buildSupervisorDeploymentTablePagesFromDeploymentCells({
      '0:zone': 'Response',
      '0:position': 'Supervisor',
      '0:assigned': 'Floyd Allen',
      '0:start': '13:00',
      '0:end': '21:45',
      '1:zone': 'Response',
      '1:position': 'SIA support',
      '1:assigned': 'David Capener',
      '1:start': '13:00',
      '1:end': '21:45',
      '2:zone': 'Bar 1',
      '2:position': 'Supervisor',
      '2:assigned': 'Nigel Train',
      '2:start': '13:00',
      '2:end': '21:45',
      '3:zone': 'Bar 1',
      '3:position': 'Steward',
      '3:assigned': 'Callum Keegan',
      '3:start': '13:00',
      '3:end': '21:45',
    }, {
      eventName: "BBC Radio 1's Big Weekend Sunderland 2026",
      eventDate: '2026-05-22',
    })

    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({
      fields: {
        'Supervisor / Zone': 'Response Supervisor',
        'Prepared By': 'David Capener',
      },
      tableCells: {
        '0:position': 'Supervisor',
        '0:assigned': 'Floyd Allen',
        '1:position': 'SIA support',
        '1:assigned': 'David Capener',
      },
    })
    expect(pages[1]).toMatchObject({
      fields: {
        'Supervisor / Zone': 'Bar 1 Supervisor',
      },
      tableCells: {
        '0:assigned': 'Nigel Train',
        '1:assigned': 'Callum Keegan',
      },
    })
  })

  it('repeats the full BBC Radio One deployment matrix across all event days', () => {
    const prefill = buildEmpMasterTemplatePrefillFromFieldValues({
      event_name: "BBC Radio 1's Big Weekend Sunderland 2026",
      show_dates: '22 May 2026 to 24 May 2026',
      venue_address: 'Herrington Country Park, Sunderland, DH4 7EL',
      staffing_by_zone_and_time:
        'Management - Manager x1 - Friday 13:00-21:45\n'
        + 'Event Control - Logger x1 - Friday 13:00-21:45\n'
        + 'Response - Supervisor x1; SIA support x4 - Friday 13:00-21:45\n'
        + 'Bar 1 - Supervisor x1; SIA x5; Steward x2 - Friday 13:00-21:45\n'
        + 'Bar 2 - Supervisor x1; SIA x5; Steward x2 - Friday 13:00-21:45\n'
        + 'Bar 3 - Supervisor x1; SIA x5; Steward x2 - Friday 13:00-21:45\n'
        + 'Bar 4 - Supervisor x1; SIA x5; Steward x2 - Friday 13:00-21:45\n'
        + 'Bar 5 - SIA x1 - Friday 13:00-21:45\n'
        + 'Bar 6 Guest - SIA x1 - Friday 13:00-21:45',
    })

    const pages = prefill.templateTablePageValues?.['deployment-matrix'] || []
    expect(pages).toHaveLength(6)
    expect(pages[0]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
      },
      tableCells: {
        '0:zone': 'Management',
        '22:zone': 'Bar 2',
        '22:position': 'Steward',
      },
    })
    expect(pages[1]).toMatchObject({
      fields: {
        Date: 'Friday 22/05/2026',
      },
      tableCells: {
        '0:zone': 'Bar 3',
        '0:position': 'Supervisor',
        '16:zone': 'Bar 5',
        '16:position': 'SIA',
        '17:zone': 'Bar 6 Guest',
        '17:position': 'SIA',
      },
    })
    expect(pages[5]).toMatchObject({
      fields: {
        Date: 'Sunday 24/05/2026',
      },
      tableCells: {
        '17:zone': 'Bar 6 Guest',
        '17:position': 'SIA',
      },
    })
  })

  it('syncs deployment matrix first-day page edits across matching event days', () => {
    const pages = syncDeploymentMatrixEventPagesFromSourcePages([
      {
        fields: { Date: 'Friday 22/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
          '0:assigned': 'Floyd Allen',
          '0:supervisor': 'Floyd Allen',
        },
      },
      {
        fields: { Date: 'Friday 22/05/2026' },
        tableCells: {
          '0:zone': 'Bar 3',
          '0:position': 'Supervisor',
          '0:assigned': 'Nigel Train',
          '0:supervisor': 'Nigel Train',
        },
      },
      {
        fields: { Date: 'Saturday 23/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
          '0:assigned': 'Old Saturday Response',
          '0:supervisor': 'Old Saturday Response',
        },
      },
      {
        fields: { Date: 'Saturday 23/05/2026' },
        tableCells: {
          '0:zone': 'Bar 3',
          '0:position': 'Supervisor',
          '0:assigned': 'Old Saturday Bar',
          '0:supervisor': 'Old Saturday Bar',
        },
      },
      {
        fields: { Date: 'Sunday 24/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
        },
      },
      {
        fields: { Date: 'Sunday 24/05/2026' },
        tableCells: {
          '0:zone': 'Bar 3',
          '0:position': 'Supervisor',
        },
      },
    ])

    expect(pages[2]).toMatchObject({
      fields: { Date: 'Saturday 23/05/2026' },
      tableCells: {
        '0:assigned': 'Floyd Allen',
        '0:supervisor': 'Floyd Allen',
      },
    })
    expect(pages[3]).toMatchObject({
      fields: { Date: 'Saturday 23/05/2026' },
      tableCells: {
        '0:assigned': 'Nigel Train',
        '0:supervisor': 'Nigel Train',
      },
    })
    expect(pages[4]).toMatchObject({
      fields: { Date: 'Sunday 24/05/2026' },
      tableCells: {
        '0:assigned': 'Floyd Allen',
        '0:supervisor': 'Floyd Allen',
      },
    })
    expect(pages[5]).toMatchObject({
      fields: { Date: 'Sunday 24/05/2026' },
      tableCells: {
        '0:assigned': 'Nigel Train',
        '0:supervisor': 'Nigel Train',
      },
    })
  })

  it('builds Isle of Wight deployment matrix pages from the detailed schedule rows', () => {
    const prefill = buildEmpMasterTemplatePrefillFromFieldValues(EMP_ISLE_OF_WIGHT_PLAN_VALUES)
    const pages = prefill.templateTablePageValues?.['deployment-matrix'] || []
    const supervisorPages = prefill.templateTablePageValues?.['supervisor-deployment'] || []

    expect(pages).toHaveLength(18)
    expect(pages[0]).toMatchObject({
      fields: {
        Date: 'Saturday 13 June',
      },
      tableCells: {
        '0:zone': 'OTHER DEPLOYMENTS',
        '0:position': 'COOP - STORE GUARD - SIA - NIGHT',
        '0:start': '19:00',
        '0:end': '07:00',
      },
    })
    expect(pages[5]).toMatchObject({
      fields: {
        Date: 'Thursday 18 June',
      },
      tableCells: {
        '0:zone': 'BAR DEPLOYMENTS',
        '0:position': 'EVENT CONTROL - SIA',
        '0:start': '17:00',
        '0:end': '01:00',
        '22:zone': 'OTHER DEPLOYMENTS',
        '22:position': 'PINK MOON - CAMPSITES DAYS - SUPERVISOR - SIA',
        '22:supervisor': 'PINK MOON - CAMPSITES DAYS - SUPERVISOR',
      },
    })
    expect(pages[6]).toMatchObject({
      fields: {
        Date: 'Thursday 18 June',
      },
      tableCells: {
        '0:zone': 'OTHER DEPLOYMENTS',
        '0:position': 'PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE - SIA x2',
        '22:zone': 'OTHER DEPLOYMENTS',
        '22:position': 'COOP - STORE GUARD - SIA',
      },
    })
    expect(supervisorPages.length).toBeGreaterThan(0)
    expect(supervisorPages.some((page) => page.fields?.['Supervisor / Zone'] === 'OTHER DEPLOYMENTS PINK MOON - CAMPSITES DAYS - SUPERVISOR - SIA')).toBe(true)
  })

  it('applies compact first-day deployment overrides to plan-loaded event pages', () => {
    const basePages = [
      {
        fields: { Date: 'Friday 22/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
          '0:assigned': '',
          '0:supervisor': 'Supervisor',
        },
      },
      {
        fields: { Date: 'Saturday 23/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
          '0:assigned': '',
          '0:supervisor': 'Supervisor',
        },
      },
      {
        fields: { Date: 'Sunday 24/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
          '0:assigned': '',
          '0:supervisor': 'Supervisor',
        },
      },
    ]
    const editedPages = [
      {
        fields: { Date: 'Friday 22/05/2026' },
        tableCells: {
          '0:zone': 'Response',
          '0:position': 'Supervisor',
          '0:assigned': 'Floyd Allen',
          '0:supervisor': 'Floyd Allen',
        },
      },
      basePages[1],
      basePages[2],
    ]

    const overrides = buildDeploymentMatrixSourcePageOverrides(editedPages, basePages)
    const pages = applyDeploymentMatrixSourcePageOverrides(basePages, overrides)
    const supervisorPages = buildSupervisorDeploymentTablePagesFromDeploymentMatrixOverrides(basePages, overrides)

    expect(overrides).toEqual([
      {
        tableCells: {
          '0:assigned': 'Floyd Allen',
          '0:supervisor': 'Floyd Allen',
        },
      },
    ])
    expect(pages[1]).toMatchObject({
      fields: { Date: 'Saturday 23/05/2026' },
      tableCells: {
        '0:assigned': 'Floyd Allen',
        '0:supervisor': 'Floyd Allen',
      },
    })
    expect(pages[2]).toMatchObject({
      fields: { Date: 'Sunday 24/05/2026' },
      tableCells: {
        '0:assigned': 'Floyd Allen',
        '0:supervisor': 'Floyd Allen',
      },
    })
    expect(supervisorPages).toHaveLength(3)
    expect(supervisorPages[0]).toMatchObject({
      fields: {
        'Supervisor / Zone': 'Response Supervisor',
      },
      tableCells: {
        '0:assigned': 'Floyd Allen',
      },
    })
    expect(supervisorPages[1]).toMatchObject({
      fields: {
        Date: 'Saturday 23/05/2026',
        'Supervisor / Zone': 'Response Supervisor',
      },
      tableCells: {
        '0:assigned': 'Floyd Allen',
      },
    })
  })
})
