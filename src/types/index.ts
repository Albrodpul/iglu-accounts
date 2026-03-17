export type Account = {
  id: string;
  name: string;
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

export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  concept: string;
  expense_date: string;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseWithCategory = Expense & {
  category: Category;
};

export type RecurringExpense = {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  concept: string;
  day_of_month: number | null;
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
