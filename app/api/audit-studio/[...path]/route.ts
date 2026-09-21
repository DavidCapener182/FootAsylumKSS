import { auditReportFilename } from "@/lib/audit-studio/report-filename";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {previousStoreActions, publishToStore} from "@/lib/audit-studio/store-records";
import references from "@/lib/audit-studio/reference-documents.json";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ZodError } from "zod";
import {
  studioAdmin,
  StudioError,
  bootstrap,
  bundle,
  createAudit,
  saveAudit,
  reserveEvidence,
  confirmEvidence,
  completeAudit,
  reviseAudit,
  readStored,
} from "@/lib/audit-studio/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
async function dispatch(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    const user = await studioAdmin();
    if (req.method !== "GET") {
      const origin = req.headers.get("origin");
      if (!origin || origin !== req.nextUrl.origin)
        throw new StudioError("Request origin was not accepted.", 403);
      if (!req.headers.get("content-type")?.startsWith("application/json"))
        throw new StudioError("Expected JSON.", 415);
      if (Number(req.headers.get("content-length") || 0) > 2 * 1024 * 1024)
        throw new StudioError("Request is too large.", 413);
    }
    const [resource, id, operation, evidenceId] = params.path;
    let result: unknown;
    const body = async () => {
      const text = await req.text();
      if (text.length > 2 * 1024 * 1024)
        throw new StudioError("Request is too large.", 413);
      return JSON.parse(text);
    };
    if (resource === "bootstrap" && req.method === "GET")
      result = await bootstrap(user);
    else if (
      resource === "reference" &&
      req.method === "GET" &&
      ["pdf", "docx", "introduction"].includes(id)
    ) {
      const filename =
        id === "introduction"
          ? "safetyculture-introduction-v1.pdf"
          : `SafetyCulture-Audit-Update.${id}`;
      const bytes = id === "introduction"
        ? await readFile(path.join(process.cwd(), "docs/audit-studio", filename))
        : await readStored(references[id as "pdf" | "docx"].path);
      if (id !== "introduction" && createHash("sha256").update(bytes).digest("hex") !== references[id as "pdf" | "docx"].sha256)
        throw new StudioError("The reference document failed its integrity check.", 503);
      return new NextResponse(
        bytes,
        {
          headers: {
            ...headers,
            "Content-Type":
              id !== "docx"
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        },
      );
    } else if (resource === "audits") {
      if (!id && req.method === "POST")
        result = await createAudit(await body(), user);
      else if(id && operation === "previous-actions" && req.method === "GET") result = await previousStoreActions(id);
      else if(id && operation === "history" && evidenceId && req.method === "GET") {
        const b = await bundle(id);
        const entry = b.history?.find(h=>h.id===evidenceId);
        if(!entry?.pdf_path) throw new StudioError("No report file is linked to this history entry.",404);
        if(/^https:\/\//.test(entry.pdf_path)) return NextResponse.redirect(entry.pdf_path);
        const signed = await createAdminSupabaseClient().storage.from("fa-attachments").createSignedUrl(entry.pdf_path,300);
        if(signed.error || !signed.data) throw new StudioError("The retained report could not be opened.",503);
        return NextResponse.redirect(signed.data.signedUrl);
      }
      else if(id && operation === "publish" && req.method === "POST") result = await publishToStore(id, await body(), user);
      else if (id && !operation && req.method === "GET")
        result = await bundle(id);
      else if (id && !operation && req.method === "PUT")
        result = await saveAudit(id, await body());
      else if (
        id &&
        operation === "evidence" &&
        !evidenceId &&
        req.method === "POST"
      )
        result = await reserveEvidence(id, await body());
      else if (
        id &&
        operation === "evidence" &&
        evidenceId &&
        req.method === "POST"
      )
        result = await confirmEvidence(id, evidenceId);
      else if (
        id &&
        operation === "evidence" &&
        evidenceId &&
        req.method === "GET"
      ) {
        const b = await bundle(id),
          e = b.evidence.find((e) => e.id === evidenceId);
        if (!e || e.status !== "ready")
          throw new StudioError("Evidence not found.", 404);
        const original = req.nextUrl.searchParams.has("original"),
          bytes = await readStored(
            original ? e.source_path : e.render_path || e.source_path,
          );
        return new NextResponse(bytes, {
          headers: {
            ...headers,
            "Content-Type": original
              ? e.file_type
              : e.file_type === "application/pdf"
                ? "application/pdf"
                : "image/jpeg",
            "Content-Disposition": `inline; filename="evidence-${e.id}.${e.file_type === "application/pdf" ? "pdf" : "jpg"}"`,
          },
        });
      } else if (id && operation === "complete" && req.method === "POST")
        result = await completeAudit(id, await body());
      else if (id && operation === "revise" && req.method === "POST")
        result = await reviseAudit(id, await body(), user);
      else if (id && operation === "report" && req.method === "GET") {
        const b = await bundle(id);
        if (b.audit.status !== "completed" || !b.audit.pdf_path)
          throw new StudioError(
            "Complete the audit before downloading its report.",
            409,
          );
        return new NextResponse(await readStored(b.audit.pdf_path), {
          headers: {
            ...headers,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${auditReportFilename(b.audit.document.site).replace(/[^\x20-\x7e]/g, "-")}"; filename*=UTF-8''${encodeURIComponent(auditReportFilename(b.audit.document.site))}`,
          },
        });
      } else throw new StudioError("Operation not found.", 404);
    } else throw new StudioError("Operation not found.", 404);
    return NextResponse.json(result, { headers });
  } catch (error) {
    const status =
      error instanceof StudioError
        ? error.status
        : error instanceof ZodError || error instanceof SyntaxError
          ? 400
          : 500;
    console.error("[audit-studio] operation failed", {
      method: req.method,
      path: params.path.slice(0, 3).join("/"),
      status,
    });
    const message =
      error instanceof StudioError
        ? error.message
        : error instanceof ZodError
          ? "Check the fields and try again."
          : error instanceof SyntaxError
            ? "Invalid request."
            : "The operation failed. Your device draft is retained; please retry.";
    return NextResponse.json({ error: message }, { status, headers });
  }
}
export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
