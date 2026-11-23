"use client";
/* eslint-disable @next/next/no-img-element -- signed URLs are short-lived; bypass the image optimizer on purpose */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, cx } from "@/components/ui";

const TIMERS = [0, 3, 5, 10];
/** Output: 3:4 portrait, like the gallery tiles, max 1600 px high. */
const OUT_W = 1200;
const OUT_H = 1600;

/**
 * Full-screen camera with the last photo of the same pose as a see-through
 * overlay, so new photos line up with old ones. Optional self-timer.
 * The front camera preview is mirrored and the photo is saved the same way
 * (what you see is what you get, also for the overlay).
 */
export function PoseCamera({ ghostUrl, onCapture, onClose }: { ghostUrl: string | null; onCapture: (blob: Blob, width: number, height: number) => Promise<void>; onClose: () => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState(false);
  const [showGhost, setShowGhost] = useState(true);
  const [timer, setTimer] = useState(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  const grab = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // centre crop to 3:4, the same crop the preview shows (object-cover)
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const target = OUT_W / OUT_H;
    let sw = vw;
    let sh = vh;
    if (vw / vh > target) sw = vh * target;
    else sh = vw / target;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    const scale = Math.min(1, OUT_H / sh);
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    canvas.toBlob((b) => b && setShot({ blob: b, url: URL.createObjectURL(b) }), "image/jpeg", 0.85);
  }, [facing]);

  useEffect(() => {
    if (countdown === null) return;
    const id = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        grab();
      } else setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown, grab]);

  const mirror = facing === "user" ? "scale-x-[-1]" : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        <button type="button" onClick={onClose} aria-label={t.photoCompare.close} className="grid size-10 place-items-center rounded-full bg-white/10">
          <X className="size-5" />
        </button>
        <div className="flex gap-1 rounded-full bg-white/10 p-1 text-xs">
          {TIMERS.map((s) => (
            <button key={s} type="button" onClick={() => setTimer(s)} className={cx("h-8 min-w-10 rounded-full px-2", timer === s ? "bg-white text-black" : "text-white/80")}>
              {s === 0 ? t.photoCompare.timerOff : `${s} s`}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => {
            setError(false);
            setFacing((f) => (f === "user" ? "environment" : "user"));
          }} aria-label={t.photoCompare.switchCam} className="grid size-10 place-items-center rounded-full bg-white/10">
          <RefreshCw className="size-5" />
        </button>
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden">
        {shot ? (
          <img src={shot.url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <video ref={videoRef} playsInline muted className={cx("absolute inset-0 size-full object-cover", mirror)} />
            {showGhost && ghostUrl && <img src={ghostUrl} alt="" className="pointer-events-none absolute inset-0 size-full object-cover opacity-35" />}
            {countdown !== null && <div className="absolute inset-0 grid place-items-center text-8xl font-semibold drop-shadow-lg">{countdown}</div>}
            {error && <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm">{t.photoCompare.cameraError}</div>}
          </>
        )}
      </div>

      <div className="flex-1 space-y-3 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        {shot ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => setShot(null)} disabled={saving}>
              {t.photoCompare.retake}
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const bmp = await createImageBitmap(shot.blob);
                const { width, height } = bmp;
                bmp.close();
                await onCapture(shot.blob, width, height);
                setSaving(false);
              }}
            >
              {saving ? t.photos.uploading : t.photoCompare.save}
            </Button>
          </div>
        ) : (
          <>
            {ghostUrl ? (
              <label className="flex items-center justify-center gap-2 text-sm text-white/80">
                <input type="checkbox" checked={showGhost} onChange={(e) => setShowGhost(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                {t.photoCompare.ghost}
              </label>
            ) : (
              <p className="text-center text-xs text-white/60">{t.photoCompare.noGhost}</p>
            )}
            <div className="flex justify-center">
              <button
                type="button"
                disabled={error || countdown !== null}
                onClick={() => (timer ? setCountdown(timer) : grab())}
                aria-label={t.photoCompare.capture}
                className="grid size-18 place-items-center rounded-full border-4 border-white/80 bg-white/15 disabled:opacity-40"
              >
                <Camera className="size-7" />
              </button>
            </div>
            {ghostUrl && <p className="text-center text-[11px] leading-snug text-white/55">{t.photoCompare.ghostHint}</p>}
          </>
        )}
      </div>
    </div>
  );
}
