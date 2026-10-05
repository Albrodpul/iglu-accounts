import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getAccounts: vi.fn(),
  getSelectedAccountId: vi.fn(),
  selectAccount: vi.fn(),
  hasInvestmentsEnabled: vi.fn(),
  notificationsEnabled: vi.fn(),
  getCategories: vi.fn(),
  getDebtCategoryId: vi.fn(),
  getTransferCategoryId: vi.fn(),
  getExpenses: vi.fn(),
  getExpensesByYear: vi.fn(),
  getAllTimeBalance: vi.fn(),
  getAvailablePeriods: vi.fn(),
  getExpensesPaginated: vi.fn(),
  getRecurringExpenses: vi.fn(),
  getUserPasskeys: vi.fn(),
  getInvestmentTypes: vi.fn(),
  getInvestmentFunds: vi.fn(),
  getInvestmentSummary: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/actions/accounts", () => ({
  getAccounts: mocks.getAccounts,
  getSelectedAccountId: mocks.getSelectedAccountId,
  selectAccount: mocks.selectAccount,
  hasInvestmentsEnabled: mocks.hasInvestmentsEnabled,
  notificationsEnabled: mocks.notificationsEnabled,
  getUserDisplayName: vi.fn().mockResolvedValue("Test"),
}));

vi.mock("@/actions/categories", () => ({
  getCategories: mocks.getCategories,
  getDebtCategoryId: mocks.getDebtCategoryId,
  getTransferCategoryId: mocks.getTransferCategoryId,
}));

vi.mock("@/actions/expenses", () => ({
  getExpenses: mocks.getExpenses,
  getExpensesByYear: mocks.getExpensesByYear,
  getAllTimeBalance: mocks.getAllTimeBalance,
  getAvailablePeriods: mocks.getAvailablePeriods,
  getExpensesPaginated: mocks.getExpensesPaginated,
}));

vi.mock("@/actions/recurring", () => ({
  getRecurringExpenses: mocks.getRecurringExpenses,
  getPendingRecurring: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/actions/passkeys", () => ({
  getUserPasskeys: mocks.getUserPasskeys,
}));

vi.mock("@/actions/investments", () => ({
  getInvestmentTypes: mocks.getInvestmentTypes,
  getInvestmentFunds: mocks.getInvestmentFunds,
  getInvestmentSummary: mocks.getInvestmentSummary,
  getInvestmentMonthlyReturns: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/components/expenses/expense-list", () => ({
  ExpenseList: () => <div data-testid="expense-list" />,
}));

vi.mock("@/components/expenses/add-expense-fab", () => ({
  AddExpenseFab: () => <div data-testid="add-expense-fab" />,
}));

vi.mock("@/components/shared/collapsible-section", () => ({
  CollapsibleSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  heroPillClass: "",
}));

vi.mock("@/components/expenses/month-selector", () => ({
  MonthSelector: () => <div data-testid="month-selector" />,
}));

vi.mock("@/components/expenses/expense-list-filtered", () => ({
  ExpenseListFiltered: () => <div data-testid="expense-list-filtered" />,
}));

vi.mock("@/components/summary/year-selector", () => ({
  YearSelector: () => <div data-testid="year-selector" />,
}));

vi.mock("@/components/summary/monthly-chart", () => ({
  MonthlyChart: () => <div data-testid="monthly-chart" />,
}));

vi.mock("@/components/summary/category-breakdown", () => ({
  CategoryBreakdown: () => <div data-testid="category-breakdown" />,
}));

vi.mock("@/components/summary/annual-grid", () => ({
  AnnualGrid: () => <div data-testid="annual-grid" />,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/settings/recurring-list", () => ({
  RecurringList: () => <div data-testid="recurring-list" />,
}));

vi.mock("@/components/settings/category-list", () => ({
  CategoryList: () => <div data-testid="category-list" />,
}));

vi.mock("@/components/settings/modules-settings", () => ({
  ModulesSettings: () => <div data-testid="modules-settings" />,
}));

vi.mock("@/components/settings/passkeys-settings", () => ({
  PasskeysSettings: () => <div data-testid="passkeys-settings" />,
}));

vi.mock("@/components/settings/accounts-settings", () => ({
  AccountsSettings: () => <div data-testid="accounts-settings" />,
}));

vi.mock("@/components/investments/investment-type-manager", () => ({
  InvestmentTypeManager: () => <div data-testid="investment-type-manager" />,
}));

vi.mock("@/components/investments/investment-returns-tab", () => ({
  InvestmentReturnsTab: () => <div data-testid="investment-returns-tab" />,
}));

vi.mock("@/components/investments/fund-list", () => ({
  FundList: () => <div data-testid="fund-list" />,
}));

vi.mock("@/components/import/import-backup-form", () => ({
  ImportBackupForm: () => <div data-testid="import-backup-form" />,
}));

import Home from "@/app/page";
import SelectAccountPage from "@/app/select-account/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import ExpensesPage from "@/app/(app)/expenses/page";
import SummaryPage from "@/app/(app)/summary/page";
import SettingsPage from "@/app/(app)/settings/page";
import RecurringPage from "@/app/(app)/recurring/page";
import InvestmentsPage from "@/app/(app)/investments/page";
import ImportPage from "@/app/(app)/import/page";

const sampleExpenses = [
  { amount: -80, category_id: "food", expense_date: "2026-01-12" },
  { amount: 1200, category_id: "salary", expense_date: "2026-01-05" },
  { amount: 300, category_id: "debt", expense_date: "2026-01-03" },
];

beforeEach(() => {
  vi.clearAllMocks();

  mocks.getDebtCategoryId.mockResolvedValue("debt");
  mocks.getTransferCategoryId.mockResolvedValue(null);
  mocks.notificationsEnabled.mockResolvedValue(true);
  mocks.getAccounts.mockResolvedValue([{ id: "acc-1", name: "Casa", has_investments: false }]);
  mocks.getSelectedAccountId.mockResolvedValue(null);
  mocks.getCategories.mockResolvedValue([{ id: "food", name: "Comida", color: "#fff" }]);
  mocks.getExpenses.mockResolvedValue(sampleExpenses);
  mocks.getExpensesByYear.mockResolvedValue(sampleExpenses);
  mocks.getAllTimeBalance.mockResolvedValue({
    total: 1000,
    bankTotal: 1000,
    cashTotal: 0,
    years: [{ year: 2026, neto: 1000 }],
  });
  mocks.getAvailablePeriods.mockResolvedValue([{ month: 1, year: 2026 }]);
  mocks.getRecurringExpenses.mockResolvedValue([{ amount: -50 }, { amount: 100 }]);
  mocks.getExpensesPaginated.mockResolvedValue({ data: sampleExpenses, hasMore: false });
  mocks.hasInvestmentsEnabled.mockResolvedValue(false);
  mocks.getUserPasskeys.mockResolvedValue([]);
  mocks.getInvestmentSummary.mockResolvedValue({
    totalInvested: 0,
    totalValue: 0,
    totalReturn: 0,
    types: [],
  });
  mocks.getInvestmentTypes.mockResolvedValue([]);
  mocks.getInvestmentFunds.mockResolvedValue([]);
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
    },
  });
});

describe("app pages", () => {
  it("redirects root page to dashboard", () => {
    Home();
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects select-account to login when user is not authenticated", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    await SelectAccountPage();

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("renders select-account with account list", async () => {
    const element = await SelectAccountPage();
    render(element);

    expect(screen.getByText("Selecciona una cuenta")).toBeInTheDocument();
    expect(screen.getByText("Casa")).toBeInTheDocument();
  });

  it("renders dashboard page with summary blocks", async () => {
    const element = await DashboardPage();
    render(element);

    expect(screen.getByText("Total acumulado")).toBeInTheDocument();
    expect(screen.getByTestId("add-expense-fab")).toBeInTheDocument();
  });

  it("renders expenses page with month detail", async () => {
    const element = await ExpensesPage({
      searchParams: Promise.resolve({ month: "1", year: "2026" }),
    });
    render(element);

    expect(screen.getByText("Movimientos")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Movimientos de Enero" })).toBeInTheDocument();
    expect(screen.getByTestId("expense-list-filtered")).toBeInTheDocument();
  });

  it("renders annual summary page", async () => {
    const element = await SummaryPage({
      searchParams: Promise.resolve({ year: "2026" }),
    });
    render(element);

    expect(screen.getByRole("heading", { level: 1, name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByTestId("year-selector")).toBeInTheDocument();
    // Balance and the month-by-month chart share the first view.
    expect(screen.getByRole("heading", { name: "Balance 2026" })).toBeInTheDocument();
    expect(screen.getByTestId("monthly-chart")).toBeInTheDocument();
  });

  it("renders settings page as one column of sections, without the fixed movements", async () => {
    const element = await SettingsPage();
    render(element);

    expect(screen.getByRole("heading", { level: 1, name: "Ajustes" })).toBeInTheDocument();
    for (const id of ["accounts-settings", "modules-settings", "passkeys-settings"]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Apariencia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(screen.queryByTestId("recurring-list")).not.toBeInTheDocument();
  });

  it("renders fixed movements on their own page", async () => {
    const element = await RecurringPage();
    render(element);

    expect(screen.getByRole("heading", { level: 1, name: "Movimientos fijos" })).toBeInTheDocument();
    expect(screen.getByTestId("recurring-list")).toBeInTheDocument();
  });

  it("redirects investments page when module is disabled", async () => {
    mocks.hasInvestmentsEnabled.mockResolvedValue(false);

    await InvestmentsPage();

    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders investments page when module is enabled", async () => {
    mocks.hasInvestmentsEnabled.mockResolvedValue(true);

    const element = await InvestmentsPage();
    render(element);

    expect(screen.getByText("Inversiones")).toBeInTheDocument();
    expect(screen.getByTestId("fund-list")).toBeInTheDocument();
  });

  it("renders import backup form", async () => {
    const element = await ImportPage();
    render(element);

    expect(screen.getByTestId("import-backup-form")).toBeInTheDocument();
  });
});
