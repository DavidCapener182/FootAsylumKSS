# Audit PDF SharePoint fallback and archive filing

When a completed Audit 1 or Audit 2 has an uploaded PDF, its button opens the existing PDF viewer. When no PDF is linked, **SharePoint** opens the store's **H&S Audit folder directly in a new tab**. There is no intermediate message modal. Both desktop and mobile use the same renderer. These are folder links, not claims that a PDF matching a particular audit date exists. The owner requested store-folder navigation regardless of the recorded audit date.

The exact mapping is in `lib/audit-sharepoint.ts`. SharePoint authenticates visitors using its existing access controls. Unknown stores do not receive invented paths. Eligible managers retain PDF upload; Audit 1 cannot displace a retained Audit 2 PDF.

## Archive work verified on 7 September 2026

Archive root: `/Shared Documents/Operations Clients Drive/Footasylum Ltd/2026 Audits`.

- Inspected 72 original store folders and their H&S/FRA subfolders, plus parent-folder PDFs.
- Read 93 currently linked source PDFs from the live app: 66 H&S audits and 27 FRAs. Copies were downloaded to a private local staging directory; the app's files were preserved.
- Uploaded and verified 20 missing PDFs: 18 H&S reports and two FRAs (Warrington and Bradford Forster Square).
- Moved 37 existing parent-folder PDFs into H&S subfolders across 21 store groups, retaining existing duplicate copies.
- Renamed `Merthyr Tydfil` to `S0125 - Merthyr Tydfil`; created its H&S and FRA subfolders and filed its PDF.
- Created `Trafford Centre New` using the owner's explicit temporary naming instruction, with H&S/FRA subfolders. Moved the two July Br 34 Trafford Centre PDFs out of `S0040 - Trafford Mega` into the new store's H&S folder. The app has no recorded code for the new store, so none was invented.
- Other coded parent folders preserve `store code - store name`. Nottingham retains the observed SharePoint spelling `S0037 - Nottingham Clumber St` and child `S0037 - Nottingham Clumber St. H&S Audit`; links use these exact names.
- No files were deleted or overwritten. No database dates, scores, links or permissions were changed.

The uploaded H&S stores were Lakeside New, Coventry, Bull ring new, Stratford, Birmingham Fort, Southampton, White City, Oxford Street, Cheshunt, Brighton, Milton Keynes, Bromley, Portsmouth, West Bromwich, Thanet, Plymouth, Merry Hill and Bluewater.

## Source discrepancies left unchanged

The source PDFs were read before copying. Six entries were withheld from automatic copying as the recorded report type, site or year did not agree with the content:

- Bolton FRA field: an H&S report, also linked as Bolton H&S and already archived as H&S.
- Photo Studio FRA field: an H&S report for Sharp Project, already present in the H&S archive.
- Sunderland FRA field: the January H&S report, already present in its H&S archive.
- Darlington FRA field: a Doncaster FRA.
- Walsall H&S: report names Walsall but the location is Doc Barnet Kiosk, Brierley Hill.
- Walsall FRA: PDF states 15 January 2025; the app records 29 June 2026.

Stratford's removed Audit 1 still has a recorded 23 January 2025 date. Its June 2026 Audit 2 PDF has now been added to the H&S folder. A folder link does not assert that the older report is present.

Private source inventory, staged PDFs, SHA-256 hashes and upload manifest are under ignored `reports/backups/sharepoint-sync-2026-09-07/`. Verification used visible SharePoint upload outcomes and destination listings; a full byte-for-byte reconciliation of pre-existing SharePoint copies was not performed.

## Validation

- Targeted mapping and audit-helper tests passed, including URL encoding, Nottingham/Merthyr paths, warehouse codes, unknown codes and the explicit new Trafford exception.
- TypeScript, lint and production build passed. Lint reports existing warnings outside this change.
- SharePoint folder links and file destinations were checked using the signed-in browser.
