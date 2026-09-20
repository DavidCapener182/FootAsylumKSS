import { describe, it, expect, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({
  user: null as null | { id: string; user_metadata?: Record<string, string> },
  profile: null as null | {
    role: string;
    account_status: string;
    full_name: string;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: state.profile }) }),
      }),
    }),
  }),
}));
import { studioAdmin } from "./server";
beforeEach(() => {
  process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED = "true";
  state.user = { id: "test" };
  state.profile = { role: "admin", account_status: "active", full_name: "QA" };
});
describe("Audit Studio active Admin gate", () => {
  it("allows an active administrator", async () =>
    expect(await studioAdmin()).toEqual({ id: "test", name: "QA" }));
  it.each(["ops", "readonly", "client", "pending"])(
    "denies %s even with editable admin metadata",
    async (role) => {
      state.profile!.role = role;
      state.user!.user_metadata = { role: "admin" };
      await expect(studioAdmin()).rejects.toMatchObject({ status: 403 });
    },
  );
  it.each(["disabled", "invited", "suspended", "pending"])(
    "denies an admin with %s status",
    async (status) => {
      state.profile!.account_status = status;
      await expect(studioAdmin()).rejects.toMatchObject({ status: 403 });
    },
  );
  it("denies a signed-out request", async () => {
    state.user = null;
    await expect(studioAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("honours the feature flag", async () => {
    process.env.NEXT_PUBLIC_AUDIT_STUDIO_ENABLED = "false";
    await expect(studioAdmin()).rejects.toMatchObject({ status: 404 });
  });
});
