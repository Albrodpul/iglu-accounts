/**
 * Parses amount from FormData applying income/expense sign convention.
 * Expenses are stored as negative, income as positive.
 */
export function parseSignedAmount(formData: FormData): number {
  const rawAmount = parseFloat(formData.get("amount") as string);
  const isIncome = formData.get("is_income") === "true";
  return isIncome ? Math.abs(rawAmount) : -Math.abs(rawAmount);
}
