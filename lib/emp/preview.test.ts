import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EmpPreviewDocument } from '@/components/emp/emp-preview-document'
import { describe, expect, it } from 'vitest'
import { EMP_DEMO_PLAN_VALUES, EMP_DEMO_SELECTED_ANNEXES } from '@/lib/emp/demo-plan'
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

  it('renders stewarding deployment as structured tables when staffing rows are supplied', () => {
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
    expect(multiTables).toHaveLength(2)
    expect(multiTables[0]).toMatchObject({
      headers: ['Time / Phase', 'Zone', 'Deployment Detail'],
    })
    expect(multiTables[1]).toMatchObject({
      headers: ['Team', 'Resourcing', 'Purpose'],
    })
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
      `Operational instruction ${index + 1} confirms that crowd pressure, route resilience, supervisor escalation, and welfare handover actions are fully recorded and implemented in line with event control requirements.`
    ).join(' ')

    const html = renderToStaticMarkup(
      createElement(EmpPreviewDocument, {
        mode: 'preview',
        model: {
          title: 'Test EMP',
          subtitle: '',
          coverRows: [],
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
          subtitle: '',
          coverRows: [],
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
    expect(html).toContain('Annex: Bar Emergency Action Cards')
    expect(html).toContain('Annex: Staff Briefing and Sign-Off Record')
    expect(html).toContain('Event Director Gold')
    expect(html).toContain('Bar 1 Supervisor')
    expect(html).toContain('Rating')
    expect(html).toContain('Bar 1')
    expect(html).toMatch(new RegExp('<span class="font-semibold text-slate-500">\\d+</span>'))
  })
})
