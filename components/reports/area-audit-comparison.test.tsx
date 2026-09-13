import React from 'react'
import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {AreaAuditComparison} from './area-audit-comparison'
import type {NewsletterAreaStoreRow} from '@/lib/reports/monthly-newsletter-types'
const base={storeCode:null,latestAuditScore:null,latestAuditDate:null,plannedVisitDate:null,fraStatus:'up_to_date',requiresAction:false} as NewsletterAreaStoreRow
export const stores=[{...base,storeName:'Hull',audit1Score:97.98,audit2Score:95.96,auditChange:-2.02},{...base,storeName:'Bradford',audit1Score:90.91,audit2Score:93.94,auditChange:3.03},{...base,storeName:'Bolton',audit1Score:98.99,audit2Score:null,auditChange:null}]
it('renders both audits, movements and a pending comparison',()=>{
 const html=renderToStaticMarkup(<AreaAuditComparison stores={stores}/>);
 expect(html).toContain('Improved (1)');expect(html).toContain('Declined (1)');expect(html).toContain('+3.03 pp');expect(html).toContain('-2.02 pp');expect(html).toContain('Awaiting Audit 2');expect(html).toContain('2 of 3 stores have both audits')
})
