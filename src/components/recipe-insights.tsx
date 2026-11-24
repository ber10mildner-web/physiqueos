import { Lightbulb, Sparkles } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { REFERENCES } from "@/lib/nutrition/gaps";
import type { NutrientKey, NutrientMap } from "@/lib/nutrition/nutrients";
import type { RecipeInsights, RecipeTag } from "@/lib/recipes/insights";
import { Card, SectionTitle, cx } from "@/components/ui";

/** Small pills for a recipe row. */
export function TagPills({ tags, t, max = 3, highlight = [] }: { tags: RecipeTag[]; t: Dictionary; max?: number; highlight?: string[] }) {
  // Selected filters first; calorie and diet tags last: they say less about what is in the dish.
  const order = (x: RecipeTag) => (highlight.includes(x) ? 0 : x === "light" || x === "vegetarian" || x === "vegan" ? 2 : 1);
  const shown = [...tags].sort((a, b) => order(a) - order(b)).slice(0, max);
  if (!shown.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {shown.map((tag) => (
        <span key={tag} className={cx("rounded-full border px-2 py-px text-[11px]", highlight.includes(tag) ? "border-accent/50 bg-accent/10 text-text" : "border-line text-muted")}>
          {t.recipeIdeas.tags[tag]}
        </span>
      ))}
      {tags.length > shown.length && <span className="px-1 text-[11px] text-faint">+{tags.length - shown.length}</span>}
    </div>
  );
}

const refOf = (key: NutrientKey) => {
  const r = REFERENCES[key];
  return r ? (r.male + r.female) / 2 : null;
};

/**
 * "Warum gut?" + "Gut zu wissen" for one recipe. `perServing` (nutrients of one
 * serving) adds the share of the daily reference to the "rich in" list.
 */
export function RecipeInsightsCard({ insights, t, perServing, gapKeys = [] }: { insights: RecipeInsights; t: Dictionary; perServing?: NutrientMap | null; gapKeys?: NutrientKey[] }) {
  const r = t.recipeIdeas;
  const tags = insights.tags.filter((x) => x !== "vegetarian" && x !== "vegan");
  const gapHits = insights.richIn.filter((x) => gapKeys.includes(x.key)).map((x) => t.nutrients[x.key]);
  if (!tags.length && !insights.richIn.length && !insights.notes.length) return null;
  const skinList = insights.skinFrom.map((k) => (k === "omega3" ? r.tags.omega3 : t.nutrients[k])).join(", ");
  return (
    <Card>
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-accent" /> {r.why}
        </span>
      </SectionTitle>
      {gapHits.length > 0 && <p className="mb-3 rounded-2xl bg-accent/10 px-3 py-2 text-sm">{fmt(r.gapsWhy, { list: gapHits.join(", ") })}</p>}
      {tags.length > 0 && (
        <ul className="space-y-2.5">
          {tags.map((tag) => (
            <li key={tag}>
              <div className="text-sm font-medium">{r.tags[tag]}</div>
              <p className="text-[13px] leading-snug text-muted">
                {r.tagWhy[tag]}
                {tag === "skin" && skinList ? ` ${fmt(r.skinFrom, { list: skinList })}.` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {insights.richIn.length > 0 && (
        <div className={cx(tags.length > 0 && "mt-4")}>
          <div className="text-sm font-medium">{r.richIn}</div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {insights.richIn.map(({ key }) => {
              const ref = refOf(key);
              const v = perServing?.[key];
              const share = ref && v !== undefined ? Math.round((v / ref) * 100) : null;
              return (
                <li key={key} className={cx("num rounded-full border px-2.5 py-0.5 text-[13px]", gapKeys.includes(key) ? "border-accent/50 bg-accent/10" : "border-line")}>
                  {t.nutrients[key]}
                  {share !== null && <span className="text-muted"> ({share} %)</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-[11px] leading-snug text-faint">{r.richInHint}</p>
        </div>
      )}
      {insights.notes.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-medium">
            <Lightbulb className="size-3.5 text-carbs" /> {r.learn}
          </div>
          <ul className="space-y-1.5">
            {insights.notes.map((n) => (
              <li key={n.key} className="text-[13px] leading-snug text-muted">
                {fmt(r.notes[n.key], n.vars ?? {})}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-snug text-faint">{r.roughNote}</p>
        </div>
      )}
    </Card>
  );
}
