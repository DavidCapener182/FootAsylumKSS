import {beforeEach,describe,it,expect,vi} from 'vitest'
const {text,destroy}=vi.hoisted(()=>({text:vi.fn(),destroy:vi.fn()}))
vi.mock('pdf-parse',()=>({PDFParse:class{getText=text;destroy=destroy}}))
import {importAuditPdfActions} from './import-pdf-actions'
const base={userId:'user',storeId:'store',auditNumber:2 as const,filePath:'store/store/audit2.pdf',file:new File(['%PDF'], 'audit.pdf')}
function client(existing=false){
 const mutations: {table:string;data:any}[]=[]
 const db={from:vi.fn((table:string)=>{
  const chain:any={select:()=>chain,eq:()=>chain,single:async()=>({data:{store_name:'Sunderland',store_code:'S0057',postcode:'SR1 3LB',compliance_audit_2_pdf_path:base.filePath,compliance_audit_1_date:'2026-01-09'},error:null}),maybeSingle:async()=>({data:existing?{id:'existing-completed'}:null,error:null}),insert:async(data:any)=>{mutations.push({table,data});return{error:null}},upsert:async(data:any)=>{mutations.push({table,data});return{error:null}}};return chain
 })}
 return {db:db as any,mutations}
}
beforeEach(()=>{vi.clearAllMocks();text.mockResolvedValue({pages:[{num:1,text:'Sunderland\nConducted on 4 Aug 2026\nFlagged items 1'},{num:2,text:'Flagged items 1 flagged\nFire Safety\nCombustible materials are stored correctly? No\nStock at stairs.\n2.Disclaimer'}]})})
describe('automatic PDF actions',()=>{
 it('never imports first-audit findings',async()=>{const {db}=client();expect((await importAuditPdfActions({...base,auditNumber:1,supabase:db})).status).toBe('skipped');expect(db.from).not.toHaveBeenCalled();expect(text).not.toHaveBeenCalled()})
 it('creates a source-linked second-audit action with a six-month lifetime',async()=>{const{db,mutations}=client();const result=await importAuditPdfActions({...base,supabase:db});expect(result.count).toBe(1);expect(mutations.find(m=>m.table==='fa_store_actions')?.data).toMatchObject({source_audit_number:2,source_audit_date:'2026-08-04',active_until:'2027-02-04',status:'open',ai_generated:false,description:'Stock at stairs.'})})
 it('does not reopen or duplicate an already imported finding',async()=>{const{db,mutations}=client(true);expect((await importAuditPdfActions({...base,supabase:db})).count).toBe(0);expect(mutations.filter(m=>m.table==='fa_store_actions')).toEqual([])})
 it('records a review requirement without partial actions when extraction cannot match the PDF count',async()=>{text.mockResolvedValue({pages:[{num:1,text:'Flagged items 2'},{num:2,text:'Flagged items 2 flagged\nFire Safety\nA question? No'}]});const{db,mutations}=client();expect((await importAuditPdfActions({...base,supabase:db})).status).toBe('needs_review');expect(mutations.every(m=>m.table==='fa_audit_pdf_imports')).toBe(true)})
})
