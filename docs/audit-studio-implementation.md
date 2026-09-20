# Audit Studio

Audit Studio is an Admin-only workspace under Assurance, controlled by `NEXT_PUBLIC_AUDIT_STUDIO_ENABLED`. The flag is disabled by default. Drafts and practice audits remain separate from live store scores. An active Admin can explicitly publish a completed store audit; downloading the PDF does not publish it.

## Workflow

Select a store, confirm the auditor, visit date and site details, record the manager Q&A, then work through the audit. Version 3 has 17 sections, 57 scored checks and 112 raw points, normalised to a percentage. Earlier audits retain their template versions.

The editor includes question-specific evidence guidance, editable note suggestions, practical checks and interviews with up to two colleagues. Selected interview gaps affect their linked checks; multiple gaps on one check do not deduct its weight repeatedly. Manager answers are reference information, not compliance answers. In current drafts, checks 05.02 and 06.03 derive Yes/No from completed staff interviews. Missing or incomplete interviews stay unanswered; a deliberate sampling exclusion needs a reason. Check 05.02 needs two distinct sampled risks (or its direct two-risk checklist). Mixed physical/documentary checks remain auditor-led, with interview gaps overriding Yes. A stored scoring-version marker preserves older completed reports.

Yes earns the question weight; No earns zero; N/A excludes the weight. Under 80% fails. At least 80% with a core section under 70% passes with recommendations. Confirmed required escape-route obstruction or immediate serious danger overrides the percentage. Unverified safety evidence produces Pending unless failure is already determined. Completion requires all required answers and follow-up details.

## Persistence and evidence

User-scoped IndexedDB retains answers and files on the device. Prepared audits cache their app shell and template. Synchronisation uses revision checks, explicit conflict resolution, stable operation IDs and resumable uploads. A connection and synchronised evidence are required for completion.

Each question accepts up to ten photos or supporting PDFs, with an overall 300-file limit and 25 MB per file. Evidence remains stored after completion. The private bucket restricts direct reads to active Admins and permits uploads only for reserved draft evidence paths. Server operations independently require an active Admin.

Completed audits and PDFs are frozen; corrections create linked revisions. PDFs include flagged findings from page two, the full introduction, manager Q&A, structured staff interviews, question photos, supporting PDFs and signatures. Interview summaries link to their full question rather than duplicating the full interview in every section. Downloads return the saved report.

## Reference documents

The client update Word/PDF files are excluded from the public repository. The authenticated reference endpoint loads content-addressed files from the private evidence bucket and checks their SHA-256 hashes. Generic branding, introduction and the reviewed question contract are bundled. The local Word parity test runs when the private Word file is available; CI always checks the public question contract.

## Verification and remaining release limits

Focused tests cover scoring, interviews, evidence limits, access gates, offline file persistence, synchronisation and 120-photo PDF generation. Actual physical iPhone Safari and Android camera/gallery, airplane mode, browser restart and expired-session testing remain release checks before wider use. Feature activation requires the production flag and an authenticated deployment check.

## Store publication and annual history

Audits persist in `fa_audit_studio_audits`; structured manager, interview and previous-action reviews are stored in its validated document. The previous-action picker loads store-linked H&S actions and actions from its latest confirmed FRA. Only the selected reviews affect 16.03. A failed review yields No; unanswered reviews stay pending. Archived reports without linked actions still need manual review.

A completed store audit can be published to its selected store. The server verifies the frozen PDF hash, copies it into private store storage, then calls the authenticated atomic publication function. That function requires `auth.uid()` to match an active Admin; it never changes actor claims. It locks the store, rejects older visits, and makes retries idempotent. Practice audits cannot be published. Findings become store actions; prior actions are not automatically closed.

`fa_audit_studio_publications` records store assignment and `fa_store_audit_history` retains prior report references, dates and scores. Both have RLS and no direct client table access. Existing SharePoint documents stay in SharePoint; the migration does not import their bytes. History URLs are resolved through the Admin-only endpoint.

Audit numbering uses the visit's calendar year and restarts at 1 when the first new-year audit is published. Until that happens, prior H&S slots remain current. FRA fields are preserved independently. The existing tracker supports three numbered visits per year; linked corrections retain their visit number. Previous PDFs remain available in history. Legacy PDF replacement preserves history-linked files.

Verification includes browser loading of Dundee H&S/FRA actions and persisted follow-up review, plus rolled-back database checks for publication, retry, annual reset, retained FRA, actor mismatch and practice rejection. No presentation audits were published as store visits. Create FRA draft remains future work.


### Graded staff interviews

Drafts use `graded-v2`: each colleague can deduct 0.25 points for a minor omission, 0.5 for an incorrect answer, or the full question weight for an unsafe demonstration. Use the highest severity across that colleague’s prompts for the same question; add colleagues and cap at the question weight. Existing failed or unverified store arrangements earn zero. Severity and explanation are required before completion, with a follow-up action, owner and date. Linked sampled-risk evidence does not deduct again under 05.02. Unasked staff-understanding checks remain pending unless explicitly excluded with a reason. Frozen reports retain their stored scoring version. The same fractional calculation drives the UI, save result and PDF; partial results remain indexed as findings.
