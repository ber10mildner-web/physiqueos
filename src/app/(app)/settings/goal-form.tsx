"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import type { NutritionGoal, Profile } from "@/lib/data/types";
import { ageFromBirthDate, caloriesFromMacroTargets, macrosForCalories, suggestTargets, type Phase, type Targets } from "@/lib/nutrition/energy";
import { formatNumber } from "@/lib/format";
import { shiftCarbs } from "@/lib/nutrition/goal-days";
import { Button, Field, Input, Notice, cx } from "@/components/ui";
import { saveGoal } from "./actions";

const PHASES: Phase[] = ["cut", "maintenance", "lean_bulk", "custom"];
type Key = keyof Targets;

export function GoalForm({ profile, latestWeightKg, goal, today }: { profile: Profile | null; latestWeightKg: number | null; goal: NutritionGoal | null; today: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [phase, setPhase] = useState<Phase>(goal?.phase ?? "maintenance");
  const [values, setValues] = useState<Record<Key, string>>({
    energy_kcal: goal ? String(goal.base.energy_kcal) : "",
    protein_g: goal ? String(goal.base.protein_g) : "",
    carbs_g: goal ? String(goal.base.carbs_g) : "",
    fat_g: goal ? String(goal.base.fat_g) : "",
    fiber_g: goal ? String(goal.base.fiber_g) : "",
  });
  const [altDays, setAltDays] = useState<number[]>(goal?.alt_days ?? []);
  const [alt, setAlt] = useState<Record<Key, string>>({
    energy_kcal: goal?.alt ? String(goal.alt.energy_kcal) : "",
    protein_g: goal?.alt ? String(goal.alt.protein_g) : "",
    carbs_g: goal?.alt ? String(goal.alt.carbs_g) : "",
    fat_g: goal?.alt ? String(goal.alt.fat_g) : "",
    fiber_g: goal?.alt ? String(goal.alt.fiber_g) : "",
  });
  const baseTargets = (): Targets => ({ energy_kcal: n("energy_kcal"), protein_g: n("protein_g"), carbs_g: n("carbs_g"), fat_g: n("fat_g"), fiber_g: n("fiber_g") });
  const onAltCalories = (v: string) => {
    const kcal = Number(v);
    if (kcal >= 800 && n("energy_kcal") >= 800) {
      const shifted = shiftCarbs(baseTargets(), kcal);
      setAlt({ ...(Object.fromEntries(Object.entries(shifted).map(([k, x]) => [k, String(x)])) as Record<Key, string>), energy_kcal: v });
    } else setAlt((s) => ({ ...s, energy_kcal: v }));
  };

  const canCalculate = Boolean(profile?.sex && profile.birth_date && profile.height_cm && profile.activity_level && latestWeightKg);
  const suggestion = useMemo(() => {
    if (!canCalculate || phase === "custom") return null;
    return suggestTargets(
      {
        sex: profile!.sex!,
        ageYears: ageFromBirthDate(profile!.birth_date!),
        heightCm: profile!.height_cm!,
        weightKg: latestWeightKg!,
        activity: profile!.activity_level!,
      },
      phase,
    );
  }, [canCalculate, phase, profile, latestWeightKg]);

  const apply = (targets: Targets) =>
    setValues(Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, String(v)])) as Record<Key, string>);

  function n(k: Key) {
    return Number(values[k]) || 0;
  }
  const macroKcal = caloriesFromMacroTargets({ protein_g: n("protein_g"), carbs_g: n("carbs_g"), fat_g: n("fat_g") });

  // When the user edits calories in a non-custom phase, re-split macros automatically.
  const onCalories = (v: string) => {
    const kcal = Number(v);
    if (phase !== "custom" && latestWeightKg && kcal >= 800) apply(macrosForCalories(kcal, latestWeightKg, phase));
    setValues((s) => ({ ...s, energy_kcal: v }));
  };

  const fields: { key: Key; label: string; color?: string }[] = [
    { key: "protein_g", label: t.settings.protein, color: "var(--protein)" },
    { key: "carbs_g", label: t.settings.carbs, color: "var(--carbs)" },
    { key: "fat_g", label: t.settings.fat, color: "var(--fat)" },
    { key: "fiber_g", label: t.settings.fiber, color: "var(--fiber)" },
  ];

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          fd.set("phase", phase);
          const res = await saveGoal(fd);
          setStatus(res.ok ? "saved" : "error");
          if (res.ok) router.refresh();
        })
      }
    >
      <div>
        <span className="mb-1.5 block text-[13px] text-muted">{t.settings.phase}</span>
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPhase(p)}
              className={cx("h-10 rounded-xl px-1 text-[13px] font-medium transition", p === phase ? "bg-surface-3 text-text shadow" : "text-muted")}
            >
              {t.phases[p]}
            </button>
          ))}
        </div>
      </div>

      {phase !== "custom" &&
        (suggestion ? (
          <div className="rounded-2xl border border-line bg-surface-2 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t.settings.bmr}</span>
              <span className="num">{formatNumber(suggestion.bmr, locale)} kcal</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">{t.settings.tdee}</span>
              <span className="num">{formatNumber(suggestion.tdee, locale)} kcal</span>
            </div>
            <p className="mt-2 text-xs text-faint">{t.settings.estimateNote}</p>
            <Button type="button" size="sm" variant="secondary" className="mt-3 w-full" onClick={() => apply(suggestion.targets)}>
              {t.settings.useSuggestion}: {formatNumber(suggestion.targets.energy_kcal, locale)} kcal
            </Button>
          </div>
        ) : (
          <Notice>{t.settings.calcNeeds}</Notice>
        ))}

      <Field label={t.settings.energy}>
        <Input name="energy_kcal" type="number" inputMode="numeric" required min={800} max={8000} value={values.energy_kcal} onChange={(e) => onCalories(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <Field
            key={f.key}
            label={
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: f.color }} />
                {f.label}
              </span>
            }
          >
            <Input
              name={f.key}
              type="number"
              inputMode="numeric"
              required
              min={0}
              value={values[f.key]}
              onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      {macroKcal > 0 && (
        <p className={cx("text-xs", Math.abs(macroKcal - n("energy_kcal")) > 50 ? "text-warn" : "text-faint")}>
          {fmt(t.settings.macroKcal, { value: formatNumber(macroKcal, locale) })}
        </p>
      )}
      <div className="rounded-2xl border border-line p-3">
        <div className="text-sm font-medium">{t.settings.altTitle}</div>
        <p className="mb-2 text-xs text-muted">{t.settings.altIntro}</p>
        <div className="grid grid-cols-7 gap-1">
          {t.settings.weekdaysShort.map((label, i) => {
            const day = i + 1;
            const on = altDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                onClick={() => setAltDays((d) => (on ? d.filter((x) => x !== day) : [...d, day]))}
                className={cx("h-9 rounded-lg text-xs font-medium", on ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}
              >
                {label}
              </button>
            );
          })}
        </div>
        {altDays.map((d) => (
          <input key={d} type="hidden" name="alt_days" value={d} />
        ))}
        {altDays.length > 0 && (
          <div className="mt-3 space-y-3">
            <Field label={t.settings.energy}>
              <Input name="alt_energy_kcal" type="number" inputMode="numeric" required min={800} max={8000} value={alt.energy_kcal} onChange={(e) => onAltCalories(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Input
                    name={`alt_${f.key}`}
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    value={alt[f.key]}
                    onChange={(e) => setAlt((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-faint">{t.settings.altHint}</p>
          </div>
        )}
      </div>

      <Field label={t.settings.validFrom}>
        <Input name="valid_from" type="date" defaultValue={goal && goal.valid_from === today ? goal.valid_from : today} required />
      </Field>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.settings.saveGoal}
      </Button>
    </form>
  );
}
