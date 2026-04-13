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
  day_of_month: z.number().int("Día inválido").optional().nullable(),
  schedule_type: z.enum(["monthly", "last_day", "last_weekday", "bimonthly"]).default("monthly"),
}).superRefine((data, ctx) => {
  if (data.schedule_type === "last_day") {
    return;
  }

  if (data.schedule_type === "last_weekday") {
    if (data.day_of_month == null || data.day_of_month < 0 || data.day_of_month > 6) {
      ctx.addIssue({
        code: "custom",
        path: ["day_of_month"],
        message: "Día inválido",
      });
    }
    return;
  }

  if (data.day_of_month != null && (data.day_of_month < 1 || data.day_of_month > 31)) {
    ctx.addIssue({
      code: "custom",
      path: ["day_of_month"],
      message: "Día inválido",
    });
  }
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

export const investmentTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
});

export const investmentFundSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  type_id: z.string().check(z.uuid({ error: "Selecciona un tipo de inversión" })),
  current_value: z.number().min(0, "El valor no puede ser negativo"),
  isin: z.string().trim().max(12).optional().nullable(),
  show_negative_returns: z.boolean().optional().default(true),
});

export const investmentFundCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  type_id: z.string().check(z.uuid({ error: "Selecciona un tipo de inversión" })),
  initial_amount: z.number().min(0, "El importe no puede ser negativo"),
  isin: z.string().trim().max(12).optional().nullable(),
  show_negative_returns: z.boolean().optional().default(true),
});

export const investmentFundUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  isin: z.string().trim().max(12).optional().nullable(),
  show_negative_returns: z.boolean().optional().default(true),
});

export const investmentContributionSchema = z.object({
  fund_id: z.string().check(z.uuid({ error: "Selecciona un fondo" })),
  amount: z
    .number({ error: "El importe es obligatorio" })
    .refine((v) => v > 0, "El importe debe ser positivo"),
  purchase_price: z
    .number()
    .positive("El precio debe ser positivo")
    .optional()
    .nullable(),
  contribution_date: z
    .string()
    .min(1, "La fecha es obligatoria")
    .regex(DATE_REGEX, "Formato de fecha inválido"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type InvestmentTypeFormData = z.infer<typeof investmentTypeSchema>;
export type InvestmentFundFormData = z.infer<typeof investmentFundSchema>;
export type InvestmentFundCreateFormData = z.infer<typeof investmentFundCreateSchema>;
export type InvestmentFundUpdateFormData = z.infer<typeof investmentFundUpdateSchema>;
export type InvestmentContributionFormData = z.infer<typeof investmentContributionSchema>;
