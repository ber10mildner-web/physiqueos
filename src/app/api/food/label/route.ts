import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTimeZone } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { readLabel } from "@/lib/ai/label-reader";
import { aiEnabled, canSpend, recordUsage } from "@/lib/ai/usage";
import { labelToFood } from "@/lib/nutrition/label";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3_000_000;

/** Photo of a nutrition label → prefilled food for the manual form (nothing is saved here). */
export async function POST(req: NextRequest) {
  if (!aiEnabled()) return NextResponse.json({ error: "disabled" }, { status: 400 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ctx = { supabase, userId };

  let photos: Buffer[];
  try {
    const form = await req.formData();
    const files = form.getAll("photo").slice(0, 2);
    if (files.length === 0) throw new Error("none");
    photos = await Promise.all(
      files.map(async (v) => {
        if (typeof v === "string" || v.size === 0 || v.size > MAX_IMAGE_BYTES || !/^image\/jpe?g$/.test(v.type)) throw new Error("image");
        return Buffer.from(await v.arrayBuffer());
      }),
    );
  } catch {
    return NextResponse.json({ error: "image" }, { status: 400 });
  }

  const timeZone = await getTimeZone();
  const budget = await canSpend(ctx, todayIn(timeZone), timeZone, "food_label");
  if (!budget.ok) return NextResponse.json({ error: budget.reason }, { status: 429 });

  let result: Awaited<ReturnType<typeof readLabel>>;
  try {
    result = await readLabel(photos);
  } catch (e) {
    console.error("label photo", e);
    return NextResponse.json({ error: "api" }, { status: 502 });
  }
  const cost = await recordUsage(ctx, "food_label", result.model, result.usage);
  const out = result.reading ? labelToFood(result.reading) : ({ ok: false, reason: "unreadable" } as const);
  if (!out.ok) return NextResponse.json({ error: out.reason, cost_eur: cost }, { status: 422 });
  return NextResponse.json({ food: out.food, scaledFromServing: out.scaledFromServing, cost_eur: cost });
}
