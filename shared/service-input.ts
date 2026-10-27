import { z } from "zod";

// Match PostgreSQL integer storage without silently rounding monetary values.
const positiveInteger = z.number().int().positive().max(2147483647);
export const serviceNumericFields = {
  priceMin: positiveInteger,
  priceMax: positiveInteger.nullable().optional(),
  duration: positiveInteger,
};

export function validServicePriceRange(value: { priceMin: number; priceMax?: number | null }) {
  return value.priceMax == null || value.priceMax >= value.priceMin;
}

export const servicePriceRangeError = {
  message: "Maximum price must be at least the minimum price",
  path: ["priceMax"],
};

const localizedText = z.object({ en: z.string(), ru: z.string(), uz: z.string() });
export const updateServiceSchema = z.object({
  name: localizedText,
  description: localizedText.nullable().optional(),
  category: z.string().min(1).max(100),
  ...serviceNumericFields,
  priceMax: positiveInteger.nullable(),
  isActive: z.boolean(),
}).refine(validServicePriceRange, servicePriceRangeError);
