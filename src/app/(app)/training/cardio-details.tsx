"use client";
import { useRef, useState, useTransition } from "react";
import { Camera, ScanText } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { TrainingRating } from "@/lib/data/types";
import type { CardioWithEstimate } from "@/lib/cardio";
import type { KcalSource } from "@/lib/training/cardio-kcal";
import { Button, Field, Input, Notice } from "@/components/ui";
import { RatingFields, emptyRating, isRated } from "@/components/rating-form";
import { resizeImage } from "../body/photos/resize";
import { rateTrainingAction, readMachinePhotoAction, saveMachineAction, setMachinePhotoAction } from "./actions";

const MACHINE_FIELDS = ["machine_minutes", "machine_level", "machine_floors", "machine_steps", "machine_kcal"] as const;
type MachineField = (typeof MACHINE_FIELDS)[number];

const parse = (s: string) => {
  const v = s.trim().replace(",", ".");
  return v === "" ? null : Number(v);
};

export function SourceList({ sources, source }: { sources: KcalSource[]; source: string }) {
  const { t, locale } = useI18n();
  const label = (s: KcalSource) => {
    if (s.kind === "work")
      return fmt(t.machine.sourceWork, { basis: s.note === "steps" ? t.machine.basisSteps : s.note === "floors" ? t.machine.basisFloors : t.machine.basisLevel });
    if (s.kind === "watch") return source === "garmin" ? t.machine.sourceWatch : t.machine.sourceEntered;
    if (s.kind === "heart_rate") return t.machine.sourceHeartRate;
    return t.machine.sourceMachine;
  };
  return (
    <ul className="space-y-1 text-sm">
      {sources.map((s) => (
        <li key={s.kind} className="flex justify-between gap-3">
          <span className="text-muted">{label(s)}</span>
          <span className="num">{formatNumber(s.kcal, locale)} kcal</span>
        </li>
      ))}
    </ul>
  );
}

export function CardioDetails({
  session,
  userId,
  photoUrl,
  aiEnabled,
  hasWeight,
  onClose,
}: {
  session: CardioWithEstimate;
  userId: string;
  photoUrl: string | null;
  aiEnabled: boolean;
  hasWeight: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const saved: TrainingRating = { feeling: session.feeling, energy: session.energy, effort: session.effort, rating_note: session.rating_note };
  const [rating, setRating] = useState<TrainingRating>(isRated(saved) ? saved : emptyRating);
  const [machine, setMachine] = useState<Record<MachineField, string>>(
    () => Object.fromEntries(MACHINE_FIELDS.map((k) => [k, session[k] === null ? "" : String(session[k])])) as Record<MachineField, string>,
  );
  const [status, setStatus] = useState<null | "saved" | "error" | "readDone" | "readFailed">(null);
  const [busy, setBusy] = useState<null | "upload" | "read">(null);

  const upload = async (file: File) => {
    setBusy("upload");
    setStatus(null);
    try {
      const { blob } = await resizeImage(file, 1600, 0.85);
      const path = `${userId}/cardio/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const res = await setMachinePhotoAction(session.id, path);
      if (!res.ok) throw new Error(res.error);
      if (aiEnabled) await read();
    } catch {
      setStatus("error");
    } finally {
      setBusy(null);
    }
  };

  const read = async () => {
    setBusy("read");
    const res = await readMachinePhotoAction(session.id);
    setBusy(null);
    if (!res.ok) return setStatus("readFailed");
    const v = res.values;
    setMachine((m) => ({
      machine_minutes: v.minutes !== null ? String(v.minutes) : m.machine_minutes,
      machine_level: v.level !== null ? String(v.level) : m.machine_level,
      machine_floors: v.floors !== null ? String(Math.round(v.floors)) : m.machine_floors,
      machine_steps: v.steps !== null ? String(Math.round(v.steps)) : m.machine_steps,
      machine_kcal: v.kcal !== null ? String(Math.round(v.kcal)) : m.machine_kcal,
    }));
    setStatus("readDone");
  };

  const save = () =>
    start(async () => {
      setStatus(null);
      const values = Object.fromEntries(MACHINE_FIELDS.map((k) => [k, parse(machine[k])])) as Record<MachineField, number | null>;
      if (Object.values(values).some((v) => v !== null && !Number.isFinite(v))) return setStatus("error");
      for (const k of ["machine_floors", "machine_steps", "machine_kcal"] as const) if (values[k] !== null) values[k] = Math.round(values[k]!);
      const [m, r] = await Promise.all([saveMachineAction(session.id, values), rateTrainingAction("cardio", session.id, rating)]);
      setStatus(m.ok && r.ok ? "saved" : "error");
    });

  const labels: Record<MachineField, string> = {
    machine_minutes: t.machine.minutes,
    machine_level: t.machine.level,
    machine_floors: t.machine.floors,
    machine_steps: t.machine.steps,
    machine_kcal: t.machine.kcal,
  };

  return (
    <div className="mt-3 space-y-5 rounded-2xl bg-surface-2/50 p-3">
      <section>
        <h4 className="mb-3 font-semibold">{t.rating.titleCardio}</h4>
        <RatingFields value={rating} onChange={setRating} />
      </section>

      <section>
        <h4 className="font-semibold">{t.machine.title}</h4>
        <p className="mb-3 text-xs text-muted">{t.machine.intro}</p>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={t.machine.photo} className="mb-3 max-h-64 w-full rounded-xl object-contain" />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" className="flex-1" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" /> {busy === "upload" ? t.machine.uploading : photoUrl ? t.machine.retake : t.machine.photo}
          </Button>
          {aiEnabled && photoUrl && (
            <Button type="button" variant="secondary" size="sm" className="flex-1" disabled={busy !== null} onClick={() => void read()}>
              <ScanText className="size-4" /> {busy === "read" ? t.machine.reading : t.machine.read}
            </Button>
          )}
        </div>
        {!aiEnabled && <p className="mt-2 text-xs text-faint">{t.machine.viaClaude}</p>}
        {status === "readDone" && <div className="mt-2"><Notice tone="success">{t.machine.readDone}</Notice></div>}
        {status === "readFailed" && <div className="mt-2"><Notice tone="warn">{t.machine.readFailed}</Notice></div>}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {MACHINE_FIELDS.map((k) => (
            <Field key={k} label={labels[k]}>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={machine[k]}
                onChange={(e) => setMachine((m) => ({ ...m, [k]: e.target.value }))}
                className="num"
              />
            </Field>
          ))}
        </div>
        {session.activity === "stairs" && !hasWeight && <p className="mt-2 text-xs text-warn">{t.machine.needWeight}</p>}
      </section>

      {session.estimate && (
        <section>
          <div className="flex items-baseline justify-between">
            <h4 className="font-semibold">{t.machine.estimate}</h4>
            <span className="num text-lg font-semibold text-accent">{formatNumber(session.estimate.kcal, locale)} kcal</span>
          </div>
          <p className="mb-2 text-xs text-muted">{t.machine.sources}</p>
          <SourceList sources={session.estimate.sources} source={session.source} />
          <p className="mt-2 text-xs text-faint">{t.machine.explain}</p>
        </section>
      )}

      {status === "error" && <Notice tone="error">{t.errors.invalidInput}</Notice>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
          {t.machine.hide}
        </Button>
        <Button type="button" className="flex-1" disabled={pending || busy !== null} onClick={save}>
          {pending ? t.common.saving : status === "saved" ? `✓ ${t.common.saved}` : t.common.save}
        </Button>
      </div>
    </div>
  );
}
