// Real dialog, transport, PDF.js and browser downloads; fictional local files only.
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const out = 'output/playwright/revisit-preview'
await mkdir(out, {recursive:true})
const pdf = await PDFDocument.create()
for(let i=1;i<=6;i++) pdf.addPage([420,595]).drawText('Fictional revisit evidence page '+i,{x:30,y:550,size:18})
const bytes = Buffer.from(await pdf.save()), hash = createHash('sha256').update(bytes).digest('hex')
const bundle = await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{EvidencePreviewButton}from'./components/shared/evidence-preview-button';createRoot(document.getElementById('app')).render(<EvidencePreviewButton href="/api/audit-revisits?storeId=local&uri=ignored&evidenceId=fictional" title="Fictional revisit evidence">View report</EvidencePreviewButton>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}})
const css=(await Promise.all((await readdir('.next/static/css')).filter(f=>f.endsWith('.css')).map(f=>readFile('.next/static/css/'+f,'utf8')))).join('\n')
let mode='success', requests=0
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/pdfjs/')){const name=req.url.split('/').pop();if(!['pdf.min.mjs','pdf.worker.min.mjs'].includes(name)){res.writeHead(404).end();return}res.setHeader('Content-Type','text/javascript');res.end(await readFile('public/pdfjs/'+name));return}
 if(req.url.startsWith('/api/')){requests++;if(mode==='delayed'){await new Promise(r=>setTimeout(r,500))}if(mode==='401'||mode==='403'||mode==='404'||mode==='503'){res.writeHead(Number(mode),{'Content-Type':'application/json'}).end('{}');return}if(mode==='html'){res.writeHead(200,{'Content-Type':'text/html'}).end('<html>Sign in</html>');return}res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="Fictional.pdf"; filename*=UTF-8''Fictional%20review.pdf`,'X-Content-SHA256':mode==='corrupt'?'0'.repeat(64):hash});res.end(bytes);return}
 res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local preview test</title><style>${css}</style></head><body><h1>LOCAL FICTIONAL PREVIEW</h1><div id="app"></div><script>${bundle.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`)
})
await new Promise(done=>server.listen(0,'127.0.0.1',done))
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);await page.emulateMedia({reducedMotion:'reduce'})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`http://127.0.0.1:${server.address().port}`)
 const trigger=page.getByRole('button',{name:'View report'})
 await trigger.click();await page.locator('[data-viewing-document*="page 1 of 6"]').waitFor()
 await page.getByRole('spinbutton',{name:'PDF page number'}).fill('6')
 await page.locator('[data-viewing-document*="page 6 of 6"]').waitFor()
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download Fictional review.pdf'}).click();const download=await downloadPromise
 assert.equal(download.suggestedFilename(),'Fictional review.pdf');assert.equal(createHash('sha256').update(await readFile(await download.path())).digest('hex'),hash)
 await page.screenshot({path:out+'/desktop.png',fullPage:true})
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.activeElement?.textContent==='View report')
 for(const [failure,message] of [['401','session has expired'],['403','permission'],['404','unavailable'],['503','could not be retrieved'],['html','file was not returned'],['corrupt','verification failed']]){
  mode=failure;await trigger.click();await page.getByRole('alert').filter({hasText:message}).waitFor();assert.equal(await page.getByRole('link',{name:/Download/}).count(),0)
  mode='success';await page.getByRole('button',{name:'Retry evidence'}).click();await page.locator('[data-viewing-document*="page 1 of 6"]').waitFor();await page.keyboard.press('Escape')
 }
 mode='delayed';await trigger.click();await page.getByText('Loading evidence…',{exact:true}).waitFor();await page.keyboard.press('Escape');mode='success';await trigger.click();await page.locator('[data-viewing-document*="page 1 of 6"]').waitFor()
 await page.keyboard.press('Tab');assert.equal(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),true)
 await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await trigger.click();await page.locator('[data-viewing-document*="page 1 of 6"]').waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 const dialog=await page.getByRole('dialog').boundingBox();assert.ok(dialog.width<=390&&dialog.height<=844)
 await page.screenshot({path:out+'/mobile.png',fullPage:true});await page.getByRole('button',{name:'Close',exact:true}).click()
 assert.deepEqual(errors,[])
 console.log('PASS real PDF.js six-page rendering, exact download hash/name, 401/403/404/503/HTML/corruption + retry, interrupted/reopened fetch, Escape/focus trap/restoration, mobile bounds; requests='+requests+'; synthetic SHA256='+hash)
}finally{await browser.close();await new Promise(done=>server.close(done))}
