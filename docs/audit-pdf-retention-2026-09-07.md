# Audit PDF retention and storage cleanup

Uploads retain the latest compliance audit PDF for each store. Audit 2 replaces Audit 1 and any previous Audit 2 PDF. A store with only Audit 1 keeps that PDF until a replacement is uploaded. An Audit 1 upload cannot displace an existing Audit 2 PDF.

The replacement is uploaded under a unique filename and linked with an authenticated, conditional database update before deleting superseded files. Concurrent changes and failed uploads preserve the existing report. Cleanup failures are surfaced to the user. Legacy report-builder source paths require a reference check before deletion. Dates, scores, historical actions and audit counts remain intact.

For completed Audit 1 records with no PDF and a retained Audit 2 PDF, the PDF button opens a dialog reading **Saved to SharePoint**, as requested by the owner. A SharePoint folder URL is pending; no SharePoint upload or link verification was performed in this task.

## Live operations, 7 September 2026 (Europe/London)

- Removed 27 superseded Audit 1 PDFs: 67,365,556 bytes.
- Preserved 36 stores' Audit 1 PDFs where no Audit 2 PDF exists, and all 30 Audit 2 PDFs.
- Compressed two large FRA PDFs, saving 66,841,476 bytes. Original image resolution, selectable text, page count and links were preserved. Large lossless image objects use JPEG quality 92.
- Glasgow Silverburn: 50,002,585 to 7,587,201 bytes; 35 pages.
- Birmingham Fort: 29,935,471 to 5,509,379 bytes; 36 pages.
- Current storage after verification: 977,402,452 bytes across 1,544 files. All 1,336 report-builder images remain.
- Verified all 82 stores' dates, scores, FRA links and audit counts against the pre-cleanup snapshot.
- Original PDFs, SHA-256 hashes, manifests and verification receipts are stored locally under ignored `reports/backups/audit-retention-2026-09-07/`.

Supabase storage usage is averaged over the billing period; the usage warning may lag the live object total. Approximately 22.6 MB remains below the free plan's 1 GB allowance.

## Validation

- Full unit suite: 441 tests across 98 files.
- Type check and production build passed.
- Lint passed with three existing warnings outside this change.
- PDF verification: exact extracted text for all 71 pages, unchanged page dimensions/link counts, full-page render comparisons and visual inspection, followed by fresh remote downloads matching the compressed SHA-256 hashes.

## PDF viewer production correction

The live check exposed a shared server-action initialization failure: the findings importer eagerly loaded PDF.js, whose optional native canvas package is absent in the production function. `DOMMatrix is not defined` prevented audit download URLs from being signed. Findings extraction now loads its parser only when needed, after installing the existing DOMMatrix shim. The viewer propagates actual errors rather than treating them as missing PDFs, and uses a stable URL callback. Regression verification reproduces the old initialization failure and proves download signing no longer loads the parser. Real Sunderland PDF text extraction also passed with native canvas deliberately unavailable.
