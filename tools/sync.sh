#!/bin/bash
# Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
#
# The parsers live in one place each (js/vmgx.js and python/vmgx.py). This copies
# them, and the shared preview code, to everywhere else that ships them, rebuilds
# the spec page, and runs every test. Run it after changing any of those files.
set -euo pipefail
cd "$(dirname "$0")/.."

cp js/vmgx.js site/vmgx.js
cp js/vmgx.js vscode/vmgx.js
cp js/vmgx.js mac/VMGX/Shared/js/vmgx.js
cp mac/VMGX/Shared/js/vmgx-render.js site/vmgx-render.js
cp python/vmgx.py site/vmgx.py
cp examples/example.vmgx site/example.vmgx
cp examples/example.vmgx mac/VMGX/example.vmgx
for d in js python vscode conformance mac/VMGX; do cp LICENSE "$d/LICENSE"; done
cp LICENSE site/LICENSE.txt

python3 tools/build_spec_page.py

# Every page of the website must load analytics.js (Google Tag Manager with consent).
missing=$(grep -L '<script src="analytics.js"></script>' site/*.html || true)
if [ -n "$missing" ]; then
  echo "✕ These pages do not include analytics.js. Add <script src=\"analytics.js\"></script> to their <head>:"
  echo "$missing"
  exit 1
fi
python3 python/test_vmgx.py
node js/test.js
python3 conformance/run_conformance.py
node conformance/run_conformance.js
echo "✓ Everything is in sync and all tests pass."
