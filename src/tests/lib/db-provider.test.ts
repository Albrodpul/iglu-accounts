import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "@/tests/utils/supabase-mock";

/**
 * These tests verify the provider abstraction layer:
 * - getDb() / getServiceDb() are pure re-exports from ./providers/supabase
 * - Swapping the import path in db/index.ts, db/auth.ts, db/service.ts
 *   is the only change required to switch providers.
 * - The shape of the returned objects matches the expected interface.
 */

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import { getDb } from "@/lib/db";
import { getServiceDb } from "@/lib/db/service";
import { getAuthUser, authSignIn, authSignOut, authUpdateUser } from "@/lib/db/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── DB Factory ───────────────────────────────────────────────────────────────

describe("getDb()", () => {
  it("returns all expected repositories", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const db = await getDb();

    expect(db).toHaveProperty("accounts");
    expect(db).toHaveProperty("categories");
    expect(db).toHaveProperty("expenses");
    expect(db).toHaveProperty("recurring");
    expect(db).toHaveProperty("investments");
    expect(db).toHaveProperty("notifications");
    expect(db).toHaveProperty("passkeys");
  });

  it("accounts repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { accounts } = await getDb();

    expect(typeof accounts.findAll).toBe("function");
    expect(typeof accounts.findById).toBe("function");
    expect(typeof accounts.findSettings).toBe("function");
    expect(typeof accounts.create).toBe("function");
    expect(typeof accounts.update).toBe("function");
    expect(typeof accounts.delete).toBe("function");
    expect(typeof accounts.isMember).toBe("function");
    expect(typeof accounts.getMembership).toBe("function");
    expect(typeof accounts.createMember).toBe("function");
  });

  it("categories repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { categories } = await getDb();

    expect(typeof categories.findAll).toBe("function");
    expect(typeof categories.findWithDetails).toBe("function");
    expect(typeof categories.findByNameIlike).toBe("function");
    expect(typeof categories.findByNamesIn).toBe("function");
    expect(typeof categories.create).toBe("function");
    expect(typeof categories.update).toBe("function");
    expect(typeof categories.delete).toBe("function");
  });

  it("expenses repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { expenses } = await getDb();

    expect(typeof expenses.findWithCategoryByMonth).toBe("function");
    expect(typeof expenses.findWithCategoryByYear).toBe("function");
    expect(typeof expenses.findForBackup).toBe("function");
    expect(typeof expenses.searchWithCategory).toBe("function");
    expect(typeof expenses.create).toBe("function");
    expect(typeof expenses.createMany).toBe("function");
    expect(typeof expenses.update).toBe("function");
    expect(typeof expenses.delete).toBe("function");
    expect(typeof expenses.deleteByTransferPair).toBe("function");
  });

  it("recurring repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { recurring } = await getDb();

    expect(typeof recurring.findActive).toBe("function");
    expect(typeof recurring.findAllActive).toBe("function");
    expect(typeof recurring.findForBackup).toBe("function");
    expect(typeof recurring.create).toBe("function");
    expect(typeof recurring.createMany).toBe("function");
    expect(typeof recurring.update).toBe("function");
    expect(typeof recurring.deactivate).toBe("function");
  });

  it("investments repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { investments } = await getDb();

    expect(typeof investments.findTypes).toBe("function");
    expect(typeof investments.createType).toBe("function");
    expect(typeof investments.findFunds).toBe("function");
    expect(typeof investments.createFund).toBe("function");
    expect(typeof investments.findContributions).toBe("function");
    expect(typeof investments.createContribution).toBe("function");
  });

  it("notifications repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { notifications } = await getDb();

    expect(typeof notifications.upsert).toBe("function");
    expect(typeof notifications.findByUser).toBe("function");
    expect(typeof notifications.findByUsers).toBe("function");
    expect(typeof notifications.delete).toBe("function");
    expect(typeof notifications.deleteByEndpoints).toBe("function");
  });

  it("passkeys repo exposes expected methods", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock());

    const { passkeys } = await getDb();

    expect(typeof passkeys.findByUser).toBe("function");
    expect(typeof passkeys.findByCredentialId).toBe("function");
    expect(typeof passkeys.findCredentialIdsByUser).toBe("function");
    expect(typeof passkeys.create).toBe("function");
    expect(typeof passkeys.updateCounter).toBe("function");
    expect(typeof passkeys.delete).toBe("function");
  });
});

// ─── Service DB Factory ───────────────────────────────────────────────────────

describe("getServiceDb()", () => {
  it("returns service repositories including investments", () => {
    mocks.createServiceClient.mockReturnValue(createSupabaseMock());

    const db = getServiceDb();

    expect(db).toHaveProperty("accounts");
    expect(db).toHaveProperty("categories");
    expect(db).toHaveProperty("expenses");
    expect(db).toHaveProperty("recurring");
    expect(db).toHaveProperty("notifications");
    expect(db).toHaveProperty("passkeys");
    expect(db).toHaveProperty("investments");
  });

  it("is synchronous — no await needed", () => {
    mocks.createServiceClient.mockReturnValue(createSupabaseMock());

    // getServiceDb() must be sync because cron routes use it synchronously
    const result = getServiceDb();

    expect(result).not.toBeInstanceOf(Promise);
  });
});

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

describe("getAuthUser()", () => {
  it("returns the authenticated user", async () => {
    const user = { id: "user-123", email: "test@example.com" };
    mocks.createClient.mockResolvedValue(createSupabaseMock({ user }));

    const result = await getAuthUser();

    expect(result).toEqual(user);
  });

  it("returns null when no session", async () => {
    mocks.createClient.mockResolvedValue(createSupabaseMock({ user: null }));

    const result = await getAuthUser();

    expect(result).toBeNull();
  });
});

describe("authSignIn()", () => {
  it("delegates to supabase.auth.signInWithPassword", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    const result = await authSignIn("user@example.com", "secret");

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret",
    });
    expect(result.error).toBeNull();
  });

  it("returns error on failed sign-in", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    const result = await authSignIn("bad@example.com", "wrong");

    expect(result.error).toBeTruthy();
  });
});

describe("authSignOut()", () => {
  it("calls supabase.auth.signOut", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await authSignOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe("authUpdateUser()", () => {
  it("delegates to supabase.auth.updateUser and returns no error on success", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    const payload = { data: { display_name: "Alberto" } };
    const result = await authUpdateUser(payload);

    expect(supabase.auth.updateUser).toHaveBeenCalledWith(payload);
    expect(result.error).toBeNull();
  });

  it("returns error when updateUser fails", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.updateUser = vi.fn().mockResolvedValue({
      error: { message: "Update failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    const result = await authUpdateUser({ data: { display_name: "X" } });

    expect(result.error).toBeTruthy();
  });
});
