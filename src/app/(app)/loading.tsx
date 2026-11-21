import { Page } from "@/components/ui";

/** Shown instantly while a tab loads its data, so a tap never feels ignored. */
export default function Loading() {
  return (
    <Page>
      <div aria-busy="true" aria-live="polite" className="animate-pulse">
        <div className="mb-5 pt-2">
          <div className="h-4 w-28 rounded-full bg-surface-2" />
          <div className="mt-2 h-8 w-44 rounded-xl bg-surface-2" />
        </div>
        <div className="space-y-4">
          <div className="h-44 rounded-3xl border border-line bg-surface" />
          <div className="h-24 rounded-3xl border border-line bg-surface" />
          <div className="h-32 rounded-3xl border border-line bg-surface" />
        </div>
      </div>
    </Page>
  );
}
