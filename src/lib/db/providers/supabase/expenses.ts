import type { SupabaseClient } from "@supabase/supabase-js";

type ExpenseInsert = {
  user_id: string;
  account_id?: string | null;
  category_id?: string | null;
  amount: number;
  concept?: string | null;
  expense_date: string;
  notes?: string | null;
  payment_method?: string;
  transfer_pair_id?: string;
};

export function createExpensesRepo(client: SupabaseClient) {
  return {
    async findWithCategoryByMonth(accountId: string | null, month: number, year: number) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      let q = client
        .from("expenses")
        .select("*, category:categories(*)")
        .gte("expense_date", startDate)
        .lt("expense_date", endDate)
        .order("expense_date", { ascending: true });
      if (accountId) q = q.eq("account_id", accountId);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findWithCategoryByYear(accountId: string | null, year: number) {
      let q = client
        .from("expenses")
        .select("*, category:categories(*)")
        .gte("expense_date", `${year}-01-01`)
        .lt("expense_date", `${year + 1}-01-01`)
        .order("expense_date", { ascending: true });
      if (accountId) q = q.eq("account_id", accountId);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findAllDates(accountId: string | null) {
      let q = client.from("expenses").select("expense_date");
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findAllAmounts(accountId: string | null) {
      let q = client
        .from("expenses")
        .select("expense_date, amount, category_id, payment_method");
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findAmountsByDateRange(accountId: string | null, start: string, end: string) {
      let q = client
        .from("expenses")
        .select("amount, category_id")
        .gte("expense_date", start)
        .lt("expense_date", end);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data ?? [];
    },

    async findRecurringNotesInRange(accountId: string | null, start: string, end: string) {
      let q = client
        .from("expenses")
        .select("notes")
        .like("notes", "auto:recurring:%")
        .gte("expense_date", start)
        .lt("expense_date", end);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data ?? [];
    },

    async searchWithCategory(accountId: string | null, query: string) {
      let q = client
        .from("expenses")
        .select("*, category:categories(*)")
        .ilike("concept", `%${query}%`)
        .order("expense_date", { ascending: false })
        .limit(50);
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findLatestByConceptIlike(accountId: string | null, concept: string) {
      let q = client
        .from("expenses")
        .select("category_id, category:categories(id, name)")
        .ilike("concept", concept)
        .order("expense_date", { ascending: false })
        .limit(1);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return data && data.length > 0 ? data[0] : null;
    },

    async findDuplicate(
      accountId: string | null,
      params: {
        amount: number;
        category_id: string;
        expense_date: string;
        excludeId?: string;
      },
    ) {
      let q = client
        .from("expenses")
        .select("id, concept")
        .eq("amount", params.amount)
        .eq("category_id", params.category_id)
        .eq("expense_date", params.expense_date)
        .limit(1);
      if (accountId) q = q.eq("account_id", accountId);
      if (params.excludeId) q = q.neq("id", params.excludeId);
      const { data } = await q;
      return data && data.length > 0 ? data[0] : null;
    },

    async findTransferPair(id: string, userId: string) {
      const { data } = await client
        .from("expenses")
        .select("transfer_pair_id")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
      return data ?? null;
    },

    async findByTransferPair(pairId: string, userId: string) {
      const { data } = await client
        .from("expenses")
        .select("id, amount, payment_method")
        .eq("transfer_pair_id", pairId)
        .eq("user_id", userId);
      return data ?? [];
    },

    async findForBackup(accountId: string) {
      const { data, error } = await client
        .from("expenses")
        .select("id, category_id, amount, concept, expense_date, notes, payment_method, transfer_pair_id")
        .eq("account_id", accountId)
        .order("expense_date", { ascending: true });
      if (error) return null;
      return data;
    },

    async findForDedup(accountId: string) {
      const { data } = await client
        .from("expenses")
        .select("expense_date, amount, concept")
        .eq("account_id", accountId);
      return data ?? [];
    },

    async create(data: ExpenseInsert) {
      const { error } = await client.from("expenses").insert(data);
      return { error: error?.message ?? null };
    },

    async createMany(data: ExpenseInsert[]) {
      const { error } = await client.from("expenses").insert(data);
      return { error: error?.message ?? null };
    },

    async update(id: string, userId: string, data: Record<string, unknown>) {
      const { error } = await client
        .from("expenses")
        .update(data)
        .eq("id", id)
        .eq("user_id", userId);
      return { error: error?.message ?? null };
    },

    async delete(id: string, userId: string) {
      const { error } = await client
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      return { error: error?.message ?? null };
    },

    async deleteByTransferPair(pairId: string, userId: string) {
      const { error } = await client
        .from("expenses")
        .delete()
        .eq("transfer_pair_id", pairId)
        .eq("user_id", userId);
      return { error: error?.message ?? null };
    },
  };
}

export type ExpensesRepo = ReturnType<typeof createExpensesRepo>;
