'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CloudOff, FileCheck2, Loader2, ShieldAlert } from 'lucide-react'
import { createIncident } from '@/app/actions/incidents'
import { uploadAttachment } from '@/app/actions/attachments'
import { EvidenceUploader, PageHeader } from '@/components/product'
import { OfflineStatus } from '@/components/offline/offline-status'
import { useOfflineSync } from '@/components/offline/offline-sync-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { getOfflineDraft } from '@/lib/offline/indexed-db'
import { compressEvidenceFiles } from '@/lib/offline/images'
import { canSubmitFinalRecord } from '@/lib/offline/sync'
import { shouldHideStore } from '@/lib/store-normalization'
import { incidentFormSchema, toCreateIncidentInput, type IncidentFormValues } from '@/lib/incidents/schema'

type StoreOption = { id: string; store_name: string; store_code: string | null }
type YesNo = 'yes' | 'no' | ''
type RiddorFact = 'death' | 'specifiedInjury' | 'overSevenDayAbsence' | 'publicTakenToHospital' | 'dangerousOccurrence'
type SupportingDetails = {
  immediateDanger: YesNo
  emergencyServices: YesNo
  personName: string
  personRole: string
  personContact: string
  injuryDescription: string
  firstAid: string
  lostTimeDays: string
  witnesses: string
  riddorFacts: Record<RiddorFact, boolean>
  confirmed: boolean
}
type DeviceDraft = { form: IncidentFormValues; supporting: SupportingDetails; evidence: File[] }

const DRAFT_ID = 'incident-new-current-user'
const steps = ['Where and when', 'Incident type', 'Immediate danger', 'Person involved', 'Injury or loss', 'First aid', 'Witnesses', 'Evidence', 'RIDDOR screening', 'Review and submit'] as const
const defaultSupporting: SupportingDetails = {
  immediateDanger: '', emergencyServices: '', personName: '', personRole: '', personContact: '',
  injuryDescription: '', firstAid: '', lostTimeDays: '', witnesses: '', confirmed: false,
  riddorFacts: { death: false, specifiedInjury: false, overSevenDayAbsence: false, publicTakenToHospital: false, dangerousOccurrence: false },
}

export function GuidedIncidentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [stores, setStores] = useState<StoreOption[]>([])
  const [supporting, setSupporting] = useState(defaultSupporting)
  const [evidence, setEvidence] = useState<File[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState('Draft not yet saved')
  const [isPreparingEvidence, setIsPreparingEvidence] = useState(false)
  const restored = useRef(false)
  const { saveDraft, discardDraft, isOnline, isSyncing } = useOfflineSync()
  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: { store_id: '', incident_category: 'other', severity: 'medium', summary: '', description: '', occurred_at: new Date().toISOString().slice(0, 16), riddor_reportable: '' },
  })
  const values = form.watch()
  const possibleRiddor = Object.values(supporting.riddorFacts).some(Boolean)
  const selectedStore = useMemo(() => stores.find((store) => store.id === values.store_id), [stores, values.store_id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const [{ data }, draft] = await Promise.all([
        supabase.from('fa_stores').select('id, store_name, store_code').eq('is_active', true).order('store_name'),
        getOfflineDraft<DeviceDraft>(DRAFT_ID).catch(() => null),
      ])
      if (cancelled) return
      setStores((data || []).filter((store) => !shouldHideStore(store)))
      if (draft?.payload) {
        form.reset(draft.payload.form)
        setSupporting(draft.payload.supporting)
        setEvidence(Array.isArray(draft.payload.evidence) ? draft.payload.evidence : [])
        setDraftMessage(`Recovered device draft from ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
      }
      restored.current = true
    }
    void load()
    return () => { cancelled = true }
  }, [form])

  useEffect(() => {
    const preset = searchParams?.get('storeId')
    if (preset && stores.some((store) => store.id === preset)) form.setValue('store_id', preset)
  }, [form, searchParams, stores])

  useEffect(() => {
    if (!restored.current) return
    const timeout = window.setTimeout(async () => {
      try {
        await saveDraft({ id: DRAFT_ID, kind: 'incident', payload: { form: values, supporting, evidence } })
        setDraftMessage(`Saved on this device at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
      } catch {
        setDraftMessage('This browser could not save the device draft.')
      }
    }, 600)
    return () => window.clearTimeout(timeout)
  }, [evidence, saveDraft, supporting, values])

  useEffect(() => {
    form.setValue('riddor_reportable', possibleRiddor ? 'yes' : 'no', { shouldValidate: true })
  }, [form, possibleRiddor])

  function update<Key extends keyof SupportingDetails>(key: Key, value: SupportingDetails[Key]) {
    setSupporting((current) => ({ ...current, [key]: value }))
  }

  async function selectEvidence(files: File[]) {
    setIsPreparingEvidence(true)
    try {
      const preparedFiles = await compressEvidenceFiles(files)
      setEvidence((current) => [...current, ...preparedFiles])
    }
    finally { setIsPreparingEvidence(false) }
  }

  async function continueForward() {
    const fields: Array<Array<keyof IncidentFormValues>> = [
      ['store_id', 'occurred_at'], ['incident_category', 'severity', 'summary', 'description'], [], [], [], [], [], [], ['riddor_reportable'], [],
    ]
    if (fields[step].length === 0 || await form.trigger(fields[step])) setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  const submit = form.handleSubmit(async (formValues) => {
    setSubmitError(null)
    if (!canSubmitFinalRecord(isOnline, isSyncing)) {
      setSubmitError('This report is saved on this device. Reconnect before final submission so the platform can confirm the incident and evidence.')
      return
    }
    if (!supporting.confirmed) {
      setSubmitError('Confirm that the report is accurate before final submission.')
      return
    }
    try {
      const input = toCreateIncidentInput(formValues)
      const incident = await createIncident({
        ...input,
        persons_involved: supporting.personName || supporting.personRole || supporting.personContact
          ? { name: supporting.personName, role: supporting.personRole, contact: supporting.personContact }
          : undefined,
        injury_details: {
          description: supporting.injuryDescription,
          first_aid: supporting.firstAid,
          lost_time_days: supporting.lostTimeDays ? Number(supporting.lostTimeDays) : null,
          immediate_danger: supporting.immediateDanger === 'yes',
          emergency_services_contacted: supporting.emergencyServices === 'yes',
          riddor_screening_facts: supporting.riddorFacts,
        },
        witnesses: supporting.witnesses ? { notes: supporting.witnesses } : undefined,
      })
      for (const file of evidence) await uploadAttachment('incident', incident.id, file)
      await discardDraft(DRAFT_ID)
      router.push(`/incidents/${incident.id}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed. Your device draft has been retained.')
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader eyebrow="Field report" title="Report an incident" description="Record the facts now. An authorised manager reviews RIDDOR decisions and escalation." breadcrumbs={[{ label: 'Incidents', href: '/incidents' }, { label: 'New report' }]} secondaryActions={<OfflineStatus compact />} />
      {supporting.immediateDanger === 'yes' ? <EmergencyWarning /> : null}
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <StepNavigation step={step} setStep={setStep} />
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 p-4 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Step {step + 1} of {steps.length}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{steps[step]}</h2>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lime-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          </header>
          <form onSubmit={submit} className="space-y-5 p-4 sm:p-6">
            {step === 0 ? <WhereWhen stores={stores} form={form} /> : null}
            {step === 1 ? <IncidentType form={form} /> : null}
            {step === 2 ? <div className="space-y-5"><Choice label="Is anyone in immediate danger now?" value={supporting.immediateDanger} onChange={(value) => update('immediateDanger', value)} /><Choice label="Were emergency services contacted?" value={supporting.emergencyServices} onChange={(value) => update('emergencyServices', value)} /><Info>This form does not replace emergency action or the duty-manager escalation process.</Info></div> : null}
            {step === 3 ? <div className="space-y-4"><TextInput label="Name (if known and necessary)" value={supporting.personName} onChange={(value) => update('personName', value)} /><TextInput label="Role or relationship" placeholder="Colleague, customer, contractor, visitor" value={supporting.personRole} onChange={(value) => update('personRole', value)} /><TextInput label="Contact detail (only if operationally required)" value={supporting.personContact} onChange={(value) => update('personContact', value)} /></div> : null}
            {step === 4 ? <div className="space-y-4"><TextArea label="Injury, illness, damage or loss details" hint="Describe what is known. Do not add a diagnosis unless supplied by a clinician." value={supporting.injuryDescription} onChange={(value) => update('injuryDescription', value)} /><TextInput type="number" label="Known or expected days absent" value={supporting.lostTimeDays} onChange={(value) => update('lostTimeDays', value)} /></div> : null}
            {step === 5 ? <TextArea label="First aid and emergency response" hint="Record who responded, what was done, and any handover to medical or emergency services." value={supporting.firstAid} onChange={(value) => update('firstAid', value)} /> : null}
            {step === 6 ? <TextArea label="Witness names and factual accounts" hint="Record contact details only where operationally necessary." value={supporting.witnesses} onChange={(value) => update('witnesses', value)} /> : null}
            {step === 7 ? <Evidence evidence={evidence} preparing={isPreparingEvidence} onFiles={selectEvidence} onRemove={(index) => setEvidence((current) => current.filter((_, itemIndex) => itemIndex !== index))} /> : null}
            {step === 8 ? <Riddor facts={supporting.riddorFacts} possible={possibleRiddor} update={(key, checked) => setSupporting((current) => ({ ...current, riddorFacts: { ...current.riddorFacts, [key]: checked } }))} /> : null}
            {step === 9 ? <Review values={values} store={selectedStore} supporting={supporting} evidenceCount={evidence.length} onConfirm={(checked) => update('confirmed', checked)} /> : null}
            {submitError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">{submitError}</div> : null}
            <footer className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">{!isOnline ? <CloudOff className="h-4 w-4 text-amber-600" /> : <FileCheck2 className="h-4 w-4 text-emerald-600" />}{draftMessage}</div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="min-h-[46px]" onClick={() => step ? setStep(step - 1) : router.back()}>{step ? <><ArrowLeft className="mr-2 h-4 w-4" />Back</> : 'Cancel'}</Button>
                {step < steps.length - 1 ? <Button type="button" className="min-h-[46px] bg-[#143457]" onClick={() => void continueForward()}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" className="min-h-[46px] bg-emerald-700" disabled={form.formState.isSubmitting || !isOnline || isSyncing}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting</> : 'Confirm and submit'}</Button>}
              </div>
            </footer>
          </form>
        </section>
      </div>
    </div>
  )
}

function StepNavigation({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  return <nav aria-label="Incident report progress" className="hidden rounded-2xl border border-slate-200 bg-white p-3 lg:block"><ol className="space-y-1">{steps.map((label, index) => <li key={label}><button type="button" onClick={() => setStep(index)} className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${index === step ? 'bg-[#143457] text-white' : index < step ? 'text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${index < step ? 'bg-emerald-100 text-emerald-800' : index === step ? 'bg-white/15' : 'bg-slate-100'}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>{label}</button></li>)}</ol></nav>
}

function EmergencyWarning() { return <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-950"><div className="flex gap-3"><ShieldAlert className="h-6 w-6 shrink-0" /><div><p className="font-bold">Immediate danger</p><p className="mt-1 text-sm leading-6">Protect life first. Call 999 where required, notify the duty manager, and do not delay emergency action to finish this form.</p></div></div></div> }
function FieldError({ message }: { message?: string }) { return message ? <span role="alert" className="mt-1 block text-xs font-medium text-red-700">{message}</span> : null }
function WhereWhen({ stores, form }: { stores: StoreOption[]; form: ReturnType<typeof useForm<IncidentFormValues>> }) { const errors = form.formState.errors; return <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-900">Store *<select className="mt-2 min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm" {...form.register('store_id')}><option value="">Select a store</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.store_name}{store.store_code ? ` (${store.store_code})` : ''}</option>)}</select><FieldError message={errors.store_id?.message} /></label><label className="text-sm font-semibold text-slate-900">Date and time *<Input className="mt-2" type="datetime-local" {...form.register('occurred_at')} /><FieldError message={errors.occurred_at?.message} /></label></div> }
function IncidentType({ form }: { form: ReturnType<typeof useForm<IncidentFormValues>> }) { const errors = form.formState.errors; return <div className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Category *<select className="mt-2 min-h-[44px] w-full rounded-md border border-input bg-background px-3" {...form.register('incident_category')}><option value="accident">Accident</option><option value="near_miss">Near miss</option><option value="security">Security</option><option value="fire">Fire</option><option value="health_safety">Health & safety</option><option value="other">Other</option></select></label><label className="text-sm font-semibold">Observed severity *<select className="mt-2 min-h-[44px] w-full rounded-md border border-input bg-background px-3" {...form.register('severity')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div><label className="block text-sm font-semibold">Short factual summary *<Input className="mt-2" {...form.register('summary')} /><FieldError message={errors.summary?.message} /></label><label className="block text-sm font-semibold">What was observed?<Textarea className="mt-2" rows={6} {...form.register('description')} placeholder="Record facts, location and immediate circumstances. Avoid assumptions." /><FieldError message={errors.description?.message} /></label></div> }
function Choice({ label, value, onChange }: { label: string; value: YesNo; onChange: (value: YesNo) => void }) { return <fieldset><legend className="text-sm font-semibold text-slate-900">{label}</legend><div className="mt-2 grid grid-cols-2 gap-2">{(['yes', 'no'] as const).map((choice) => <button key={choice} type="button" aria-pressed={value === choice} onClick={() => onChange(choice)} className={`min-h-[48px] rounded-xl border px-4 text-sm font-bold ${value === choice ? 'border-[#143457] bg-[#143457] text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{choice === 'yes' ? 'Yes' : 'No'}</button>)}</div></fieldset> }
function Info({ children }: { children: React.ReactNode }) { return <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{children}</p> }
function TextInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) { return <label className="block text-sm font-semibold text-slate-900">{label}<Input className="mt-2" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label> }
function TextArea({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) { return <label className="block text-sm font-semibold text-slate-900">{label}<Textarea className="mt-2" rows={7} value={value} onChange={(event) => onChange(event.target.value)} />{hint ? <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}</label> }
function Evidence({ evidence, preparing, onFiles, onRemove }: { evidence: File[]; preparing: boolean; onFiles: (files: File[]) => void; onRemove: (index: number) => void }) { return <div className="space-y-4"><EvidenceUploader label={preparing ? 'Preparing photographs…' : 'Take photo or add evidence'} capture="environment" disabled={preparing} onFilesSelected={onFiles} hint="Large photographs are compressed on this device before upload. Evidence stays in the device draft until final submission." />{evidence.length ? <ul className="divide-y rounded-xl border">{evidence.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 p-3 text-sm"><span className="truncate font-medium">{file.name}</span><button type="button" onClick={() => onRemove(index)} className="min-h-[44px] px-2 text-xs font-bold text-red-700">Remove</button></li>)}</ul> : null}</div> }
function Riddor({ facts, possible, update }: { facts: SupportingDetails['riddorFacts']; possible: boolean; update: (key: RiddorFact, checked: boolean) => void }) { const questions: Array<[RiddorFact, string]> = [['death', 'Did the incident result in a death?'], ['specifiedInjury', 'Was a specified serious injury reported?'], ['overSevenDayAbsence', 'Is a worker expected to be unable to perform normal duties for more than seven consecutive days?'], ['publicTakenToHospital', 'Was a member of the public taken directly to hospital for treatment?'], ['dangerousOccurrence', 'Was there a dangerous occurrence or reportable near miss?']]; return <div className="space-y-3">{questions.map(([key, label]) => <label key={key} className="flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border p-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={facts[key]} onChange={(event) => update(key, event.target.checked)} /><span className="text-sm font-medium leading-6">{label}</span></label>)}<div className={`rounded-xl border p-4 ${possible ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}><p className="font-bold">{possible ? 'Manager review required' : 'No factual trigger selected'}</p><p className="mt-1 text-sm leading-6">This is a factual screen, not the final legal determination. An authorised manager must confirm the outcome.</p></div></div> }
function Review({ values, store, supporting, evidenceCount, onConfirm }: { values: IncidentFormValues; store?: StoreOption; supporting: SupportingDetails; evidenceCount: number; onConfirm: (checked: boolean) => void }) { const rows = [['Store', store?.store_name || 'Not selected'], ['Occurred', values.occurred_at ? new Date(values.occurred_at).toLocaleString() : 'Not entered'], ['Category', values.incident_category.replace(/_/g, ' ')], ['Severity', values.severity], ['Summary', values.summary || 'Not entered'], ['Evidence', `${evidenceCount} file${evidenceCount === 1 ? '' : 's'}`], ['Immediate danger', supporting.immediateDanger || 'Not answered'], ['RIDDOR', values.riddor_reportable === 'yes' ? 'Manager review required' : 'No current factual trigger']]; return <div className="space-y-4"><dl className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold capitalize text-slate-900">{value}</dd></div>)}</dl><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 p-4"><input type="checkbox" className="mt-1 h-5 w-5" checked={supporting.confirmed} onChange={(event) => onConfirm(event.target.checked)} /><span className="text-sm font-medium leading-6">I confirm this report is accurate to the best of my knowledge and understand it will be submitted to the platform now.</span></label></div> }
