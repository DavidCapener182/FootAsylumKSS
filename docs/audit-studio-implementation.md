# Audit Studio

Audit Studio is an Admin-only workspace under Assurance, controlled by `NEXT_PUBLIC_AUDIT_STUDIO_ENABLED`. The flag is disabled by default. Audits, findings, evidence and report revisions remain separate from live store scores, Actions and FRA records.

## Workflow

Select a store, confirm the auditor, visit date and site details, record the manager Q&A, then work through the audit. Version 3 has 17 sections, 57 scored checks and 112 raw points, normalised to a percentage. Earlier audits retain their template versions.

The editor includes question-specific evidence guidance, editable note suggestions, practical checks and interviews with up to two colleagues. Selected interview gaps affect their linked checks; multiple gaps on one check do not deduct its weight repeatedly. Manager answers are reference information, not compliance answers.

Yes earns the question weight; No earns zero; N/A excludes the weight. Under 80% fails. At least 80% with a core section under 70% passes with recommendations. Confirmed required escape-route obstruction or immediate serious danger overrides the percentage. Unverified safety evidence produces Pending unless failure is already determined. Completion requires all required answers and follow-up details.

## Persistence and evidence

User-scoped IndexedDB retains answers and files on the device. Prepared audits cache their app shell and template. Synchronisation uses revision checks, explicit conflict resolution, stable operation IDs and resumable uploads. A connection and synchronised evidence are required for completion.

Each question accepts up to ten photos or supporting PDFs, with an overall 300-file limit and 25 MB per file. Evidence remains stored after completion. The private bucket restricts direct reads to active Admins and permits uploads only for reserved draft evidence paths. Server operations independently require an active Admin.

Completed audits and PDFs are frozen; corrections create linked revisions. PDFs include flagged findings from page two, the full introduction, manager Q&A, structured staff interviews, question photos, supporting PDFs and signatures. Interview summaries link to their full question rather than duplicating the full interview in every section. Downloads return the saved report.

## Reference documents

The client update Word/PDF files are excluded from the public repository. The authenticated reference endpoint loads content-addressed files from the private evidence bucket and checks their SHA-256 hashes. Generic branding, introduction and the reviewed question contract are bundled. The local Word parity test runs when the private Word file is available; CI always checks the public question contract.

## Verification and remaining release limits

Focused tests cover scoring, interviews, evidence limits, access gates, offline file persistence, synchronisation and 120-photo PDF generation. Actual physical iPhone Safari and Android camera/gallery, airplane mode, browser restart and expired-session testing remain release checks before wider use. Feature activation requires the production flag and an authenticated deployment check.

Live publication of results and Create FRA draft are later work and are not enabled.
