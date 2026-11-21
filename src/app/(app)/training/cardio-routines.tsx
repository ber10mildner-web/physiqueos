"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Repeat } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber } from "@/lib/format";
import { CARDIO_ACTIVITIES, type CardioTemplate } from "@/lib/data/types";
import { Button, Field, Input, Notice, Select, cx } from "@/components/ui";
import { WeekdayPicker, weekdayLabel } from "@/components/weekday-picker";
import { archiveCardioTemplateAction, logCardioTemplateAction, saveCardioTemplateAction } from "./actions";

const parse = (s: string) => {
  const v = s.trim().replace(",", ".");
  return v === "" ? null : Number(v);
};

/** Values to start a new template with, e.g. from a logged session ("Als Vorlage speichern"). */
export type TemplatePrefill = Omit<CardioTemplate, "id" | "auto_days" | "auto_from">;

export function CardioRoutines({ templates, loggedToday, prefill }: { templates: CardioTemplate[]; loggedToday: string[]; prefill?: TemplatePrefill | null }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(prefill ? "new" : null);
  const closeNew = () => {
    setEditing(null);
    // drop ?vorlage=… so a reload doesn't open the form again
    if (prefill) router.replace("/training", { scroll: false });
  };
  const [logged, setLogged] = useState(new Set(loggedToday));
  const [, start] = useTransition();

  const summary = (x: CardioTemplate) =>
    [
      `${formatNumber(x.duration_min, locale)} min`,
      x.incline_pct !== null && `${formatNumber(x.incline_pct, locale, 1)} %`,
      x.speed_kmh !== null && `${formatNumber(x.speed_kmh, locale, 1)} km/h`,
      x.kcal !== null && `${x.kcal} kcal`,
      x.avg_hr !== null && `${x.avg_hr} bpm`,
      x.effort !== null && `${t.rating.effort} ${x.effort}/10`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="space-y-2">
      <p className="text-xs text-faint">{t.routines.hint}</p>
      {templates.map((x) =>
        editing === x.id ? (
          <TemplateEditor key={x.id} template={x} onDone={() => setEditing(null)} />
        ) : (
          <div key={x.id} className="rounded-2xl bg-surface-2 p-3">
            <div className="flex items-start gap-2">
              <Repeat className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{x.name}</div>
                <div className="num text-xs text-muted">{summary(x)}</div>
                <div className="text-xs text-faint">
                  {x.auto_days.length ? `${t.routines.autoDays}: ${weekdayLabel(x.auto_days, t)}` : t.routines.autoNone}
                </div>
              </div>
              <button type="button" aria-label={t.routines.edit} onClick={() => setEditing(x.id)} className="grid size-8 place-items-center rounded-lg text-muted">
                <Pencil className="size-4" />
              </button>
            </div>
            <button
              type="button"
              disabled={logged.has(x.id)}
              onClick={() => {
                // optimistic: show it as logged right away
                setLogged((s) => new Set(s).add(x.id));
                start(async () => {
                  const res = await logCardioTemplateAction(x.id);
                  if (!res.ok)
                    setLogged((s) => {
                      const n = new Set(s);
                      n.delete(x.id);
                      return n;
                    });
                });
              }}
              className={cx(
                "mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium transition active:scale-[0.99]",
                logged.has(x.id) ? "bg-accent/10 text-accent" : "bg-accent text-accent-ink",
              )}
            >
              {logged.has(x.id) ? (
                <>
                  <Check className="size-4" /> {t.routines.loggedToday}
                </>
              ) : (
                t.routines.logToday
              )}
            </button>
          </div>
        ),
      )}
      {!templates.length && editing !== "new" && <p className="text-sm text-muted">{t.routines.empty}</p>}
      {editing === "new" ? (
        <TemplateEditor template={null} prefill={prefill ?? null} onDone={closeNew} />
      ) : (
        <Button type="button" variant="secondary" className="w-full" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> {t.routines.new}
        </Button>
      )}
    </div>
  );
}

function TemplateEditor({ template, prefill = null, onDone }: { template: CardioTemplate | null; prefill?: TemplatePrefill | null; onDone: () => void }) {
  const { t } = useI18n();
  const base = template ?? prefill;
  const [v, setV] = useState({
    name: base?.name ?? "",
    activity: base?.activity ?? "walk",
    duration_min: base ? String(base.duration_min) : "",
    incline_pct: base?.incline_pct != null ? String(base.incline_pct) : "",
    speed_kmh: base?.speed_kmh != null ? String(base.speed_kmh) : "",
    avg_hr: base?.avg_hr != null ? String(base.avg_hr) : "",
    kcal: base?.kcal != null ? String(base.kcal) : "",
  });
  const [effort, setEffort] = useState<number | null>(base?.effort ?? null);
  const [days, setDays] = useState<number[]>(template?.auto_days ?? []);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((o) => ({ ...o, [k]: e.target.value }));

  const save = () =>
    start(async () => {
      setError(false);
      const hr = parse(v.avg_hr);
      const kcal = parse(v.kcal);
      const res = await saveCardioTemplateAction({
        id: template?.id,
        name: v.name,
        activity: v.activity,
        duration_min: Number(parse(v.duration_min)),
        distance_km: null,
        incline_pct: parse(v.incline_pct),
        speed_kmh: parse(v.speed_kmh),
        avg_hr: hr === null ? null : Math.round(hr),
        kcal: kcal === null ? null : Math.round(kcal),
        effort,
        auto_days: days,
      });
      if (!res.ok) return setError(true);
      onDone();
    });

  return (
    <div className={cx("space-y-3 rounded-2xl border p-3", prefill ? "border-accent/50" : "border-line")}>
      {prefill && <p className="text-sm text-accent">{t.routines.saveAsTemplateHint}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.routines.name} className="col-span-2">
          <Input value={v.name} onChange={set("name")} maxLength={100} placeholder={t.routines.namePlaceholder} />
        </Field>
        <Field label={t.training.activity}>
          <Select value={v.activity} onChange={set("activity")}>
            {CARDIO_ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {t.training.activities[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.training.durationMin}>
          <Input value={v.duration_min} onChange={set("duration_min")} type="number" inputMode="decimal" min={1} max={1440} step="any" className="num" />
        </Field>
        <Field label={`${t.routines.incline} (${t.common.optional})`}>
          <Input value={v.incline_pct} onChange={set("incline_pct")} type="number" inputMode="decimal" min={0} max={40} step="any" className="num" />
        </Field>
        <Field label={`${t.routines.speed} (${t.common.optional})`}>
          <Input value={v.speed_kmh} onChange={set("speed_kmh")} type="number" inputMode="decimal" min={0} max={40} step="any" className="num" />
        </Field>
        <Field label={`${t.training.avgHr} (${t.common.optional})`}>
          <Input value={v.avg_hr} onChange={set("avg_hr")} type="number" inputMode="numeric" min={30} max={250} className="num" />
        </Field>
        <Field label={`${t.training.kcal} (${t.common.optional})`}>
          <Input value={v.kcal} onChange={set("kcal")} type="number" inputMode="numeric" min={0} max={10000} className="num" />
        </Field>
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[13px] text-muted">{t.routines.intensity}</span>
          <span className="text-xs text-faint">{t.routines.intensityHint}</span>
        </div>
        <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={t.routines.intensity}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={effort === n}
              onClick={() => setEffort(effort === n ? null : n)}
              className={cx("num h-9 rounded-lg text-sm font-medium", effort === n ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted")}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 text-[13px] text-muted">{t.routines.autoDays}</div>
        <WeekdayPicker value={days} onChange={setDays} />
        <p className="mt-1 text-xs text-faint">{t.routines.autoHint}</p>
      </div>
      {error && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" disabled={pending} onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button type="button" disabled={pending || !v.name.trim() || !(Number(parse(v.duration_min)) > 0)} onClick={save}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
      {template && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="w-full"
          disabled={pending}
          onClick={() =>
            confirm(t.common.confirmDelete) &&
            start(async () => {
              await archiveCardioTemplateAction(template.id);
              onDone();
            })
          }
        >
          {t.routines.remove}
        </Button>
      )}
    </div>
  );
}
