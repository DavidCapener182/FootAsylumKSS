import type { SiteDetails } from "./types";

type ManagerQuestion = {
  key: keyof SiteDetails;
  question: string;
  hint: string;
  checks?: string[];
};

/** Unscored visit context. A manager's answer never supplies a compliance answer. */
export const MANAGER_QUESTION_GROUPS: { title: string; questions: ManagerQuestion[] }[] = [
  { title: "People and staffing", questions: [
    { key: "managerName", question: "Who are we speaking with?", hint: "Record the manager's name and role." },
    { key: "staff", question: "How many people work at this store?", hint: "Include permanent, part-time and temporary staff. Note any vacancies or recent starters relevant to this visit.", checks: ["06.01", "06.02"] },
    { key: "maxStaff", question: "What is the maximum number of staff on a shift?", hint: "Include busy periods, deliveries and stocktakes.", checks: ["13.02", "15.08"] },
    { key: "youngPersons", question: "How many staff are under 18, and what arrangements apply to them?", hint: "Record the number, tasks, restrictions and supervision. Enter None if there are no under-18s; avoid personal medical details.", checks: ["05.01", "06.01"] },
    { key: "inductionArrangements", question: "How are new starters trained and supervised?", hint: "Ask who checks induction is complete, where records are kept and what happens before someone works unsupervised.", checks: ["06.01", "06.02"] },
  ] },
  { title: "Fire and evacuation", questions: [
    { key: "assemblyPoint", question: "Where is the fire evacuation assembly point?", hint: "Record the exact location and a clear landmark. Ask about any alternative assembly point.", checks: ["06.03", "15.08"] },
    { key: "assemblyPointEvidence", question: "Where can we confirm the assembly point?", hint: "Auditor: check the fire action notice or evacuation plan. Record the source and any disagreement with the manager's answer.", checks: ["06.03", "15.08"] },
    { key: "evacuationProcedure", question: "What should staff do when the fire alarm sounds?", hint: "Ask about leaving the store, directing customers, raising the alarm and checking everyone is accounted for.", checks: ["06.03", "15.08"] },
    { key: "evacuationAssistance", question: "What arrangements are in place for people who need help to evacuate?", hint: "Record the assistance arrangements and responsible roles. Record arrangements rather than private health information.", checks: ["05.01", "06.03", "15.08"] },
  ] },
  { title: "Help, reporting and local risks", questions: [
    { key: "firstAidArrangements", question: "How do staff get first-aid help?", hint: "Record who provides cover, how to contact them, where the kit is and how all shifts are covered.", checks: ["13.01", "13.02"] },
    { key: "incidentReporting", question: "How should staff report an accident or near miss?", hint: "Record the system, who staff tell and how an urgent concern is escalated.", checks: ["14.01", "14.02"] },
    { key: "localRisks", question: "Which tasks or risks need particular attention at this store?", hint: "Ask about deliveries, stock retrieval, lone working and recent changes. Record the controls staff should be able to explain.", checks: ["05.01", "05.02", "05.03", "09.01", "12.01"] },
    { key: "responsibilities", question: "Who is responsible for the store's safety checks?", hint: "Record roles, cover during absence and who follows up defects.", checks: ["04.02", "16.01", "16.04"] },
  ] },
];

export const MANAGER_QUESTIONS = MANAGER_QUESTION_GROUPS.flatMap((g) => g.questions);

export function managerReferences(site: SiteDetails, questionId: string) {
  return MANAGER_QUESTIONS.filter((q) => q.checks?.includes(questionId)).map((q) => ({
    key: q.key,
    question: q.question,
    answer: site[q.key]?.trim() || "",
  }));
}

export function managerReferenceNotes(site: SiteDetails, questionId: string) {
  const recorded = managerReferences(site, questionId).filter((q) => q.answer);
  if (!recorded.length) return "";
  return `Manager Q&A reference${site.managerName ? ` (${site.managerName})` : ""} — check against the site records; not proof of staff understanding.\n${recorded.map((q) => `${q.question}\n${q.answer}`).join("\n")}`;
}
