import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard",
  setTheme: vi.fn(),
  resolved: "light" as "light" | "dark",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/actions/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/actions/export", () => ({ exportAccountData: vi.fn() }));
vi.mock("@/contexts/discrete-mode", () => ({ useDiscreteMode: () => ({ discrete: false, toggle: vi.fn() }) }));
vi.mock("@/contexts/theme", () => ({
  useTheme: () => ({ theme: mocks.resolved, resolved: mocks.resolved, setTheme: mocks.setTheme }),
}));
vi.mock("@/components/expenses/movement-dialog", () => ({
  MovementDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="add-dialog" /> : null),
}));
vi.mock("@/components/expenses/global-search", () => ({
  GlobalSearch: ({ open }: { open: boolean }) => (open ? <div data-testid="search-dialog" /> : null),
}));
vi.mock("@/components/layout/account-switcher", () => ({
  AccountSwitcher: ({ open }: { open: boolean }) => (open ? <div data-testid="account-switcher" /> : null),
}));

import { Navbar } from "@/components/layout/navbar";

const accounts = [
  { id: "home", name: "Casa" },
  { id: "mine", name: "Personal" },
];

/** The desktop sidebar is the first of the two `<nav>` landmarks. */
const sidebar = () => screen.getAllByRole("navigation")[0];
const header = () => screen.getAllByRole("banner")[0];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/dashboard";
  mocks.resolved = "light";
});

describe("Navbar on desktop", () => {
  it("groups the sidebar and keeps the backup out of it", () => {
    render(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" hasInvestments />);
    const links = within(sidebar()).getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual(["Iglú Management", "Inicio", "Diario", "Inversiones", "Resumen", "Movimientos fijos", "Ajustes"]);
    expect(within(sidebar()).getByText("Gestión")).toBeInTheDocument();
    expect(within(sidebar()).queryByText("Copia de seguridad")).not.toBeInTheDocument();
    expect(within(sidebar()).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  });

  it("offers a new movement from the sidebar on every page", async () => {
    mocks.pathname = "/summary";
    const user = userEvent.setup();
    render(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" />);
    await user.click(within(sidebar()).getByRole("button", { name: "Nuevo movimiento" }));
    expect(screen.getByTestId("add-dialog")).toBeInTheDocument();
  });

  it("keeps Ajustes lit while importing a backup", () => {
    mocks.pathname = "/import";
    render(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" />);
    expect(within(sidebar()).getByRole("link", { name: "Ajustes" })).toHaveAttribute("aria-current", "page");
  });

  it("puts account, help and sign-out together at the bottom", async () => {
    const user = userEvent.setup();
    render(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" />);
    expect(within(sidebar()).getByRole("button", { name: "Ayuda" })).toBeInTheDocument();
    expect(within(sidebar()).getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    await user.click(within(sidebar()).getByRole("button", { name: /Cambiar de cuenta/ }));
    expect(screen.getByTestId("account-switcher")).toBeInTheDocument();
  });

  it("shows the account without a switch when there is only one", () => {
    render(<Navbar accountName="Casa" accounts={[accounts[0]]} currentAccountId="home" />);
    expect(within(sidebar()).getByText("Casa")).toBeInTheDocument();
    expect(within(sidebar()).queryByRole("button", { name: /Cambiar de cuenta/ })).not.toBeInTheDocument();
  });

  it("opens search from a field-like button, with no shortcut hint", async () => {
    const user = userEvent.setup();
    render(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" />);
    expect(header()).not.toHaveTextContent("⌘K");
    await user.click(within(header()).getByRole("button", { name: "Buscar concepto o importe" }));
    expect(screen.getByTestId("search-dialog")).toBeInTheDocument();
  });

  it("switches theme with a single button", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" />);
    await user.click(within(header()).getByRole("button", { name: "Cambiar a tema oscuro" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");

    mocks.resolved = "dark";
    rerender(<Navbar accountName="Casa" accounts={accounts} currentAccountId="home" />);
    await user.click(within(header()).getByRole("button", { name: "Cambiar a tema claro" }));
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });
});
