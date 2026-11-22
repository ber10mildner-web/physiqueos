import { Flame } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import type { Burn } from "@/lib/nutrition/burn";
import { formatNumber } from "@/lib/format";
import { cx } from "./ui";

/** Eaten vs. burned today, with the parts of the burn estimate. */
export function EnergyBalance({ intake, burn, isToday, t, locale }: { intake: number; burn: Burn | null; isToday: boolean; t: Dictionary; locale: string }) {
  if (!burn) {
    return (
      <div className="flex items-start gap-3">
        <Flame className="mt-0.5 size-5 shrink-0 text-carbs" />
        <p className="text-sm text-muted">{t.burn.missingProfile}</p>
      </div>
    );
  }
  const balance = Math.round(intake - burn.total);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Cell label={t.burn.eaten} value={formatNumber(intake, locale)} />
        <Cell label={isToday ? t.burn.burnedToday : t.burn.burned} value={formatNumber(burn.total, locale)} icon />
        <Cell
          label={t.burn.balance}
          value={`${balance > 0 ? "+" : ""}${formatNumber(balance, locale)}`}
          tone={balance > 0 ? "text-carbs" : "text-fiber"}
        />
      </div>
      <details className="group mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
        <summary className="cursor-pointer list-none text-xs text-muted">
          {burn.basis === "garmin" ? t.burn.basisGarmin : t.burn.basisEstimate} <span className="text-faint group-open:hidden">· {t.burn.howCalculated}</span>
        </summary>
        <ul className="mt-2 space-y-1">
          {burn.parts.map((p) => (
            <li key={p.key} className="flex justify-between gap-3">
              <span className="text-muted">{t.burn.parts[p.key]}</span>
              <span className="num">{formatNumber(p.kcal, locale)} kcal</span>
            </li>
          ))}
        </ul>
        {burn.gymWithoutDuration > 0 && <p className="mt-2 text-xs text-warn">{fmt(t.burn.gymNoDuration, { n: burn.gymWithoutDuration })}</p>}
        <p className="mt-2 text-xs text-faint">{isToday ? t.burn.noteToday : t.burn.note}</p>
      </details>
    </div>
  );
}

function Cell({ label, value, tone, icon }: { label: string; value: string; tone?: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-2.5">
      <div className="num flex items-center justify-center gap-1 text-lg font-semibold tracking-tight">
        {icon && <Flame className="size-4 text-carbs" />}
        <span className={cx(tone)}>{value}</span>
      </div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
