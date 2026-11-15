#!/bin/bash
# Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
#
# Builds VMGX.app for download by other people: signed with your Developer ID,
# notarized by Apple and stapled, so it opens on any Mac without warnings.
# Requires the Apple Developer Program. See "Releasing for other Macs" in README.md.
#
# Usage:  bash release.sh "Developer ID Application: Your Name (TEAMID1234)"
set -euo pipefail
cd "$(dirname "$0")"

step() { printf "\n\033[1;33m▸ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✕ %s\033[0m\n" "$1"; exit 1; }

IDENTITY="${1:-}"
PROFILE="${NOTARY_PROFILE:-VMGX}"
[ -n "$IDENTITY" ] || fail 'Give your signing identity, for example:  bash release.sh "Developer ID Application: Your Name (TEAMID1234)"'
TEAM=$(sed -n 's/.*(\([A-Z0-9]\{10\}\)).*/\1/p' <<<"$IDENTITY")
[ -n "$TEAM" ] || fail "Could not read the 10-character team ID from: $IDENTITY"
security find-identity -v -p codesigning | grep -q "$IDENTITY" \
  || fail "That signing identity is not in your keychain. Check the exact name with: security find-identity -v -p codesigning"

step "Preparing the project"
[ -x .tools/xcodegen/bin/xcodegen ] || command -v xcodegen >/dev/null || fail "Run build.sh once first; it sets up XcodeGen."
XCODEGEN="$(command -v xcodegen || echo "$PWD/.tools/xcodegen/bin/xcodegen")"
"$XCODEGEN" generate --quiet
VERSION=$(sed -n 's/^ *MARKETING_VERSION: "\(.*\)"/\1/p' project.yml | head -1)
mkdir -p build/release

step "Building and signing VMGX $VERSION"
if ! xcodebuild \
      -project VMGX.xcodeproj -scheme VMGX -configuration Release \
      -derivedDataPath build/ReleaseData \
      CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_IDENTITY="$IDENTITY" \
      ENABLE_HARDENED_RUNTIME=YES OTHER_CODE_SIGN_FLAGS="--timestamp" \
      build > build/release/build.log 2>&1; then
  grep "error:" build/release/build.log | sort -u | head -20 || true
  fail "The build failed. The full log is in build/release/build.log."
fi
APP="build/ReleaseData/Build/Products/Release/VMGX.app"
codesign --verify --deep --strict "$APP" || fail "The signature did not verify."

step "Sending to Apple for notarization (usually a few minutes)"
ZIP="build/release/VMGX-$VERSION-notarize.zip"
rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"
xcrun notarytool submit "$ZIP" --keychain-profile "$PROFILE" --wait \
  || fail "Notarization failed. See the log with: xcrun notarytool log <submission id> --keychain-profile $PROFILE"

step "Stapling the notarization ticket"
xcrun stapler staple "$APP"
spctl --assess --type execute --verbose "$APP" || fail "macOS does not accept the app yet."

OUT="build/release/VMGX-for-Mac-$VERSION.zip"
rm -f "$OUT"
ditto -c -k --keepParent "$APP" "$OUT"
printf "\n\033[1;32m✓ Ready to upload:\033[0m %s\n" "$OUT"
echo "Put it next to index.html on your site and link to it."
