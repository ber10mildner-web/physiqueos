import { NUTRIENTS, type NutrientKey } from "@/lib/nutrition/nutrients";

export function formatNumber(value: number, locale: string, decimals = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(value);
}

export function formatNutrient(key: NutrientKey, value: number, locale: string, withUnit = true): string {
  const def = NUTRIENTS[key];
  const n = formatNumber(value, locale, def.decimals);
  return withUnit ? `${n} ${def.unit}` : n;
}
