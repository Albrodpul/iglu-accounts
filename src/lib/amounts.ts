/**
 * Parses amount from FormData applying income/expense/debt sign convention.
 * Expenses are stored as negative, income and debts as positive.
 */
export function parseSignedAmount(formData: FormData): number {
  const rawAmount = parseFloat(formData.get("amount") as string);
  const isIncome = formData.get("is_income") === "true";
  const isDebt = formData.get("is_debt") === "true";
  return isIncome || isDebt ? Math.abs(rawAmount) : -Math.abs(rawAmount);
}
