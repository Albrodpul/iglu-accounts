export type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
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
