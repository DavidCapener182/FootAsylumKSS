// Isolated real-component browser checks. No production data or network credentials.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const out = resolve('output/playwright/revisit-follow-up')
await mkdir(out, { recursive: true })
const storeId = '11111111-1111-4111-8111-111111111111', evidenceId = '55555555-5555-4555-8555-555555555555'
const code = `import React from 'react';import{createRoot}from'react-dom/client';import{AuditTable}from'./components/audit/audit-table';import{RoutePlanningClient}from'./components/route-planning/route-planning-client';import{StoreDetailWorkspace}from'./components/stores/store-detail-workspace';import{needsAuditVisit}from'./lib/route-planning-store-eligibility';
const base={id:'${storeId}',store_name:'Dundee (local fixture)',store_code:'S0053',region:'A1',reporting_area:'AREA1',is_active:true,compliance_audit_1_date:'2026-01-22',compliance_audit_1_overall_pct:83.67,compliance_audit_1_pdf_path:null,compliance_audit_2_date:'2026-09-17',compliance_audit_2_overall_pct:73.2,compliance_audit_2_pdf_path:'original.pdf',compliance_audit_3_date:null,compliance_audit_3_overall_pct:null,compliance_audit_3_pdf_path:null,compliance_audit_2_planned_date:null,action_plan_1_sent:false,action_plan_2_sent:true,action_plan_3_sent:false,fire_risk_assessment_date:null,fire_risk_assessment_pct:null,fire_risk_assessment_pdf_path:null,total_audits_to_date:2,address_line_1:null,city:null,postcode:null,latitude:53,longitude:-2,compliance_audit_2_assigned_manager_user_id:null,route_sequence:null,assigned_manager:null,audit_revisit_follow_up:{status:'available',originals:[{id:'22222222-2222-4222-8222-222222222222',auditNumber:2,visitDate:'2026-09-17',percentage:73.2,pdfPath:'original.pdf',documentCount:1,latestRevisitDate:'2026-10-22',latestEvidenceId:'${evidenceId}'}]}};
const later={...base,id:'33333333-3333-4333-8333-333333333333',store_name:'Later failed audit',store_code:'TEST2',compliance_audit_2_date:'2026-10-24'};
const missing={...base,id:'44444444-4444-4444-8444-444444444444',store_name:'Still needs evidence',store_code:'TEST3',audit_revisit_follow_up:{status:'available',originals:[]}};
const planned={...base,id:'66666666-6666-4666-8666-666666666666',store_name:'Unrelated planned return',store_code:'TEST4',compliance_audit_2_planned_date:'2026-11-10',route_sequence:1};
const stores=[base,later,missing];
const content=location.pathname.startsWith('/stores/')?<StoreDetailWorkspace store={base} incidents={[]} actions={Array.from({length:15},(_,i)=>({id:String(i),title:'Pending finding '+i,status:'open'}))} userRole="admin" crmData={{contacts:[],notes:[],trackerEntries:[],userMap:{},isAvailable:true,unavailableMessage:null}} canEdit={false} initialTab={new URLSearchParams(location.search).get('tab')==='audit-history'?'audit history':'overview'}/>:location.search.includes('routes')?<RoutePlanningClient initialData={{stores:[...stores,planned].filter(s=>needsAuditVisit(s)||s.compliance_audit_2_planned_date),profiles:[]}}/>:<AuditTable rows={stores} userRole="admin"/>;
createRoot(document.getElementById('app')).render(content);`
const compiled = await build({ stdin: { contents: code, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'isolated-services', setup(b) {
 b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'router', namespace: 'stub' }))
 b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'stub' }))
 b.onResolve({ filter: /map-component$/ }, () => ({ path: 'map', namespace: 'stub' }))
 b.onResolve({ filter: /^next\/dynamic$/ }, () => ({ path: 'dynamic', namespace: 'stub' }))
 b.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({ path: 'client', namespace: 'stub' }))
 b.onResolve({ filter: /^@\/app\/actions\// }, args => ({ path: args.path, namespace: 'actions' }))
 b.onResolve({ filter: /(?:pdf-viewer-modal|saved-fra-pdf-viewer|store-actions-modal|route-directions-modal)$/ }, () => ({ path: 'modals', namespace: 'stub' }))
 b.onLoad({ filter: /.*/, namespace: 'actions' }, async args => {
  let file; for (const suffix of ['.ts','.tsx']) { try { file=await readFile(resolve(args.path.replace('@/', '')+suffix),'utf8');break } catch{} }
  if (!file) throw Error('Missing action module '+args.path)
  const names=[...file.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(m=>m[1])
  return { contents: names.map(n=>`export async function ${n}(){return {data:[],error:null}}`).join('\n'), loader: 'js' }
 })
 b.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ loader: 'js', resolveDir: process.cwd(), contents: args.path==='router'?`export const useRouter=()=>({refresh(){},push(){}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);`:
 args.path==='link'?`import React from 'react';export default function Link({prefetch,children,...props}){return React.createElement('a',props,children)}`:
 (args.path==='dynamic'||args.path==='map')?`export default ()=>()=>null`:
 args.path==='client'?`const q={select(){return q},in(){return q},eq(){return q},order(){return q},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};export const createClient=()=>({from:()=>q})`:
 `export const PDFViewerModal=()=>null;export const SavedFraPdfViewer=()=>null;export const StoreActionsModal=()=>null;export const RouteDirectionsModal=()=>null;` }))
} }] })
const css=(await Promise.all((await readdir('.next/static/css')).filter(f=>f.endsWith('.css')).map(f=>readFile('.next/static/css/'+f,'utf8')))).join('\n')
const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local follow-up test</title><style>${css}body{font-family:Arial,sans-serif;background:#f4f7fa}main{max-width:1440px;margin:auto;padding:20px}.preview{padding:12px;background:#fff7d6;border:1px solid #e1bd4a;margin-bottom:16px}</style></head><body><main><div class="preview">LOCAL PREVIEW · fictional evidence · no production changes</div><div id="app"></div></main><script>${compiled.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`
const server=createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(html)})
await new Promise(done=>server.listen(0,'127.0.0.1',done))
const browser=await chromium.launch({headless:true})
try {
 const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(8000);page.on('pageerror', error => console.log('UI_ERROR',error.message))
 await page.route('**/api/**',route=>route.fulfill({json:{originals:[{id:'22222222-2222-4222-8222-222222222222',audit_number:2,visit_date:'2026-09-17',percentage:73.2}],revisits:[{id:evidenceId,original_history_id:'22222222-2222-4222-8222-222222222222',revisit_date:'2026-10-22',notes:'Synthetic review; findings remain open.',file_name:'Fictional review.pdf',created_at:'2026-10-25T18:00:00Z'}]}}))
 const origin=`http://127.0.0.1:${server.address().port}`
 await page.goto(origin)
 const desktop=page.locator('.audit-register-table');await desktop.getByText('Revisit complete',{exact:true}).waitFor()
 assert.equal(await desktop.getByText('Revisit complete',{exact:true}).count(),1)
 assert.equal(await desktop.locator('.audit-store-row').getByText('73.20%',{exact:true}).count(),3)
 const report=desktop.locator(`button[data-evidence-url*="evidenceId=${evidenceId}"]`).first();assert.ok((await report.getAttribute('data-evidence-url')).includes(`storeId=${storeId}`))
 await page.screenshot({path:out+'/tracker-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/Area 1.*3/}).click()
 await page.locator('.audit-mobile-card').filter({hasText:'Dundee'}).getByText('Revisit complete',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.screenshot({path:out+'/tracker-mobile.png',fullPage:true})
 await page.setViewportSize({width:1500,height:1000});await page.goto(origin+'?view=routes')
 const queue=page.locator('[data-store-id]');await page.locator('[data-store-id="44444444-4444-4444-8444-444444444444"]').waitFor()
 assert.equal(await queue.count(),2)
 assert.equal(await page.locator('[data-store-id="11111111-1111-4111-8111-111111111111"]').count(),0)
 assert.equal(await page.locator('[data-store-id="33333333-3333-4333-8333-333333333333"]').count(),1)
 assert.ok((await page.locator('body').innerText()).includes('Unrelated planned return'))
 assert.ok((await page.locator('body').innerText()).includes('Stores in All Areas (2 stores)'))
 await page.screenshot({path:out+'/route-queue-desktop.png',fullPage:true})
 await page.goto(origin+`/stores/${storeId}?tab=audit-history#revisit-heading`)
 await page.getByRole('heading',{name:'Original audits & revisit evidence'}).waitFor()
 await page.getByRole('button',{name:'View Fictional review.pdf'}).waitFor()
 console.log('PASS: tracker desktop/mobile evidence indicator/count/link; later failures retained and completed current revisit absent from new-route selection; unrelated planned visit excluded from unplanned selection; history deep link opens evidence directly. Screenshots:',out)
} finally {await browser.close();await new Promise(done=>server.close(done))}
