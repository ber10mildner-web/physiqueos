"use client";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { FoodCandidate } from "@/lib/food-sources/types";
import { Button, Notice } from "@/components/ui";
import { resizeImage } from "../../body/photos/resize";

export interface LabelRead {
  food: Partial<FoodCandidate>;
  scaledFromServing: boolean;
}

type ErrorKey = keyof ReturnType<typeof useI18n>["t"]["labelPhoto"]["errors"];

/**
 * Fallback only: photo of a nutrition label → values for the manual form.
 * Shown where a barcode found nothing or a food has none (bakery bread).
 */
export function LabelPhoto({ onRead, showHint = false }: { onRead: (r: LabelRead) => void; showHint?: boolean }) {
  const { t } = useI18n();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);

  async function send(file: File) {
    setBusy(true);
    setError(null);
    try {
      // Labels have small print: keep more pixels than for meal photos.
      const { blob } = await resizeImage(file, 2000, 0.85);
      const form = new FormData();
      form.append("photo", blob, "label.jpg");
      const res = await fetch("/api/food/label", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as Partial<LabelRead> & { error?: string };
      if (!res.ok || !body.food) {
        const key = body.error && body.error in t.labelPhoto.errors ? (body.error as ErrorKey) : "api";
        setError(key);
        return;
      }
      onRead({ food: body.food, scaledFromServing: Boolean(body.scaledFromServing) });
    } catch {
      setError("image");
    } finally {
      setBusy(false);
    }
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void send(file);
  };

  return (
    <div className="space-y-2">
      {showHint && <p className="text-sm text-muted">{t.labelPhoto.hint}</p>}
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={gal} type="file" accept="image/*" className="hidden" onChange={pick} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => cam.current?.click()}>
          <Camera className="size-4" /> {busy ? t.labelPhoto.reading : t.labelPhoto.button}
        </Button>
        {!busy && (
          <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={() => gal.current?.click()}>
            {t.labelPhoto.gallery}
          </button>
        )}
      </div>
      {error && <Notice tone="error">{t.labelPhoto.errors[error]}</Notice>}
    </div>
  );
}
