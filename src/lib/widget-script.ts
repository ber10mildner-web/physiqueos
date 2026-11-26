/**
 * Script for the free iPhone app Scriptable (https://scriptable.app): shows
 * today's remaining calories and macros from /api/widget/<token> as a home or
 * lock screen widget. A web app (PWA) cannot draw widgets itself, on iOS or on
 * Android; Scriptable is the smallest step that really works without the app open.
 * iOS refreshes widgets on its own schedule (roughly every 15 to 30 minutes).
 */
export function widgetScript(url: string): string {
  return `// Sigma: verbleibende Kalorien und Makros heute
// Widget für die App "Scriptable". Diese Adresse ist wie ein Passwort.
const URL = ${JSON.stringify(url)};

let d;
try {
  d = await new Request(URL).loadJSON();
} catch (e) {
  d = null;
}
const fam = config.widgetFamily || "medium";
const w = new ListWidget();
w.url = ${JSON.stringify(new URL("/nutrition", url).toString())};
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
const fmt = (n) => (n === null || n === undefined ? "–" : String(Math.round(n)));
const kcal = d && d.energy;
const left = kcal ? kcal.left : null;

if (!d || !kcal) {
  const t = w.addText("Sigma: keine Daten");
  t.font = Font.systemFont(12);
} else if (fam === "accessoryInline") {
  w.addText(\`\${fmt(left)} kcal · P \${fmt(d.protein.left)} g\`);
} else if (fam === "accessoryCircular") {
  const t = w.addText(fmt(left));
  t.font = Font.boldSystemFont(14);
  t.centerAlignText();
  const s = w.addText("kcal");
  s.font = Font.systemFont(9);
  s.centerAlignText();
} else if (fam === "accessoryRectangular") {
  const t = w.addText(\`\${fmt(left)} kcal übrig\`);
  t.font = Font.boldSystemFont(15);
  const m = w.addText(\`P \${fmt(d.protein.left)} · K \${fmt(d.carbs.left)} · F \${fmt(d.fat.left)} g\`);
  m.font = Font.systemFont(12);
} else {
  w.backgroundColor = new Color("#0a0b0d");
  const head = w.addText("SIGMA · ÜBRIG HEUTE");
  head.font = Font.semiboldSystemFont(10);
  head.textColor = new Color("#8a8f98");
  w.addSpacer(4);
  const big = w.addText(\`\${fmt(left)} kcal\`);
  big.font = Font.boldSystemFont(fam === "small" ? 24 : 30);
  big.textColor = left !== null && left < 0 ? new Color("#f87171") : Color.white();
  const sub = w.addText(\`\${fmt(kcal.eaten)} von \${fmt(kcal.goal)} gegessen\`);
  sub.font = Font.systemFont(11);
  sub.textColor = new Color("#8a8f98");
  w.addSpacer(8);
  const row = w.addStack();
  const macro = (label, m, color) => {
    const s = row.addStack();
    s.layoutVertically();
    const v = s.addText(\`\${fmt(m.left)} g\`);
    v.font = Font.semiboldSystemFont(fam === "small" ? 13 : 15);
    v.textColor = Color.white();
    const l = s.addText(label);
    l.font = Font.systemFont(10);
    l.textColor = new Color(color);
    row.addSpacer(fam === "small" ? 8 : 14);
  };
  macro("Eiweiß", d.protein, "#60a5fa");
  macro("KH", d.carbs, "#fbbf24");
  macro("Fett", d.fat, "#f472b6");
  if (fam !== "small") macro("Ballastst.", d.fiber, "#34d399");
}

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
`;
}
