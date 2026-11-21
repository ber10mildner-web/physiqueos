"use client";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";
import { Button, EmptyState, Field, Input, Notice, cx } from "@/components/ui";
import { createConnection, revokeConnection } from "./actions";

export function ConnectForm() {
  const { t } = useI18n();
  const [name, setName] = useState("Claude");
  const [canWrite, setCanWrite] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (url) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold">{t.connect.urlTitle}</h3>
        <div className="rounded-2xl border border-line bg-surface-2 p-3 font-mono text-xs break-all select-all">{url}</div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
        >
          <Copy className="size-4" /> {copied ? t.connect.copiedOk : t.connect.copy}
        </Button>
        <Notice tone="warn">{t.connect.urlWarning}</Notice>
        <p className="text-sm text-muted">{t.connect.steps}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        start(async () => {
          const res = await createConnection(name, canWrite);
          if (res.ok) {
            setUrl(res.url);
          } else setError(true);
        });
      }}
    >
      <Field label={t.connect.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.connect.namePlaceholder} maxLength={60} />
      </Field>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {[true, false].map((w) => (
          <button key={String(w)} type="button" onClick={() => setCanWrite(w)} className={cx("h-10 rounded-xl text-sm font-medium", canWrite === w ? "bg-surface-3 text-text" : "text-muted")}>
            {w ? t.connect.readWrite : t.connect.readOnly}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{t.common.error}</Notice>}
      <Button type="submit" className="w-full" disabled={pending}>
        {t.connect.create}
      </Button>
    </form>
  );
}

export function TokenList({ tokens }: { tokens: { id: string; name: string; token_prefix: string; can_write: boolean; created_at: string; last_used_at: string | null }[] }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  if (!tokens.length) return <EmptyState>{t.connect.none}</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {tokens.map((tk) => (
        <li key={tk.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{tk.name}</div>
            <div className="text-xs text-muted">
              {tk.token_prefix}… · {tk.can_write ? t.connect.readWrite : t.connect.readOnly} ·{" "}
              {tk.last_used_at ? fmt(t.connect.lastUsed, { date: formatDate(tk.last_used_at.slice(0, 10), locale) }) : t.connect.neverUsed}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!confirm(t.common.confirmDelete)) return;
              start(async () => {
                await revokeConnection(tk.id);
              });
            }}
          >
            {t.connect.revoke}
          </Button>
        </li>
      ))}
    </ul>
  );
}
