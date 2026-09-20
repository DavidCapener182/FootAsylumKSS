import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  getDraft,
  getFiles,
  listDrafts,
  saveDraft,
  saveWithFiles,
  markFileSynced,
  draftKey,
} from "./device-store";
import { TEMPLATE, emptyDocument } from "./template";
import type { DeviceDraft, LocalEvidence } from "./types";
function draft(userId: string): DeviceDraft {
  return {
    key: draftKey(userId, "audit"),
    userId,
    bundle: {
      audit: { id: "audit" } as DeviceDraft["bundle"]["audit"],
      template: TEMPLATE,
      evidence: [],
    },
    document: emptyDocument(),
    baseRevision: 0,
    generation: 1,
    syncedGeneration: 0,
    operationId: "stable-op",
    updatedAt: "2026-09-19",
  };
}
describe("Device evidence persistence", () => {
  it("retains actual attachment bytes with their question reference and stable operation", async () => {
    const d = draft("owner-A"),
      file: LocalEvidence = {
        id: "photo-A",
        auditId: "audit",
        userId: "owner-A",
        file: new Blob(["photo bytes"], { type: "image/jpeg" }),
        name: "evidence.jpg",
        type: "image/jpeg",
        synced: false,
      };
    d.document.evidence.push({
      id: file.id,
      questionId: "09.02",
      caption: "Stacking",
      location: "Stockroom",
    });
    await saveWithFiles(d, [file]);
    expect((await getDraft("owner-A", "audit"))?.operationId).toBe("stable-op");
    expect(await (await getFiles("owner-A", "audit"))[0].file.text()).toBe(
      "photo bytes",
    );
    await markFileSynced(file);
    expect((await getFiles("owner-A", "audit"))[0].synced).toBe(true);
    expect((await getFiles("owner-A", "audit"))[0].file.size).toBe(11);
  });
  it("never returns another user’s drafts or files", async () => {
    await saveDraft(draft("owner-B"));
    expect(await getFiles("owner-B", "audit")).toEqual([]);
    expect((await listDrafts("owner-B")).map((d) => d.userId)).toEqual([
      "owner-B",
    ]);
  });
  it("retains local changes until explicitly synced", async () => {
    const d = draft("owner-C");
    d.generation = 3;
    await saveDraft(d);
    const restored = await getDraft("owner-C", "audit");
    expect(restored?.generation).toBe(3);
    expect(restored?.syncedGeneration).toBe(0);
  });
});
