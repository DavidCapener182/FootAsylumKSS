import type { Response } from "./types";

const prompts: Record<string, { checked: string; outcome: string }> = {
  "05.02": {
    checked:
      "Which two risks did you choose? Record the staff roles sampled and what you asked them to explain or demonstrate.",
    outcome:
      "What did staff explain or demonstrate? Record which controls they understood and any gaps.",
  },
  "06.03": {
    checked:
      "Record the staff roles sampled and the safe-working or emergency questions you asked, such as what to do when the alarm sounds.",
    outcome:
      "Record their own answers. Compare the assembly point and procedure with the manager Q&A and site records; note what matched, any differences and any refresher needed.",
  },
  "09.01": {
    checked:
      "Which stock and location did you select? Record who you asked and how they would move or retrieve it, including the aids available.",
    outcome:
      "Was the method safe and practical? Record what you observed or were told and any handling difficulties.",
  },
  "10.03": {
    checked:
      "Which product, COSHH assessment and safety data sheet did you check? Record the user's role and what you asked about safe use, PPE or spills.",
    outcome:
      "Could the user find the records and explain the controls? Record their answers and any gaps.",
  },
  "12.01": {
    checked:
      "Which shelf or task did you select? Record the staff role sampled and the access equipment or method discussed. Do not ask for an unsafe demonstration.",
    outcome:
      "Could staff explain or demonstrate safe access? Record whether the available equipment was suitable and any problems.",
  },
  "13.02": {
    checked:
      "Record the staff roles sampled, the first-aid cover checked and what you asked about getting help.",
    outcome:
      "Did staff know who to contact and how? Record their answers and any gaps in cover or understanding.",
  },
  "14.01": {
    checked:
      "Record the staff role sampled and the accident or near-miss reporting task you asked them to explain. Include any anonymised record reference checked.",
    outcome:
      "Could they explain or demonstrate the reporting process? Record whether the records matched and any gaps.",
  },
  "15.08": {
    checked:
      "Check the manager's evacuation arrangements against the fire action notice or plan and the latest drill record. Ask staff independently where to assemble and how to help customers.",
    outcome:
      "Record the drill result and staff answers, whether they matched the verified arrangements, and any gaps or follow-up needed.",
  },
};

export function practicalCheckPrompts(version: string, questionId: string) {
  return ["hs-update-2026-09-19-v1", "hs-update-2026-09-20-v2", "hs-update-2026-09-20-v3"].includes(version)
    ? prompts[questionId]
    : undefined;
}

/** Keep structured observations with the question in both report locations. */
export function responseNotes(response: Response): string {
  const check = response.practicalCheck;
  return [
    check?.checked.trim() ? `What was checked: ${check.checked}` : "",
    check?.outcome.trim() ? `Outcome: ${check.outcome}` : "",
    response.note,
  ]
    .filter(Boolean)
    .join("\n\n");
}
