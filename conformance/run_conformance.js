// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// Runs the VMGX conformance suite against vmgx.js. Usage: node run_conformance.js [SUITE_DIR]
const fs = require("fs");
const path = require("path");

function load() {
  for (const p of [path.join(__dirname, "vmgx.js"), path.join(__dirname, "..", "vmgx.js"),
                   path.join(__dirname, "..", "site", "vmgx.js"), path.join(__dirname, "..", "js", "vmgx.js")]) {
    if (fs.existsSync(p)) return require(p);
  }
  throw new Error("vmgx.js not found next to this script or one folder up");
}
const VMGX = load();
const suite = process.argv[2] || __dirname;

// Deep equality on parsed JSON values; numbers compared by value.
function same(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
}

let passed = 0, failed = 0;
const files = (dir) => fs.readdirSync(path.join(suite, dir)).filter((f) => f.endsWith(".vmgx")).sort();

for (const f of files("valid")) {
  const text = new TextDecoder("utf-8").decode(fs.readFileSync(path.join(suite, "valid", f)));
  const expected = JSON.parse(fs.readFileSync(path.join(suite, "valid", f.replace(/\.vmgx$/, ".json")), "utf8"));
  let ok = false, why = "";
  try {
    const data = VMGX.parse(text);
    const typed = JSON.parse(VMGX.toJSON(data, { typed: true }));
    const again = JSON.parse(VMGX.toJSON(VMGX.parse(VMGX.stringify(data)), { typed: true }));
    ok = same(typed, expected) && same(again, typed);
    if (!ok) why = "result differs from expected";
  } catch (e) { why = e.name + ": " + e.message; }
  ok ? passed++ : (failed++, console.log(`FAIL valid/${f}: ${why}`));
}
for (const f of files("invalid")) {
  const text = new TextDecoder("utf-8").decode(fs.readFileSync(path.join(suite, "invalid", f)));
  let ok = false;
  try { VMGX.parse(text); } catch (e) { ok = e instanceof VMGX.VMGXError; }
  ok ? passed++ : (failed++, console.log(`FAIL invalid/${f}: was accepted`));
}
console.log(`vmgx.js: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
