import { describe, expect, it } from "vitest";
import de from "./de";
import en from "./en";
import { fmt, negotiateLocale } from "./index";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe("i18n", () => {
  it("German and English have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(de).sort());
  });

  it("no translation is empty", () => {
    const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "object" ? values(v) : [v]));
    expect(values(de).every((s) => s.trim().length > 0)).toBe(true);
    expect(values(en).every((s) => s.trim().length > 0)).toBe(true);
  });

  it("placeholders match between languages", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const flat = (o: object, p = ""): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v as string]]));
    const enMap = new Map(flat(en));
    for (const [k, v] of flat(de)) expect(ph(enMap.get(k)!), k).toBe(ph(v));
  });

  it("fills placeholders", () => {
    expect(fmt("{a} von {b}", { a: 1, b: 3 })).toBe("1 von 3");
    expect(fmt("{missing}", {})).toBe("{missing}");
  });

  it("negotiates locale from Accept-Language", () => {
    expect(negotiateLocale("en-US,en;q=0.9,de;q=0.8")).toBe("en");
    expect(negotiateLocale("fr-FR,de;q=0.5")).toBe("de");
    expect(negotiateLocale(null)).toBe("de");
  });
});
