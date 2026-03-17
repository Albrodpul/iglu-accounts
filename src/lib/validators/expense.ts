import { z } from "zod";

export const expenseSchema = z.object({
  amount: z
    .number({ error: "El importe es obligatorio" })
    .refine((v) => v !== 0, "El importe no puede ser 0"),
  concept: z.string().max(200, "Máximo 200 caracteres").optional().nullable(),
  category_id: z.string().uuid("Selecciona una categoría"),
  expense_date: z.string().min(1, "La fecha es obligatoria"),
  notes: z.string().max(500).optional().nullable(),
});

export const recurringExpenseSchema = z.object({
  amount: z
    .number({ error: "El importe es obligatorio" })
    .refine((v) => v !== 0, "El importe no puede ser 0"),
  concept: z.string().optional().nullable(),
  category_id: z.string().uuid("Selecciona una categoría"),
  day_of_month: z.number().min(0).max(31).optional().nullable(),
  schedule_type: z.enum(["monthly", "last_day", "last_weekday", "bimonthly"]).default("monthly"),
});

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(50, "Máximo 50 caracteres"),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
