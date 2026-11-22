import { foodIcon } from "@/lib/nutrition/food-icon";
import { cx } from "./ui";

/** A food's picture: an emoji on a soft tile, in Sigma's own style. */
export function FoodIcon({ name, kind, size = "md", className }: { name: string; kind?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-7 rounded-lg text-[15px]", md: "size-10 rounded-xl text-[20px]", lg: "size-14 rounded-2xl text-[28px]" };
  return (
    <span aria-hidden="true" className={cx("grid shrink-0 place-items-center bg-surface-2 leading-none ring-1 ring-line/60 ring-inset", sizes[size], className)}>
      {foodIcon(name, kind)}
    </span>
  );
}
