import { describe, expect, it } from 'vitest'
import { deriveCmpFieldCandidates } from '@/lib/cmp/extraction'

describe('deriveCmpFieldCandidates', () => {
  it('extracts common event metadata and operational sections from uploaded docs', () => {
    const candidates = deriveCmpFieldCandidates([
      {
        id: 'doc-1',
        document_kind: 'previous_somp',
        file_name: 'bbc.docx',
        extracted_text: `
Festival Name: BBC Radio 1 Big Weekend 2025
Date: 23-25 May 2025
Location: Sefton Park, Liverpool
Client: Peppermint Bars Ltd (Bar Operator)
Expected Attendance: 40,000 per day
Operational Hours (Bars): 10:00 - 23:00 daily
Challenge Policy: Challenge 25

4.2 KSS NW LTD Command Team
Bar Operations Lead - Kain M - Overall coordination of KSS
Event Controller (Loggist) - Leanne J - Records all incidents, decisions

12.0 Communications and Radio Protocols
Dedicated radio-connected control between bar teams and KSS Event Controller.

9.2 Control Room
The security control room contains the Event Controller, CCTV review point, and direct liaison with Event Control.
`,
      },
      {
        id: 'doc-2',
        document_kind: 'previous_cmp',
        file_name: 'worsley.docx',
        extracted_text: `
The event is Worsley Live 2024.

ROUTES:
Distance to and from nearest Transport links:
800 m Worsley Train Station
200 m Bus Request

INGRESS:
The entry width is 26m.

Egress:
Normal Conditions: Expected 15 minutes clearance time.

8 Build and Break
Access control, contractor search, and emergency route integrity checks apply throughout build and break.
`,
      },
    ])

    expect(candidates.event_name?.valueText).toContain('BBC Radio 1 Big Weekend 2025')
    expect(candidates.client_name?.valueText).toContain('Peppermint Bars Ltd')
    expect(candidates.challenge_policy?.valueText).toContain('Challenge 25')
    expect(candidates.named_command_roles?.valueText).toContain('Bar Operations Lead')
    expect(candidates.communications_plan?.valueText).toContain('radio-connected control')
    expect(candidates.control_room_structure?.valueText).toContain('security control room')
    expect(candidates.build_break_operations?.valueText).toContain('Access control')
  })
})
