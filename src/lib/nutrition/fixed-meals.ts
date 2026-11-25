/** Short name for a fixed meal from its foods: "Haferflocken, Skyr +2". Pure (tested). */
export function fixedMealName(foods: string[], max = 120): string {
  const names = foods.map((f) => f.split(",")[0].trim()).filter(Boolean);
  if (!names.length) return "?";
  const shown = names.slice(0, 2).join(", ");
  const name = names.length > 2 ? `${shown} +${names.length - 2}` : shown;
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
