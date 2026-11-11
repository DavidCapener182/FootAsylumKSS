import { describe, expect, it } from 'vitest'
import { readPreOpeningPdfToc, PRE_OPENING_TOC_HEADINGS, resolvePreOpeningToc } from './pdf-toc'

describe('pre-opening physical PDF contents', () => {
  it('uses physical pages after arbitrary photo and findings overflow, not section indices', () => {
    const labels = Object.keys(PRE_OPENING_TOC_HEADINGS)
    const pages = [{ num: 3, text: `Table of Contents\n${labels.map(label => `${label}\t2`).join('\n')}` },
      ...labels.map((label, index) => ({ num: 4 + index * 3, text: `Pre-Opening Fire Risk Assessment\n${PRE_OPENING_TOC_HEADINGS[label]}\nBody text` }))]
    const result = resolvePreOpeningToc(pages, labels)
    expect(result['Purpose of This Assessment']).toBe(4)
    expect(result['Action Plan']).toBe(46)
    expect(result['Additional Site Pictures / Appendices']).toBe(49)
  })
  it('finds headings wrapped across lines and ignores numbered TOC entries', () => {
    const label = 'Stage 3 – Evaluate, remove, reduce and protect from risk'
    expect(resolvePreOpeningToc([
      { num: 3, text: `${label}\t10` },
      { num: 25, text: 'Stage 3 – Evaluate, remove, reduce and\nprotect from risk\nMore text' },
    ], [label])[label]).toBe(25)
  })
  it('reads real PDF page numbers and preserves the bytes returned to the client', async () => {
    // Match the serverless runtime: no browser matrix global is available.
    const originalMatrix = globalThis.DOMMatrix
    delete (globalThis as any).DOMMatrix
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    doc.addPage().drawText('Fire Plan 2') // TOC entry, not the destination
    for (let i = 0; i < 5; i++) doc.addPage().drawText('Photo / long findings continuation')
    doc.addPage().drawText('Fire Plan')
    const bytes = await doc.save()
    const before = Buffer.from(bytes)
    expect(await readPreOpeningPdfToc(bytes, ['Fire Plan'])).toEqual({ 'Fire Plan': 7 })
    expect(Buffer.from(bytes)).toEqual(before)
    expect(typeof globalThis.DOMMatrix).toBe('function')
    if (originalMatrix) globalThis.DOMMatrix = originalMatrix
  })
  it('cold-starts without browser globals or optional native canvas', async () => {
    const { execFileSync } = await import('node:child_process')
    const script = `
      const fs=require('fs'),ts=require('typescript'),Module=require('module'),path=require('path');
      (async()=>{
        const {PDFDocument}=require('pdf-lib'); const pdf=await PDFDocument.create();
        pdf.addPage().drawText('Fire Plan'); const bytes=await pdf.save();
        delete globalThis.DOMMatrix;
        const original=Module._load;
        Module._load=function(name,...rest){ if(String(name).includes('@napi-rs/canvas')) throw Error('Native canvas unavailable'); return original.call(this,name,...rest); };
        const filename=path.resolve('lib/fra/pdf-toc.cjs'); const mod=new Module(filename,module);
        mod.filename=filename; mod.paths=Module._nodeModulePaths(path.dirname(filename));
        mod._compile(ts.transpileModule(fs.readFileSync('lib/fra/pdf-toc.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
        const result=await mod.exports.readPreOpeningPdfToc(bytes,['Fire Plan']);
        if(result['Fire Plan']!==1 || typeof globalThis.DOMMatrix!=='function') throw Error('Cold parser failed');
        console.log('cold-parser-ok');
      })().catch(error=>{console.error(error);process.exit(1)});
    `
    expect(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })).toContain('cold-parser-ok')
  })
  it('fails rather than publishing missing, ambiguous or unknown targets', () => {
    expect(() => resolvePreOpeningToc([], ['Fire Plan'])).toThrow('0 matching pages')
    expect(() => resolvePreOpeningToc([{num: 2,text:'Fire Plan'}, {num: 7,text:'Fire Plan'}], ['Fire Plan'])).toThrow('2 matching pages')
    expect(() => resolvePreOpeningToc([], ['New heading'])).toThrow('Unrecognized')
  })
})
