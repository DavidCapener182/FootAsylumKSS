import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DEFAULT_ROSTER = resolve(HERE, 'footasylum-store-roster-2026-09-25.json')
const ACTION_PRIORITY = new Set(['Low', 'Medium', 'High'])

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function readEnvValue(source, name) {
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`))
  if (!line) return null
  const raw = line.slice(name.length + 1).trim()
  return raw.replace(/^(['"])(.*)\1$/, '$2')
}

async function loadConnection() {
  const local = await readFile(resolve(process.cwd(), '.env.local'), 'utf8').catch(() => '')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || readEnvValue(local, 'NEXT_PUBLIC_SUPABASE_URL')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || readEnvValue(local, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase URL and service role key are required for the read-only inventory')
  return { url, key }
}

async function selectAll(client, table, columns, configure = (query) => query) {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const query = configure(client.from(table).select(columns)).range(offset, offset + 499)
    const { data, error } = await query
    if (error) throw new Error(`Unable to read ${table}: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < 500) return rows
  }
}

/** Produces review records only. It never decides whether a finding remains open. */
export function reconcileFraHistory({ roster, stores, templates, instances, responses, publications, history }) {
  if (!Array.isArray(roster?.stores) || !roster.projectId) throw new Error('An explicit tenant store roster is required')
  const approved = new Map(roster.stores.map((store) => [store.id, store]))
  if (approved.size !== roster.stores.length) throw new Error('Duplicate store ID in roster')
  const storeById = new Map(stores.map((store) => [store.id, store]))
  for (const entry of approved.values()) {
    const current = storeById.get(entry.id)
    if (!current || current.store_code !== entry.code || current.store_name !== entry.name) {
      throw new Error(`Store roster needs review: ${entry.id}`)
    }
  }
  const fraTemplateIds = new Set(templates.filter((template) => template.category === 'fire_risk_assessment').map((template) => template.id))
  const fraInstances = instances.filter((instance) => approved.has(instance.store_id) && fraTemplateIds.has(instance.template_id))
  const instanceById = new Map(fraInstances.map((instance) => [instance.id, instance]))
  const responsesByInstance = new Map()
  for (const response of responses) {
    if (!instanceById.has(response.audit_instance_id)) continue
    const list = responsesByInstance.get(response.audit_instance_id) || []
    list.push(response)
    responsesByInstance.set(response.audit_instance_id, list)
  }
  const confirmedByInstance = new Map()
  for (const publication of publications) {
    if (!publication.confirmed_at || !instanceById.has(publication.instance_id)) continue
    const prior = confirmedByInstance.get(publication.instance_id)
    if (!prior || publication.confirmed_at > prior.confirmed_at) confirmedByInstance.set(publication.instance_id, publication)
  }
  const historyByStore = new Map()
  for (const row of history) {
    if (row.kind !== 'FRA' || !approved.has(row.store_id)) continue
    const list = historyByStore.get(row.store_id) || []
    list.push({ visitDate: row.visit_date, pdfPath: row.pdf_path })
    historyByStore.set(row.store_id, list)
  }

  const candidateActions = []
  const assessmentInventory = fraInstances.map((instance) => {
    const store = storeById.get(instance.store_id)
    const publication = confirmedByInstance.get(instance.id) || null
    const sourceResponses = responsesByInstance.get(instance.id) || []
    const actionResponses = sourceResponses.filter((response) =>
      Array.isArray(asRecord(asRecord(response.response_json).fra_extracted_data).actionPlanItems))
    const duplicateArrays = actionResponses.length > 1
    for (const response of actionResponses) {
      const items = asRecord(asRecord(response.response_json).fra_extracted_data).actionPlanItems
      items.forEach((raw, index) => {
        const item = asRecord(raw)
        const recommendation = typeof item.recommendation === 'string' ? item.recommendation : ''
        const flags = ['CLASSIFICATION_REQUIRED', 'COMPLETION_STATUS_UNKNOWN', 'ISSUED_PDF_ACTION_LIST_UNVERIFIED']
        if (!publication) flags.push('NO_CONFIRMED_PUBLICATION')
        if (duplicateArrays) flags.push('MULTIPLE_SOURCE_ACTION_ARRAYS')
        if (!recommendation.trim()) flags.push('EMPTY_RECOMMENDATION')
        if (!ACTION_PRIORITY.has(item.priority)) flags.push('PRIORITY_REVIEW_REQUIRED')
        candidateActions.push({
          stagingKey: `${instance.id}:${response.id}:${index + 1}`,
          storeId: store.id,
          storeCode: store.store_code,
          assessmentInstanceId: instance.id,
          responseId: response.id,
          sourceJsonPath: `fra_extracted_data.actionPlanItems[${index}]`,
          sourceOrdinal: index + 1,
          // Preserve the exact serialization used by sourceItemSha256. PostgreSQL
          // jsonb text has different spacing/key-order rules from JSON.stringify.
          sourceItemJson: JSON.stringify(raw),
          sourceItemSha256: sha256(raw),
          publicationId: publication?.id || null,
          confirmedPdfPath: publication?.pdf_path || null,
          confirmedPdfSha256: publication?.pdf_sha256 || null,
          recommendation,
          priority: ACTION_PRIORITY.has(item.priority) ? item.priority : null,
          dueNote: typeof item.dueNote === 'string' ? item.dueNote : null,
          reviewNeeded: true,
          trackingEligible: false,
          reviewFlags: flags,
        })
      })
    }
    return {
      storeId: store.id,
      storeCode: store.store_code,
      storeName: store.store_name,
      instanceId: instance.id,
      templateId: instance.template_id,
      status: instance.status,
      conductedAt: instance.conducted_at,
      responseRows: sourceResponses.length,
      explicitActionArrays: actionResponses.length,
      explicitActionItems: actionResponses.reduce((count, response) =>
        count + asRecord(asRecord(response.response_json).fra_extracted_data).actionPlanItems.length, 0),
      confirmedPublication: publication ? { id: publication.id, pdfPath: publication.pdf_path, pdfSha256: publication.pdf_sha256, confirmedAt: publication.confirmed_at } : null,
      storeCurrentPdfReference: store.fire_risk_assessment_pdf_path || null,
      storePdfIdentityVerified: false,
    }
  })
  const assessedStoreIds = new Set(fraInstances.map((instance) => instance.store_id))
  const storeInventory = [...approved.values()].map((entry) => {
    const store = storeById.get(entry.id)
    return {
      storeId: store.id,
      storeCode: store.store_code,
      storeName: store.store_name,
      isActive: store.is_active,
      latestFraDate: store.fire_risk_assessment_date,
      currentFraPdfReference: store.fire_risk_assessment_pdf_path,
      historicalFraReferences: historyByStore.get(store.id) || [],
      hasSafehubFraInstance: assessedStoreIds.has(store.id),
      sourceReviewNeeded: !!store.fire_risk_assessment_date && !assessedStoreIds.has(store.id),
    }
  })
  return {
    generatedAt: new Date().toISOString(),
    projectId: roster.projectId,
    rosterReviewedOn: roster.reviewedOn,
    note: 'Read-only candidate inventory. No action is classified, open, due or safe to migrate until the issued FRA and current completion evidence are reviewed.',
    summary: {
      rosterStores: approved.size,
      fraInstances: assessmentInventory.length,
      assessmentsWithExplicitActionArrays: assessmentInventory.filter((row) => row.explicitActionArrays > 0).length,
      explicitCandidateItems: candidateActions.length,
      confirmedAssessmentPublications: assessmentInventory.filter((row) => row.confirmedPublication).length,
      datedStoresWithoutSafehubInstance: storeInventory.filter((row) => row.sourceReviewNeeded).length,
      trackingEligibleItems: 0,
    },
    storeInventory,
    assessmentInventory,
    candidateActions,
  }
}

async function main() {
  const outputFlag = process.argv.indexOf('--output')
  const rosterFlag = process.argv.indexOf('--roster')
  if (outputFlag < 0 || !process.argv[outputFlag + 1]) {
    throw new Error('Usage: node scripts/fra-actions/reconcile-history.mjs --output /absolute/path.json [--roster /absolute/path.json]')
  }
  const output = resolve(process.argv[outputFlag + 1])
  const roster = JSON.parse(await readFile(rosterFlag >= 0 ? resolve(process.argv[rosterFlag + 1]) : DEFAULT_ROSTER, 'utf8'))
  const { url, key } = await loadConnection()
  if (new URL(url).hostname.split('.')[0] !== roster.projectId) throw new Error('Store roster belongs to a different Supabase project')
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const [stores, templates, instances, responses, publications, history] = await Promise.all([
    selectAll(client, 'fa_stores', 'id,store_code,store_name,is_active,fire_risk_assessment_date,fire_risk_assessment_pdf_path'),
    selectAll(client, 'fa_audit_templates', 'id,category,title'),
    selectAll(client, 'fa_audit_instances', 'id,template_id,store_id,status,conducted_at,created_at'),
    selectAll(client, 'fa_audit_responses', 'id,audit_instance_id,response_json,created_at'),
    selectAll(client, 'fa_fra_publications', 'id,instance_id,store_id,pdf_path,pdf_sha256,confirmed_at'),
    selectAll(client, 'fa_store_audit_history', 'store_id,kind,visit_date,pdf_path'),
  ])
  const report = reconcileFraHistory({ roster, stores, templates, instances, responses, publications, history })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ output, ...report.summary }))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
