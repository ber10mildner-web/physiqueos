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
  for (const f of ["20261120000000_grants.sql", "20261120000100_recipes_training_api.sql", "20261120000200_garmin.sql"]) {
    await db.exec(readFileSync(path.join(import.meta.dirname, "../supabase/migrations", f), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, raw_user_meta_data) values ('${A}', '{"locale":"en"}'), ('${B}', '{}');
  `);
}, 60_000);

describe("schema", () => {
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
});
