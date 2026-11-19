"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import type { Profile } from "@/lib/data/types";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { saveProfile } from "./actions";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  return (
    <form
      className="space-y-3"
      action={(fd) =>
        start(async () => {
          const res = await saveProfile(fd);
          setStatus(res.ok ? "saved" : "error");
          if (res.ok) router.refresh();
        })
      }
    >
      <Field label={t.settings.name}>
        <Input name="display_name" defaultValue={profile?.display_name ?? ""} autoComplete="given-name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.settings.sex}>
          <Select name="sex" defaultValue={profile?.sex ?? ""}>
            <option value="">–</option>
            <option value="male">{t.settings.sexes.male}</option>
            <option value="female">{t.settings.sexes.female}</option>
          </Select>
        </Field>
        <Field label={t.settings.height}>
          <Input name="height_cm" type="number" inputMode="decimal" step="0.1" min={100} max={250} defaultValue={profile?.height_cm ?? ""} />
        </Field>
      </div>
      <Field label={t.settings.birthDate}>
        <Input name="birth_date" type="date" defaultValue={profile?.birth_date ?? ""} />
      </Field>
      <Field label={t.settings.activity}>
        <Select name="activity_level" defaultValue={profile?.activity_level ?? ""}>
          <option value="">–</option>
          {(Object.keys(t.settings.activities) as (keyof typeof t.settings.activities)[]).map((k) => (
            <option key={k} value={k}>
              {t.settings.activities[k]}
            </option>
          ))}
        </Select>
      </Field>
      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
      </Button>
    </form>
  );
}
