import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAmountQuery } from "@/lib/amount-search";
import { fetchAllRows } from "./fetch-all";

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

/**
 * PostgREST `or` filter matching the concept or, when the query is a number,
 * the absolute amount. Returns null for plain-text queries (concept only).
 * Safe to interpolate: `parseAmountQuery` only accepts digits, a sign, one
 * decimal separator and "€", and the concept pattern is double-quoted.
 */
function conceptOrAmountFilter(search: string): string | null {
  const range = parseAmountQuery(search);
  if (!range) return null;
  const { min, max } = range;
  return [
    `concept.ilike."%${search.trim()}%"`,
    `and(amount.gte.${min},amount.lt.${max})`,
    `and(amount.lte.${-min},amount.gt.${-max})`,
  ].join(",");
}

export function createExpensesRepo(client: SupabaseClient) {
  return {
    async findWithCategoryByMonth(accountId: string | null, month: number, year: number) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const { data, error } = await fetchAllRows((from, to) => {
        let q = client
          .from("expenses")
          .select("*, category:categories(*)")
          .gte("expense_date", startDate)
          .lt("expense_date", endDate)
          .order("expense_date", { ascending: true })
          .order("id")
          .range(from, to);
        if (accountId) q = q.eq("account_id", accountId);
        return q;
      });
      if (error) throw error;
      return data;
    },

    async findWithCategoryByYear(accountId: string | null, year: number) {
      const { data, error } = await fetchAllRows((from, to) => {
        let q = client
          .from("expenses")
          .select("*, category:categories(*)")
          .gte("expense_date", `${year}-01-01`)
          .lt("expense_date", `${year + 1}-01-01`)
          .order("expense_date", { ascending: true })
          .order("id")
          .range(from, to);
        if (accountId) q = q.eq("account_id", accountId);
        return q;
      });
      if (error) throw error;
      return data;
    },

    async findAllDates(accountId: string | null) {
      const { data, error } = await fetchAllRows<{ expense_date: string }>((from, to) => {
        let q = client.from("expenses").select("expense_date").order("id").range(from, to);
        if (accountId) q = q.eq("account_id", accountId);
        return q;
      });
      if (error) throw error;
      return data;
    },

    async findAllAmounts(accountId: string | null) {
      const { data, error } = await fetchAllRows<{
        expense_date: string;
        amount: number;
        category_id: string;
        payment_method: string;
      }>((from, to) => {
        let q = client
          .from("expenses")
          .select("expense_date, amount, category_id, payment_method")
          .order("id")
          .range(from, to);
        if (accountId) q = q.eq("account_id", accountId);
        return q;
      });
      if (error) throw error;
      return data;
    },

    async findAmountsByDateRange(accountId: string | null, start: string, end: string) {
      const { data } = await fetchAllRows<{ amount: number; category_id: string }>((from, to) => {
        let q = client
          .from("expenses")
          .select("amount, category_id")
          .gte("expense_date", start)
          .lt("expense_date", end)
          .order("id")
          .range(from, to);
        if (accountId) q = q.eq("account_id", accountId);
        return q;
      });
      return data;
    },

    async findDatedAmountsByDateRange(accountId: string | null, start: string, end: string) {
      const { data } = await fetchAllRows<{ expense_date: string; amount: number; category_id: string }>(
        (from, to) => {
          let q = client
            .from("expenses")
            .select("expense_date, amount, category_id")
            .gte("expense_date", start)
            .lt("expense_date", end)
            .order("id")
            .range(from, to);
          if (accountId) q = q.eq("account_id", accountId);
          return q;
        },
      );
      return data;
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
        .order("expense_date", { ascending: false })
        .limit(50);
      const amountFilter = conceptOrAmountFilter(query);
      q = amountFilter ? q.or(amountFilter) : q.ilike("concept", `%${query}%`);
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

    /** Latest movements (concept, category, amount) to derive quick-entry hints. */
    async findRecentForHints(accountId: string | null, limit: number) {
      let q = client
        .from("expenses")
        .select("concept, category_id, amount, category:categories(name)")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      return (data ?? []) as unknown as {
        concept: string | null;
        category_id: string;
        amount: number;
        category: { name: string } | null;
      }[];
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
      // A truncated backup would look complete: read every page.
      const { data, error } = await fetchAllRows((from, to) =>
        client
          .from("expenses")
          .select("id, category_id, amount, concept, expense_date, notes, payment_method, transfer_pair_id")
          .eq("account_id", accountId)
          .order("expense_date", { ascending: true })
          .order("id")
          .range(from, to),
      );
      if (error) return null;
      return data;
    },

    async findPaginated(
      accountId: string | null,
      opts: {
        page: number;
        limit: number;
        ascending: boolean;
        search?: string;
        categoryId?: string;
        /** Latest `expense_date` to include (YYYY-MM-DD). */
        until?: string;
      },
    ) {
      const { page, limit, ascending, search, categoryId, until } = opts;
      const from = page * limit;
      const to = from + limit - 1;

      let q = client
        .from("expenses")
        .select("*, category:categories(*)")
        .order("expense_date", { ascending })
        .range(from, to);
      if (accountId) q = q.eq("account_id", accountId);
      if (search) {
        const amountFilter = conceptOrAmountFilter(search);
        q = amountFilter ? q.or(amountFilter) : q.ilike("concept", `%${search}%`);
      }
      if (categoryId) q = q.eq("category_id", categoryId);
      if (until) q = q.lte("expense_date", until);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async findForDedup(accountId: string) {
      const { data } = await fetchAllRows<{ expense_date: string; amount: number; concept: string | null }>(
        (from, to) =>
          client
            .from("expenses")
            .select("expense_date, amount, concept")
            .eq("account_id", accountId)
            .order("id")
            .range(from, to),
      );
      return data;
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
