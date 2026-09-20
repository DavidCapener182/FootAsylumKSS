import type { AuditDocument, StudioTemplate } from "./types";
import { responseNotes } from "./practical-checks";
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function changesBetween(
  local: AuditDocument,
  online: AuditDocument,
  template: StudioTemplate,
) {
  const differences: Array<{ label: string; local: string; online: string }> =
    [];
  const add = <T>(label: string, a: T, b: T, display?: (v: T) => string) => {
    if (stable(a) !== stable(b))
      differences.push({
        label,
        local: display ? display(a) : String(a || "Not recorded"),
        online: display ? display(b) : String(b || "Not recorded"),
      });
  };
  for (const key of [...new Set([...Object.keys(local.site), ...Object.keys(online.site)])] as Array<
    keyof AuditDocument["site"]
  >)
    add(key.replace(/([A-Z])/g, " $1"), local.site[key], online.site[key]);
  for (const q of template.sections.flatMap((s) => s.checks))
    add(
      `${q.id} · ${q.question}`,
      local.responses[q.id],
      online.responses[q.id],
      (r) =>
        r
          ? `${r.answer || "Unanswered"}${!r.verified ? " / Not verified" : ""}\n${responseNotes(r)}\n${r.naReason ? `N/A reason: ${r.naReason}\n` : ""}${r.danger ? `Serious danger: ${r.dangerReason}\n` : ""}Action: ${r.action.text || "None"}\nOwner: ${r.action.owner || "None"} · Due: ${r.action.dueDate || "None"}`
          : "Unanswered",
    );
  add("Staff interviews", local.staffInterviews || [], online.staffInterviews || [], v => JSON.stringify(v, null, 2));
  for (const id of new Set(
    [...local.evidence, ...online.evidence].map((e) => e.id),
  ))
    add(
      `Attachment ${id.slice(0, 8)}`,
      local.evidence.find((e) => e.id === id),
      online.evidence.find((e) => e.id === id),
      (e) =>
        e
          ? `${e.questionId} · ${e.caption || "No caption"} · ${e.location || "No location"}`
          : "Not attached",
    );
  add(
    "Store representative",
    local.signOff.representative,
    online.signOff.representative,
  );
  add(
    "Acknowledgement unavailable",
    local.signOff.unavailableReason,
    online.signOff.unavailableReason,
  );
  for (const key of ["auditorSignature", "representativeSignature"] as const)
    if (local.signOff[key] !== online.signOff[key])
      differences.push({
        label:
          key === "auditorSignature" ? "Auditor signature" : "Store signature",
        local: local.signOff[key] ? "Signature present" : "No signature",
        online: online.signOff[key]
          ? "Different signature present"
          : "No signature",
      });
  return differences;
}
