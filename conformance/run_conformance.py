# Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
"""Runs the VMGX conformance suite against vmgx.py. Usage: python run_conformance.py [SUITE_DIR]"""
import json
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
sys.path.insert(0, str(here))
sys.path.insert(0, str(here.parent))
sys.path.insert(0, str(here.parent / "python"))
import vmgx  # noqa: E402

suite = Path(sys.argv[1]) if len(sys.argv) > 1 else here
passed = failed = 0
for f in sorted((suite / "valid").glob("*.vmgx")):
    expected = json.loads(f.with_suffix(".json").read_text(encoding="utf-8"))
    try:
        data = vmgx.loads(f.read_bytes().decode("utf-8"))
        ok = json.loads(vmgx.to_json(data, typed=True)) == expected and vmgx.loads(vmgx.dumps(data)) == data
        why = "" if ok else "result differs from expected"
    except Exception as e:  # noqa: BLE001
        ok, why = False, f"{type(e).__name__}: {e}"
    passed += ok
    failed += not ok
    if not ok:
        print(f"FAIL valid/{f.name}: {why}")
for f in sorted((suite / "invalid").glob("*.vmgx")):
    try:
        vmgx.loads(f.read_bytes().decode("utf-8"))
        ok = False
    except vmgx.VMGXError:
        ok = True
    passed += ok
    failed += not ok
    if not ok:
        print(f"FAIL invalid/{f.name}: was accepted")
print(f"vmgx.py: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
