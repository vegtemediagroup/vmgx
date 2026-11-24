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
(cd vscode && npx -y @vscode/vsce package -o ../site/vmgx-vscode.vsix >/dev/null)
(cd site && zip -qr ../dist/vmgx-website.zip index.html spec.html editor.html analytics.js \
    vmgx.js vmgx-render.js vmgx.py \
    example.vmgx logo.svg LICENSE.txt sitemap.xml robots.txt vmgx-conformance.zip vmgx-vscode.vsix \
    $(ls favicon.png logo.png 2>/dev/null || true))
echo "✓ dist/vmgx-website.zip"
