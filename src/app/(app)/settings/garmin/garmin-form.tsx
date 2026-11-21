"use client";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { Button, Notice } from "@/components/ui";
import { connectGarmin, disconnectGarmin, syncGarminNow } from "./actions";

function errorText(t: ReturnType<typeof useI18n>["t"], error: string) {
  if (error === "format") return t.garmin.errorFormat;
  if (error === "server") return t.garmin.errorServer;
  return fmt(t.garmin.error, { error });
}

export function GarminConnectForm() {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await connectGarmin(value);
          if (res.ok) {
            setValue("");
            setMsg({ tone: "success", text: fmt(t.garmin.syncResult, { days: res.sync.days, activities: res.sync.activities }) + (res.sync.note ? ` Details: ${res.sync.note}` : "") });
          } else setMsg({ tone: "error", text: errorText(t, res.error) });
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-muted">{t.garmin.paste}</span>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          spellCheck={false}
          autoComplete="off"
          placeholder={t.garmin.pastePlaceholder}
          className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 font-mono text-xs text-text outline-none placeholder:text-faint focus:border-accent/60"
        />
      </label>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button type="submit" className="w-full" disabled={pending || !value.trim()}>
        {pending ? t.garmin.connecting : t.garmin.connect}
      </Button>
    </form>
  );
}

export function GarminStatus({ conn }: { conn: { display_name: string | null; status: string; last_error: string | null; last_sync_at: string | null } }) {
  const { t, locale } = useI18n();
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const last = conn.last_sync_at
    ? fmt(t.garmin.lastSync, { date: new Date(conn.last_sync_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) })
    : t.garmin.neverSynced;
  return (
    <div className="space-y-3">
      <div>
        <div className="font-medium">
          {conn.status === "ok" ? "✓ " : "⚠ "}
          {t.garmin.connected}
          {conn.display_name ? ` · ${conn.display_name}` : ""}
        </div>
        <div className="text-sm text-muted">{last}</div>
        <div className="text-xs text-faint">{t.garmin.daily}</div>
      </div>
      {conn.status === "error" && conn.last_error && <Notice tone="error">{fmt(t.garmin.error, { error: conn.last_error })}</Notice>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const res = await syncGarminNow();
              setMsg(
                res.ok
                  ? { tone: "success", text: fmt(t.garmin.syncResult, { days: res.sync.days, activities: res.sync.activities }) + (res.sync.note ? ` Details: ${res.sync.note}` : "") }
                  : { tone: "error", text: errorText(t, res.error) },
              );
            })
          }
        >
          {pending ? t.garmin.syncing : t.garmin.syncNow}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() =>
            confirm(t.common.confirmDelete) &&
            start(async () => {
              await disconnectGarmin();
            })
          }
        >
          {t.garmin.disconnect}
        </Button>
      </div>
    </div>
  );
}
