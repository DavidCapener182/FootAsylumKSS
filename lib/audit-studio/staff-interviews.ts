import { previousActionResponse } from "./previous-actions";
import { interviewAssessment, practicalDefinition, practicalNotes } from "./interview-practical";
import type { AuditDocument, Response, StaffInterviewAnswer, StudioTemplate } from "./types";
import { emptyResponse } from "./template";

// Version-bound mappings: a finding is deducted once at its existing audit check.
const V1 = [
  { id: "assembly", questionId: "06.03", title: "Assembly point", ask: "Where would you assemble after evacuating this store?" },
  { id: "evacuation", questionId: "06.03", title: "Evacuating the store", ask: "What would you do when the fire alarm sounds, and how would you direct or assist customers?" },
  { id: "risks", questionId: "05.02", title: "Local risks", ask: "For these two selected risks, explain and show me the controls you would use. Record which two risks you asked about." },
  { id: "handling", questionId: "09.01", title: "Moving stock", ask: "Show me how you would move this load safely. When would you use equipment or ask for help?" },
  { id: "product-use", questionId: "10.01", title: "Using a cleaning product", ask: "If you were using this product for this task, how would you use it safely? Show me the protection and method you would use." },
  { id: "product-storage", questionId: "10.02", title: "Putting a product away", ask: "How should this product be stored? Show me the container and put it away correctly." },
  { id: "coshh", questionId: "10.03", title: "Product instructions and COSHH", ask: "For this product, show me the instructions, protection and safe storage you would use." },
  { id: "height", questionId: "12.01", title: "Reaching high stock", ask: "Show me how you would select, check and set up the access equipment, then safely retrieve this item and come down." },
  { id: "first-aid", questionId: "13.02", title: "Getting first aid", ask: "If someone was injured now, how would you get first-aid help and find the equipment?" },
  { id: "reporting", questionId: "14.01", title: "Reporting an incident", ask: "How would you report an accident or a near miss, and who would you tell?" },
  { id: "stock-storage", questionId: "09.02", title: "Stacking and storing stock", ask: "Show me where you would put this stock. How do you know the stack and shelf are safe?" },
  { id: "deliveries", questionId: "09.03", title: "Receiving a delivery", ask: "Talk me through receiving and putting away this delivery. What would you do if there was not enough safe space?" },
  { id: "spills", questionId: "11.03", title: "Dealing with a spill", ask: "You find a spill here while customers are nearby. What would you do, and when would you reopen the area?" },
  { id: "defects", questionId: "12.03", title: "A damaged ladder", ask: "If you found damage during a ladder check, what would you do to stop it being used, and how would you get the stock instead?" },
  { id: "contractors", questionId: "08.01", title: "A contractor arrives", ask: "A contractor arrives to work in this area. How would you check they can start, and keep staff and customers safe?" },
  { id: "visitors", questionId: "08.02", title: "Signing visitors in and out", ask: "Show me how you record a visitor arriving and leaving. How would you find out who is still inside?" },
  { id: "induction", questionId: "06.01", title: "Starting an unfamiliar task", ask: "You are asked to do a task you have not been trained for. What would you do before starting?" },
  { id: "weekly-checks", questionId: "16.01", title: "Carrying out weekly checks", ask: "Show me how you check this item in the weekly check. What do you record if it fails, and how do you follow it up?" },
] as const;
export function interviewPrompts(template: StudioTemplate) {
  if (!["hs-update-2026-09-19-v1", "hs-update-2026-09-20-v2", "hs-update-2026-09-20-v3"].includes(template.version)) return [];
  const ids = new Set(template.sections.flatMap(s => s.checks.map(q => q.id)));
  return V1.filter(p => ids.has(p.questionId) && (template.version === "hs-update-2026-09-19-v1" || p.id !== "visitors"));
}
export const emptyInterviewAnswer = (): StaffInterviewAnswer => ({ asked: "", reply: "", assessment: null, outcome: "" });
export function interviewEntries(doc: AuditDocument, template: StudioTemplate, questionId?: string) {
  return (doc.staffInterviews || []).flatMap((staff, index) => interviewPrompts(template)
    .flatMap(prompt => {
      const answer = staff.answers[prompt.id];
      return answer && (!questionId || prompt.questionId === questionId || (questionId === "05.02" && answer.sampledRisk)) ? [{ staff, index, prompt, answer }] : [];
    }));
}
export function hasInterviewGap(doc: AuditDocument, template: StudioTemplate, id: string) {
  return interviewEntries(doc, template, id).some(e => interviewAssessment(e.answer, e.prompt.id) === "gap");
}
export function interviewNotes(doc: AuditDocument, template: StudioTemplate, id: string) {
  return interviewEntries(doc, template, id).map(({staff, index, answer, prompt}) => [
    `Staff interview — ${staff.colleague || `Colleague ${index + 1}`}${staff.role ? ` (${staff.role})` : ""}`,
    `Topic: ${prompt.title} · Audit check ${prompt.questionId}${answer.sampledRisk && prompt.questionId !== "05.02" ? " · Also sampled-risk evidence for 05.02" : ""}`,
    `Asked: ${answer.asked || "Not recorded"}`,
    answer.practical && !answer.reply ? "" : `Staff response: ${answer.reply || "Not recorded"}`,
    practicalNotes(answer, prompt.id),
    `Auditor assessment: ${interviewAssessment(answer, prompt.id) === "understood" ? "Understood" : interviewAssessment(answer, prompt.id) === "gap" ? "Gap identified" : interviewAssessment(answer, prompt.id) === "not-applicable" ? "Not applicable to this colleague" : "Not assessed"}`,
    answer.outcome ? `Outcome / explanation: ${answer.outcome}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}
/** Pure knowledge checks are answered by staff evidence, not a separate audit tick.
 * The document marker preserves the interpretation of previously frozen reports.
 */
export const STAFF_UNDERSTANDING_IDS = ["05.02", "06.03"] as const;
export function isInterviewDerived(doc: AuditDocument, id: string) {
  return doc.interviewScoringVersion === "derived-v1" && STAFF_UNDERSTANDING_IDS.some(q => q === id);
}
export function withCurrentInterviewScoring(doc: AuditDocument): AuditDocument {
  return {...doc, interviewScoringVersion: "derived-v1"};
}
function derivedInterviewResponse(doc: AuditDocument, template: StudioTemplate, id: string, r: Response): Response {
  const entries = interviewEntries(doc, template, id);
  if (entries.some(e => interviewAssessment(e.answer, e.prompt.id) === "gap"))
    return {...r, answer: "no", verified: true};
  const relevant = entries.filter(e => interviewAssessment(e.answer, e.prompt.id) !== "not-applicable");
  // Skipping a topic is explicit and justified; not asking a colleague never earns Yes.
  if (!relevant.length && r.answer === "na" && r.naReason.trim()) return {...r, verified: true};
  const complete = relevant.length > 0 && relevant.every(e => {
    const a = e.answer;
    if (!e.staff.colleague.trim() || !e.staff.role.trim() || !a.asked.trim() || interviewAssessment(a, e.prompt.id) !== "understood") return false;
    if (!a.practical) return !!a.reply.trim();
    return !!a.practical.context.trim() && !!a.practical.reference.trim() &&
      (practicalDefinition(e.prompt.id, a.practical.version)?.criteria || []).every(c => {
        const check = a.practical!.checks[c.id];
        return check?.result === "met" || (check?.result === "na" && !!check.note.trim());
      });
  });
  // A direct local-risk checklist covers two risks; otherwise use two distinct
  // selected topics. Asking two colleagues the same topic is still one risk.
  const coverage = id !== "05.02" || relevant.some(e => e.prompt.id === "risks") || new Set(relevant.map(e => e.prompt.id)).size >= 2;
  return {...r, answer: complete && coverage ? "yes" : null, verified: complete && coverage};
}
export function effectiveResponse(doc: AuditDocument, template: StudioTemplate, id: string): Response {
  const r = previousActionResponse(doc, id, doc.responses[id] || emptyResponse());
  if (isInterviewDerived(doc, id)) return derivedInterviewResponse(doc, template, id, r);
  return hasInterviewGap(doc, template, id) ? { ...r, answer: "no", verified: true } : r;
}
export function interviewReportDocument(doc: AuditDocument, template: StudioTemplate): AuditDocument {
  const responses = { ...doc.responses };
  for (const id of new Set([...interviewEntries(doc, template).flatMap(e => [e.prompt.questionId, ...(e.answer.sampledRisk ? ["05.02"] : [])]), ...(doc.interviewScoringVersion ? STAFF_UNDERSTANDING_IDS : []), ...(doc.previousActionReviews?.length ? ["16.03"] : [])])) {
    const r = effectiveResponse(doc, template, id);
    responses[id] = { ...r, note: [r.note, interviewNotes(doc, template, id)].filter(Boolean).join("\n\n") };
  }
  return { ...doc, responses };
}
export function interviewIssues(doc: AuditDocument, template: StudioTemplate) {
  const issues: Array<{questionId: string; message: string}> = [];
  for (const [index, staff] of (doc.staffInterviews || []).entries()) {
    const label = staff.colleague || `Colleague ${index + 1}`;
    const add = (message: string) => issues.push({questionId: "staff-interviews", message: `${label}: ${message}`});
    if (!staff.colleague.trim() || !staff.role.trim()) add("record an identifier and role.");
    const entries = interviewEntries({ ...doc, staffInterviews: [staff] }, template);
    if (!entries.length) add("record at least one question or remove the unused colleague.");
    for (const {prompt, answer: a} of entries) {
      if (a.practical) {
        const definition = practicalDefinition(prompt.id, a.practical.version);
        if (!a.asked.trim() || !a.practical.context.trim() || !a.practical.reference.trim()) add(`${prompt.title}: record the question, selected task and verified reference.`);
        for (const c of definition?.criteria || []) {
          const check = a.practical.checks[c.id];
          if (!check?.result) add(`${prompt.title}: assess “${c.label}”.`);
          else if ((check.result === "gap" || check.result === "na" || check.result === "not-observed") && !check.note.trim()) add(`${prompt.title}: explain the ${check.result === "gap" ? "missed item" : check.result === "not-observed" ? "stopped demonstration" : "N/A"} for “${c.label}”.`);
        }
        if (Object.values(a.practical.checks).some(c => c.result === "not-observed") && interviewAssessment(a, prompt.id) !== "gap") add(`${prompt.title}: a stopped demonstration must link to a recorded gap; otherwise assess the remaining items.`);
        continue;
      }
      if (!a.asked.trim() || !a.assessment) add(`${prompt.title}: record the question asked and your assessment.`);
      if (a.assessment === "not-applicable" ? !a.outcome.trim() : !a.reply.trim())
        add(`${prompt.title}: ${a.assessment === "not-applicable" ? "explain why this does not apply" : "record what the colleague said or demonstrated"}.`);
    }
  }
  return issues;
}

// The atomic save RPC indexes responses/findings from this projection. Keep the
// auditor's source separately so reloads and later corrections never duplicate text
// or erase their original answers. Only the server writes this internal field.
type StoredDocument = AuditDocument & { staffInterviewSourceResponses?: AuditDocument["responses"] };
export function toStoredInterviewDocument(doc: AuditDocument, template: StudioTemplate): StoredDocument {
  if (!doc.staffInterviews?.length && !doc.interviewScoringVersion && !doc.previousActionReviews?.length) return doc;
  return { ...interviewReportDocument(doc, template), staffInterviewSourceResponses: doc.responses };
}
export function fromStoredInterviewDocument(doc: StoredDocument): AuditDocument {
  const {staffInterviewSourceResponses, ...source} = doc;
  return staffInterviewSourceResponses ? { ...source, responses: staffInterviewSourceResponses } : source;
}
