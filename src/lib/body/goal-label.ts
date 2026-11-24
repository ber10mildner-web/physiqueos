import type { Dictionary } from "@/lib/i18n";
import type { BodyGoal } from "@/lib/data/body-goal";

/** "Lose fat, keep muscle · Intermediate", or null without a goal type. */
export function goalLabel(goal: Pick<BodyGoal, "goal_type" | "training_level">, t: Dictionary): string | null {
  if (!goal.goal_type) return null;
  const type = t.bodyGoal.types[goal.goal_type];
  return goal.training_level ? `${type} · ${t.bodyGoal.levels[goal.training_level]}` : type;
}
