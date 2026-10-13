# One visit: H&S audit and Fire Risk Assessment

Prepared 20 September 2026. **Design proposal, not an activated integration.**

## Recommended outcome

Collect the fire-assessment facts inside the H&S visit, once. Completing an opted-in H&S audit automatically creates a linked **FRA draft**, with the findings, photographs, records and actions already populated. The assessor reviews the remaining gaps and risk judgement, previews the familiar FRA, then approves and saves the issued PDF.

Use a separate **2027 FRA pilot** route initially. Keep the existing SafeHub text-import process available and unchanged. Do not activate the replacement merely because the date reaches 2027; activation follows approval.

The additional questions are unscored evidence fields. They must not change the H&S scoring denominator or force every colleague to answer every interview topic. An incomplete FRA evidence pack must not prevent completing the H&S audit.

## What the application does today

The current SafeHub route stores pasted audit text as `fra_pdf_text`, extracts facts, merges assessor edits, maps the result into the FRA report and generates a PDF. Publication confirmation is a separate step. Audit Studio already holds structured site details, answers, notes, practical checks, staff interviews, actions and evidence, so converting those into text and parsing them again would lose information unnecessarily.

The existing mapper/report also contains fallback descriptions and some fixed positive statements. In particular, the report can assert acceptable travel distances, no sleeping occupants, building fire resistance and system coverage without those specific observations being recorded. Occupancy can be estimated from floor area. The pilot must replace these assumptions with recorded facts or an explicit limitation, while preserving the report's design.

This review inspected the current source implementation and report structure. It did not constitute a site inspection or a completed end-to-end pilot FRA test.

## What can carry across already

| Existing H&S data | FRA use | Qualification |
|---|---|---|
| Store ID, name, code, address, visit date, auditor | Cover, premises identity and source visit | Retain actual store ID; do not match by display name. FRA assessor and approval date remain separate. |
| Floors, floor area and unit, exits, staff, maximum staff, young persons | Property and people at risk | Staff count is not total customer occupancy; preserve explicit units. |
| Limitations, enforcement, responsibilities, previous report | Scope, management and previous findings | Fire history is a separate fact, not inferred from enforcement history. |
| Manager answers on assembly point, evacuation, assistance and induction | Fire plan and management arrangements | Attribute manager-reported information; distinguish it from verification. |
| Testing/maintenance answers and attached certificates | Alarm, lighting, sprinkler, extinguisher and electrical evidence | A Yes answer does not supply a service date, system category or certificate result. |
| Fire-safety answers, notes, practical checks and photographs | Hazards, escape, doors, systems and significant findings | A combined question must not silently prove every component. |
| Relevant staff answers and assessed steps | Sampled understanding and training evidence | Unasked topics remain Not asked; do not treat a sample as proof that all staff are trained. |
| Actions, owner, due date and previous-action reviews | FRA action plan | Link to the original action; avoid duplicate operational tasks. |
| Sign-off | H&S source record | Do not reuse an H&S signature as approval of the new FRA. |

## Additional capture: where it belongs in the H&S visit

Expand a short **FRA details** panel beside the relevant existing section when the pilot is selected. Show follow-up fields only when applicable. Prefill existing facts; never ask for them twice.

| H&S location | Additional prompts and structured facts | Evidence / destination |
|---|---|---|
| 1. Title Page | Confirm assessment scope: whole store, included floors and ancillary areas; visit start/end; intended FRA assessor; country/jurisdiction and correct report variant. | Cover and scope. Do not assume a standard retail assessment fits a pre-opening site. |
| 2. Disclaimer / access | Which areas were inspected, inaccessible or outside scope? Why? Who controls shared areas? Is specialist information needed? | Terms and limitations; unresolved items in the assessor review. |
| 3. Site information / manager Q&A | Building use, approximate age **with source or Unknown**, construction, floor-by-floor use, mezzanine/basement, adjoining/above/below occupancies, shared escape routes. | About the property; location-tagged overview photographs. |
| 3. Site information | Opening hours; maximum staff and customers/visitors; existing occupancy limit, source and date; area by use with units/source. Sleeping use here or in adjoining premises, if known. | Occupancy and people at risk. Any calculation is a labelled estimate until assessed against escape provision. |
| 3. Responsibilities | Responsible organisation/person, local appointed person, landlord/centre responsibilities, alarm monitoring/contact arrangements; previous fires/near misses separately from notices or insurer requirements. | Cover, management responsibilities and fire history. No default named person. |
| 3. Evacuation | Assembly point and verified location; evacuation strategy; who raises the alarm, calls emergency services, sweeps if appropriate, accounts for people and meets crews; arrangements for visitors/contractors and those needing assistance. | Site-specific fire plan. Record arrangements without collecting unnecessary personal medical details. |
| 6. Training | Fire-training record date/source, eligible and completed counts, roles covered, refresher arrangements; drill date, attendance/coverage, issues and actions. | Fire safety training and management. Keep records, manager statements and colleague samples distinguishable. |
| 7. Testing: alarm | System type/category **as documented**, coverage, panel location, panel state/fault text, monitoring and landlord interface; service date, provider, record reference, defects and repair evidence. | Fire alarm section; panel and certificate photos. An unread category is Unknown, not an assumed L category. |
| 7. Testing: lighting | Areas covered, test-switch location; last routine and duration-test dates, record references, failed fitting locations and repairs. | Emergency lighting section; switch and test-record photographs. Separate missing records from observed equipment failure. |
| 7. Testing: extinguishers | Types and locations, suitability review, accessibility, service date/provider, defects and follow-up. | Portable firefighting equipment; sales floor and stockroom photos. |
| 7. Testing: sprinkler / smoke control | Present / absent / not verified for each system; areas served, who maintains it, last service/test, impairments, clearance and restrictions. | Conditional system section. Sprinkler absence does not answer whether smoke control is present. |
| 7. Testing: electrical | Fixed-wire inspection date, result, unresolved observations and remedial references; portable-equipment maintenance/PAT evidence and unsafe equipment action. | Ignition controls and current certificate/photo positions. Do not set a universal test interval from a Yes answer. |
| 8. Contractors | Hot-work controls, permits, shared-site coordination, contractor induction and out-of-hours arrangements where relevant. | Ignition prevention and management controls. |
| 9–11. Storage / COSHH / premises | Actual ignition sources, combustible stock/packaging and waste, storage locations, smoking/arson controls, charging/heating/cooking if present, flammables/aerosols/gases and oxygen sources. | Hazards and control measures. Offer editable retail prompts, but require selection/confirmation instead of pre-filled claims. |
| 15. Escape routes | Identify each route/exit and the area served; route availability, locks/opening arrangements, final discharge, obstructions, signs, shared-route responsibility. Record relevant travel distances, dead ends, exit widths, measurement/source and assessor conclusion. | Escape evidence and travel-distance section. Do not automatically declare compliance from a generic guidance table. |
| 15. Doors / compartmentation | Door location/ID, observed condition, closing/latching, wedges, seals/strips where applicable, penetrations/ceiling void limitations, defect photos and actions. | Fire resistance, internal doors and significant findings. A visual sample cannot establish an unverified fire rating. |
| 15. Fire service access | Access point and route, restrictions/security, who meets crews, known access constraints and available information. | Fire and Rescue Service access and fire plan. |
| 15. Plans / visual evidence | Attach the current site plan or record it as unavailable; confirm its date and whether it reflects this visit; tag exits, assembly point and system/defect photographs. | Existing fire-plan and photo positions. A generic evacuation flowchart is not a surveyed site plan. |
| 16–17. Follow-up / review | For each fire finding: location, observed condition, people affected, existing/interim controls, action, owner, target date and linked evidence. Reconcile previous FRA actions. | Significant findings and action plan. Inherited actions need current-visit confirmation before being marked resolved. |

**FRA-only assessor decisions:** likelihood, consequence, rationale, residual concerns, review date/triggers and final approval. These should be pre-populated with evidence where possible, but are not equivalent to the H&S percentage. An 88% H&S result does not establish a particular fire-risk rating.

## Capture states and the mobile experience

Every extra fact needs an explicit state: **Recorded**, **Not verified**, or **Not applicable**, plus source and relevant evidence references. A blank field means not yet recorded; it is never converted to No, zero or satisfactory. Negative observations belong in the recorded value and linked finding, not in the Not verified state.

Sources should distinguish observation, measurement, document checked, manager statement and prior assessment. Carry-forward facts show their source date and require confirmation for the new visit. Store record dates independently from visit and approval dates.

On iPhone:

- Keep the current sticky section/score header and Back/Next controls; show FRA evidence progress separately from H&S scoring.
- Present short system cards with conditional details, growing text boxes and inline explanations. Avoid a second long questionnaire at the end.
- Reuse the same photo in H&S and the FRA by assigning a role. Keep multiple photos, captions, locations, preview and removal available.
- Use existing report photo roles: premises, panel, lighting switch, fire doors, seals, call points, extinguishers, sprinkler, electrical/PAT records, hazards and fire plan.
- Final FRA review groups items into **Needs information**, **Needs assessor judgement** and **Ready**. Tapping an item opens the exact field, not merely the section.
- Unasked staff topics do not affect completeness or scores. An actually recorded gap remains a finding until assessed; optional sampling must not erase it.
- Offline collection remains possible. Generation waits until the completed audit and required attachments have synced.

## Proposed separate route and end-to-end behaviour

Proposed routes, **not currently implemented**:

- `/audit-studio/fra-pilot` — pilot entry, eligible audits and draft status.
- `/audit-studio/fra-pilot/[draftId]` — missing facts, assessor review and report preview.
- A separate pilot print endpoint using the current FRA presentation components.

Pilot access is restricted to the existing appropriate administrative/FRA permissions. Route isolation alone is not sufficient: use a server-side feature flag and per-audit opt-in. Normal Audit Studio and current SafeHub import keep their existing behaviour.

1. **Start the visit:** choose the store and the H&S + FRA pilot option. Existing site details appear once. Stable historical facts may be offered for confirmation.
2. **Record the visit:** answer H&S checks and capture contextual FRA details beside them. Attach evidence once. Record actual findings and explicitly mark limitations.
3. **Complete H&S:** use its existing validation/sign-off. Save the immutable completed H&S record and its PDF first.
4. **Create the FRA draft automatically:** a durable, retryable job snapshots that exact audit revision, extra facts, evidence references and mapped actions. It must not read whichever audit happens to be latest for the store.
5. **Show clear progress:** “H&S complete — preparing FRA draft”. Then show “FRA draft ready” or the exact reason creation failed, with Retry. Never reset the user to a blank audit or make H&S completion fail because the separate FRA job failed.
6. **Review the draft:** populate all supported sections. Show missing facts, contradictory evidence and assessor decisions. Additional FRA-only information is saved to the draft, leaving completed H&S unchanged.
7. **Preview the PDF:** use the current FRA layout, with a clear pilot/draft status. Review all pages, photos, actions and risk rationale. Save/download the draft without implying it has been issued.
8. **Approve and issue after rollout approval:** use the verified-publication confirmation process. Only this step updates the live FRA record/store assessment date and attaches the issued report. During pilot testing, drafts remain outside that live process.

The user-facing result after H&S completion should be two clearly separate entries: **H&S report — completed** and **FRA — draft awaiting review**. Automatic preparation removes copying and re-entry; it does not silently sign an assessor's judgement.

## Storage and integration design

Add an optional, versioned `fraCapture` block to the H&S document schema for pilot visits. Old documents remain valid. Store structured system/route/door records rather than one large free-text field. Validate units, dates, identifiers, lengths and evidence ownership server-side.

Use separate pilot draft records with: source audit ID/revision, store ID, source snapshot/hash, capture schema version, mapping version, report-template version, status, facts and provenance, findings/action links, evidence manifest, assessor review, timestamps and generated PDF path/hash. Permissions must be enforced on every draft, asset and print route.

Recommended states: `queued → preparing → needs_review → ready_for_approval`; failures have a retryable error state. PDF rendering has its own status, so an available draft is not confused with an available PDF. The pilot does not mark a report issued.

Enforce a unique source-audit/revision key. Double taps, concurrent requests and retries return the existing draft. A durable outbox/job records the completion event; a reconciliation pass can recover a missed draft. Completing an audit must not depend on an unawaited background promise surviving a serverless response.

The mapping is deterministic: structured facts → existing FRA report contract. Do not feed the audit back through PDF text extraction or web-based guesses. If prose assistance is added later, restrict it to summarising attributed facts and require review of the result.

Keep evidence references durable and scoped to the report. Do not persist expiring signed URLs as the evidence record. Freeze an evidence manifest when publishing; subsequent deletion from another draft must not break an issued PDF or its provenance.

Revising an H&S audit creates a new source revision/linked FRA draft; it never overwrites an issued FRA. No historical batch generation by default. Backfill is a separate deliberate operation.

## Preserve the current FRA formatting

Reuse `components/fra/fra-report-view.tsx`, its print CSS, logos, typography, tables, cover, photo placement, risk matrix and action-plan presentation. Keep the current section order, including the conditional sprinkler section. Preserve layout rules rather than promising an identical page count when evidence length differs.

The pilot needs a distinct data adapter and explicit read-only/report rendering support so it cannot accidentally save pilot edits into a SafeHub instance. Any changes to the shared renderer need regression checks against the legacy route.

Keep standard explanatory text clearly separate from site-specific conclusions. Replace unsupported positive statements in the pilot with evidence-backed wording or an explicit limitation. Preserve the familiar design while making the content accurate. The applicable jurisdiction and assessment variant must be confirmed before selecting legal reference text.

Before approval, compare an existing approved-format FRA with a pilot-generated one page by page: cover, contents/page references, headings, tables, photo cropping/captions, footers, conditional sections, action plan and final PDF. The existing section list is also used for DOCX parity; do not let exports drift.

## Acceptance checks before the 2027 rollout

| Scenario | Required result |
|---|---|
| Normal H&S-only audit / legacy text import | Existing behaviour and report layout unchanged. |
| Complete an opted-in audit | Exactly one linked FRA draft from the completed revision. |
| Double tap, retry, worker restart | No duplicate FRA, no lost H&S result, recoverable status. |
| Missing service record / unknown alarm category | Explicit gap; no invented date, category or satisfactory conclusion. |
| Combined check or conflicting notes | Request component evidence / flag conflict; do not silently pick a favourable answer. |
| High H&S score plus serious fire findings | FRA judgement still reflects the fire findings and existing risk matrix. |
| Unasked staff topics | No false gap, score deduction or completion blocker. |
| No sprinkler / unknown sprinkler / separate smoke control | Correct conditional fields and report content for each state. |
| Shared landlord system / inaccessible area | Responsibility and limitation carried into the draft and report. |
| Customer capacity and escape distances | Show sources/measurements and assessor conclusion; no unqualified floor-area capacity or generic compliance claim. |
| Long notes, many images and multiple floor plans | Readable report; no clipped text, disappearing images or broken pagination. |
| iPhone completion, reopen, preview every PDF page and download | Visible progress, persistent draft, stable viewer, actual saved PDF verified. |
| Offline collection / pending photo upload | Clear sync state; no report that silently omits expected evidence. |
| Cross-store / unprivileged access | Drafts, evidence, PDF and actions inaccessible without permission. |
| Pilot PDF generation | No live FRA date, publication or action-tracker side effects. |
| Later approved publication | Verified PDF path/hash and history readback; correct store/source/assessor; explicit confirmation. |

## Implementation sequence

1. Approve the capture wording, ownership boundaries and report mapping in this plan.
2. Add the isolated pilot route and unscored contextual capture; verify the entire iPhone visit.
3. Add durable automatic draft creation and the source-traceable adapter; test failures/retries.
4. Reuse the FRA renderer, correct pilot assumptions, and verify PDF parity and download.
5. Run a real visit alongside the existing method, compare findings and issued-format output, then obtain rollout approval.
6. Enable the new process for approved 2027 audits while retaining legacy access to previous reports and the existing creation route during transition.

No production route, database schema, audit scoring, stored assessment or publication behaviour was changed while preparing this plan.

## Source references

Application source reviewed: `lib/audit-studio/types.ts`, `validation.ts`, `template.ts`, `template-v3.json`, `server.ts`; `components/audit-studio/workspace.tsx`; SafeHub `store-hs-audit-text`, `extract-data`, `save-custom-data`, `view`, `generate-pdf` and `complete` routes; `app/actions/fra-reports.ts`; `lib/fra/pdf-parser.ts`, `risk-rating.ts`, `report-sections.ts`; `components/fra/fra-report-view.tsx`; `app/print/fra-report/page.tsx`.

Public guidance used as a cross-check for the evidence categories, not as a substitute for the assessor or the applicable national guidance:

- [Government fire risk assessment responsibilities](https://www.gov.uk/workplace-fire-safety-your-responsibilities/fire-risk-assessments)
- [Fire safety risk assessment: offices and shops](https://www.gov.uk/government/publications/fire-safety-risk-assessment-offices-and-shops/fire-safety-risk-assessment-offices-and-shops-accessible)
- [Fire risk assessment: five-step checklist](https://www.gov.uk/government/publications/fire-safety-risk-assessment-5-step-checklist/fire-safety-risk-assessment-5-step-checklist-accessible)

Confirm jurisdiction for each store; the offices-and-shops guidance and the current report's Fire Safety Order references must not be assumed to apply unchanged across all UK nations.
