import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createAccountsRepo } from "./accounts";
import { createCategoriesRepo } from "./categories";
import { createExpensesRepo } from "./expenses";
import { createRecurringRepo } from "./recurring";
import { createInvestmentsRepo } from "./investments";
import { createNotificationsRepo } from "./notifications";
import { createPasskeysRepo } from "./passkeys";

export async function getDb() {
  const client = await createClient();
  return {
    accounts: createAccountsRepo(client),
    categories: createCategoriesRepo(client),
    expenses: createExpensesRepo(client),
    recurring: createRecurringRepo(client),
    investments: createInvestmentsRepo(client),
    notifications: createNotificationsRepo(client),
    passkeys: createPasskeysRepo(client),
  };
}

export type Db = Awaited<ReturnType<typeof getDb>>;

export function getServiceDb() {
  const client = createServiceClient();
  return {
    accounts: createAccountsRepo(client),
    categories: createCategoriesRepo(client),
    expenses: createExpensesRepo(client),
    recurring: createRecurringRepo(client),
    notifications: createNotificationsRepo(client),
    passkeys: createPasskeysRepo(client),
  };
}

export type ServiceDb = ReturnType<typeof getServiceDb>;
