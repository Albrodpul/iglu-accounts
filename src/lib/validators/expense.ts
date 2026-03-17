import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const expenseSchema = z.object({
  amount: z
    .number({ error: "El importe es obligatorio" })
    .refine((v) => v !== 0, "El importe no puede ser 0"),
  concept: z.string().trim().max(200, "Máximo 200 caracteres").optional().nullable(),
  category_id: z.string().check(z.uuid({ error: "Selecciona una categoría" })),
  expense_date: z
    .string()
    .min(1, "La fecha es obligatoria")
    .regex(DATE_REGEX, "Formato de fecha inválido"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const recurringExpenseSchema = z.object({
  amount: z
    .number({ error: "El importe es obligatorio" })
    .refine((v) => v !== 0, "El importe no puede ser 0"),
  concept: z.string().trim().max(200, "Máximo 200 caracteres").optional().nullable(),
  category_id: z.string().check(z.uuid({ error: "Selecciona una categoría" })),
  day_of_month: z.number().min(1, "Día inválido").max(31, "Día inválido").optional().nullable(),
  schedule_type: z.enum(["monthly", "last_day", "last_weekday", "bimonthly"]).default("monthly"),
});

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(50, "Máximo 50 caracteres"),
  icon: z.string().max(10).optional().nullable(),
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, "Color inválido")
    .optional()
    .nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
