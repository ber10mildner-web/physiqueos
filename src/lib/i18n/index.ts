import de, { type Dictionary } from "./de";
import en from "./en";

export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES: Record<Locale, string> = { de: "Deutsch", en: "English" };

const dictionaries: Record<Locale, Dictionary> = { de, en };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Fill {placeholders}. Unknown placeholders are left as-is so missing values are visible. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Pick a supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

export type { Dictionary };
