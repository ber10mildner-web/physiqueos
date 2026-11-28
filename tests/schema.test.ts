/**
 * Runs the real SQL migration against an in-process Postgres (PGlite) with a
 * minimal stand-in for Supabase's `auth` schema, then checks Row Level Security:
 * a user must never see or modify another user's rows.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

async function as<T>(user: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  const sql = readFileSync(path.join(import.meta.dirname, "../supabase/migrations/20261119000000_init.sql"), "utf8");
  await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  for (const f of ["20261120000000_grants.sql", "20261120000100_recipes_training_api.sql", "20261120000200_garmin.sql", "20261120000300_service_role_grants.sql", "20261120000400_sigma.sql", "20261121000000_routines.sql", "20261122000000_today_week.sql", "20261122000100_meal_slots.sql", "20261123000000_entry_order.sql", "20261123000100_ai_usage.sql", "20261123000200_waitlist.sql", "20261123000300_body_goal.sql", "20261124000000_body_goal_type.sql", "20261124000100_label_off_cache.sql", "20261125000000_fixed_meals_water.sql", "20261126000000_medication_schedule.sql", "20261128000000_day_notes.sql"]) {
    await db.exec(readFileSync(path.join(import.meta.dirname, "../supabase/migrations", f), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, raw_user_meta_data) values ('${A}', '{"locale":"en"}'), ('${B}', '{}');
  `);
}, 60_000);

describe("schema", () => {
  it("waitlist: anyone can join via the function, nobody can read or change the list", async () => {
    await db.exec("set role anon;");
    try {
      await db.exec(`select public.join_waitlist('  Max@Example.de ', 'TikTok')`);
      await db.exec(`select public.join_waitlist('max@example.de', 'instagram')`);
      await db.exec(`select public.join_waitlist('eva@example.de', 'x; drop table')`);
      await expect(db.exec(`select public.join_waitlist('kein-at-zeichen', null)`)).rejects.toThrow(/check constraint/);
      await expect(db.exec(`select * from public.waitlist`)).rejects.toThrow(/permission denied/);
      await expect(db.exec(`insert into public.waitlist (email) values ('a@b.de')`)).rejects.toThrow(/permission denied/);
      await expect(db.exec(`delete from public.waitlist`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role;");
    }
    await expect(as(A, () => db.exec(`select * from public.waitlist`))).rejects.toThrow(/permission denied/);
    const r = await db.query<{ email: string; source: string | null }>(`select email, source from public.waitlist order by email`);
    expect(r.rows).toEqual([
      { email: "eva@example.de", source: null },
      { email: "max@example.de", source: "tiktok" },
    ]);
  });

  it("off_cache: app users can neither read nor write the shared Open Food Facts cache", async () => {
    await db.exec(`insert into public.off_cache (key, kind, name, data) values ('p:de:4000000000000', 'product', 'Test', '{}')`);
    await expect(as(A, () => db.exec(`select * from public.off_cache`))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => db.exec(`insert into public.off_cache (key, kind, data) values ('x', 'search', '[]')`))).rejects.toThrow(/permission denied/);
    await db.exec("set role anon;");
    try {
      await expect(db.exec(`select * from public.off_cache`)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role;");
    }
    await expect(db.exec(`insert into public.off_cache (key, kind, data) values ('y', 'other', '{}')`)).rejects.toThrow(/check constraint/);
  });

  it("ai_usage: food_label is an allowed feature", async () => {
    await as(A, () => db.exec(`insert into public.ai_usage (user_id, feature, model, cost_eur) values ('${A}', 'food_label', 'claude-opus-5-5', 0.01)`));
    await expect(as(A, () => db.exec(`insert into public.ai_usage (user_id, feature, model) values ('${A}', 'other', 'x')`))).rejects.toThrow(/check constraint/);
    await db.exec(`delete from public.ai_usage where feature = 'food_label'`);
  });

  it("ai_usage: own rows can be read and added, never changed or deleted", async () => {
    await as(A, () => db.exec(`insert into public.ai_usage (user_id, feature, model, input_tokens, output_tokens, cost_eur) values ('${A}', 'meal_photo', 'claude-opus-5-5', 2500, 600, 0.021)`));
    await expect(as(A, () => db.exec(`insert into public.ai_usage (user_id, feature, model) values ('${B}', 'meal_photo', 'x')`))).rejects.toThrow(/row-level security/);
    await expect(as(A, () => db.exec(`insert into public.ai_usage (user_id, feature, model) values ('${A}', 'chat', 'x')`))).rejects.toThrow(/check constraint/);
    await expect(as(A, () => db.exec(`update public.ai_usage set cost_eur = 0 where user_id = '${A}'`))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => db.exec(`delete from public.ai_usage where user_id = '${A}'`))).rejects.toThrow(/permission denied/);
    const mine = await as(A, () => db.query<{ n: number }>(`select count(*)::int as n from public.ai_usage`));
    const theirs = await as(B, () => db.query<{ n: number }>(`select count(*)::int as n from public.ai_usage`));
    expect(mine.rows[0].n).toBe(1);
    expect(theirs.rows[0].n).toBe(0);
  });

  it("knows pre/post-workout meals, per-user meal setup and plan weekdays", async () => {
    await as(A, () => db.exec(`insert into public.diary_entries (user_id, entry_date, meal, food_name, source, nutrients_per_100g, amount_g) values ('${A}', '2026-11-22', 'post_workout', 'Skyr', 'custom', '{}', 250)`));
    await as(A, () => db.exec(`update public.profiles set meal_slots = '[{"key":"breakfast","name":null},{"key":"snack","name":"Supplemente"}]' where id = '${A}'`));
    await as(A, () => db.exec(`update public.diary_entries set sort_order = 2 where user_id = '${A}'`));
    await expect(as(A, () => db.exec(`update public.diary_entries set sort_order = -1 where user_id = '${A}'`))).rejects.toThrow(/check constraint/);
    await expect(as(A, () => db.exec(`update public.profiles set meal_slots = '{"key":"snack"}' where id = '${A}'`))).rejects.toThrow(/check constraint/);
    await expect(as(A, () => db.exec(`insert into public.workout_plans (user_id, name, schedule_days) values ('${A}', 'Push', '{8}')`))).rejects.toThrow(/check constraint/);
    const r = await as(A, () => db.query<{ meal_slots: unknown }>(`select meal_slots from public.profiles where id = '${A}'`));
    expect(r.rows[0].meal_slots).toEqual([{ key: "breakfast", name: null }, { key: "snack", name: "Supplemente" }]);
    await as(A, () => db.exec(`delete from public.diary_entries where user_id = '${A}'`));
  });

  it("creates a profile for every new user, honouring the signup locale", async () => {
    const r = await db.query<{ id: string; locale: string }>("select id, locale from public.profiles order by id");
    expect(r.rows).toEqual([
      { id: A, locale: "en" },
      { id: B, locale: "de" },
    ]);
  });

  it("isolates rows between users (RLS)", async () => {
    await as(A, () => db.exec(`insert into public.weight_entries (user_id, entry_date, weight_kg) values ('${A}', '2026-11-19', 80.4)`));
    const seenByA = await as(A, () => db.query("select * from public.weight_entries"));
    const seenByB = await as(B, () => db.query("select * from public.weight_entries"));
    expect(seenByA.rows).toHaveLength(1);
    expect(seenByB.rows).toHaveLength(0);

    const del = await as(B, () => db.query("delete from public.weight_entries returning id"));
    expect(del.rows).toHaveLength(0);
    const profiles = await as(B, () => db.query("select id from public.profiles"));
    expect(profiles.rows).toEqual([{ id: B }]);
  });

  it("prevents writing rows on behalf of another user", async () => {
    await expect(
      as(B, () => db.exec(`insert into public.weight_entries (user_id, entry_date, weight_kg) values ('${A}', '2026-11-18', 70)`)),
    ).rejects.toThrow(/row-level security/);
  });

  it("prevents linking a diary entry to another user's food", async () => {
    const food = await as(A, () =>
      db.query<{ id: string }>(
        `insert into public.foods (user_id, source, source_id, name, nutrients) values ('${A}', 'openfoodfacts', '4000000000000', 'Test', '{"energy_kcal":100}') returning id`,
      ),
    );
    const foodId = food.rows[0].id;
    await expect(
      as(B, () =>
        db.exec(
          `insert into public.diary_entries (user_id, entry_date, meal, food_id, food_name, source, nutrients_per_100g, amount_g) values ('${B}', '2026-11-19', 'lunch', '${foodId}', 'x', 'custom', '{}', 100)`,
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("enforces one weight per day and plausible values", async () => {
    await expect(
      as(A, () => db.exec(`insert into public.weight_entries (user_id, entry_date, weight_kg) values ('${A}', '2026-11-19', 81)`)),
    ).rejects.toThrow(/duplicate key/);
    await expect(
      as(A, () => db.exec(`insert into public.weight_entries (user_id, entry_date, weight_kg) values ('${A}', '2026-11-10', 5)`)),
    ).rejects.toThrow(/check constraint/);
  });

  it("keeps one library entry per external product but allows many custom foods", async () => {
    await expect(
      as(A, () => db.exec(`insert into public.foods (user_id, source, source_id, name) values ('${A}', 'openfoodfacts', '4000000000000', 'Dup')`)),
    ).rejects.toThrow(/duplicate key/);
    await as(A, () =>
      db.exec(`insert into public.foods (user_id, source, name) values ('${A}', 'custom', 'Mine 1'), ('${A}', 'custom', 'Mine 2')`),
    );
    // External foods must keep their identifier.
    await expect(as(A, () => db.exec(`insert into public.foods (user_id, source, name) values ('${A}', 'usda', 'No id')`))).rejects.toThrow(
      /foods_external_has_id/,
    );
  });

  it("requires progress photo paths inside the owner's folder", async () => {
    await expect(
      as(A, () => db.exec(`insert into public.progress_photos (user_id, taken_on, storage_path) values ('${A}', '2026-11-19', '${B}/x.jpg')`)),
    ).rejects.toThrow(/progress_photos_path_owner/);
    await as(A, () => db.exec(`insert into public.progress_photos (user_id, taken_on, storage_path) values ('${A}', '2026-11-19', '${A}/x.jpg')`));
  });

  it("keeps one goal per start date", async () => {
    const insert = `insert into public.nutrition_goals (user_id, valid_from, phase, energy_kcal, protein_g, carbs_g, fat_g, fiber_g) values ('${A}', '2026-11-19', 'cut', 2200, 170, 220, 60, 30)`;
    await as(A, () => db.exec(insert));
    await expect(as(A, () => db.exec(insert))).rejects.toThrow(/duplicate key/);
  });

  it("shares built-in exercises but keeps custom exercises private", async () => {
    await as(A, () => db.exec(`insert into public.exercises (user_id, name_de, name_en, muscle_group) values ('${A}', 'Meine Übung', 'My exercise', 'chest')`));
    const a = await as(A, () => db.query("select count(*)::int as n from public.exercises"));
    const b = await as(B, () => db.query("select count(*)::int as n from public.exercises"));
    expect((a.rows[0] as { n: number }).n).toBe((b.rows[0] as { n: number }).n + 1);
    expect((b.rows[0] as { n: number }).n).toBeGreaterThan(40);
    await expect(as(B, () => db.exec(`update public.exercises set name_de = 'x' where user_id is null`))).resolves.toBeDefined();
    const changed = await db.query("select count(*)::int as n from public.exercises where name_de = 'x'");
    expect((changed.rows[0] as { n: number }).n).toBe(0);
  });

  it("prevents adding ingredients to another user's recipe", async () => {
    const r = await as(A, () => db.query<{ id: string }>(`insert into public.recipes (user_id, name) values ('${A}', 'Chili') returning id`));
    const recipeId = r.rows[0].id;
    await as(A, () =>
      db.exec(`insert into public.recipe_ingredients (recipe_id, user_id, name, source, amount_g, nutrients_per_100g) values ('${recipeId}', '${A}', 'Bohnen', 'custom', 400, '{}')`),
    );
    await expect(
      as(B, () =>
        db.exec(`insert into public.recipe_ingredients (recipe_id, user_id, name, source, amount_g, nutrients_per_100g) values ('${recipeId}', '${B}', 'x', 'custom', 1, '{}')`),
      ),
    ).rejects.toThrow(/row-level security/);
    const seen = await as(B, () => db.query("select * from public.recipe_ingredients"));
    expect(seen.rows).toHaveLength(0);
  });

  it("prevents logging sets into another user's workout", async () => {
    const w = await as(A, () => db.query<{ id: string }>(`insert into public.workouts (user_id, name, workout_date) values ('${A}', 'Push', '2026-11-20') returning id`));
    const ex = await db.query<{ id: string }>("select id from public.exercises where user_id is null limit 1");
    await expect(
      as(B, () =>
        db.exec(`insert into public.workout_sets (workout_id, user_id, exercise_id, reps, weight_kg) values ('${w.rows[0].id}', '${B}', '${ex.rows[0].id}', 8, 100)`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("never lets the browser read the encrypted Garmin tokens", async () => {
    await db.exec(`insert into public.garmin_connections (user_id, enc_tokens, display_name) values ('${A}', 'v1.secret', 'leo')`);
    const status = await as(A, () => db.query("select display_name, status from public.garmin_connections"));
    expect(status.rows).toEqual([{ display_name: "leo", status: "ok" }]);
    await expect(as(A, () => db.query("select enc_tokens from public.garmin_connections"))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => db.exec(`update public.garmin_connections set display_name = 'x'`))).rejects.toThrow(/permission denied/);
    const seenByB = await as(B, () => db.query("select display_name from public.garmin_connections"));
    expect(seenByB.rows).toHaveLength(0);
  });
  it("keeps skin and medication logs private and rejects foreign medications", async () => {
    await as(A, () => db.exec(`insert into public.skin_logs (user_id, entry_date, score, areas) values ('${A}', '2026-11-20', 2, '{chin,forehead}')`));
    await expect(as(A, () => db.exec(`insert into public.skin_logs (user_id, entry_date, score, areas) values ('${A}', '2026-11-21', 1, '{elbow}')`))).rejects.toThrow(/check constraint/);
    const m = await as(A, () => db.query<{ id: string }>(`insert into public.medications (user_id, name, dose) values ('${A}', 'Zink', '25 mg') returning id`));
    await as(A, () => db.exec(`insert into public.medication_logs (user_id, medication_id, name, entry_date) values ('${A}', '${m.rows[0].id}', 'Zink', '2026-11-20')`));
    await expect(
      as(B, () => db.exec(`insert into public.medication_logs (user_id, medication_id, name, entry_date) values ('${B}', '${m.rows[0].id}', 'Zink', '2026-11-20')`)),
    ).rejects.toThrow(/row-level security/);
    for (const table of ["skin_logs", "medications", "medication_logs"]) {
      const seen = await as(B, () => db.query(`select * from public.${table}`));
      expect(seen.rows, table).toHaveLength(0);
    }
  });

  it("keeps day notes private and only accepts known tags", async () => {
    await as(A, () => db.exec(`insert into public.day_notes (user_id, entry_date, note, tags) values ('${A}', '2026-11-27', 'Krampf im Arm', '{pain}')`));
    await expect(as(A, () => db.exec(`insert into public.day_notes (user_id, entry_date, tags) values ('${A}', '2026-11-28', '{hungover}')`))).rejects.toThrow(/check constraint/);
    await expect(as(A, () => db.exec(`insert into public.day_notes (user_id, entry_date, note) values ('${A}', '2026-11-27', 'zweite')`))).rejects.toThrow(/duplicate key/);
    await expect(as(B, () => db.exec(`insert into public.day_notes (user_id, entry_date, note) values ('${A}', '2026-11-29', 'x')`))).rejects.toThrow(/row-level security/);
    const seen = await as(B, () => db.query("select * from public.day_notes"));
    expect(seen.rows).toHaveLength(0);
  });

  it("keeps waist measurements private and checks body goal values", async () => {
    await as(A, () => db.exec(`insert into public.body_measurements (user_id, entry_date, waist_cm) values ('${A}', '2026-11-24', 84.5)`));
    await expect(as(A, () => db.exec(`insert into public.body_measurements (user_id, entry_date, waist_cm) values ('${A}', '2026-11-25', 12)`))).rejects.toThrow(/check constraint/);
    await expect(as(B, () => db.exec(`insert into public.body_measurements (user_id, entry_date, waist_cm) values ('${A}', '2026-11-26', 80)`))).rejects.toThrow(/row-level security/);
    const seen = await as(B, () => db.query("select * from public.body_measurements"));
    expect(seen.rows).toHaveLength(0);
    await as(A, () => db.exec(`update public.profiles set goal_type = 'fat_loss', training_level = 'intermediate', goal_note = 'Fett weg, Kraft halten' where id = '${A}'`));
    await expect(as(A, () => db.exec(`update public.profiles set goal_type = 'shred' where id = '${A}'`))).rejects.toThrow(/check constraint/);
  });

  it("stores training ratings and only accepts display photos in the owner's cardio folder", async () => {
    const c = await as(A, () =>
      db.query<{ id: string }>(`insert into public.cardio_sessions (user_id, session_date, activity, duration_min, feeling, effort) values ('${A}', '2026-11-20', 'stairs', 60, 8, 9) returning id`),
    );
    await expect(as(A, () => db.exec(`update public.cardio_sessions set feeling = 11 where id = '${c.rows[0].id}'`))).rejects.toThrow(/check constraint/);
    await expect(as(A, () => db.exec(`update public.cardio_sessions set machine_photo_path = '../x.jpg' where id = '${c.rows[0].id}'`))).rejects.toThrow(/check constraint/);
    await as(A, () => db.exec(`update public.cardio_sessions set machine_photo_path = '${A}/cardio/${B}.jpg', machine_level = 8, machine_floors = 120 where id = '${c.rows[0].id}'`));
  });

  it("keeps routines private and only links a user's own templates, supplement logs and workouts", async () => {
    const t = await as(A, () =>
      db.query<{ id: string }>(
        `insert into public.cardio_templates (user_id, name, activity, duration_min, incline_pct, speed_kmh, effort, auto_days) values ('${A}', 'Incline Walk', 'walk', 30, 6, 5, 6, '{6,7,1}') returning id`,
      ),
    );
    await expect(as(A, () => db.exec(`insert into public.cardio_templates (user_id, name, activity, duration_min, auto_days) values ('${A}', 'x', 'walk', 30, '{8}')`))).rejects.toThrow(/check constraint/);
    await as(A, () => db.exec(`insert into public.cardio_sessions (user_id, session_date, activity, duration_min, template_id, incline_pct, speed_kmh) values ('${A}', '2026-11-21', 'walk', 30, '${t.rows[0].id}', 6, 5)`));
    await expect(
      as(B, () => db.exec(`insert into public.cardio_sessions (user_id, session_date, activity, duration_min, template_id) values ('${B}', '2026-11-21', 'walk', 30, '${t.rows[0].id}')`)),
    ).rejects.toThrow(/row-level security/);

    // supplement intake with a linked diary entry; removing the intake removes the entry
    const m = await as(A, () => db.query<{ id: string }>(`insert into public.medications (user_id, name, kind, nutrients, dose_g, auto_days) values ('${A}', 'Omega 3', 'supplement', '{"energy_kcal": 9, "fat_g": 1}', 1, '{1,2,3,4,5,6,7}') returning id`));
    const log = await as(A, () => db.query<{ id: string }>(`insert into public.medication_logs (user_id, medication_id, name, entry_date) values ('${A}', '${m.rows[0].id}', 'Omega 3', '2026-11-21') returning id`));
    await as(A, () =>
      db.exec(
        `insert into public.diary_entries (user_id, entry_date, meal, food_name, source, nutrients_per_100g, amount_g, medication_log_id) values ('${A}', '2026-11-21', 'snack', 'Omega 3', 'custom', '{"energy_kcal": 900, "fat_g": 100}', 1, '${log.rows[0].id}')`,
      ),
    );
    await expect(
      as(B, () =>
        db.exec(
          `insert into public.diary_entries (user_id, entry_date, meal, food_name, source, nutrients_per_100g, amount_g, medication_log_id) values ('${B}', '2026-11-21', 'snack', 'x', 'custom', '{}', 1, '${log.rows[0].id}')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await as(A, () => db.exec(`delete from public.medication_logs where id = '${log.rows[0].id}'`));
    const left = await as(A, () => db.query(`select * from public.diary_entries where medication_log_id is not null`));
    expect(left.rows).toHaveLength(0);

    // a routine run is recorded once per day
    await as(A, () => db.exec(`insert into public.routine_runs (user_id, kind, ref_id, run_date) values ('${A}', 'cardio', '${t.rows[0].id}', '2026-11-21') on conflict do nothing`));
    const again = await as(A, () =>
      db.query(`insert into public.routine_runs (user_id, kind, ref_id, run_date) values ('${A}', 'cardio', '${t.rows[0].id}', '2026-11-21') on conflict do nothing returning ref_id`),
    );
    expect(again.rows).toHaveLength(0);

    // exercise feelings only on the user's own workouts
    const w = await as(A, () => db.query<{ id: string }>(`insert into public.workouts (user_id, name, workout_date) values ('${A}', 'Push', '2026-11-21') returning id`));
    const ex = await db.query<{ id: string }>(`select id from public.exercises where user_id is null limit 1`);
    await as(A, () => db.exec(`insert into public.workout_exercise_notes (workout_id, exercise_id, user_id, feeling, note) values ('${w.rows[0].id}', '${ex.rows[0].id}', '${A}', 8, 'gut')`));
    await expect(
      as(B, () => db.exec(`insert into public.workout_exercise_notes (workout_id, exercise_id, user_id, feeling) values ('${w.rows[0].id}', '${ex.rows[0].id}', '${B}', 3)`)),
    ).rejects.toThrow(/row-level security/);

    for (const table of ["cardio_templates", "routine_runs", "workout_exercise_notes"]) {
      const seen = await as(B, () => db.query(`select * from public.${table}`));
      expect(seen.rows, table).toHaveLength(0);
    }
  });

  it("fixed meals: own rows only, routine runs accept 'meal', water tracking off by default", async () => {
    const items = JSON.stringify([{ food_name: "Haferflocken", amount_g: 80, source: "usda", nutrients_per_100g: { energy_kcal: 372 } }]);
    const m = await as(A, () =>
      db.query<{ id: string }>(`insert into public.meal_templates (user_id, name, meal, items, auto_days) values ('${A}', 'Haferflocken', 'breakfast', '${items}', '{1,2,3}') returning id`),
    );
    await expect(as(A, () => db.exec(`insert into public.meal_templates (user_id, name, meal, items) values ('${A}', 'leer', 'dinner', '[]')`))).rejects.toThrow(/check constraint/);
    await expect(as(B, () => db.exec(`insert into public.meal_templates (user_id, name, meal, items) values ('${A}', 'x', 'dinner', '${items}')`))).rejects.toThrow(/row-level security/);
    expect((await as(B, () => db.query(`select * from public.meal_templates`))).rows).toHaveLength(0);
    await as(A, () => db.exec(`insert into public.routine_runs (user_id, kind, ref_id, run_date) values ('${A}', 'meal', '${m.rows[0].id}', '2026-11-25')`));
    await expect(as(A, () => db.exec(`insert into public.routine_runs (user_id, kind, ref_id, run_date) values ('${A}', 'other', '${m.rows[0].id}', '2026-11-25')`))).rejects.toThrow(/check constraint/);
    const p = await as(A, () => db.query<{ water_tracking: boolean }>(`select water_tracking from public.profiles where id = '${A}'`));
    expect(p.rows[0].water_tracking).toBe(false);
  });
});
