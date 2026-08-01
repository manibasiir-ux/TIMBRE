#!/usr/bin/env node
/**
 * Bundle budget gate, NFR-05.
 *
 * Two separate budgets, and the distinction is the whole point:
 *
 *   initial client JS   <= 210 KB gzipped, EXCLUDING the three.js chunk
 *   three.js + R3F      <= 340 KB gzipped, loaded after first paint
 *
 * The roadmap records why this exists. In week ten a Lighthouse run on a
 * throttled Moto G returned an LCP of 4.8s because the three.js chunk had
 * drifted into the critical path, and a bundle check was added the same
 * afternoon so it could never regress silently. This is that check: if a static
 * import of three ever creeps into a shared module, the three chunk stops being
 * lazy, lands in rootMainFiles, and the initial budget blows.
 *
 * Deliberately dependency-free. A budget gate that needs a package to run is a
 * gate that gets skipped.
 */

import { gzipSync } from "node:zlib";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const NEXT_DIR = ".next";
const BUDGETS = { initialKb: 210, webglKb: 340, fontKb: 96 };

/** Marks a chunk as carrying three.js rather than application code. */
const WEBGL_SIGNATURE = /WebGLRenderer|IcosahedronGeometry|BufferGeometry/;

const kb = (bytes) => bytes / 1024;
const fmt = (bytes) => `${kb(bytes).toFixed(1)} KB`;

function fail(message) {
  console.error(`\n  FAIL  ${message}`);
  process.exitCode = 1;
}

if (!existsSync(join(NEXT_DIR, "build-manifest.json"))) {
  console.error("No build found. Run `npm run build` first.");
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(join(NEXT_DIR, "build-manifest.json"), "utf8"),
);

/* ------------------------------------------------- initial client JS ----- */

const rootFiles = (manifest.rootMainFiles ?? []).filter((file) =>
  file.endsWith(".js"),
);

let initialBytes = 0;
let webglInInitial = false;
const initialRows = [];

for (const file of rootFiles) {
  const path = join(NEXT_DIR, file);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  const size = gzipSync(source).length;
  const isWebgl = WEBGL_SIGNATURE.test(source);
  if (isWebgl) webglInInitial = true;
  initialBytes += size;
  initialRows.push({ file, size, isWebgl });
}

/* ------------------------------------------------------- the webgl chunk - */

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const allChunks = walk(join(NEXT_DIR, "static", "chunks")).filter((path) =>
  path.endsWith(".js"),
);

let webglBytes = 0;
for (const path of allChunks) {
  const source = readFileSync(path, "utf8");
  if (WEBGL_SIGNATURE.test(source)) webglBytes += gzipSync(source).length;
}

/* ------------------------------------------------------------- fonts ----- */

const mediaDir = join(NEXT_DIR, "static", "media");
let fontBytes = 0;
let fontFiles = 0;
if (existsSync(mediaDir)) {
  for (const name of readdirSync(mediaDir)) {
    if (!name.endsWith(".woff2")) continue;
    // Emitted, not necessarily downloaded: next/font writes every unicode-range
    // subset and the browser fetches only what it needs. Reported for
    // information; the budget is checked against measured downloads instead.
    fontBytes += statSync(join(mediaDir, name)).size;
    fontFiles += 1;
  }
}

/* ------------------------------------------------------------- report ---- */

console.log("\nBundle budgets, NFR-05\n");

console.log("  Initial client JS (every route):");
for (const row of initialRows) {
  console.log(
    `    ${fmt(row.size).padStart(9)}  ${row.file.replace("static/chunks/", "")}${
      row.isWebgl ? "   <-- contains three.js" : ""
    }`,
  );
}

const initialOk = kb(initialBytes) <= BUDGETS.initialKb;
console.log(
  `\n    ${initialOk ? "OK  " : "FAIL"}  initial JS ${fmt(initialBytes)} / ${BUDGETS.initialKb} KB`,
);

const webglOk = kb(webglBytes) <= BUDGETS.webglKb;
console.log(
  `    ${webglOk ? "OK  " : "FAIL"}  three.js chunk ${fmt(webglBytes)} / ${BUDGETS.webglKb} KB`,
);

console.log(
  `    INFO  fonts emitted ${fmt(fontBytes)} across ${fontFiles} files (budget ${BUDGETS.fontKb} KB applies to downloads)`,
);

if (!initialOk) {
  fail(
    `Initial JS is ${fmt(initialBytes)}, over the ${BUDGETS.initialKb} KB budget.`,
  );
}

if (!webglOk) {
  fail(`three.js chunk is ${fmt(webglBytes)}, over ${BUDGETS.webglKb} KB.`);
}

if (webglInInitial) {
  fail(
    "three.js is in the initial chunk. Something imports it at module scope " +
      "instead of through next/dynamic, which puts it back in the LCP path.",
  );
}

if (process.exitCode) {
  console.error("");
} else {
  console.log("\n  All bundle budgets met.\n");
}
