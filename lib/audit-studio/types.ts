export type Answer = "yes" | "no" | "na" | null;
export type Outcome = "Pass" | "Pass with recommendations" | "Fail" | "Pending";
export type StudioQuestion = { id: string; question: string; weight: number };
export type StudioSection = {
  page: number;
  title: string;
  total: number;
  checks: StudioQuestion[];
  evidence: string;
  practice: string;
};
export type StudioTemplate = {
  version: string;
  title: string;
  sections: StudioSection[];
};
export type Response = {
  answer: Answer;
  note: string;
  practicalCheck?: { checked: string; outcome: string };
  naReason: string;
  verified: boolean;
  danger: boolean;
  dangerReason: string;
  action: { text: string; owner: string; dueDate: string };
};
export type SiteDetails = {
  storeName: string;
  storeCode: string;
  address: string;
  visitDate: string;
  auditor: string;
  floors: string;
  area: string;
  areaUnit: "m²" | "ft²";
  exits: string;
  staff: string;
  maxStaff: string;
  youngPersons: string;
  enforcement: string;
  limitations: string;
  systems: string;
  responsibilities: string;
  previousReport: string;
  managerName?: string;
  assemblyPoint?: string;
  assemblyPointEvidence?: string;
  evacuationProcedure?: string;
  evacuationAssistance?: string;
  firstAidArrangements?: string;
  incidentReporting?: string;
  localRisks?: string;
  inductionArrangements?: string;
};
export type EvidenceReference = {
  id: string;
  questionId: string;
  caption: string;
  location: string;
};
export type SignOff = {
  auditorSignature: string;
  representative: string;
  representativeSignature: string;
  unavailableReason: string;
};
export type StaffInterviewTarget = {staffId: string; topicId?: string; field?: "severity" | "outcome" | "practical" | "reply"};
export type StaffInterviewAnswer = {
  askedThisVisit?: boolean;
  sampledRisk?: boolean;
  gapSeverity?: "minor" | "incorrect" | "unsafe";
  practical?: {
    version: "practical-v1";
    optionalSampling?: boolean;
    context: string;
    reference: string;
    checks: Record<string, {result: "met" | "gap" | "na" | "not-observed" | null; note: string}>;
  };
  asked: string;
  reply: string;
  assessment: "understood" | "gap" | "not-applicable" | null;
  outcome: string;
};
export type StaffInterview = {
  id: string;
  colleague: string;
  role: string;
  answers: Record<string, StaffInterviewAnswer>;
};
export type PreviousAction = {
  id: string;
  kind: "H&S" | "FRA";
  title: string;
  detail: string;
  date: string;
  status: string;
  reportPath?: string;
};
export type PreviousActionReview = PreviousAction & {
  outcome: "improved" | "not-improved" | "not-applicable" | null;
  note: string;
};
export type AuditDocument = {
  purpose?: "store" | "practice";
  previousActionReviews?: PreviousActionReview[];
  interviewScoringVersion?: "derived-v1" | "graded-v2";
  optionalStaffSampling?: boolean;
  staffInterviews?: StaffInterview[];
  site: SiteDetails;
  responses: Record<string, Response>;
  evidence: EvidenceReference[];
  signOff: SignOff;
};
export type Evidence = EvidenceReference & {
  audit_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: "pending" | "ready";
  source_path: string;
  render_path: string | null;
  sha256: string | null;
  created_at: string;
};
export type AuditRecord = {
  id: string;
  store_id: string;
  template_version: string;
  created_by: string;
  status: "draft" | "finalizing" | "completed";
  revision: number;
  document: AuditDocument;
  result: ScoreResult | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  parent_id: string | null;
  pdf_path: string | null;
  pdf_sha256: string | null;
  report_error: string | null;
};
export type AuditBundle = {
  audit: AuditRecord;
  template: StudioTemplate;
  evidence: Evidence[];
  previousActions?: PreviousAction[];
  publication?: { audit_year: number; audit_number: number; published_at: string; pdf_path: string } | null;
  history?: Array<{ id: string; kind: string; audit_year: number; audit_number: number | null; visit_date: string; pdf_path: string | null; percentage: number | null }>;
};
export type SectionScore = {
  page: number;
  title: string;
  earned: number;
  applicable: number;
  answered: number;
  unanswered: number;
  percentage: number | null;
  core: boolean;
};
export type ScoreResult = {
  earned: number;
  applicable: number;
  percentage: number | null;
  outcome: Outcome;
  reasons: string[];
  answered: number;
  total: number;
  sections: SectionScore[];
};
export type StoreOption = {
  id: string;
  store_name: string;
  store_code: string;
  address?: string | null;
};
export type StudioBootstrap = {
  user: { id: string; name: string };
  stores: StoreOption[];
  audits: AuditRecord[];
  template: StudioTemplate;
};
export type LocalEvidence = {
  id: string;
  auditId: string;
  userId: string;
  file: Blob;
  preview?: Blob;
  name: string;
  type: string;
  synced: boolean;
};
export type DeviceDraft = {
  key: string;
  userId: string;
  bundle: AuditBundle;
  document: AuditDocument;
  baseRevision: number;
  generation: number;
  syncedGeneration: number;
  operationId: string;
  updatedAt: string;
};
