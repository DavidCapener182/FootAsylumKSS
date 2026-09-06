import fs from 'node:fs'
import {parsePdfFlaggedItems,auditDateFromCover,coverMatchesStore} from '../lib/audit/pdf-flagged-items.ts'
const root='output/audit-pdf-actions-2026-09-06'
const inventory=JSON.parse(fs.readFileSync(root+'/inventory.json'))
const results=inventory.map(job=>{try {if(job.error)throw Error(job.error);const parsed=parsePdfFlaggedItems(JSON.parse(fs.readFileSync(job.cache)));return {...job,...parsed,pdfAuditDate:auditDateFromCover(parsed.cover),identityMatch:coverMatchesStore(parsed.cover,job.storeName,job.storeCode)}} catch(e){return {...job,error:e.message}}})
fs.writeFileSync(root+'/extraction-review.json',JSON.stringify(results,null,2))
console.log(JSON.stringify({total:results.length,good:results.filter(r=>!r.error).length,findings:results.reduce((n,r)=>n+(r.findings?.length||0),0),errors:results.filter(r=>r.error).map(r=>({store:r.storeName,audit:r.auditNumber,error:r.error}))},null,2))
