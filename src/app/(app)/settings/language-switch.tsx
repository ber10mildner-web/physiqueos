"use client";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n";
import { setLocale } from "./actions";
import { cx } from "@/components/ui";

export function LanguageSwitch() {
  const { locale } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => start(() => setLocale(l))}
          className={cx(
            "h-10 rounded-xl text-sm font-medium transition",
            l === locale ? "bg-surface-3 text-text shadow" : "text-muted hover:text-text",
          )}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
