# Audit comparison exports

`render-comparison.ts` renders a fully populated, private practice snapshot using the same report generator and scoring as Audit Studio. The presentation layout shows a proposed audit title, named staff answers and concise photograph references. Operational reports retain their existing metadata and guidance.

Bundle the TypeScript entry with the project's esbuild dependency, then run the resulting module with two arguments:

```
node render-comparison.mjs /private/path/snapshot.json /private/path/report.pdf
```

Run it from the repository root so the existing report assets can be located. Keep the bundled module inside the project so external dependencies resolve. The command requires a practice snapshot, validates its document and interviews, and rejects unanswered or pending results. It never writes to Supabase or publishes a store result. Use absolute evidence paths and retain their SHA-256 hashes.

For meeting packs:

- Select high, middle and low results from actual second audits; preserve recorded findings and relevant original photographs.
- Complete additional presentation answers separately from operational records. Explain their purpose once in the accompanying email; do not repeat preparation instructions throughout each audit.
- Match extracted photographs to their numbered captions, not image order or vertical position: mixed orientations can change the extraction order.
- Render and inspect every report, verify the percentages with the shared scorer, and check email attachment bytes against the final files.
- Keep client snapshots, original reports, generated reports and email attachments out of git.

The proposed pass threshold remains 80%, subject to review of question weights before rollout. A core section below 70% leads to recommendations when the overall score passes. Existing critical-failure rules remain unchanged. Presentation requests do not change live scoring or verification requirements.
