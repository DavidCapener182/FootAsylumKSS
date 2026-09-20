import { afterEach, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { clientId } from "./client-id";
afterEach(() => { vi.unstubAllGlobals(); });
it("creates valid unique UUIDs when randomUUID is unavailable on a LAN preview", () => {
  vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const ids = Array.from({length: 100}, () => clientId());
  expect(new Set(ids).size).toBe(100);
  ids.forEach(id => expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/));
});
