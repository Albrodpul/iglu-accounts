export type Account = {
  id: string;
  name: string;
  has_investments: boolean;
  created_at: string;
};

export type AccountMember = {
  id: string;
  account_id: string;
  user_id: string;
  role: "owner" | "member";
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  account_id: string;
  created_at: string;
};

export type PaymentMethod = "bank" | "cash";

export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  concept: string;
  expense_date: string;
  payment_method: PaymentMethod;
  transfer_pair_id: string | null;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseWithCategory = Expense & {
  category: Category;
};

export type ScheduleType = "monthly" | "last_day" | "last_weekday" | "bimonthly";

export type RecurringExpense = {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  concept: string;
  day_of_month: number | null;
  schedule_type: ScheduleType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecurringExpenseWithCategory = RecurringExpense & {
  category: Category;
};

export type MonthlySummary = {
  month: number;
  year: number;
  total_expenses: number;
  total_income: number;
  net: number;
  by_category: { category: string; color: string; total: number }[];
};

export type DailySummary = {
  date: string;
  total: number;
  items: ExpenseWithCategory[];
};

export type InvestmentType = {
  id: string;
  account_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type InvestmentFund = {
  id: string;
  account_id: string;
  type_id: string;
  name: string;
  isin: string | null;
  show_negative_returns: boolean;
  invested_amount: number;
  current_value: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type InvestmentFundWithType = InvestmentFund & {
  investment_type: InvestmentType;
};

export type InvestmentContribution = {
  id: string;
  fund_id: string;
  account_id: string;
  amount: number;
  purchase_price: number | null;
  units: number | null;
  contribution_date: string;
  notes: string | null;
  created_at: string;
};
