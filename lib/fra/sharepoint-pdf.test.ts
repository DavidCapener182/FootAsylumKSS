import { describe, expect, it } from 'vitest'
import { isSharePointFraPdf } from './sharepoint-pdf'
describe('archived FRA URL boundary', () => {
  const url='https://kssnwlimited.sharepoint.com/Shared%20Documents/Operations%20Clients%20Drive/Footasylum%20Ltd/2026%20Audits/S0021/FRA.pdf'
  it('accepts only saved PDFs in the designated existing client library', () => {
    expect(isSharePointFraPdf(url)).toBe(true)
    for(const bad of [null,'fra/abc.pdf',url.replace('https:','http:'),url.replace('kssnwlimited','other'),url.replace('/S0021/FRA.pdf',''),url.replace('2026%20Audits','Other'),url.replace('.pdf','.html'),'https://kssnwlimited.sharepoint.com.evil.com/FRA.pdf']) expect(isSharePointFraPdf(bad)).toBe(false)
  })
})
