import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ switchAccount: vi.fn(), replace: vi.fn(), refresh: vi.fn(), toastError: vi.fn() }));
vi.mock("@/actions/accounts", () => ({ switchAccount: mocks.switchAccount }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  usePathname: () => "/expenses",
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import { AccountSwitcher } from "@/components/layout/account-switcher";

const accounts = [
  { id: "home", name: "Casa" },
  { id: "mine", name: "Personal" },
];

function setup() {
  const onOpenChange = vi.fn();
  render(<AccountSwitcher open onOpenChange={onOpenChange} accounts={accounts} currentAccountId="home" />);
  return onOpenChange;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.switchAccount.mockResolvedValue({ success: true });
});

describe("AccountSwitcher", () => {
  it("marks the account in use", () => {
    setup();
    expect(screen.getByRole("button", { name: /Casa/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Personal/ })).not.toHaveAttribute("aria-current");
  });

  it("switches and reloads the same screen, dropping filters of the old account", async () => {
    const onOpenChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /Personal/ }));

    await waitFor(() => expect(mocks.switchAccount).toHaveBeenCalledWith("mine"));
    expect(mocks.replace).toHaveBeenCalledWith("/expenses");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("just closes when the current account is picked", async () => {
    const onOpenChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /Casa/ }));
    expect(mocks.switchAccount).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open and says why when the switch is refused", async () => {
    mocks.switchAccount.mockResolvedValue({ error: "No tienes acceso a esa cuenta" });
    const onOpenChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /Personal/ }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("No tienes acceso a esa cuenta"));
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
