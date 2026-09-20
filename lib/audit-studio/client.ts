"use client";
import { Upload } from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { STUDIO_BUCKET } from "./template";
import { getFiles, markFileSynced } from "./device-store";
import type { AuditBundle, DeviceDraft, Evidence } from "./types";
import { makePreview } from "./preview";

/** Cache evidence from an existing audit without rewriting newer local answers. */
export async function cacheStoredEvidence(draft: DeviceDraft) {
  const files = await getFiles(draft.userId, draft.bundle.audit.id);
  const known = new Set(files.map((f) => f.id));
  const needed = draft.bundle.evidence.filter(
    (e) =>
      e.status === "ready" &&
      !known.has(e.id) &&
      draft.document.evidence.some((ref) => ref.id === e.id),
  );
  let cursor = 0;
  const worker = async () => {
    while (cursor < needed.length) {
      const e = needed[cursor++];
      const response = await fetch(
        `/api/audit-studio/audits/${draft.bundle.audit.id}/evidence/${e.id}?original`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          "Some saved evidence could not be downloaded for offline use. Reconnect and retry preparation.",
        );
      const file = await response.blob();
      if (file.size !== e.file_size)
        throw new Error(
          "An offline attachment download was incomplete. Retry preparation.",
        );
      let preview = await makePreview(file);
      if (!preview && e.file_type.startsWith("image/")) {
        const rendered = await fetch(
          `/api/audit-studio/audits/${draft.bundle.audit.id}/evidence/${e.id}`,
          { credentials: "same-origin", cache: "no-store" },
        );
        if (!rendered.ok)
          throw new Error("A photo preview could not be prepared offline.");
        preview = await makePreview(await rendered.blob());
      }
      await markFileSynced({
        id: e.id,
        auditId: draft.bundle.audit.id,
        userId: draft.userId,
        file,
        preview,
        name: e.file_name,
        type: e.file_type,
        synced: true,
      });
    }
  };
  const results = await Promise.allSettled([worker(), worker()]);
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
  return getFiles(draft.userId, draft.bundle.audit.id);
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/audit-studio/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "The server could not be reached." }));
  if (!response.ok)
    throw new ApiError(data.error || "Request failed.", response.status);
  return data;
}
export async function syncDraft(
  draft: DeviceDraft,
  onProgress?: (done: number, total: number) => void,
  shouldContinue: () => boolean = () => true,
): Promise<AuditBundle> {
  const assertActive = () => {
    if (!shouldContinue())
      throw new Error(
        "This editor was closed; remaining work stays on the device.",
      );
  };
  assertActive();
  const current = await api<AuditBundle>(`audits/${draft.bundle.audit.id}`);
  assertActive();
  // Do this before uploading: stale devices must not consume evidence reservations silently.
  if (current.audit.revision !== draft.baseRevision) {
    // Stable operation IDs make a lost successful response safely retryable.
    return api<AuditBundle>(`audits/${draft.bundle.audit.id}`, "PUT", {
      revision: draft.baseRevision,
      operationId: draft.operationId,
      document: draft.document,
    });
  }
  if (current.audit.status === "completed")
    throw new ApiError(
      "This audit was completed on another device. Review the saved report.",
      409,
    );
  const files = await getFiles(draft.userId, draft.bundle.audit.id);
  const pending = files.filter(
    (f) => !f.synced && draft.document.evidence.some((e) => e.id === f.id),
  );
  let done = 0;
  onProgress?.(0, pending.length);
  const uploadOne = async (file: (typeof pending)[number]) => {
    assertActive();
    const ref = draft.document.evidence.find((e) => e.id === file.id)!;
    const reservation = await api<Evidence & { existing?: boolean }>(
      `audits/${draft.bundle.audit.id}/evidence`,
      "POST",
      {
        id: file.id,
        questionId: ref.questionId,
        name: file.name,
        type: file.type,
        size: file.file.size,
        questionEvidenceIds: draft.document.evidence
          .filter((e) => e.questionId === ref.questionId)
          .map((e) => e.id),
      },
    );
    if (reservation.status !== "ready") {
      // A completed upload can outlive a lost confirmation response. Check it before sending bytes again.
      let uploaded = false;
      if (reservation.existing) {
        try {
          await api(
            `audits/${draft.bundle.audit.id}/evidence/${file.id}`,
            "POST",
            {},
          );
          uploaded = true;
        } catch (error) {
          if (error instanceof ApiError && error.status !== 422) throw error;
        }
      }
      if (!uploaded) {
        const {
          data: { session },
        } = await createClient().auth.getSession();
        if (!session)
          throw new ApiError(
            "Sign in again to synchronise. Your photos remain on this device.",
            401,
          );
        const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!),
          endpoint = `https://${url.hostname.split(".")[0]}.storage.supabase.co/storage/v1/upload/resumable`;
        await new Promise<void>((resolve, reject) => {
          const upload = new Upload(file.file, {
            endpoint,
            chunkSize: 6 * 1024 * 1024,
            retryDelays: [0, 1000, 3000, 5000],
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            fingerprint: async () =>
              `audit-studio:${draft.userId}:${draft.bundle.audit.id}:${file.id}`,
            metadata: {
              bucketName: STUDIO_BUCKET,
              objectName: reservation.source_path,
              contentType: file.type,
              cacheControl: "3600",
            },
            headers: {
              authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "x-upsert": "false",
            },
            onSuccess: () => resolve(),
            onError: reject,
          });
          upload
            .findPreviousUploads()
            .then((previous) => {
              if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
              upload.start();
            })
            .catch(reject);
        });
        await api(
          `audits/${draft.bundle.audit.id}/evidence/${file.id}`,
          "POST",
          {},
        );
      }
    }
    await markFileSynced(file);
    onProgress?.(++done, pending.length);
  };
  let index = 0,
    failure: unknown;
  const worker = async () => {
    while (index < pending.length && !failure) {
      const file = pending[index++];
      try {
        await uploadOne(file);
      } catch (e) {
        failure = e;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(3, pending.length) }, worker),
  );
  if (failure) throw failure;
  assertActive();
  return api<AuditBundle>(`audits/${draft.bundle.audit.id}`, "PUT", {
    revision: draft.baseRevision,
    operationId: draft.operationId,
    document: draft.document,
  });
}
