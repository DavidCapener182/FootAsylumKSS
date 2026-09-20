import type { DeviceDraft, LocalEvidence } from "./types";
const DATABASE = "footasylum-audit-studio-v1";
export function draftKey(userId: string, auditId: string) {
  return `${userId}:${auditId}`;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("drafts", { keyPath: "key" });
      db.createObjectStore("files", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Device storage could not be opened. Do not close this page before saving online.",
        ),
      );
    request.onblocked = () =>
      reject(
        new Error("Close older Audit Studio tabs and retry device storage."),
      );
  });
}
async function transaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction, set: (result: T) => void) => void,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    let result: T;
    const tx = db.transaction(stores, mode);
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Device storage failed or is full. The latest change has not been saved. Free space and retry.",
        ),
      );
    };
    try {
      work(tx, (value) => {
        result = value;
      });
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}
export function saveDraft(draft: DeviceDraft) {
  return transaction<void>(["drafts"], "readwrite", (tx) => {
    tx.objectStore("drafts").put(draft);
  });
}
export function getDraft(userId: string, id: string) {
  return transaction<DeviceDraft | undefined>(
    ["drafts"],
    "readonly",
    (tx, set) => {
      const r = tx.objectStore("drafts").get(draftKey(userId, id));
      r.onsuccess = () => set(r.result);
    },
  );
}
export function listDrafts(userId: string) {
  return transaction<DeviceDraft[]>(["drafts"], "readonly", (tx, set) => {
    const r = tx.objectStore("drafts").getAll();
    r.onsuccess = () =>
      set(r.result.filter((d: DeviceDraft) => d.userId === userId));
  });
}
export function getFiles(userId: string, id: string) {
  return transaction<LocalEvidence[]>(["files"], "readonly", (tx, set) => {
    const r = tx.objectStore("files").getAll();
    r.onsuccess = () =>
      set(
        r.result.filter(
          (f: LocalEvidence) => f.userId === userId && f.auditId === id,
        ),
      );
  });
}
/** File and question reference are committed together: never show a saved photo before this resolves. */
export function saveWithFiles(draft: DeviceDraft, files: LocalEvidence[]) {
  return transaction<void>(["drafts", "files"], "readwrite", (tx) => {
    tx.objectStore("drafts").put(draft);
    for (const file of files)
      tx.objectStore("files").put({
        ...file,
        key: draftKey(file.userId, file.id),
      });
  });
}
export function markFileSynced(file: LocalEvidence) {
  return transaction<void>(["files"], "readwrite", (tx) => {
    tx.objectStore("files").put({
      ...file,
      synced: true,
      key: draftKey(file.userId, file.id),
    });
  });
}
export async function prepareOffline() {
  if (!("serviceWorker" in navigator))
    throw new Error("Offline preparation is unavailable in this browser.");
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;
  if (!registration.active)
    throw new Error("Offline files are still installing. Retry in a moment.");
  const assets = [
    ...document.querySelectorAll<HTMLScriptElement>("script[src]"),
  ]
    .map((s) => s.src)
    .concat(
      [
        ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ].map((l) => l.href),
    );
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(
      () =>
        reject(
          new Error("Offline preparation timed out. Stay online and retry."),
        ),
      45000,
    );
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      if (e.data?.ok) resolve();
      else
        reject(
          new Error(
            "Some app files could not be saved for offline use. Retry while online.",
          ),
        );
    };
    registration.active!.postMessage({ type: "STUDIO_PREPARE", assets }, [
      channel.port2,
    ]);
  });
  await navigator.storage?.persist?.();
}
