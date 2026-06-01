import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmpPreviewDocument } from '@/components/emp/emp-preview-document'
import { describe, expect, it } from 'vitest'
import { EMP_DEMO_PLAN_VALUES, EMP_DEMO_SELECTED_ANNEXES } from '@/lib/emp/demo-plan'
import { EMP_DOWNLOAD_PLAN_VALUES, EMP_DOWNLOAD_SELECTED_ANNEXES } from '@/lib/emp/download-plan'
import { EMP_ISLE_OF_WIGHT_PLAN_VALUES, EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES } from '@/lib/emp/isle-of-wight-plan'
import { EMP_MASTER_TEMPLATE_FIELDS } from '@/lib/emp/master-template'
import { buildEmpPreviewModel, resolveEmpFieldValueMap } from '@/lib/emp/preview'

describe('buildEmpPreviewModel', () => {
  const fieldValues = {
    plan_title: { key: 'plan_title', label: 'Plan title', valueText: 'Test EMP', source: 'manual' },
    event_name: { key: 'event_name', label: 'Event name', valueText: 'Test Event', source: 'manual' },
    venue_name: { key: 'venue_name', label: 'Venue', valueText: 'Test Venue', source: 'manual' },
    show_dates: { key: 'show_dates', label: 'Show dates', valueText: '1-2 June 2026', source: 'manual' },
    purpose_scope_summary: { key: 'purpose_scope_summary', label: 'Purpose', valueText: 'Purpose text', source: 'manual' },
    related_documents: { key: 'related_documents', label: 'Docs', valueText: 'EMP\nRA', source: 'manual' },
    search_policy: { key: 'search_policy', label: 'Search policy', valueText: 'Search all patrons on entry', source: 'manual' },
    queue_design: { key: 'queue_design', label: 'Queue design', valueText: 'Snake queues with holding area', source: 'manual' },
    prohibited_items: { key: 'prohibited_items', label: 'Prohibited items', valueText: 'Glass\nPyrotechnics', source: 'manual' },
  }

  it('keeps annexes out of the preview unless they are selected', () => {
    const model = buildEmpPreviewModel({
      fieldValues,
      selectedAnnexes: [],
      includeKssProfileAppendix: false,
    })

    expect(model.sections[0]?.title).toBe('Document Control')
    expect(model.sections[1]?.title).toBe('Table of Contents')
    expect(model.sections[1]?.blocks[0]?.type).toBe('toc_columns')
    expect(model.annexes).toHaveLength(0)
  })

  it('adds the selected annex content to the preview', () => {
    const model = buildEmpPreviewModel({
      fieldValues: {
        ...fieldValues,
        search_screening_roles: {
          key: 'search_screening_roles',
          label: 'Search roles',
          valueText: 'Ingress Search Supervisor - 6 lane search team and 1 flex lane',
          source: 'manual',
        },
      },
      selectedAnnexes: ['search_screening'],
      includeKssProfileAppendix: false,
    })

    expect(model.annexes).toHaveLength(1)
    expect(model.annexes[0]?.title).toBe('Search and Screening')
    const annexText = model.annexes[0]?.blocks
      .filter((block): block is Extract<(typeof model.annexes)[number]['blocks'][number], { type: 'paragraph' }> => block.type === 'paragraph')
      .map((block) => block.text)
      .join('\n')
    expect(annexText).toContain('Search policy')
    expect(annexText).toContain('Prohibited items')
    expect(annexText).toContain('Roles and duties')
  })

  it('uses Download-specific annex labels without changing the generic bar labels', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })

    expect(model.annexes.map((annex) => annex.title)).toContain('Co-Op Shop and Sponsor Activation Security')
    expect(model.annexes.map((annex) => annex.title)).toContain('Accessibility Campsite Security')
    expect(model.annexes.map((annex) => annex.title)).toContain('Search and Screening - Accessibility Campsite')
    expect(model.annexes.map((annex) => annex.title)).not.toContain('High-Demand Bar Queue Area')
    expect(model.annexes.map((annex) => annex.title)).not.toContain('Overnight Bar Asset Protection')
  })

  it('adds scored Download risks for Co-Op and accessibility campsite positions', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })

    expect(model.riskAssessment?.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ hazard: 'Co-Op shop queue surge and over-capacity', rpn: '6', rating: 'Medium (Amber)' }),
      expect.objectContaining({ hazard: 'Co-Op shop theft, disorder or asset intrusion', rpn: '4', rating: 'Medium (Amber)' }),
      expect.objectContaining({ hazard: 'Accessibility campsite search delay or dignity concern', rpn: '6', rating: 'Medium (Amber)' }),
      expect.objectContaining({ hazard: 'Accessible route obstruction or crossover conflict', rpn: '6', rating: 'Medium (Amber)' }),
      expect.objectContaining({ hazard: 'Overnight safeguarding or welfare incident in accessible campsites', rpn: '6', rating: 'Medium (Amber)' }),
    ]))
  })

  it('uses event-specific queue diagram labels for non-Radio One EMPs', () => {
    const model = buildEmpPreviewModel({
      fieldValues: {
        ...fieldValues,
        event_name: { key: 'event_name', label: 'Event name', valueText: 'City Park Live', source: 'manual' },
        ingress_routes_holding_areas: {
          key: 'ingress_routes_holding_areas',
          label: 'Queue areas',
          valueText: 'North Bar and East Bar queue lanes',
          source: 'manual',
        },
      },
      selectedAnnexes: ['bar_operations'],
      includeKssProfileAppendix: false,
    })
    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { mode: 'preview', model }))

    expect(html).toContain('North Bar and East Bar queue lanes - Queue Management Plan')
    expect(html).toContain('/emp-assets/bar-queue-flow-template.png')
    expect(html).not.toContain('Radio 1 Bar - Queue Management Plan')
    expect(html).not.toContain('/emp-assets/bar-queue-flow.png')
  })

  it('uses the saved document status on Radio One EMP cover rows', () => {
    const model = buildEmpPreviewModel({
      fieldValues: {
        ...fieldValues,
        plan_title: {
          key: 'plan_title',
          label: 'Plan title',
          valueText: 'KSS NW LTD Bar Security Operations Plan - BBC Radio 1 Big Weekend Sunderland 2026',
          source: 'manual',
        },
        event_name: {
          key: 'event_name',
          label: 'Event name',
          valueText: 'BBC Radio 1 Big Weekend Sunderland 2026',
          source: 'manual',
        },
        document_status: {
          key: 'document_status',
          label: 'Document status',
          valueText: 'Final',
          source: 'manual',
        },
        document_version: {
          key: 'document_version',
          label: 'Document version',
          valueText: 'V1',
          source: 'manual',
        },
      },
      selectedAnnexes: ['bar_operations'],
      includeKssProfileAppendix: false,
    })

    expect(model.coverRows).toContainEqual({ label: 'Status', value: 'Final' })
    expect(model.coverRows).toContainEqual({ label: 'Approver', value: 'Floyd Allen' })
    const documentControl = model.sections.find((section) => section.key === 'document_control')
    const documentControlTable = documentControl?.blocks.find((block) => block.type === 'table')
    const versionHistory = documentControl?.blocks.find((block) => block.type === 'multi_table')

    expect(documentControlTable).toMatchObject({
      rows: expect.arrayContaining([
        { label: 'Status', value: 'Final' },
        { label: 'Approver', value: 'Floyd Allen' },
      ]),
    })
    expect(versionHistory).toMatchObject({
      rows: expect.arrayContaining([
        ['V1', expect.any(String), expect.any(String), expect.any(String), 'Final'],
      ]),
    })
    expect(versionHistory).toMatchObject({ rows: expect.not.arrayContaining([
      expect.arrayContaining(['V0.6']),
    ]) })
    expect(model.coverRows).not.toContainEqual({
      label: 'Status',
      value: 'Draft - final confirmations required',
    })
    expect(model.riskAssessment).toMatchObject({
      eventName: 'BBC Radio 1 Big Weekend Sunderland 2026',
      activity: 'BBC Radio 1 Big Weekend Sunderland 2026 - Operational Risk Assessment',
      location: 'Test Venue',
      assessmentDate: expect.any(String),
      rows: expect.arrayContaining([
        expect.objectContaining({ hazard: 'High-volume queuing and congestion' }),
        expect.objectContaining({ hazard: 'Underage or proxy alcohol service' }),
        expect.objectContaining({ hazard: 'Intoxication, disorder or assault near bars' }),
        expect.objectContaining({ hazard: 'Emergency route obstruction by bar queues' }),
        expect.objectContaining({ hazard: 'Bar close-down and final egress demand' }),
      ]),
    })
  })

  it('treats version-like Radio One approval text as final for submission', () => {
    const model = buildEmpPreviewModel({
      fieldValues: {
        ...fieldValues,
        plan_title: {
          key: 'plan_title',
          label: 'Plan title',
          valueText: 'KSS NW LTD Bar Security Operations Plan - BBC Radio 1 Big Weekend Sunderland 2026',
          source: 'manual',
        },
        event_name: {
          key: 'event_name',
          label: 'Event name',
          valueText: 'BBC Radio 1 Big Weekend Sunderland 2026',
          source: 'manual',
        },
        document_version: {
          key: 'document_version',
          label: 'Document version',
          valueText: 'V1',
          source: 'manual',
        },
        document_status: {
          key: 'document_status',
          label: 'Document status',
          valueText: 'V1',
          source: 'manual',
        },
      },
      selectedAnnexes: ['bar_operations'],
      includeKssProfileAppendix: false,
    })
    const documentControl = model.sections.find((section) => section.key === 'document_control')
    const versionHistory = documentControl?.blocks.find((block) => block.type === 'multi_table')

    expect(versionHistory).toMatchObject({
      rows: expect.arrayContaining([
        ['V1', expect.any(String), expect.any(String), expect.any(String), 'Final'],
      ]),
    })
    expect(model.coverRows).toContainEqual({ label: 'Status', value: 'Final' })
  })

  it('does not show Radio One data for a generic bar security plan', () => {
    const model = buildEmpPreviewModel({
      fieldValues: {
        ...fieldValues,
        plan_title: {
          key: 'plan_title',
          label: 'Plan title',
          valueText: 'KSS NW LTD Bar Security Operations Plan',
          source: 'manual',
        },
        event_name: { key: 'event_name', label: 'Event name', valueText: 'City Park Live', source: 'manual' },
        licensed_capacity: { key: 'licensed_capacity', label: 'Licensed capacity', valueText: '12,500', source: 'manual' },
        expected_attendance: { key: 'expected_attendance', label: 'Expected attendance', valueText: '10,000 expected attendees', source: 'manual' },
        excluded_areas: { key: 'excluded_areas', label: 'Excluded areas', valueText: 'Main stage and traffic routes', source: 'manual' },
        density_assumptions: { key: 'density_assumptions', label: 'Density assumptions', valueText: 'Medium bar queue demand with live supervisor monitoring.', source: 'manual' },
      },
      selectedAnnexes: ['bar_operations'],
      includeKssProfileAppendix: false,
    })
    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { mode: 'preview', model }))

    expect(html).toContain('12,500')
    expect(html).toContain('10,000 expected attendees')
    expect(html).toContain('Queue Planning Factor')
    expect(html).toContain('Queue capacity status')
    expect(html).not.toContain('39,999')
    expect(html).not.toContain('BBC Radio 1')
    expect(html).not.toContain('CSMP references')
    expect(html).not.toContain('Showsec')
    expect(html).not.toContain('Peppermint')
    expect(html).not.toContain('Annex: Queue Layouts and Queue Types')
    expect(model.riskAssessment).toMatchObject({
      eventName: 'City Park Live',
      location: 'Test Venue',
    })
  })

  it('renders stewarding deployment annex without duplicating deployment tables', () => {
    const model = buildEmpPreviewModel({
      fieldValues: {
        ...fieldValues,
        stewarding_roles: {
          key: 'stewarding_roles',
          label: 'Stewarding roles',
          valueText: 'Directional stewards, queue marshals, emergency exit stewards, and route-clearance teams.',
          source: 'manual',
        },
        staffing_by_zone_and_time: {
          key: 'staffing_by_zone_and_time',
          label: 'Staffing by zone and time',
          valueText:
            '11:00 to 13:00 - East ingress plaza - 18 stewards across queue lanes, accessible entry support, and admissions holding.\n22:30 to 00:30 - South boulevard - 14 stewards across route clearance, taxi marshal support, and dispersal split points.',
          source: 'manual',
        },
        response_teams: {
          key: 'response_teams',
          label: 'Response teams',
          valueText:
            'Steward relief team - 1 team of 6 - Covers breaks, queue reinforcement, and emergency route support.\nWayfinding reserve - 1 team of 4 - Deployed to route changes, post-show holds, and lost-person support.',
          source: 'manual',
        },
      },
      selectedAnnexes: ['stewarding_deployment'],
      includeKssProfileAppendix: false,
    })

    const annex = model.annexes[0]
    const multiTables = annex?.blocks.filter((block) => block.type === 'multi_table') || []

    expect(annex?.title).toBe('Stewarding / Queue Marshal Deployment')
    expect(multiTables).toHaveLength(1)
    expect(multiTables[0]).toMatchObject({
      headers: ['Team', 'Resourcing', 'Purpose'],
    })
  })

  it('splits mixed Download bar roles into separate deployment rows', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const deploymentRows = model.sections
      .flatMap((section) => section.blocks)
      .filter((block): block is Extract<(typeof model.sections)[number]['blocks'][number], { type: 'multi_table' }> => block.type === 'multi_table' && block.deploymentSchedule === true)
      .flatMap((block) => block.rows)

    expect(model.coverRows).toContainEqual({ label: 'Status', value: 'V1' })
    expect(deploymentRows).toContainEqual(['BARS', 'Bar 1', 'SUP', '1', '12:00', '22:30', '', '', ''])
    expect(deploymentRows).toContainEqual(['BARS', 'Bar 1', 'SIA', '2', '12:00', '22:30', '1', '22:30', '09:30'])
    expect(deploymentRows).toContainEqual(['BARS', 'Bar 1', 'ST', '2', '12:00', '22:30', '', '', ''])
    expect(deploymentRows).toContainEqual(expect.arrayContaining(['BARS', 'Hair of the Dog']))
    expect(deploymentRows).not.toContainEqual(expect.arrayContaining(['BARS', 'HAIR OF THE DOG']))
    expect(deploymentRows).not.toContainEqual(expect.arrayContaining(['1 SUP, 2 SIA, 2 ST']))
  })

  it('renders the Isle of Wight deployment schedule using the detailed deployment table', () => {
    const isleOfWightFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_ISLE_OF_WIGHT_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: isleOfWightFieldValues,
      selectedAnnexes: EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const deploymentTables = model.sections
      .flatMap((section) => section.blocks)
      .filter((block): block is Extract<(typeof model.sections)[number]['blocks'][number], { type: 'multi_table' }> => block.type === 'multi_table' && block.deploymentSchedule === true)
    const deploymentRows = deploymentTables.flatMap((block) => block.rows)

    expect(deploymentTables[0]).toMatchObject({
      headers: ['Area', 'Position', 'Role', 'Day staff', 'Day start', 'Day end', 'Night staff', 'Night start', 'Night end'],
      landscape: true,
    })
    expect(model.coverRows).toContainEqual({ label: 'Status', value: 'V1' })
    ;['Thursday 18 June', 'Friday 19 June', 'Saturday 20 June', 'Sunday 21 June', 'Monday 22 June'].forEach((day) => {
      expect(deploymentTables.find((table) => table.title === day)).toMatchObject({
        startOnNewPage: true,
      })
    })
    expect(deploymentTables.find((table) => table.title === 'Wednesday 17 June')).not.toMatchObject({
      startOnNewPage: true,
    })
    expect(deploymentRows).toContainEqual(['BAR DEPLOYMENTS', 'EVENT CONTROL', 'SIA', '1', '09:00', '01:00', '', '', ''])
    expect(deploymentRows).toContainEqual(['BAR DEPLOYMENTS', 'BAR 1 - STAGE RIGHT - FOH', 'SIA', '5', '14:00', '00:00', '', '', ''])
    expect(deploymentRows).toContainEqual(['OTHER DEPLOYMENTS', 'PINK MOON - CAMPSITES DAYS - MOON - ENTRANCE', 'SIA', '2', '08:00', '20:00', '', '', ''])
    expect(deploymentRows).toContainEqual(['OTHER DEPLOYMENTS', 'IQOS - COURTYARD', 'SIA', '1', '11:00', '22:00', '', '', ''])
    expect(model.annexes.map((annex) => annex.title)).toContain('Pink Moon Campsite Security')
    expect(model.annexes.map((annex) => annex.title)).not.toContain('Search and Screening')
    expect(model.annexes.map((annex) => annex.title)).not.toContain('Search and Screening - Accessibility Campsite')

    const eventOverview = model.sections.find((section) => section.key === 'event_overview')
    const operationalHoursTable = eventOverview?.blocks.find(
      (block): block is Extract<(typeof model.sections)[number]['blocks'][number], { type: 'multi_table' }> =>
        block.type === 'multi_table' && block.headers.join('|') === 'Operational Phase|Detail'
    )
    const commandDiagram = model.sections
      .find((section) => section.key === 'command_control')
      ?.blocks
      .find((block): block is Extract<(typeof model.sections)[number]['blocks'][number], { type: 'diagram'; variant: 'command' }> =>
        block.type === 'diagram' && block.variant === 'command'
      )
    const commandBlocks = model.sections.find((section) => section.key === 'command_control')?.blocks || []
    const commandExternalInterfaces = commandBlocks.find(
      (block): block is Extract<(typeof commandBlocks)[number], { type: 'bullet_list' }> =>
        block.type === 'bullet_list' && block.items.some((item) => item.includes('One Circle Events'))
    )
    const briefingBlock = commandBlocks.find(
      (block): block is Extract<(typeof commandBlocks)[number], { type: 'paragraph' }> =>
        block.type === 'paragraph' && block.text.startsWith('Briefings and inductions:')
    )

    expect(operationalHoursTable?.rows).toContainEqual([
      'Event Control source rota',
      expect.stringContaining('day shifts 07:00-19:00'),
    ])
    expect(operationalHoursTable?.rows.some(([label, detail]) => label.endsWith('07') || detail.startsWith('00-19:00'))).toBe(false)
    expect(commandDiagram?.control).toContain('Callum Keegan')
    expect(commandExternalInterfaces).toMatchObject({
      keepTogether: true,
      startOnNewPage: true,
    })
    expect(briefingBlock).toMatchObject({ keepWithNext: true })

    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { mode: 'preview', model }))
    expect(html).toContain('V1')
    expect(html).toContain('Callum Keegan')
    expect(html).toContain('07:00-19:00')
    expect(html).toContain('Pink Moon Campsite Security')
    const renderedPages = html.split('<section').slice(1)
    const relatedDocumentsPage = renderedPages.find((page) => page.includes('Related Documents'))
    const externalInterfacesPage = renderedPages.find((page) => page.includes('One Circle Events - DPS'))
    const briefingPage = renderedPages.find((page) => page.includes('Briefings and inductions:'))
    const mondayPage = renderedPages.find((page) => page.includes('Monday 22 June'))
    expect(relatedDocumentsPage).toBeDefined()
    expect(relatedDocumentsPage).toContain('1.0 ESOP IWF Introduction and Index 2026 V2')
    expect(relatedDocumentsPage).toContain('2.0 IWF Risk Assessment 2026 V2')
    expect(relatedDocumentsPage).toContain('E06 Master - IOW26 Security Schedule V1')
    expect(externalInterfacesPage).toContain('Events Wellbeing - welfare and lost property.')
    expect(externalInterfacesPage).toContain('Medical, fire, traffic, accessibility, stewarding and security contractor control teams.')
    expect(briefingPage).toContain('Monitoring technology and live observation:')
    expect(mondayPage).toBeDefined()
    expect(mondayPage).not.toContain('Sunday 21 June')
    expect(mondayPage).not.toContain('Saturday 20 June')
    expect(html).not.toContain('accessibility campsite search')
    expect(html).not.toContain('SPONSORS (RECHARGE)')
    expect(html).not.toContain('STAGES - OTHER')
  })

  it('replaces stale Download ingress values when rendering Isle of Wight previews', () => {
    const staleIsleOfWightValues = {
      ...EMP_ISLE_OF_WIGHT_PLAN_VALUES,
      ingress_routes_holding_areas:
        'KSS ingress activity is focused on accessibility campsite search, production/back-of-house interface and assigned bars/Co-op shop areas as they open.',
      ingress_operations:
        'KSS ingress activity is focused on accessibility campsite search, production/back-of-house interface and assigned bars/Co-op shop areas as they open. Accessible customers will be processed calmly with suitable space, privacy, companion consideration, medication/medical equipment sensitivity and clear routes onward.',
      search_policy:
        'Search is carried out only on behalf of and under instruction of the client. Security staff have no independent power to search; consent will be requested and confirmed.',
      queue_design:
        'Queue design for bars, Co-op shop and accessibility campsite search will keep emergency routes, accessible routes, welfare/medical routes, stock routes and service lanes clear.',
      accessible_entry_arrangements:
        'Accessibility customers will receive dignified, proportionate search and entry support. Accessibility campsite search will account for mobility aids, medical equipment and carers/companions.',
    }
    const isleOfWightFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(staleIsleOfWightValues).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: isleOfWightFieldValues,
      selectedAnnexes: EMP_ISLE_OF_WIGHT_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { mode: 'preview', model }))

    expect(html).toContain('Searching is controlled by the IWF gate/search operation')
    expect(html).toContain('Ingress routes include A2 from festival car parks')
    expect(html).toContain('Queue design uses long pedestrian barriers')
    expect(html).toContain('Separate Accessibility/VIP and Performer entry')
    expect(html).toContain('Ingress operations focus on keeping lanes clear')
    expect(html).not.toContain('accessibility campsite search')
    expect(html).not.toContain('Co-op shop')
    expect(html).not.toContain('Co-Op shop')
    expect(html).not.toContain('Search is carried out only on behalf')
    expect(html).not.toContain('Accessibility customers will receive dignified')
  })

  it('adds Download behavioural risk zones and bar-specific queue formats', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { mode: 'preview', model }))

    expect(html).toContain('Key Behavioural Risk Zones for KSS-Controlled Areas')
    expect(html).toContain('Co-Op retail store')
    expect(html).toContain('Bar-Specific Queuing Format')
    expect(html).toContain('Disney-style serpentine lanes')
    expect(html).toContain('District X Pub')
  })

  it('adds the Download 2026 site plan as a landscape map image', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const siteDesign = model.sections.find((section) => section.key === 'site_design')
    const sitePlanImage = siteDesign?.blocks.find((block) => block.type === 'image' && block.imageUrl === '/emp-assets/download-2026-site-plan-v5.png')

    expect(EMP_DOWNLOAD_PLAN_VALUES.site_maps_and_route_diagrams).toContain('Download 2026 Site Plan V5')
    expect(sitePlanImage).toMatchObject({
      title: 'Download 2026 Site Plan V5',
      landscape: true,
    })
  })

  it('renders the Download accessibility campsite annex deployment as schedule tables', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const annex = model.annexes.find((item) => item.key === 'camping_security')
    const deploymentTables = annex?.blocks.filter((block): block is Extract<(typeof model.annexes)[number]['blocks'][number], { type: 'multi_table' }> => block.type === 'multi_table' && block.deploymentSchedule === true) || []
    const deploymentRows = deploymentTables.flatMap((block) => block.rows)

    expect(annex?.title).toBe('Accessibility Campsite Security')
    expect(deploymentTables.length).toBeGreaterThan(0)
    expect(deploymentTables[0]).toMatchObject({
      headers: ['Area', 'Position', 'Role', 'Day staff', 'Day start', 'Day end', 'Night staff', 'Night start', 'Night end'],
      landscape: true,
    })
    expect(deploymentRows).toContainEqual(expect.arrayContaining(['ACCESSIBILITY CAMPSITE', 'Accessibility Manager']))
    expect(deploymentRows).not.toContainEqual(expect.arrayContaining(['BARS']))
    expect(deploymentRows).not.toContainEqual(expect.arrayContaining(['SPONSORSHIP']))
    expect(annex?.blocks.some((block) => block.type === 'paragraph' && block.text.includes('|SPONSORSHIP|'))).toBe(false)
  })

  it('splits Download annex deployment rows by operational scope', () => {
    const downloadFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DOWNLOAD_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )
    const model = buildEmpPreviewModel({
      fieldValues: downloadFieldValues,
      selectedAnnexes: EMP_DOWNLOAD_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
    })
    const barAnnexRows = model.annexes
      .find((item) => item.key === 'bar_operations')
      ?.blocks.filter((block): block is Extract<(typeof model.annexes)[number]['blocks'][number], { type: 'multi_table' }> => block.type === 'multi_table' && block.deploymentSchedule === true)
      .flatMap((block) => block.rows) || []
    const coOpAnnexRows = model.annexes
      .find((item) => item.key === 'front_of_stage_pit')
      ?.blocks.filter((block): block is Extract<(typeof model.annexes)[number]['blocks'][number], { type: 'multi_table' }> => block.type === 'multi_table' && block.deploymentSchedule === true)
      .flatMap((block) => block.rows) || []

    expect(barAnnexRows).toContainEqual(expect.arrayContaining(['BARS', 'Bar 1']))
    expect(barAnnexRows).not.toContainEqual(expect.arrayContaining(['SPONSORSHIP']))
    expect(coOpAnnexRows).toContainEqual(expect.arrayContaining(['SPONSORSHIP', 'Coop Security No 1']))
    expect(coOpAnnexRows).not.toContainEqual(expect.arrayContaining(['BARS']))
   })

  it('renders richer structured blocks for the seeded demo event', () => {
    const demoFieldValues = resolveEmpFieldValueMap(
      EMP_MASTER_TEMPLATE_FIELDS,
      Object.entries(EMP_DEMO_PLAN_VALUES).map(([fieldKey, valueText]) => ({
        fieldKey,
        valueText,
        source: 'manual',
      }))
    )

    const model = buildEmpPreviewModel({
      fieldValues: demoFieldValues,
      selectedAnnexes: EMP_DEMO_SELECTED_ANNEXES,
      includeKssProfileAppendix: false,
      documents: [
        {
          documentKind: 'site_map',
          fileName: 'site-plan.png',
          fileType: 'image/png',
          signedUrl: 'https://example.com/site-plan.png',
        },
      ],
    })

    const siteDesign = model.sections.find((section) => section.key === 'site_design')
    const ramp = model.sections.find((section) => section.key === 'ramp_assessment')
    const capacity = model.sections.find((section) => section.key === 'capacity_flow')
    const command = model.sections.find((section) => section.key === 'command_control')
    const riskAssessment = model.sections.find((section) => section.key === 'risk_assessment')
    const ingressOperations = model.sections.find((section) => section.key === 'ingress_operations')
    const emergency = model.sections.find((section) => section.key === 'emergency_procedures')
    const counterTerrorism = model.sections.find((section) => section.key === 'counter_terrorism')

    expect(siteDesign?.blocks.some((block) => block.type === 'diagram' && block.variant === 'crowd_flow')).toBe(true)
    expect(siteDesign?.blocks.some((block) => block.type === 'image')).toBe(true)
    expect(ramp?.blocks.some((block) => block.type === 'diagram' && block.variant === 'ramp')).toBe(true)
    expect(capacity?.blocks.some((block) => block.type === 'metric_grid')).toBe(true)
    expect(command?.blocks.some((block) => block.type === 'diagram' && block.variant === 'command')).toBe(true)
    expect(command?.blocks.some((block) => block.type === 'multi_table')).toBe(true)
    expect(riskAssessment?.blocks.some((block) => block.type === 'multi_table')).toBe(true)
    expect(ingressOperations?.blocks.some((block) => block.type === 'diagram' && block.variant === 'bar_queue_flow')).toBe(true)
    expect(emergency?.blocks.some((block) => block.type === 'image')).toBe(true)
    expect(counterTerrorism?.blocks.some((block) => block.type === 'image_grid')).toBe(true)
  })

  it('splits long EMP content across multiple fixed A4 pages', () => {
    const longText = Array.from({ length: 90 }, (_, index) =>
      `Operational instruction ${index + 1} confirms that crowd density, route resilience, supervisor escalation, and welfare handover actions are fully recorded and implemented in line with event control requirements.`
    ).join(' ')

    const html = renderToStaticMarkup(
      createElement(EmpPreviewDocument, {
        mode: 'preview',
        model: {
          title: 'Test EMP',
          documentLabel: 'Event Management Plan',
          subtitle: '',
          coverRows: [],
          coverSummary: 'Test cover summary.',
          sections: [
            {
              key: 'incident_management',
              title: 'Incident Management',
              description: 'Long-form operational text should continue to a new page instead of stretching a single A4 sheet.',
              blocks: [{ type: 'paragraph', text: longText }],
            },
          ],
          annexes: [],
        },
      })
    )

    const pageCount = (html.match(/emp-a4-page/g) || []).length
    expect(pageCount).toBeGreaterThan(2)
    expect(html).toContain('Continued')
  })

  it('splits oversized operational tables across additional pages', () => {
    const longDetail = Array.from({ length: 70 }, (_, index) =>
      `Control measure ${index + 1} requires supervisor oversight, route monitoring, and logged escalation through event control.`
    ).join(' ')

    const html = renderToStaticMarkup(
      createElement(EmpPreviewDocument, {
        mode: 'preview',
        model: {
          title: 'Table Pagination EMP',
          documentLabel: 'Event Management Plan',
          subtitle: '',
          coverRows: [],
          coverSummary: 'Test cover summary.',
          sections: [
            {
              key: 'ingress_operations',
              title: 'Ingress Operations',
              description: 'Oversized control tables should carry onto the next A4 page without stretching the current one.',
              blocks: [
                {
                  type: 'multi_table',
                  headers: ['Ingress Control', 'Operational Detail'],
                  rows: [['Search policy', longDetail]],
                },
              ],
            },
          ],
          annexes: [],
        },
      })
    )

    const pageCount = (html.match(/emp-a4-page/g) || []).length
    expect(pageCount).toBeGreaterThan(2)
    expect(html).toContain('Search policy (continued)')
  })

  it('renders the Radio 1 bar plan with named KSS command, mapped-bar TBC rows, page-numbered TOC and bar-specific appendices', () => {
    const radioFieldValues = {
      ...fieldValues,
      plan_title: { key: 'plan_title', label: 'Plan title', valueText: 'KSS NW LTD Bar Security Operations Plan', source: 'manual' },
      event_name: { key: 'event_name', label: 'Event name', valueText: "BBC Radio 1's Big Weekend Sunderland 2026", source: 'manual' },
      staffing_by_zone_and_time: {
        key: 'staffing_by_zone_and_time',
        label: 'Staffing',
        valueText:
          'D1 Fri 22 May 13:00-21:45 - Management - Manager x1\nD1 Fri 22 May 13:00-21:45 - Event Control - Logger x1\nD1 Fri 22 May 13:00-21:45 - Response - Supervisor x1; SIA support x4\nD1 Fri 22 May 13:00-21:45 - Bar 1 - Supervisor x1; SIA x5; Steward x2\nD2 Sat 23 May 10:00-21:45 - Management - Manager x1\nD3 Sun 24 May 10:00-21:45 - Management - Manager x1',
        source: 'manual',
      },
      response_teams: {
        key: 'response_teams',
        label: 'Response teams',
        valueText: 'Response - Supervisor x1 and SIA support x4 each show day - Support bar refusals and ejections.',
        source: 'manual',
      },
    }
    const model = buildEmpPreviewModel({
      fieldValues: radioFieldValues,
      selectedAnnexes: ['bar_operations', 'traffic_pedestrian_routes', 'stewarding_deployment', 'emergency_action_cards'],
      includeKssProfileAppendix: false,
    })
    const html = renderToStaticMarkup(createElement(EmpPreviewDocument, { mode: 'preview', model }))

    expect(model.title).toBe('KSS NW LTD Bar Security Operations Plan - BBC Radio 1 Big Weekend Sunderland 2026')
    expect(html).toContain('Floyd Allen')
    expect(html).toContain('David Capener')
    expect(html).not.toContain('Bar 14 Press/Guest')
    expect(html).not.toContain('Bars 7-14')
    expect(html).not.toContain('Annex: Service / Pedestrian Route Interface')
    expect(html).not.toContain('Annex: Stewarding / Queue Marshal Deployment')
    expect(html).not.toContain('Annex: Emergency Action Cards')
    expect(html).toContain('Annex: Queue Layouts and Queue Types')
    expect(html).toContain('/emp-assets/bar-queue-flow.png')
    expect(html).not.toContain('/emp-assets/bar-queue-flow-template.png')
    expect(html).toContain('Annex: Bar Emergency Action Cards')
    expect(html).toContain('Annex: Staff Briefing and Sign-Off Record')
    expect(html).toContain('Event Director Gold')
    expect(html).toContain('Jess Shields')
    expect(html).toContain('Jack May')
    expect(html).toContain('Philly Proctor')
    expect(html).toContain('Sarah Tschentscher')
    expect(html).toContain('Bar 1 Supervisor')
    expect(html).toContain('Rating')
    expect(html).toContain('Bar 1')
    expect(html).toMatch(new RegExp('<span class="font-semibold text-slate-500">\\d+</span>'))
  })
})
