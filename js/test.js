// Tests for vmgx.js, mirroring test_vmgx.py, plus a cross-check against the Python parser.
const fs = require("fs");
const path = require("path");
const VMGX = require("./vmgx.js");

let failures = 0;
const check = (name, cond) => { if (!cond) { failures++; console.log("FAIL:", name); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function raises(name, text, fragment) {
  try { VMGX.parse(text); } catch (e) {
    check(`${name} message: ${e.message}`, e instanceof VMGX.VMGXError && e.message.includes(fragment));
    return;
  }
  check(`${name} should fail`, false);
}

const exText = fs.readFileSync(path.join(__dirname, "..", "examples", "example.vmgx"), "utf8");
const ex = VMGX.parse(exText);
check("meta key", ex["@id"] === "vmg-pub-0001");
check("datetime", ex["@created"] instanceof VMGX.VDateTime && ex["@created"].offset === 60);
check("datetime toDate", ex["@created"].toDate().toISOString() === "2026-11-14T21:30:00.000Z");
check("date", ex.published instanceof VMGX.VDate && String(ex.published) === "2027-03-01");
check("int", ex.pages === 248);
check("float", ex.price === 19.95);
check("bool", ex.illustrated === false);
check("text block", ex.summary === 'A photo book about "slow light" on the coast.\n' +
  "It follows one harbor through a full year of seasons.");
check("link", ex.links.website instanceof VMGX.Link);
check("list of objects", ex.editions[1].isbn === null);
check("nested meta", ex.archive["@source"] === "Author's manuscript");

const again = VMGX.parse(VMGX.stringify(ex));
check("round trip", eq(again, ex) && again.links.cover instanceof VMGX.Link);
const j = JSON.parse(VMGX.toJSON(ex));
check("to json", j.published === "2027-03-01" && j["@created"] === "2026-11-14T22:30:00+01:00");
check("from json", eq(VMGX.parse(VMGX.fromJSON(JSON.stringify(j))), j));

check("no header needed", eq(VMGX.parse("a: 1"), { a: 1 }));
check("empty doc", eq(VMGX.parse(""), {}) && eq(VMGX.parse("@vmgx 1.0\n# nothing"), {}));
check("commas", eq(VMGX.parse("a: 1, b: [1, 2,], c: {x: 1,}"), { a: 1, b: [1, 2], c: { x: 1 } }));
check("quoted keys", eq(VMGX.parse('"two words": 1'), { "two words": 1 }));
check("escapes", VMGX.parse(String.raw`s: "a\nb \u{1F600} \u00e9 \uD83D\uDE00"`).s === "a\nb \u{1F600} é \u{1F600}");
check("utc datetime", String(VMGX.parse("t: 2026-01-01T09:00Z").t) === "2026-01-01T09:00:00Z");
check("hash in string", VMGX.parse('s: "#1" # c').s === "#1");
check("numbers", eq(VMGX.parse("a: -3, b: 1.5e3"), { a: -3, b: 1500 }));
check("inline text block", VMGX.parse('s: """say "hi" """').s === 'say "hi" ');
const tricky = { s: "  leading space\nline", t: "ends with newline\n", u: 'has """ inside\nx', e: [], o: {} };
check("tricky round trip", eq(VMGX.parse(VMGX.stringify(tricky)), tricky));
check("__proto__ key is safe", VMGX.parse('"__proto__": 1')["__proto__"] === 1 && ({}).polluted === undefined);
check("validate", VMGX.validate("a: 1").valid && !VMGX.validate("a: b").valid);

raises("unquoted text", "name: Alex", "unrecognized value 'Alex'");
raises("duplicate", "a: 1\na: 2", "duplicate key 'a'");
raises("missing colon", "a 1", "expected ':'");
raises("missing value", "a:\n", "missing value");
raises("unclosed object", "a: {\n b: 1", "missing '}'");
raises("unclosed list", "a: [1, 2", "missing ']'");
raises("bad date", "d: 2026-02-30", "invalid date");
raises("bad time", "d: 2026-02-01T25:00", "invalid date-time");
raises("bad version", "@vmgx 2.0\na: 1", "unsupported VMGX version");
raises("two on a line", "a: 1 b: 2", "expected a comma or a new line");
raises("bad link", "l: <not closed", "unterminated link");
raises("lone surrogate", String.raw`s: "\uD83D"`, "surrogate");
raises("line numbers", "a: 1\nb: 2\nc: oops", "line 3");

console.log(failures ? `${failures} failure(s)` : "all tests passed");
process.exit(failures ? 1 : 0);
