// WCAG 2.2 AA colour audit (design-system.md §5). Reads the raw tokens, computes contrast with the
// WCAG relative-luminance formula and exits with code 1 when a required pair fails.
//   text pairs  (1.4.3)  >= 4.5:1
//   non-text    (1.4.11) >= 3:1  (control boundaries, status/priority/type/sprint markers, focus ring)
// Run: npm run check:contrast
import { schemes } from "../src/design/tokens.ts";

const toRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let checked = 0;
const failures = [];
const check = (scheme, label, fg, bg, min) => {
  checked += 1;
  const value = ratio(fg, bg);
  if (value < min) failures.push(`${scheme}: ${label} ${fg} on ${bg} = ${value.toFixed(2)} (needs ${min})`);
};

for (const [name, t] of Object.entries(schemes)) {
  const surfaces = { default: t.background.default, paper: t.background.paper, raised: t.background.raised, sunken: t.background.sunken };
  for (const [sName, bg] of Object.entries(surfaces)) {
    for (const k of ["primary", "secondary", "muted"]) check(name, `text.${k} on ${sName}`, t.text[k], bg, 4.5);
    check(name, `primary as text on ${sName}`, t.primary.main, bg, 4.5);
    check(name, `ai.text on ${sName}`, t.ai.text, bg, 4.5);
    for (const k of ["success", "warning", "error", "info"]) check(name, `${k} as text on ${sName}`, t[k].main, bg, 4.5);
    check(name, `border.interactive on ${sName}`, t.border.interactive, bg, 3);
    for (const group of ["status", "priority", "todoType", "sprint"]) {
      for (const [k, v] of Object.entries(t[group])) check(name, `${group}.${k} marker on ${sName}`, v, bg, 3);
    }
    check(name, `focus ring (primary) on ${sName}`, t.primary.main, bg, 3);
  }
  check(name, "button label on primary", t.primary.contrastText, t.primary.main, 4.5);
  check(name, "button label on ai", t.ai.contrastText, t.ai.main, 4.5);
  check(name, "button label on ai.dark (hover)", t.ai.contrastText, t.ai.dark, 4.5);
  for (const k of ["success", "warning", "error", "info"]) check(name, `${k} label on ${k}`, t[k].contrastText, t[k].main, 4.5);
  for (const k of ["primary", "success", "warning", "error", "info"]) {
    const main = k === "primary" ? t.primary.main : t[k].main;
    check(name, `${k} text on tint.${k}`, main, t.tint[k], 4.5);
  }
  check(name, "ai.text on tint.ai", t.ai.text, t.tint.ai, 4.5);
  for (const [k, bg] of Object.entries(t.tint)) check(name, `text.primary on tint.${k}`, t.text.primary, bg, 4.5);
}

console.log(`${checked} pairs checked, ${failures.length} failing`);
for (const f of failures) console.log("  FAIL", f);
process.exit(failures.length ? 1 : 0);
