#!/usr/bin/env node
/**
 * Guards specification §3.1: `--color-ink-40` is prohibited for text.
 *
 * It measures 3.54:1 against the ground, which clears the 3:1 threshold SC
 * 1.4.11 sets for non-text UI and graphics, and fails the 4.5:1 AA needs for
 * body text. §3 gives it exactly two jobs: waveform rules and disabled states.
 *
 * A unit test has asserted that ratio since the token layer existed, and it did
 * not stop `text-ink-40` reaching 43 places across 12 files, because proving a
 * rule is not the same as enforcing it. axe caught it eventually — this catches
 * it in a second rather than in a three-minute browser run.
 *
 * Allowed:
 *   - text-ink-40 in WaveformRule, where it colours an SVG stroke
 *   - disabled:text-ink-40, since WCAG 1.4.3 exempts inactive controls and a
 *     disabled control that reads as enabled is the worse defect
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = "src";
const ALLOWED_FILES = new Set([
  join("src", "components", "primitives", "WaveformRule.tsx"),
]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const offences = [];

for (const path of walk(ROOT)) {
  if (!/\.(tsx?|css)$/.test(path)) continue;
  if (ALLOWED_FILES.has(path)) continue;

  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (!line.includes("text-ink-40")) return;
    // A disabled variant is permitted; a bare one is not.
    const bare = line.replace(/disabled:text-ink-40/g, "");
    if (!bare.includes("text-ink-40")) return;
    offences.push({
      file: relative(".", path).split(sep).join("/"),
      line: index + 1,
      text: line.trim().slice(0, 100),
    });
  });
}

if (offences.length === 0) {
  console.log("\n  OK  ink-40 is not used as a text colour.\n");
  process.exit(0);
}

console.error(
  `\n  FAIL  ink-40 used as text in ${offences.length} place(s). ` +
    "§3.1 prohibits it: 3.54:1 fails AA for text.\n",
);
for (const offence of offences) {
  console.error(`    ${offence.file}:${offence.line}\n      ${offence.text}`);
}
console.error("\n  Use text-ink-70 (8.86:1) for secondary text.\n");
process.exit(1);
