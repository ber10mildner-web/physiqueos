-- Sigma: goal weight and wanted pace, for the weight forecast and the
-- adaptive calorie suggestion. Run once in the Supabase SQL Editor after the
-- earlier migrations. Safe to run again.

alter table public.profiles
  add column if not exists goal_weight_kg numeric(5, 1)
    check (goal_weight_kg is null or goal_weight_kg between 30 and 300),
  -- kg per week, always positive; the direction comes from goal vs. current weight
  add column if not exists goal_pace_kg_week numeric(3, 2)
    check (goal_pace_kg_week is null or (goal_pace_kg_week > 0 and goal_pace_kg_week <= 1.5));
