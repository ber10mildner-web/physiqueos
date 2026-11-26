"use client";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, Notice } from "@/components/ui";
import { createWidget } from "./actions";

export function WidgetForm() {
  const { t } = useI18n();
  const [script, setScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (script) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          className="w-full"
          onClick={async () => {
            await navigator.clipboard.writeText(script);
            setCopied(true);
          }}
        >
          <Copy className="size-4" /> {copied ? t.widget.copied : t.widget.copy}
        </Button>
        <Notice tone="warn">{t.widget.secret}</Notice>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
          {t.widget.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <details className="text-xs text-faint">
          <summary className="cursor-pointer">{t.widget.showScript}</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-surface-2 p-3 font-mono text-[10px] whitespace-pre-wrap break-all select-all">{script}</pre>
        </details>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{t.common.error}</Notice>}
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(false);
            const res = await createWidget();
            if (res.ok) setScript(res.script);
            else setError(true);
          })
        }
      >
        {t.widget.create}
      </Button>
    </div>
  );
}
