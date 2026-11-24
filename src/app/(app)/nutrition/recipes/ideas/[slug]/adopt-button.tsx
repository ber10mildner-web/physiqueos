"use client";
import { useState, useTransition } from "react";
import { BookPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, Notice } from "@/components/ui";
import { adoptRecipeIdeaAction } from "../../actions";

export function AdoptButton({ slug, label }: { slug: string; label: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(false);
            // Redirects to the new recipe on success.
            const res = await adoptRecipeIdeaAction(slug);
            if (res && !res.ok) setError(true);
          })
        }
      >
        <BookPlus className="size-4" /> {label}
      </Button>
      {error && (
        <div className="mt-2">
          <Notice tone="error">{t.common.error}</Notice>
        </div>
      )}
    </>
  );
}
