#!/usr/bin/env node
/**
 * Builds src/lib/food-sources/basic-foods.json from the curated list in foods.mjs
 * and the USDA SR28 "abbreviated" file (ABBREV.txt, public domain).
 *
 * Usage:
 *   node scripts/basic-foods/build.mjs [path/to/ABBREV.txt]
 *
 * Without a path, SR28 is downloaded from the npm package `fda-nutrient-database@1.0.2`
 * (an unmodified copy of USDA's SR28 ASCII files), verified against its integrity hash.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FOODS } from "./foods.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "../../src/lib/food-sources/basic-foods.json");
const TARBALL = "https://registry.npmjs.org/fda-nutrient-database/-/fda-nutrient-database-1.0.2.tgz";
const INTEGRITY = "sha512-pUebhBfCDukmJtXdw7IDtEp1idF7zYWymKFw4zVyPXKY/28gy+Ob05eCnJKIlI6mHweiDXBFO1EMrrbW2YZl5A==";

async function loadAbbrev() {
  if (process.argv[2]) return readFileSync(process.argv[2], "latin1");
  const res = await fetch(TARBALL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = "sha512-" + createHash("sha512").update(buf).digest("base64");
  if (got !== INTEGRITY) throw new Error("integrity check failed for SR28 tarball");
  const dir = mkdtempSync(join(tmpdir(), "sr28-"));
  writeFileSync(join(dir, "sr28.tgz"), buf);
  execFileSync("tar", ["-xzf", join(dir, "sr28.tgz"), "-C", dir, "package/data/ABBREV.txt"]);
  return readFileSync(join(dir, "package/data/ABBREV.txt"), "latin1");
}

// ABBREV.txt column index → Sigma nutrient key (units already match: g, mg, µg, kcal).
// Folate: dietary folate equivalents (DFE), as in the USDA API mapping (nutrient 435).
const COLUMNS = {
  energy_kcal: 3,
  protein_g: 4,
  fat_g: 5,
  carbs_g: 7,
  fiber_g: 8,
  sugar_g: 9,
  calcium_mg: 10,
  iron_mg: 11,
  magnesium_mg: 12,
  phosphorus_mg: 13,
  potassium_mg: 14,
  sodium_mg: 15,
  zinc_mg: 16,
  vitamin_c_mg: 20,
  vitamin_b1_mg: 21,
  vitamin_b2_mg: 22,
  vitamin_b3_mg: 23,
  vitamin_b6_mg: 25,
  folate_ug: 29,
  vitamin_b12_ug: 31,
  vitamin_a_ug: 33,
  vitamin_e_mg: 40,
  vitamin_d_ug: 41,
  vitamin_k_ug: 43,
  saturated_fat_g: 44,
};

function parse(text) {
  const rows = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const f = line.split("^").map((s) => s.replace(/^~|~$/g, ""));
    rows.set(f[0], f);
  }
  return rows;
}

const rows = parse(await loadAbbrev());
const seen = new Set();
const out = [];
for (const food of FOODS) {
  if (seen.has(food.ndb)) throw new Error(`duplicate NDB ${food.ndb} (${food.de})`);
  seen.add(food.ndb);
  const f = rows.get(food.ndb);
  if (!f) throw new Error(`NDB ${food.ndb} (${food.de}) not found in SR28`);
  const n = {};
  for (const [key, col] of Object.entries(COLUMNS)) {
    const raw = f[col];
    if (raw === undefined || raw === "") continue; // unknown, never 0
    const v = Number(raw);
    if (Number.isFinite(v) && v >= 0) n[key] = v;
  }
  for (const k of ["energy_kcal", "protein_g", "carbs_g", "fat_g"]) {
    if (n[k] === undefined) throw new Error(`NDB ${food.ndb} (${food.de}) lacks ${k}`);
  }
  out.push({ id: food.ndb, de: food.de, en: food.en, sr: f[1], alias: food.alias ?? [], portion: food.portion ?? null, n });
  if (process.env.VERBOSE) console.log(`${food.ndb}  ${food.de.padEnd(45)} ${f[1]}`);
}

writeFileSync(
  OUT,
  JSON.stringify({ source: "USDA SR28 (public domain); German names by Sigma", foods: out }, null, 0).replace(/\},\{"id"/g, '},\n{"id"') + "\n",
);
console.log(`wrote ${out.length} foods to ${OUT}`);
