import "server-only";
import { cookies, headers } from "next/headers";
import { getDictionary, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return negotiateLocale((await headers()).get("accept-language"));
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
