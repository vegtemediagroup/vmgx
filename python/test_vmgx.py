import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import vmgx  # noqa: E402

failures = 0


def check(name, cond):
    global failures
    if not cond:
        failures += 1
        print("FAIL:", name)


def raises(name, text, fragment):
    try:
        vmgx.loads(text)
    except vmgx.VMGXError as e:
        check(f"{name} message: {e}", fragment in str(e))
        return
    check(f"{name} should fail", False)


ex = vmgx.loads((Path(__file__).parent.parent / "examples" / "example.vmgx").read_text(encoding="utf-8"))
check("meta key", ex["@id"] == "vmg-pub-0001")
check("datetime", isinstance(ex["@created"], dt.datetime) and ex["@created"].utcoffset() == dt.timedelta(hours=1))
check("date", ex["published"] == dt.date(2027, 3, 1))
check("int", ex["pages"] == 248 and isinstance(ex["pages"], int))
check("float", ex["price"] == 19.95)
check("bool", ex["illustrated"] is False)
check("text block", ex["summary"] == 'A photo book about "slow light" on the coast.\n'
      "It follows one harbor through a full year of seasons.")
check("link", isinstance(ex["links"]["website"], vmgx.Link))
check("list of objects", ex["editions"][1]["isbn"] is None)
check("nested meta", ex["archive"]["@source"] == "Author's manuscript")

# Round trips
again = vmgx.loads(vmgx.dumps(ex))
check("round trip", again == ex and type(again["links"]["cover"]) is vmgx.Link)
j = json.loads(vmgx.to_json(ex))
check("to json", j["published"] == "2027-03-01" and j["@created"] == "2026-11-14T22:30:00+01:00")
check("from json", vmgx.loads(vmgx.from_json(json.dumps(j))) == j)

# Smaller features
check("no header needed", vmgx.loads("a: 1") == {"a": 1})
check("empty doc", vmgx.loads("") == {} and vmgx.loads("@vmgx 1.0\n# nothing") == {})
check("commas and trailing comma", vmgx.loads("a: 1, b: [1, 2,], c: {x: 1,}") == {"a": 1, "b": [1, 2], "c": {"x": 1}})
check("quoted keys", vmgx.loads('"two words": 1') == {"two words": 1})
check("escapes", vmgx.loads(r's: "a\nb \u{1F600} \u00e9 \uD83D\uDE00"')["s"] == "a\nb \U0001F600 é \U0001F600")
check("utc datetime", vmgx.loads("t: 2026-01-01T09:00Z")["t"].tzinfo == dt.timezone.utc)
check("hash inside string", vmgx.loads('s: "#1" # comment')["s"] == "#1")
check("negative/exponent", vmgx.loads("a: -3, b: 1.5e3") == {"a": -3, "b": 1500.0})
check("inline text block", vmgx.loads('s: """say "hi" """')["s"] == 'say "hi" ')
tricky = {"s": "  leading space\nline", "t": "ends with newline\n", "u": 'has """ inside\nx', "e": [], "o": {}}
check("tricky strings round trip", vmgx.loads(vmgx.dumps(tricky)) == tricky)

# Errors
raises("unquoted text", "name: Alex", "unrecognized value 'Alex'")
raises("duplicate", "a: 1\na: 2", "duplicate key 'a'")
raises("missing colon", "a 1", "expected ':'")
raises("missing value", "a:\n", "missing value")
raises("unclosed object", "a: {\n b: 1", "missing '}'")
raises("unclosed list", "a: [1, 2", "missing ']'")
raises("bad date", "d: 2026-02-30", "invalid date")
raises("bad version", "@vmgx 2.0\na: 1", "unsupported VMGX version")
raises("two on a line", "a: 1 b: 2", "expected a comma or a new line")
raises("bad link", "l: <not closed", "unterminated link")
raises("line numbers", "a: 1\nb: 2\nc: oops", "line 3")

print("all tests passed" if not failures else f"{failures} failure(s)")
sys.exit(1 if failures else 0)
