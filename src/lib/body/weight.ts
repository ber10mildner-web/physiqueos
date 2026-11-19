/** Weight trend helpers. Dates are ISO strings (YYYY-MM-DD) in the user's local calendar. */

export interface WeightPoint {
  date: string;
  weight: number;
}

export interface TrendPoint extends WeightPoint {
  /** Mean of all entries within the trailing window (inclusive), or null if none. */
  average: number;
  /** Number of entries in the window. */
  samples: number;
}

const DAY_MS = 86_400_000;
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/**
 * Trailing moving average over a calendar window (default 7 days).
 * Missing days are simply skipped – we never interpolate weights.
 */
export function movingAverage(points: WeightPoint[], windowDays = 7): TrendPoint[] {
  const sorted = [...points].sort((a, b) => dayNumber(a.date) - dayNumber(b.date));
  return sorted.map((p, i) => {
    const end = dayNumber(p.date);
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (end - dayNumber(sorted[j].date) >= windowDays) break;
      sum += sorted[j].weight;
      n++;
    }
    return { ...p, average: sum / n, samples: n };
  });
}

/**
 * Change of the moving average over the last `days` days (default 7), using the
 * trend point closest to (but not after) the reference date.
 * Returns null when there is not enough history.
 */
export function trendChange(trend: TrendPoint[], days = 7): { change: number; from: TrendPoint; to: TrendPoint } | null {
  if (trend.length < 2) return null;
  const to = trend[trend.length - 1];
  const target = dayNumber(to.date) - days;
  let from: TrendPoint | null = null;
  for (const p of trend) {
    if (dayNumber(p.date) <= target) from = p;
    else break;
  }
  if (!from) return null;
  return { change: to.average - from.average, from, to };
}
