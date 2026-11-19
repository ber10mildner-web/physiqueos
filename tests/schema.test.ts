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
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  const sql = readFileSync(path.join(import.meta.dirname, "../supabase/migrations/20261119000000_init.sql"), "utf8");
  await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
  // Supabase grants table privileges to these roles by default; RLS then restricts rows.
  await db.exec(`
    grant usage on schema public to authenticated, anon;
    grant all on all tables in schema public to authenticated;
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
});
