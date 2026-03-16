-- Categories table (shared across all users)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by all authenticated users"
  ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Categories are manageable by all authenticated users"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expenses table (daily entries, both expenses and income)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount != 0),
  concept TEXT NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses (expense_date DESC);
CREATE INDEX idx_expenses_user_date ON expenses (user_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses (category_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all expenses" ON expenses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert expenses" ON expenses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recurring expenses (monthly fixed costs: hipoteca, luz, etc.)
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount != 0),
  concept TEXT NOT NULL,
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all recurring expenses" ON recurring_expenses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert recurring expenses" ON recurring_expenses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring expenses" ON recurring_expenses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring expenses" ON recurring_expenses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed default categories based on the user's Excel
INSERT INTO categories (name, icon, color, sort_order) VALUES
  ('Hipoteca', '🏠', '#ef4444', 1),
  ('Comida', '🛒', '#f97316', 2),
  ('Comunidad', '🏢', '#eab308', 3),
  ('Seguros', '🛡️', '#22c55e', 4),
  ('Luz', '💡', '#3b82f6', 5),
  ('Gas', '🔥', '#8b5cf6', 6),
  ('Agua', '💧', '#06b6d4', 7),
  ('Internet', '🌐', '#6366f1', 8),
  ('IBI', '📋', '#ec4899', 9),
  ('Transporte', '🚗', '#14b8a6', 10),
  ('Salud', '🏥', '#f43f5e', 11),
  ('Ocio', '🎮', '#a855f7', 12),
  ('Ropa', '👕', '#d946ef', 13),
  ('Educación', '📚', '#0ea5e9', 14),
  ('Otros', '📦', '#64748b', 15),
  ('Ingresos', '💰', '#10b981', 16);
