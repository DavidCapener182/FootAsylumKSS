import { effectiveResponse, interviewNotes, interviewIssues, isInterviewDerived } from "./staff-interviews";
import { CORE_SECTIONS, LIFE_SAFETY_IDS } from "./template";
import type { AuditDocument, ScoreResult, StudioTemplate } from "./types";

/** The same integer point calculation is used in the editor, finalisation and PDF. */
export function scoreAudit(
  template: StudioTemplate,
  document: AuditDocument,
): ScoreResult {
  const failures: string[] = [],
    pending: string[] = [],
    recommendations: string[] = [];
  const sections = template.sections.map((section) => {
    let earned = 0,
      applicable = 0,
      answered = 0,
      unanswered = 0,
      unverified = 0;
    for (const q of section.checks) {
      const r = effectiveResponse(document, template, q.id);
      if (!r?.answer) {
        unanswered++;
        applicable += q.weight;
        continue;
      }
      answered++;
      if (r.answer === "na") continue;
      applicable += q.weight;
      if (r.answer === "yes" && r.verified) earned += q.weight;
      if (!r.verified && LIFE_SAFETY_IDS.has(q.id)) unverified += q.weight;
      if (!r.verified && LIFE_SAFETY_IDS.has(q.id))
        pending.push(`${q.id}: safety evidence not verified`);
      if (q.id === "15.01" && r.answer === "no" && r.verified)
        failures.push(
          "A required escape route or final exit is not clear and usable.",
        );
      // Door propping alone is handled by its four-point deduction, never the danger override.
      if (r.danger && q.id !== "15.02" && r.verified)
        failures.push(`${q.id}: immediate serious danger — ${r.dangerReason}`);
    }
    const core = CORE_SECTIONS.has(section.page);
    if (core && !unanswered && applicable > 0 && earned * 100 < 70 * applicable)
      recommendations.push(
        `${section.title} is below the 70% target; complete the recorded actions and follow up this section.`,
      );
    return {
      page: section.page,
      title: section.title,
      earned,
      applicable,
      answered,
      unanswered,
      percentage: applicable ? (earned / applicable) * 100 : null,
      core,
      unverified,
    };
  });
  const earned = sections.reduce((n, s) => n + s.earned, 0),
    applicable = sections.reduce((n, s) => n + s.applicable, 0);
  const answered = sections.reduce((n, s) => n + s.answered, 0),
    total = template.sections.reduce((n, s) => n + s.checks.length, 0);
  if (answered < total)
    pending.unshift(`${total - answered} scored questions are unanswered.`);
  if (interviewIssues(document, template).length)
    pending.push("Complete the recorded staff interviews and practical check details.");
  if (!applicable)
    pending.push("No scored checks apply; no percentage can be issued.");
  if (answered === total && applicable && earned * 100 < 80 * applicable)
    failures.push("Overall score is below the 80% pass mark.");
  return {
    earned,
    applicable,
    percentage: applicable ? (earned / applicable) * 100 : null,
    outcome: failures.length
      ? "Fail"
      : pending.length
        ? "Pending"
        : recommendations.length
          ? "Pass with recommendations"
          : "Pass",
    reasons: [...failures, ...pending, ...recommendations],
    answered,
    total,
    sections,
  };
}
export function formatScore(n: number | null) {
  return n === null ? "N/A" : `${n.toFixed(2)}%`;
}

export function completionIssues(
  template: StudioTemplate,
  doc: AuditDocument,
): Array<{ questionId: string; message: string }> {
  const issues: Array<{ questionId: string; message: string }> = [];
  const add = (questionId: string, message: string) =>
    issues.push({ questionId, message });
  for (const field of [
    "storeName",
    "storeCode",
    "address",
    "visitDate",
    "auditor",
    "floors",
    "exits",
    "staff",
    "maxStaff",
    "enforcement",
    "systems",
    "responsibilities",
  ] as const)
    if (!doc.site[field].trim())
      add(
        "site",
        `Complete ${field.replace(/([A-Z])/g, " $1").toLowerCase()}.`,
      );
  if (!doc.site.area.trim() && !doc.site.limitations.trim())
    add(
      "site",
      "Record the site area or explain why it could not be verified in limitations.",
    );
  for (const section of template.sections)
    for (const q of section.checks) {
      const r = effectiveResponse(doc, template, q.id);
      if (!r?.answer) {
        add(q.id, isInterviewDerived(doc, q.id) ? (q.id === "05.02" ? "Record staff understanding of two selected risks, or explain why this check was not sampled." : "Record the staff interview outcome, or explain why this check was not sampled.") : "Choose Yes, No or N/A.");
        continue;
      }
      if (!r.verified && r.answer !== "no")
        add(
          q.id,
          "Unverified evidence must be recorded as No, not Yes or N/A.",
        );
      if (r.answer === "na" && !r.naReason.trim())
        add(q.id, "Explain why this check does not apply.");
      if (r.answer === "no") {
        if (!r.note.trim() && !interviewNotes(doc, template, q.id).trim()) add(q.id, "Add a note explaining the finding.");
        if (
          !r.action.text.trim() ||
          !r.action.owner.trim() ||
          !r.action.dueDate
        )
          add(q.id, "Add the action, owner and due date.");
      }
      if (
        r.danger &&
        (r.answer !== "no" ||
          !r.verified ||
          !r.dangerReason.trim() ||
          q.id === "15.02")
      )
        add(
          q.id,
          "A serious danger must be a verified failure with a reason. Door propping alone is not an automatic fail.",
        );
    }
  if (!doc.signOff.auditorSignature)
    add("sign-off", "Add the auditor signature.");
  if (
    (!doc.signOff.representative.trim() ||
      !doc.signOff.representativeSignature) &&
    !doc.signOff.unavailableReason.trim()
  )
    add(
      "sign-off",
      "Add the store representative and signature, or a reason acknowledgement was unavailable.",
    );
  for(const review of doc.previousActionReviews || []) {
    if(!review.outcome || !review.note.trim()) add("16.03", "Record the outcome and findings for each selected previous action.");
  }
  return [...issues, ...interviewIssues(doc, template)];
}
