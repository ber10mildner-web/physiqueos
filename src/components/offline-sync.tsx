"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { QUEUE_EVENT, flush, pending, setQueueUser } from "@/lib/offline/queue";

/**
 * Registers the service worker (offline pages), remembers the signed-in user for
 * the offline queue, sends waiting entries when the connection is back and
 * shows a small banner while offline.
 */
export function OfflineSync({ userId }: { userId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    setQueueUser(userId);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
    const update = () => {
      setOnline(navigator.onLine);
      setWaiting(pending().length);
    };
    const sync = async () => {
      update();
      if (navigator.onLine && pending().length > 0 && (await flush()) > 0) router.refresh();
      update();
    };
    void sync();
    const onVisible = () => document.visibilityState === "visible" && void sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", update);
    window.addEventListener(QUEUE_EVENT, update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", update);
      window.removeEventListener(QUEUE_EVENT, update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, router]);

  if (online && waiting === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div role="status" className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface-2/95 px-3.5 py-1.5 text-xs shadow-lg backdrop-blur">
        {online ? <RefreshCw className="size-3.5 animate-spin text-accent" /> : <CloudOff className="size-3.5 text-warn" />}
        <span>{online ? t.offline.syncing : t.offline.offline}</span>
        {waiting > 0 && <span className="text-muted">· {fmt(t.offline.waiting, { n: waiting })}</span>}
      </div>
    </div>
  );
}

/** Forget pages stored for offline use (called on the login page after signing out). */
export function ClearOfflinePages() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
    caches?.delete("sigma-pages").catch(() => {});
  }, []);
  return null;
}
