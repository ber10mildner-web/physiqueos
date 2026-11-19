"use client";
import { useI18n } from "@/lib/i18n/client";
import { Button, Notice, Page } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <Page>
      <h1 className="mt-6 mb-4 text-2xl font-semibold">{t.setup.errorTitle}</h1>
      <Notice>
        {t.setup.errorText}
        {error.digest && <span className="mt-2 block font-mono text-xs text-faint">Code: {error.digest}</span>}
      </Notice>
      <Button className="mt-4 w-full" onClick={reset}>
        {t.common.retry}
      </Button>
    </Page>
  );
}
