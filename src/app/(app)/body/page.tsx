import Link from "next/link";
import { ImageIcon, ChevronRight } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getWeights } from "@/lib/data";
import { getToday } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { movingAverage, trendChange } from "@/lib/body/weight";
import { Card, Page, PageHeader, SectionTitle, cx } from "@/components/ui";
import { WeightForm } from "./weight-form";
import { WeightChart } from "./weight-chart";
import { WeightHistory } from "./weight-history";
import { formatNumber } from "@/lib/format";

const RANGES = { "30": 30, "90": 90, "365": 365, all: null } as const;
type RangeKey = keyof typeof RANGES;

export default async function BodyPage({ searchParams }: PageProps<"/body">) {
  const { t, locale } = await getI18n();
  const today = await getToday();
  const sp = await searchParams;
  const range: RangeKey = typeof sp.range === "string" && sp.range in RANGES ? (sp.range as RangeKey) : "90";
  const days = RANGES[range];
  const from = days ? addDays(today, -days + 1) : undefined;
  // Fetch 6 extra days so the moving average at the start of the range is correct.
  const weights = await getWeights(from ? addDays(from, -6) : undefined);
  const trend = movingAverage(weights.map((w) => ({ date: w.entry_date, weight: w.weight_kg })));
  const visible = from ? trend.filter((p) => p.date >= from) : trend;
  const change = trendChange(trend);
  const latest = trend.at(-1);

  return (
    <Page>
      <PageHeader title={t.body.title} />
      <div className="space-y-4">
        <Card>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-[13px] text-muted">{t.body.chartTrend}</div>
              <div className="num text-4xl font-semibold tracking-tight">
                {latest ? formatNumber(latest.average, locale, 1) : "–"}
                <span className="ml-1 text-lg font-normal text-muted">kg</span>
              </div>
            </div>
            {change && (
              <div className={cx("num rounded-full px-3 py-1 text-sm", change.change <= 0 ? "bg-fiber/10 text-fiber" : "bg-carbs/10 text-carbs")}>
                {change.change > 0 ? "+" : ""}
                {formatNumber(change.change, locale, 2)} kg · {t.body.per7Days}
              </div>
            )}
          </div>
          <div className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
            {(Object.keys(RANGES) as RangeKey[]).map((r) => (
              <Link
                key={r}
                href={`/body?range=${r}`}
                replace
                scroll={false}
                className={cx("flex h-8 items-center justify-center rounded-xl text-[13px] font-medium", r === range ? "bg-surface-3 text-text" : "text-muted")}
              >
                {{ "30": t.body.range30, "90": t.body.range90, "365": t.body.range365, all: t.body.rangeAll }[r]}
              </Link>
            ))}
          </div>
          {visible.length > 0 ? <WeightChart data={visible} /> : <p className="py-10 text-center text-sm text-muted">{t.body.noEntries}</p>}
          <p className="mt-2 text-xs text-faint">{t.body.trendExplain}</p>
        </Card>

        <Card>
          <SectionTitle>{t.body.logWeight}</SectionTitle>
          <WeightForm today={today} defaultWeight={weights.at(-1)?.weight_kg ?? null} />
        </Card>

        <Link href="/body/photos" className="block">
          <Card className="flex items-center gap-3 transition hover:bg-surface-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-surface-3">
              <ImageIcon className="size-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{t.body.photos}</div>
              <div className="text-sm text-muted">{t.photos.private}</div>
            </div>
            <ChevronRight className="size-5 text-faint" />
          </Card>
        </Link>

        {weights.length > 0 && (
          <Card>
            <SectionTitle>{t.body.history}</SectionTitle>
            <WeightHistory entries={[...trend].reverse().slice(0, 60).map((p) => ({ ...p, id: weights.find((w) => w.entry_date === p.date)!.id }))} />
          </Card>
        )}
      </div>
    </Page>
  );
}
