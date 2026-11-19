import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchMyFoods } from "@/lib/data";
import { searchOff } from "@/lib/food-sources/openfoodfacts";
import { searchUsda } from "@/lib/food-sources/usda";
import type { FoodCandidate, FoodSource } from "@/lib/food-sources/types";
import { getLocale } from "@/lib/i18n/server";

/** Searches the user's library, Open Food Facts and USDA in parallel. Each source fails independently. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ error: "query_too_short" }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const locale = await getLocale();
  const [mine, off, usda] = await Promise.allSettled([searchMyFoods(q), searchOff(q, locale), searchUsda(q)]);
  const unavailable: FoodSource[] = [];
  const val = (r: PromiseSettledResult<FoodCandidate[]>, s: FoodSource) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`food search failed for ${s}:`, r.reason);
    unavailable.push(s);
    return [];
  };
  return NextResponse.json({
    mine: val(mine, "custom"),
    openfoodfacts: val(off, "openfoodfacts"),
    usda: val(usda, "usda"),
    unavailable,
  });
}
