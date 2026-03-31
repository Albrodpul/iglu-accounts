import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryBuilder, createSupabaseMock } from "@/tests/utils/supabase-mock";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  cookies: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { signIn, signOut } from "@/actions/auth";
import { selectAccount, toggleInvestments } from "@/actions/accounts";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  });
});

describe("auth and account flows", () => {
  it("returns error on failed email login", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    mocks.createClient.mockResolvedValue(supabase);

    const formData = new FormData();
    formData.set("email", "demo@example.com");
    formData.set("password", "wrong");

    const result = await signIn(formData);

    expect(result).toEqual({ error: "Email o contraseña incorrectos." });
  });

  it("redirects on successful email login", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValue({ error: null });

    mocks.createClient.mockResolvedValue(supabase);

    const formData = new FormData();
    formData.set("email", "demo@example.com");
    formData.set("password", "ok");

    await expect(signIn(formData)).rejects.toThrow("REDIRECT:/select-account");
  });

  it("signs out, clears account cookie and redirects to login", async () => {
    const supabase = createSupabaseMock();
    supabase.auth.signOut = vi.fn().mockResolvedValue({ error: null });

    const cookieStore = {
      delete: vi.fn(),
    };

    mocks.createClient.mockResolvedValue(supabase);
    mocks.cookies.mockResolvedValue(cookieStore);

    await expect(signOut()).rejects.toThrow("REDIRECT:/login");

    expect(cookieStore.delete).toHaveBeenCalledWith("iglu_account_id");
  });

  it("toggles investment module and revalidates layout", async () => {
    const accountsQuery = createQueryBuilder({ data: null, error: null });

    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: ACCOUNT_ID }),
    };

    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        tables: {
          accounts: accountsQuery,
        },
      }),
    );

    const result = await toggleInvestments(true);

    expect(result).toEqual({ success: true });
    expect(accountsQuery.update).toHaveBeenCalledWith({ has_investments: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("selectAccount redirects to dashboard when membership exists", async () => {
    const membersQuery = createQueryBuilder({ data: [{ id: "member-1" }], error: null });

    const cookieStore = {
      set: vi.fn(),
    };

    mocks.cookies.mockResolvedValue(cookieStore);
    mocks.createClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        tables: {
          account_members: membersQuery,
        },
      }),
    );

    await expect(selectAccount(ACCOUNT_ID)).rejects.toThrow("REDIRECT:/dashboard");

    expect(cookieStore.set).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
