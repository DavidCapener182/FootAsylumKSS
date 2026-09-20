import { afterEach, describe, expect, it, vi } from "vitest";
import { studioEnabled } from "./config";

const original = process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED;
afterEach(() => {
  vi.unstubAllEnvs();
  if (original === undefined) delete process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED;
  else process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED = original;
});

describe("Audit Studio availability", () => {
  it("is enabled without deployment-specific configuration", () => {
    delete process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED;
    expect(studioEnabled()).toBe(true);
  });
  it("honours the explicit deployment kill switch", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIT_STUDIO_ENABLED", "false");
    expect(studioEnabled()).toBe(false);
  });
  it("supports existing enabled deployments", () => {
    vi.stubEnv("NEXT_PUBLIC_AUDIT_STUDIO_ENABLED", "true");
    expect(studioEnabled()).toBe(true);
  });
});
