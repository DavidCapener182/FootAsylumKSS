import { practicalDefinition } from "./interview-practical";
import { interviewPrompts } from "./staff-interviews";
import { z } from "zod";
import type { StudioTemplate } from "./types";
import {
  SITE_EVIDENCE_IDS,
  MAX_EVIDENCE,
  MAX_QUESTION_EVIDENCE,
} from "./template";
const text = z.string().max(12000);
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Use a valid date",
  );
const signature = z
  .string()
  .max(400000)
  .refine(
    (v) => !v || /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v),
    "Signature must be a PNG",
  );
export const documentSchema = z
  .object({
    interviewScoringVersion: z.literal("derived-v1").optional(),
    staffInterviews: z.array(z.object({
      id: z.string().uuid(), colleague: text, role: text,
      answers: z.record(z.object({ asked: text, reply: text, sampledRisk: z.boolean().optional(), assessment: z.enum(["understood", "gap", "not-applicable"]).nullable(), outcome: text, practical: z.object({version: z.literal("practical-v1"), context: text, reference: text, checks: z.record(z.object({result: z.enum(["met", "gap", "na", "not-observed"]).nullable(), note: text}).strict())}).strict().optional() }).strict()),
    }).strict()).max(2).optional(),
    site: z
      .object({
        storeName: text,
        storeCode: text,
        address: text,
        visitDate: date,
        auditor: text,
        floors: text,
        area: text,
        areaUnit: z.enum(["m²", "ft²"]),
        exits: text,
        staff: text,
        maxStaff: text,
        youngPersons: text,
        enforcement: text,
        limitations: text,
        systems: text,
        responsibilities: text,
        previousReport: text,
        managerName: text.optional(),
        assemblyPoint: text.optional(),
        assemblyPointEvidence: text.optional(),
        evacuationProcedure: text.optional(),
        evacuationAssistance: text.optional(),
        firstAidArrangements: text.optional(),
        incidentReporting: text.optional(),
        localRisks: text.optional(),
        inductionArrangements: text.optional(),
      })
      .strict(),
    responses: z.record(
      z
        .object({
          answer: z.enum(["yes", "no", "na"]).nullable(),
          note: text,
          practicalCheck: z
            .object({ checked: text, outcome: text })
            .strict()
            .optional(),
          naReason: text,
          verified: z.boolean(),
          danger: z.boolean(),
          dangerReason: text,
          action: z.object({ text, owner: text, dueDate: date }).strict(),
        })
        .strict(),
    ),
    evidence: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            questionId: z.string().max(80),
            caption: text,
            location: text,
          })
          .strict(),
      )
      .max(MAX_EVIDENCE)
      .superRefine((references, context) => {
        const counts = new Map<string, number>();
        for (const ref of references) {
          const count = (counts.get(ref.questionId) || 0) + 1;
          if (count === MAX_QUESTION_EVIDENCE + 1)
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Up to ${MAX_QUESTION_EVIDENCE} attachments per question.`,
            });
          counts.set(ref.questionId, count);
        }
      }),
    signOff: z
      .object({
        auditorSignature: signature,
        representative: text,
        representativeSignature: signature,
        unavailableReason: text,
      })
      .strict(),
  })
  .strict();
export function validateDocument(value: unknown, template: StudioTemplate) {
  const doc = documentSchema.parse(value);
  const ids = new Set(
    template.sections.flatMap((s) => s.checks.map((q) => q.id)),
  );
  if (Object.keys(doc.responses).some((id) => !ids.has(id)))
    throw new Error("A question does not belong to this template version.");
  if (
    doc.evidence.some(
      (e) => !ids.has(e.questionId) && !SITE_EVIDENCE_IDS.has(e.questionId),
    )
  )
    throw new Error("Evidence references an unknown question.");
  if (new Set(doc.evidence.map((e) => e.id)).size !== doc.evidence.length)
    throw new Error("Duplicate evidence references.");
  const prompts = new Set(interviewPrompts(template).map(p => p.id as string));
  if (new Set((doc.staffInterviews || []).map(s => s.id)).size !== (doc.staffInterviews || []).length) throw new Error("Duplicate staff interview.");
  if ((doc.staffInterviews || []).some(s => Object.keys(s.answers).some(id => !prompts.has(id)))) throw new Error("Unknown staff interview question for this template.");
  for (const staff of doc.staffInterviews || []) for (const [id, a] of Object.entries(staff.answers)) {
    if (!a.practical) continue;
    const definition = practicalDefinition(id, a.practical.version);
    if (!definition || Object.keys(a.practical.checks).some(key => !definition.criteria.some(c => c.id === key))) throw new Error("Unknown practical checklist item.");
  }
  return doc;
}
