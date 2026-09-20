import source from "./template-v3.json";
import type {
  AuditDocument,
  Response,
  SiteDetails,
  StudioTemplate,
} from "./types";

export const TEMPLATE: StudioTemplate = {
  version: "hs-update-2026-09-20-v3",
  title: "Footasylum H&S Audit",
  sections: source,
};
export const CORE_SECTIONS = new Set([7, 9, 12, 15]);
export const LIFE_SAFETY_IDS = new Set([
  "07.02",
  "07.06",
  "07.07",
  "07.08",
  "07.10",
  ...source[14].checks.map((q) => q.id),
]);
export const QUESTION_IDS = new Set(
  source.flatMap((section) => section.checks.map((q) => q.id)),
);
export const SITE_EVIDENCE_IDS = new Set([
  "site",
  "disclaimer",
  "site-information",
  "sign-off",
]);
export const STUDIO_BUCKET = "fa-audit-studio";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_EVIDENCE = 300;
export const MAX_QUESTION_EVIDENCE = 10;
export { studioEnabled } from "./config";
export function emptyResponse(): Response {
  return {
    answer: null,
    note: "",
    naReason: "",
    verified: true,
    danger: false,
    dangerReason: "",
    action: { text: "", owner: "", dueDate: "" },
  };
}
export function emptyDocument(site: Partial<SiteDetails> = {}): AuditDocument {
  return {
    site: {
      storeName: "",
      storeCode: "",
      address: "",
      visitDate: "",
      auditor: "",
      floors: "",
      area: "",
      areaUnit: "m²",
      exits: "",
      staff: "",
      maxStaff: "",
      youngPersons: "",
      enforcement: "",
      limitations: "",
      systems: "",
      responsibilities: "",
      previousReport: "",
      ...site,
    },
    responses: {},
    evidence: [],
    signOff: {
      auditorSignature: "",
      representative: "",
      representativeSignature: "",
      unavailableReason: "",
    },
  };
}
