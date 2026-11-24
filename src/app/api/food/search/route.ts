import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchMyFoods } from "@/lib/data";
import { searchOffCached } from "@/lib/food-sources/off-cache-store";
import { searchUsda } from "@/lib/food-sources/usda";
import { searchBasic } from "@/lib/food-sources/basic";
import type { FoodCandidate, FoodSource } from "@/lib/food-sources/types";
import { getLocale } from "@/lib/i18n/server";

/**
 * Searches the user's library, the bundled basic foods (offline), Open Food Facts and USDA.
 * External sources run in parallel and fail independently.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ error: "query_too_short" }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const locale = await getLocale();
  const [mine, off, usda] = await Promise.allSettled([searchMyFoods(q), searchOffCached(q, locale), searchUsda(q)]);
  const unavailable: FoodSource[] = [];
  const val = (r: PromiseSettledResult<FoodCandidate[]>, s: FoodSource) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`food search failed for ${s}:`, r.reason);
    unavailable.push(s);
    return [];
  };
  const mineList = val(mine, "custom");
  // Basic foods already in the library show up under "mine" (with favourite star etc.).
  const owned = new Set(mineList.map((f) => `${f.source}:${f.source_id}`));
  const basic = searchBasic(q, locale).filter((f) => !owned.has(`${f.source}:${f.source_id}`));
  return NextResponse.json({
    mine: mineList,
    basic,
    openfoodfacts: val(off, "openfoodfacts"),
    usda: val(usda, "usda"),
    unavailable,
  });
}
