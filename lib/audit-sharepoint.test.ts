import { describe, expect, it } from 'vitest'
import { getAuditSharePointFolder } from './audit-sharepoint'

describe('2026 audit SharePoint folders', () => {
  it('encodes the H&S folder as one id parameter on the correct site', () => {
    const folder = getAuditSharePointFolder('S0057')!
    const url = new URL(folder.url)
    expect(url.origin).toBe('https://kssnwlimited.sharepoint.com')
    expect([...url.searchParams.keys()]).toEqual(['id'])
    expect(url.searchParams.get('id')).toBe('/Shared Documents/Operations Clients Drive/Footasylum Ltd/2026 Audits/S0057 - Sunderland/S0057 - Sunderland H&S Audit')
  })

  it('preserves the different Nottingham parent and child spellings', () => {
    expect(getAuditSharePointFolder('S0037')?.path)
      .toContain('/S0037 - Nottingham Clumber St/S0037 - Nottingham Clumber St. H&S Audit')
  })

  it('uses the verified Merthyr H&S folder after standardising its store name', () => {
    expect(getAuditSharePointFolder('S0125')?.path)
      .toBe('/Shared Documents/Operations Clients Drive/Footasylum Ltd/2026 Audits/S0125 - Merthyr Tydfil/S0125 - Merthyr Tydfil H&S Audit')
  })

  it('supports the verified warehouse folder codes', () => {
    expect(getAuditSharePointFolder('WH003')?.path)
      .toContain('/WH003 - Heywood/WH003 - Heywood H&S Audit')
  })

  it.each([null, 'S0047', 'BREMONT-MAN', 'toString', '../S0057'])('does not invent a folder for %s', (code) => {
    expect(getAuditSharePointFolder(code)).toBeNull()
  })

  it('uses the owner-approved name for the new Trafford store without inventing a code', () => {
    expect(getAuditSharePointFolder(null, 'Trafford Centre New Store')?.path)
      .toContain('/Trafford Centre New/Trafford Centre New H&S Audit')
    expect(getAuditSharePointFolder('S0040', 'Trafford Centre New Store')?.path)
      .toContain('/S0040 - Trafford Mega/')
    expect(getAuditSharePointFolder(null, 'Trafford Mega')).toBeNull()
  })
})
