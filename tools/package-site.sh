#!/bin/bash
# Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
#
# Builds vmgx-website.zip: everything to upload to the web server.
# Add favicon.png and logo.png next to index.html on the server (or in site/ before running).
set -euo pipefail
cd "$(dirname "$0")/.."
bash tools/sync.sh
mkdir -p dist
rm -f site/vmgx-conformance.zip dist/vmgx-website.zip
zip -qr site/vmgx-conformance.zip conformance
(cd vscode && npx -y @vscode/vsce package -o ../site/vmgx-1.0.1.vsix >/dev/null)
(cd site && zip -q ../dist/vmgx-website.zip index.html spec.html vmgx.js vmgx-render.js vmgx.py \
    example.vmgx LICENSE.txt vmgx-conformance.zip vmgx-1.0.1.vsix $(ls favicon.png logo.png 2>/dev/null || true))
echo "✓ dist/vmgx-website.zip"
