"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { useI18n } from "@/lib/i18n/client";
import { Button, Notice } from "@/components/ui";

type Status = "idle" | "starting" | "running" | "denied" | "unsupported";

/**
 * Camera barcode scanner (EAN-13/EAN-8/UPC-A/UPC-E) using ZXing.
 * A code is only accepted after two identical consecutive reads to avoid misreads.
 * The camera only starts after the user taps the button.
 */
export function BarcodeScanner({ onDetected, paused }: { onDetected: (code: string) => void; paused: boolean }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; count: number }>({ code: "", count: 0 });
  const pausedRef = useRef(paused);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    pausedRef.current = paused;
    onDetectedRef.current = onDetected;
  }, [paused, onDetected]);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    lastRef.current = { code: "", count: 0 };
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        videoRef.current!,
        (result) => {
          if (!result || pausedRef.current) return;
          const code = result.getText();
          const last = lastRef.current;
          lastRef.current = last.code === code ? { code, count: last.count + 1 } : { code, count: 1 };
          if (lastRef.current.count === 2) {
            navigator.vibrate?.(40);
            onDetectedRef.current(code);
          }
        },
      );
      setStatus("running");
    } catch (e) {
      const name = (e as Error)?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unsupported");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />
        {status === "running" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-3/4 rounded-2xl border-2 border-accent/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Button type="button" onClick={start} disabled={status === "starting"}>
              <Camera className="size-5" />
              {status === "starting" ? t.common.loading : t.scanner.start}
            </Button>
          </div>
        )}
      </div>
      {status === "running" && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{t.scanner.hint}</p>
          <Button type="button" size="sm" variant="ghost" onClick={stop}>
            <CameraOff className="size-4" />
            {t.scanner.stop}
          </Button>
        </div>
      )}
      {status === "denied" && <Notice tone="warn">{t.scanner.permissionDenied}</Notice>}
      {status === "unsupported" && <Notice tone="warn">{t.scanner.unsupported}</Notice>}
    </div>
  );
}
