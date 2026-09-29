/**
 * Quick-entry hints for the movement form, derived from recent history:
 * frequent concepts (one tap fills concept + category) and per-category usage
 * (to list the most used categories first).
 */

export type HintSourceRow = {
  concept: string | null;
  category_id: string;
  amount: number;
  categoryName: string | null;
};

export type ConceptHint = {
  concept: string;
  category_id: string;
  kind: "expense" | "income";
  count: number;
};

export type EntryHints = {
  concepts: ConceptHint[];
  categoryUsage: Record<string, number>;
};

/** Bookkeeping categories never offered as quick picks. */
const RESERVED = new Set(["deuda", "traspaso"]);

/**
 * `rows` must be ordered newest first: the newest spelling and category of a
 * concept win, so the hints follow how the user writes things *now*.
 */
export function buildEntryHints(rows: HintSourceRow[], maxConcepts = 12): EntryHints {
  const byConcept = new Map<string, ConceptHint>();
  const categoryUsage: Record<string, number> = {};

  for (const row of rows) {
    const name = row.categoryName?.toLowerCase() ?? "";
    if (RESERVED.has(name) || row.amount === 0) continue;

    categoryUsage[row.category_id] = (categoryUsage[row.category_id] ?? 0) + 1;

    const concept = row.concept?.trim();
    if (!concept) continue;
    const kind = row.amount < 0 ? "expense" : "income";
    const key = `${kind}:${concept.toLowerCase()}`;
    const existing = byConcept.get(key);
    if (existing) existing.count += 1;
    else byConcept.set(key, { concept, category_id: row.category_id, kind, count: 1 });
  }

  const concepts = [...byConcept.values()]
    .filter((c) => c.count >= 2) // one-offs aren't worth a chip
    .sort((a, b) => b.count - a.count)
    .slice(0, maxConcepts);

  return { concepts, categoryUsage };
}
