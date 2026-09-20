/** Local presentation export. Input snapshots and resulting client PDFs stay outside git. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateReport } from '../../lib/audit-studio/report';
import { scoreAudit } from '../../lib/audit-studio/scoring';
import { documentSchema } from '../../lib/audit-studio/validation';
import { interviewIssues } from '../../lib/audit-studio/staff-interviews';
import type { AuditBundle } from '../../lib/audit-studio/types';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: render-comparison <private-snapshot.json> <output.pdf>');
if (path.resolve(input) === path.resolve(output)) throw new Error('Input and output must differ.');
const bundle: AuditBundle = JSON.parse(await readFile(input, 'utf8'));
documentSchema.parse(bundle.audit.document);
if (bundle.audit.document.purpose !== 'practice') throw new Error('Presentation exports require a practice snapshot.');
const issues = interviewIssues(bundle.audit.document, bundle.template);
if (issues.length) throw new Error(JSON.stringify(issues));
const result = scoreAudit(bundle.template, bundle.audit.document);
if (result.answered !== result.total || result.outcome === 'Pending') throw new Error('Complete the presentation answers before exporting.');
await writeFile(output, await generateReport(bundle, readFile, { presentation: true }));
console.log(JSON.stringify({file: output, earned:result.earned, applicable:result.applicable, percentage:result.percentage, outcome:result.outcome}));
