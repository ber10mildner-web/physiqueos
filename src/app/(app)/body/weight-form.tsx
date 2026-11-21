"use client";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Button, Field, Input, Notice } from "@/components/ui";
import { saveWeight } from "./actions";

export function WeightForm({ today, defaultWeight }: { today: string; defaultWeight: number | null }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const res = await saveWeight(fd);
          setStatus(res.ok ? "saved" : "error");
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.body.weightKg}>
          <Input
            name="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.05"
            min={20}
            max={400}
            required
            placeholder={defaultWeight ? String(defaultWeight) : "75.0"}
            className="num text-lg"
          />
        </Field>
        <Field label={t.body.date}>
          <Input name="entry_date" type="date" defaultValue={today} max={today} required />
        </Field>
      </div>
      <Field label={`${t.body.note} (${t.common.optional})`}>
        <Input name="note" maxLength={500} />
      </Field>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </form>
  );
}
