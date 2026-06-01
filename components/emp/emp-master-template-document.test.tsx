import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmpMasterTemplateDocument } from '@/components/emp/emp-master-template-document'
import {
  EMP_IRELAND_SIGN_IN_TEMPLATE_ID,
  buildIrelandSignInPrefillData,
} from '@/lib/emp/ireland-jobs'
import { getEmpMasterTemplateById } from '@/lib/emp/master-templates'

describe('EmpMasterTemplateDocument', () => {
  it('renders the Download Festival briefing when the Download scoped template is selected', () => {
    const template = getEmpMasterTemplateById('download-festival-security-brief')
    expect(template).not.toBeNull()

    const html = renderToStaticMarkup(
      <EmpMasterTemplateDocument
        template={template!}
        prefillValues={{ eventName: 'Download Festival 2026', eventDate: '2026-06-10' }}
      />
    )

    expect(html).toContain('Download Festival Security Brief')
    expect(html).toContain('Donington Park')
    expect(html).toContain('Page 8 of 8')
    expect(html).toContain('/emp-assets/download-festival-logo.png')
    expect(html).toContain('Accessibility Search and Access-First Standard')
    expect(html).toContain('Accessible Campsites, Toilets and Queues')
    expect(html).not.toContain('Radio One Event Week Security Brief')
    expect(html).not.toContain('BBC Radio 1')
  })

  it('places Ireland sign-in locations between the company name and document code', () => {
    const template = getEmpMasterTemplateById(EMP_IRELAND_SIGN_IN_TEMPLATE_ID)
    expect(template).not.toBeNull()

    const preset = buildIrelandSignInPrefillData()
    const html = renderToStaticMarkup(
      <EmpMasterTemplateDocument
        template={template!}
        prefillValues={{
          eventName: preset.eventName,
          eventDate: preset.eventDate,
          fields: preset.templateFieldValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || {},
          tableCells: preset.templateTableCellValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || {},
          tablePages: preset.templateTablePageValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || [],
        }}
      />
    )
    const headerCard = html.match(/KSS NW LTD[\s\S]*?EMP-MT-05/)?.[0] || ''

    expect(headerCard).toContain('Marlay Park')
    expect(headerCard.indexOf('KSS NW LTD')).toBeLessThan(headerCard.indexOf('Marlay Park'))
    expect(headerCard.indexOf('Marlay Park')).toBeLessThan(headerCard.indexOf('EMP-MT-05'))
    expect(html).toContain('Malahide Castle')
  })

  it('uses PSA badge number only for the Ireland sign-in preset', () => {
    const template = getEmpMasterTemplateById(EMP_IRELAND_SIGN_IN_TEMPLATE_ID)
    expect(template).not.toBeNull()

    const preset = buildIrelandSignInPrefillData()
    const irelandHtml = renderToStaticMarkup(
      <EmpMasterTemplateDocument
        template={template!}
        prefillValues={{
          eventName: preset.eventName,
          eventDate: preset.eventDate,
          fields: preset.templateFieldValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || {},
          tableCells: preset.templateTableCellValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || {},
          tablePages: preset.templateTablePageValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || [],
        }}
      />
    )
    const standardHtml = renderToStaticMarkup(<EmpMasterTemplateDocument template={template!} />)

    expect(irelandHtml).toContain('PSA Badge Number')
    expect(irelandHtml).not.toContain('SIA Badge Number')
    expect(irelandHtml).toContain('PSA badge tracking')
    expect(standardHtml).toContain('SIA Badge Number')
    expect(standardHtml).not.toContain('PSA Badge Number')
  })

  it('uses Ireland-only vest number and removes the shift end column', () => {
    const template = getEmpMasterTemplateById(EMP_IRELAND_SIGN_IN_TEMPLATE_ID)
    expect(template).not.toBeNull()

    const preset = buildIrelandSignInPrefillData()
    const irelandHtml = renderToStaticMarkup(
      <EmpMasterTemplateDocument
        template={template!}
        prefillValues={{
          eventName: preset.eventName,
          eventDate: preset.eventDate,
          fields: preset.templateFieldValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || {},
          tableCells: preset.templateTableCellValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || {},
          tablePages: preset.templateTablePageValues?.[EMP_IRELAND_SIGN_IN_TEMPLATE_ID] || [],
        }}
      />
    )
    const standardHtml = renderToStaticMarkup(<EmpMasterTemplateDocument template={template!} />)

    expect(irelandHtml).toContain('Vest Number')
    expect((irelandHtml.match(/emp-master-template-table-row/g) || [])).toHaveLength(32)
    expect(irelandHtml).not.toContain('Shift Start')
    expect(irelandHtml).not.toContain('Shift End')
    expect(standardHtml).toContain('Shift Start')
    expect(standardHtml).toContain('Shift End')
    expect(standardHtml).not.toContain('Vest Number')
    expect((standardHtml.match(/emp-master-template-table-row/g) || [])).toHaveLength(14)
  })
})
