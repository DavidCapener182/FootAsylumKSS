import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { emptyDocument, TEMPLATE } from "./template";
import { draftKey, saveWithFiles, getDraft, getFiles } from "./device-store";
import { syncDraft, cacheStoredEvidence } from "./client";
import type { DeviceDraft } from "./types";
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function draft(): DeviceDraft {
  const id = randomUUID(),
    userId = randomUUID();
  return {
    key: draftKey(userId, id),
    userId,
    bundle: {
      audit: {
        id,
        revision: 3,
        status: "draft",
      } as DeviceDraft["bundle"]["audit"],
      template: TEMPLATE,
      evidence: [],
    },
    document: emptyDocument(),
    baseRevision: 3,
    generation: 5,
    syncedGeneration: 2,
    operationId: randomUUID(),
    updatedAt: "2026-09-19",
  };
}
beforeEach(() => {
  vi.restoreAllMocks();
});
describe("Retry and conflict protection", () => {
  it("downloads existing evidence for offline use without overwriting newer device answers", async () => {
    const d = draft(),
      id = randomUUID();
    d.document.evidence = [
      { id, questionId: "07.02", caption: "", location: "" },
    ];
    d.bundle.evidence = [
      {
        id,
        status: "ready",
        file_size: 4,
        file_type: "application/pdf",
        file_name: "support.pdf",
      } as DeviceDraft["bundle"]["evidence"][number],
    ];
    await saveWithFiles({ ...d, generation: 99 }, []);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("test", {
            headers: { "Content-Type": "application/pdf" },
          }),
        ),
    );
    const files = await cacheStoredEvidence(d);
    expect(await files[0].file.text()).toBe("test");
    expect(files[0].synced).toBe(true);
    expect((await getDraft(d.userId, d.bundle.audit.id))?.generation).toBe(99);
  });
  it("does not claim a closed editor has saved later work", async () => {
    const d = draft();
    const fetch = vi.fn().mockResolvedValue(response(d.bundle));
    vi.stubGlobal("fetch", fetch);
    let calls = 0;
    await expect(syncDraft(d, undefined, () => ++calls === 1)).rejects.toThrow(
      "editor was closed",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves answers and actual photo bytes when the connection fails", async () => {
    const d = draft(),
      id = randomUUID();
    d.document.evidence = [
      { id, questionId: "09.02", caption: "Photo", location: "Stockroom" },
    ];
    await saveWithFiles(d, [
      {
        id,
        auditId: d.bundle.audit.id,
        userId: d.userId,
        file: new Blob(["retained bytes"]),
        name: "test.jpg",
        type: "image/jpeg",
        synced: false,
      },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network offline")),
    );
    await expect(syncDraft(d)).rejects.toThrow();
    expect((await getDraft(d.userId, d.bundle.audit.id))?.operationId).toBe(
      d.operationId,
    );
    expect(
      await (await getFiles(d.userId, d.bundle.audit.id))[0].file.text(),
    ).toBe("retained bytes");
  });
  it("retries the same operation ID after a lost save response", async () => {
    const d = draft(),
      server = { ...d.bundle, audit: { ...d.bundle.audit, revision: 4 } };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(server))
      .mockResolvedValueOnce(response(server));
    vi.stubGlobal("fetch", fetch);
    expect((await syncDraft(d)).audit.revision).toBe(4);
    expect(JSON.parse(fetch.mock.calls[1][1].body).operationId).toBe(
      d.operationId,
    );
    expect(JSON.parse(fetch.mock.calls[1][1].body).revision).toBe(3);
  });
  it("surfaces another-device conflict without uploading or discarding local work", async () => {
    const d = draft();
    await saveWithFiles(d, []);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({ ...d.bundle, audit: { ...d.bundle.audit, revision: 8 } }),
      )
      .mockResolvedValueOnce(
        response({ error: "Another device changed this audit" }, 409),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(syncDraft(d)).rejects.toMatchObject({ status: 409 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await getDraft(d.userId, d.bundle.audit.id))?.generation).toBe(5);
  });
  it("leaves pending photos intact when login expires", async () => {
    const d = draft(),
      id = randomUUID();
    d.document.evidence = [
      { id, questionId: "09.02", caption: "", location: "" },
    ];
    await saveWithFiles(d, [
      {
        id,
        auditId: d.bundle.audit.id,
        userId: d.userId,
        file: new Blob(["x"]),
        name: "test.jpg",
        type: "image/jpeg",
        synced: false,
      },
    ]);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(d.bundle))
      .mockResolvedValueOnce(response({ error: "Sign in again" }, 401));
    vi.stubGlobal("fetch", fetch);
    await expect(syncDraft(d)).rejects.toMatchObject({ status: 401 });
    expect((await getFiles(d.userId, d.bundle.audit.id))[0].synced).toBe(false);
  });
});
