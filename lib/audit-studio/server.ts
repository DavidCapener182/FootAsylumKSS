import { toStoredInterviewDocument, fromStoredInterviewDocument, withCurrentInterviewScoring } from "./staff-interviews";
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { studioEnabled } from "./config";
import {
  TEMPLATE,
  STUDIO_BUCKET,
  MAX_FILE_BYTES,
  MAX_EVIDENCE,
  MAX_QUESTION_EVIDENCE,
  SITE_EVIDENCE_IDS,
  emptyDocument,
} from "./template";
import { validateDocument } from "./validation";
import { completionIssues, scoreAudit } from "./scoring";
import type {
  AuditBundle,
  AuditRecord,
  Evidence,
  StudioTemplate,
} from "./types";

export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const uuid = z.string().uuid();
const db = () => createAdminSupabaseClient();
function checked<T>(data: T, error: { message: string } | null): T {
  if (error)
    throw new StudioError(
      "Audit storage is unavailable. Your device draft is retained.",
      503,
    );
  return data;
}
export async function studioAdmin() {
  if (!studioEnabled()) throw new StudioError("Audit Studio is disabled.", 404);
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    throw new StudioError(
      "Sign in again to synchronise. Your device draft is retained.",
      401,
    );
  const { data: profile } = await client
    .from("fa_profiles")
    .select("role,account_status,full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "active")
    throw new StudioError("Active Admin access is required.", 403);
  return { id: user.id, name: profile.full_name || user.email || "Auditor" };
}
export async function bundle(id: string): Promise<AuditBundle> {
  uuid.parse(id);
  const client = db();
  const { data, error } = await client
    .from("fa_audit_studio_audits")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checked(data, error);
  if (!data) throw new StudioError("Test audit not found.", 404);
  const [t, e] = await Promise.all([
    client
      .from("fa_audit_studio_templates")
      .select("definition")
      .eq("version", data.template_version)
      .single(),
    client
      .from("fa_audit_studio_evidence")
      .select("*")
      .eq("audit_id", id)
      .order("created_at"),
  ]);
  checked(t.data, t.error);
  checked(e.data, e.error);
  return {
    audit: { ...data, document: data.status === "draft" ? withCurrentInterviewScoring(fromStoredInterviewDocument(data.document)) : fromStoredInterviewDocument(data.document) } as AuditRecord,
    template: t.data!.definition as StudioTemplate,
    evidence: (e.data || []).map((row) => ({
      ...row,
      questionId: row.question_id,
      caption: "",
      location: "",
    })) as Evidence[],
  };
}
export async function bootstrap(user: { id: string; name: string }) {
  const client = db();
  const [stores, audits, template] = await Promise.all([
    client
      .from("fa_stores")
      .select("id,store_name,store_code,address_line_1,city,postcode")
      .eq("is_active", true)
      .order("store_name"),
    client
      .from("fa_audit_studio_audits")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500),
    client
      .from("fa_audit_studio_templates")
      .select("definition")
      .eq("version", TEMPLATE.version)
      .single(),
  ]);
  checked(stores.data, stores.error);
  checked(audits.data, audits.error);
  checked(template.data, template.error);
  return {
    user,
    stores: (stores.data || []).map((s) => ({
      id: s.id,
      store_name: s.store_name,
      store_code: s.store_code,
      address: [s.address_line_1, s.city, s.postcode]
        .filter(Boolean)
        .join(", "),
    })),
    audits: (audits.data || []).map(a => ({ ...a, document: a.status === "draft" ? withCurrentInterviewScoring(fromStoredInterviewDocument(a.document)) : fromStoredInterviewDocument(a.document) })),
    template: template.data!.definition,
  };
}
export async function createAudit(
  value: unknown,
  user: { id: string; name: string },
) {
  const input = z
    .object({
      id: uuid,
      storeId: uuid,
      visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      auditor: z.string().trim().min(1).max(200),
      address: z.string().trim().min(1).max(2000),
    })
    .strict()
    .parse(value);
  const client = db();
  const existing = await client
    .from("fa_audit_studio_audits")
    .select("id,created_by,store_id")
    .eq("id", input.id)
    .maybeSingle();
  if (existing.data) {
    if (
      existing.data.created_by !== user.id ||
      existing.data.store_id !== input.storeId
    )
      throw new StudioError("This audit identifier is already in use.", 409);
    return bundle(input.id);
  }
  const { data: store, error } = await client
    .from("fa_stores")
    .select("id,store_name,store_code,address_line_1,city,postcode,is_active")
    .eq("id", input.storeId)
    .single();
  checked(store, error);
  if (!store?.is_active) throw new StudioError("Choose an active store.");
  const document = validateDocument(
    withCurrentInterviewScoring(emptyDocument({
      storeName: store.store_name,
      storeCode: store.store_code,
      address: input.address,
      auditor: input.auditor,
      visitDate: input.visitDate,
    })),
    TEMPLATE,
  );
  const result = await client.from("fa_audit_studio_audits").insert({
    id: input.id,
    store_id: input.storeId,
    template_version: TEMPLATE.version,
    created_by: user.id,
    document,
    result: scoreAudit(TEMPLATE, document),
  });
  checked(result.data, result.error);
  return bundle(input.id);
}
export async function saveAudit(id: string, value: unknown) {
  const input = z
    .object({
      revision: z.number().int().nonnegative(),
      operationId: uuid,
      document: z.unknown(),
    })
    .strict()
    .parse(value);
  const b = await bundle(id);
  const document = withCurrentInterviewScoring(validateDocument(input.document, b.template));
  for (const ref of document.evidence) {
    const row = b.evidence.find((e) => e.id === ref.id);
    if (!row || row.questionId !== ref.questionId || row.status !== "ready")
      throw new StudioError("Synchronise all evidence before saving online.");
  }
  const { error } = await db().rpc("fa_audit_studio_save", {
    p_id: id,
    p_revision: input.revision,
    p_operation: input.operationId,
    p_document: toStoredInterviewDocument(document, b.template),
    p_result: scoreAudit(b.template, document),
  });
  if (error?.message.includes("REVISION_CONFLICT"))
    throw new StudioError(
      "This audit changed on another device. Review both versions before continuing.",
      409,
    );
  if (error?.message.includes("read-only"))
    throw new StudioError("This audit is read-only.", 409);
  checked(null, error);
  return bundle(id);
}
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;
export async function reserveEvidence(id: string, value: unknown) {
  const input = z
    .object({
      id: uuid,
      questionId: z.string(),
      name: z.string().min(1).max(255),
      type: z.enum(allowedTypes),
      size: z.number().int().positive().max(MAX_FILE_BYTES),
      questionEvidenceIds: z.array(uuid).min(1).max(MAX_QUESTION_EVIDENCE),
    })
    .strict()
    .parse(value);
  if (
    !input.questionEvidenceIds.includes(input.id) ||
    new Set(input.questionEvidenceIds).size !== input.questionEvidenceIds.length
  )
    throw new StudioError("Check the attachment list for this question.");
  const b = await bundle(id);
  if (b.audit.status !== "draft")
    throw new StudioError(
      "Evidence cannot be added to a completed audit.",
      409,
    );
  const ids = new Set(
    b.template.sections.flatMap((s) => s.checks.map((q) => q.id)),
  );
  if (!ids.has(input.questionId) && !SITE_EVIDENCE_IDS.has(input.questionId))
    throw new StudioError("Unknown question.");
  const found = b.evidence.find((e) => e.id === input.id);
  if (found) {
    if (
      found.questionId !== input.questionId ||
      found.file_size !== input.size ||
      found.file_type !== input.type
    )
      throw new StudioError("Evidence identifier conflict.", 409);
    return { ...found, existing: true };
  }
  if (b.evidence.length >= MAX_EVIDENCE)
    throw new StudioError(
      `This audit has reached its ${MAX_EVIDENCE}-attachment limit.`,
    );
  const source_path = `${id}/${input.id}/original`;
  const { data, error } = await db()
    .from("fa_audit_studio_evidence")
    .insert({
      id: input.id,
      audit_id: id,
      question_id: input.questionId,
      file_name: input.name,
      file_type: input.type,
      file_size: input.size,
      source_path,
    })
    .select("*")
    .single();
  checked(data, error);
  return { ...data, questionId: input.questionId, existing: false };
}
export async function readStored(path: string) {
  const { data, error } = await db().storage.from(STUDIO_BUCKET).download(path);
  if (error || !data)
    throw new StudioError(
      "A stored attachment is missing or unreadable. Restore it before completing the audit.",
      422,
    );
  return Buffer.from(await data.arrayBuffer());
}
export async function confirmEvidence(id: string, evidenceId: string) {
  uuid.parse(evidenceId);
  const b = await bundle(id),
    e = b.evidence.find((e) => e.id === evidenceId);
  if (!e) throw new StudioError("Evidence not found.", 404);
  if (e.status === "ready") return e;
  if (b.audit.status !== "draft")
    throw new StudioError("This audit is read-only.", 409);
  const bytes = await readStored(e.source_path);
  if (bytes.length !== e.file_size)
    throw new StudioError(
      "The uploaded file size does not match. Retry the upload.",
      422,
    );
  let renderPath = e.source_path;
  if (e.file_type === "application/pdf") {
    if (bytes.subarray(0, 5).toString() !== "%PDF-")
      throw new StudioError("This file is not a readable PDF.", 422);
    try {
      const pdf = await PDFDocument.load(bytes);
      if (!pdf.getPageCount()) throw new Error("Empty PDF");
    } catch {
      throw new StudioError(
        "The PDF is damaged or password-protected. Upload an unlocked PDF.",
        422,
      );
    }
  } else {
    let image: Buffer;
    try {
      image = await sharp(bytes, {
        limitInputPixels: 60000000,
        failOn: "error",
      })
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new StudioError(
        "This image cannot be read. Keep the original and attach a JPEG or PNG copy.",
        422,
      );
    }
    renderPath = `${id}/${e.id}/report.jpg`;
    const upload = await db()
      .storage.from(STUDIO_BUCKET)
      .upload(renderPath, image, { contentType: "image/jpeg", upsert: true });
    checked(upload.data, upload.error);
  }
  const { error } = await db()
    .from("fa_audit_studio_evidence")
    .update({
      status: "ready",
      render_path: renderPath,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    })
    .eq("id", e.id)
    .eq("status", "pending");
  checked(null, error);
  return (await bundle(id)).evidence.find((row) => row.id === e.id)!;
}
export async function completeAudit(id: string, value: unknown) {
  const input = z
    .object({ revision: z.number().int().nonnegative() })
    .strict()
    .parse(value);
  let b = await bundle(id);
  if (b.audit.status === "completed") return b;
  const document = validateDocument(b.audit.document, b.template),
    issues = completionIssues(b.template, document);
  if (issues.length)
    throw new StudioError(
      issues
        .slice(0, 8)
        .map((i) => `${i.questionId}: ${i.message}`)
        .join("\n"),
      422,
    );
  for (const ref of document.evidence)
    if (
      !b.evidence.some(
        (e) =>
          e.id === ref.id &&
          e.questionId === ref.questionId &&
          e.status === "ready",
      )
    )
      throw new StudioError(
        "Some evidence has not finished synchronising.",
        422,
      );
  // Persist the same derived answers in the response/finding indexes before
  // freezing, including older drafts upgraded to interview-derived scoring.
  if (b.audit.status === "draft") {
    b = await saveAudit(id, { revision: input.revision, operationId: randomUUID(), document });
    if (b.audit.revision !== input.revision + 1 || b.audit.status !== "draft")
      throw new StudioError("This audit changed. Synchronise and review it before completing.", 409);
    input.revision = b.audit.revision;
  }
  // An expired rendering lease can be retried; its old worker cannot commit another report.
  const client = db(),
    token = randomUUID();
  if (
    b.audit.status === "finalizing" &&
    Date.now() - Date.parse(b.audit.updated_at) < 5 * 60 * 1000
  )
    throw new StudioError(
      "The report is already being prepared. Please wait.",
      409,
    );
  const { data: locked, error } = await client
    .from("fa_audit_studio_audits")
    .update({
      status: "finalizing",
      document: toStoredInterviewDocument(document, b.template),
      finalize_token: token,
      updated_at: new Date().toISOString(),
      report_error: null,
    })
    .eq("id", id)
    .eq("revision", input.revision)
    .eq("status", b.audit.status)
    .eq("updated_at", b.audit.updated_at)
    .select("id")
    .maybeSingle();
  checked(locked, error);
  if (!locked)
    throw new StudioError(
      "This audit changed. Synchronise and review it before completing.",
      409,
    );
  try {
    const { generateReport } = await import("./report");
    b = {
      ...b,
      audit: { ...b.audit, result: scoreAudit(b.template, document) },
    };
    const pdf = await generateReport(b, readStored);
    const path = `${id}/reports/${token}.pdf`,
      hash = createHash("sha256").update(pdf).digest("hex");
    const upload = await client.storage
      .from(STUDIO_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: false });
    checked(upload.data, upload.error);
    const finish = await client
      .from("fa_audit_studio_audits")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pdf_path: path,
        pdf_sha256: hash,
        result: b.audit.result,
        finalize_token: null,
        revision: input.revision + 1,
      })
      .eq("id", id)
      .eq("finalize_token", token)
      .select("id")
      .maybeSingle();
    checked(finish.data, finish.error);
    if (!finish.data)
      throw new StudioError(
        "The completion lease expired. Retry after refreshing.",
        409,
      );
    return bundle(id);
  } catch (error) {
    await client
      .from("fa_audit_studio_audits")
      .update({
        status: "draft",
        finalize_token: null,
        report_error:
          "PDF generation failed. Evidence and answers are retained; retry completion.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("finalize_token", token);
    console.error("[audit-studio] PDF generation failed", {
      auditId: id,
      code: error instanceof StudioError ? error.status : 500,
    });
    throw error;
  }
}
export async function reviseAudit(
  id: string,
  value: unknown,
  user: { id: string },
) {
  uuid.parse(id);
  const input = z.object({ id: uuid }).strict().parse(value);
  const { error } = await db().rpc("fa_audit_studio_revise", {
    p_parent: id,
    p_id: input.id,
    p_user: user.id,
  });
  checked(null, error);
  return bundle(input.id);
}
