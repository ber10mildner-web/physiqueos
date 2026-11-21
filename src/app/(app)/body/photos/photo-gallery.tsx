"use client";
/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; bypass the image optimizer on purpose */
import { useRef, useState, useTransition } from "react";
import { Camera, Columns2, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { POSES, type PhotoPose, type ProgressPhoto } from "@/lib/data/types";
import { dayNumber } from "@/lib/body/weight";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Notice, Select, cx } from "@/components/ui";
import { recordPhoto, deletePhoto } from "./actions";
import { resizeImage } from "./resize";

export function PhotoGallery({ userId, photos, weightByDate, today }: { userId: string; photos: ProgressPhoto[]; weightByDate: Record<string, number>; today: string }) {
  const { t, locale } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<PhotoPose | "all">("all");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[] | null>(null);
  const [, start] = useTransition();

  const visible = photos.filter((p) => filter === "all" || p.pose === filter);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError(t.photos.invalidType);
    if (file.size > 30 * 1024 * 1024) return setError(t.photos.tooLarge);
    setUploading(true);
    try {
      const { blob, width, height } = await resizeImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const res = await recordPhoto({ storage_path: path, taken_on: date, pose, width, height });
      if (!res.ok) throw new Error(res.error);
    } catch {
      setError(t.common.error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const toggleCompare = (id: string) =>
    setCompare((c) => {
      if (!c) return c;
      if (c.includes(id)) return c.filter((x) => x !== id);
      return [...c, id].slice(-2);
    });

  const pair = compare?.length === 2 ? compare.map((id) => photos.find((p) => p.id === id)!).sort((a, b) => a.taken_on.localeCompare(b.taken_on)) : null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.photos.pose}>
            <Select value={pose} onChange={(e) => setPose(e.target.value as PhotoPose)}>
              {POSES.map((p) => (
                <option key={p} value={p}>
                  {t.photos.poses[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.photos.takenOn}>
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" className="mt-3 w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Camera className="size-5" />
          {uploading ? t.photos.uploading : t.photos.upload}
        </Button>
        {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      </Card>

      {pair && (
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="num text-sm text-muted">{fmt(t.photos.days, { n: dayNumber(pair[1].taken_on) - dayNumber(pair[0].taken_on) })}</span>
            <button type="button" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={t.photos.compareDone} onClick={() => setCompare(null)}>
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pair.map((p, i) => (
              <figure key={p.id}>
                {p.url && <img src={p.url} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />}
                <figcaption className="mt-1.5 text-xs">
                  <div className="font-medium">{i === 0 ? t.photos.before : t.photos.after}</div>
                  <div className="text-muted">
                    {formatDate(p.taken_on, locale)}
                    {weightByDate[p.taken_on] !== undefined && <span className="num"> · {formatNumber(weightByDate[p.taken_on], locale, 1)} kg</span>}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
      )}

      {photos.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
            {(["all", ...POSES] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilter(p)}
                className={cx("h-8 shrink-0 rounded-xl px-3 text-[13px] font-medium", filter === p ? "bg-surface-3 text-text" : "text-muted")}
              >
                {p === "all" ? t.photos.all : t.photos.poses[p]}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" variant={compare ? "primary" : "secondary"} onClick={() => setCompare(compare ? null : [])}>
            <Columns2 className="size-4" />
            {t.photos.compare}
          </Button>
        </div>
      )}
      {compare && compare.length < 2 && <Notice>{t.photos.compareHint}</Notice>}

      {photos.length === 0 ? (
        <EmptyState>{t.photos.empty}</EmptyState>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {visible.map((p) => {
            const selected = compare?.includes(p.id);
            return (
              <li key={p.id} className="relative">
                <button
                  type="button"
                  className={cx("block w-full overflow-hidden rounded-2xl ring-2 transition", selected ? "ring-accent" : "ring-transparent")}
                  onClick={() => (compare ? toggleCompare(p.id) : p.url && window.open(p.url, "_blank"))}
                >
                  {p.url ? <img src={p.url} alt="" loading="lazy" className="aspect-[3/4] w-full bg-surface-2 object-cover" /> : <div className="aspect-[3/4] bg-surface-2" />}
                </button>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>
                    {formatDate(p.taken_on, locale, { day: "numeric", month: "short", year: "2-digit" })} · {t.photos.poses[p.pose]}
                  </span>
                  {!compare && (
                    <button
                      type="button"
                      aria-label={t.common.delete}
                      className="text-faint hover:text-danger"
                      onClick={() => {
                        if (!confirm(t.common.confirmDelete)) return;
                        start(async () => {
                          await deletePhoto(p.id);
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
