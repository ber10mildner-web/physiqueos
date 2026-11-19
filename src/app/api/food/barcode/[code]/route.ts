import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFoodByBarcode } from "@/lib/data";
import { fetchOffProduct } from "@/lib/food-sources/openfoodfacts";
import { BARCODE_RE, SourceUnavailableError, type FoodCandidate } from "@/lib/food-sources/types";
import { getLocale } from "@/lib/i18n/server";

/**
 * Barcode lookup: the user's own library first (instant, includes their custom
 * products), then Open Food Facts.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/food/barcode/[code]">) {
  const { code } = await ctx.params;
  if (!BARCODE_RE.test(code)) return NextResponse.json({ error: "invalid_barcode" }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const own = await getFoodByBarcode(code);
  if (own) return NextResponse.json({ food: own satisfies FoodCandidate });

  try {
    const food = await fetchOffProduct(code, await getLocale());
    if (!food) return NextResponse.json({ food: null }, { status: 404 });
    return NextResponse.json({ food });
  } catch (e) {
    if (e instanceof SourceUnavailableError) return NextResponse.json({ error: "source_unavailable", source: e.source }, { status: 502 });
    throw e;
  }
}
