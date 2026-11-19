"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { BARCODE_RE, type FoodCandidate } from "@/lib/food-sources/types";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { BarcodeScanner } from "./barcode-scanner";

export function BarcodeTab({ onFound, onNotFound }: { onFound: (f: FoodCandidate) => void; onNotFound: (barcode: string) => void }) {
  const { t } = useI18n();
  const [manual, setManual] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "loading"; code: string } | { kind: "notfound"; code: string } | { kind: "error" }>({ kind: "idle" });

  async function lookup(code: string) {
    if (!BARCODE_RE.test(code) || state.kind === "loading") return;
    setState({ kind: "loading", code });
    try {
      const res = await fetch(`/api/food/barcode/${code}`);
      if (res.status === 404) return setState({ kind: "notfound", code });
      if (!res.ok) throw new Error(String(res.status));
      const { food } = (await res.json()) as { food: FoodCandidate };
      setState({ kind: "idle" });
      onFound(food);
    } catch {
      setState({ kind: "error" });
    }
  }

  return (
    <div className="space-y-4">
      <BarcodeScanner onDetected={lookup} paused={state.kind === "loading"} />
      {state.kind === "loading" && <Notice>{t.scanner.looking}</Notice>}
      {state.kind === "error" && <Notice tone="error">{t.common.error}</Notice>}
      {state.kind === "notfound" && (
        <Notice tone="warn">
          <p>{fmt(t.scanner.notFound, { code: state.code })}</p>
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => onNotFound(state.code)}>
            {t.scanner.createManual}
          </Button>
        </Notice>
      )}
      <Card>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(manual);
          }}
        >
          <Field label={t.scanner.manualLabel} className="flex-1">
            <Input value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="num" maxLength={14} />
          </Field>
          <Button type="submit" variant="secondary" disabled={!BARCODE_RE.test(manual)}>
            {t.scanner.lookup}
          </Button>
        </form>
      </Card>
    </div>
  );
}
