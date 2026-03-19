import { vi } from "vitest";

type ResultShape<T = unknown> = {
  data: T;
  error: { message: string } | null;
};

export type SupabaseQueryBuilder<T = unknown> = ReturnType<typeof createQueryBuilder<T>>;

export function createQueryBuilder<T = unknown>(
  initialResult: ResultShape<T> = { data: null as T, error: null },
) {
  let result = initialResult;

  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    setResult(next: ResultShape<T>) {
      result = next;
      return builder;
    },
    then(onFulfilled: (value: ResultShape<T>) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  return builder;
}

export function createSupabaseMock(options?: {
  user?: { id: string } | null;
  tables?: Record<string, SupabaseQueryBuilder<unknown>>;
}) {
  const tables = options?.tables ?? {};

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options?.user === undefined ? { id: "user-1" } : options.user,
        },
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((tableName: string) => {
      const builder = tables[tableName];
      if (!builder) {
        throw new Error(`No mock query builder for table: ${tableName}`);
      }
      return builder;
    }),
  };
}
