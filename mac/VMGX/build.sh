#!/bin/bash
# Builds VMGX.app on this Mac and installs it, together with its Finder (Quick Look) preview.
# Run it again at any time to rebuild, for example after adding logo.png.
set -euo pipefail
cd "$(dirname "$0")"

step() { printf "\n\033[1;33m▸ %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✕ %s\033[0m\n" "$1"; exit 1; }

step "Checking for Xcode"
if ! xcodebuild -version >/dev/null 2>&1; then
  echo "Xcode is needed to build the app. It is free in the Mac App Store."
  echo "Install it, open it once to finish its setup, then run this script again."
  echo "If Xcode is already installed, run this once and try again:"
  echo "    sudo xcode-select -s /Applications/Xcode.app"
  open "macappstore://apps.apple.com/app/xcode/id497799835" 2>/dev/null || true
  exit 1
fi
xcodebuild -version | head -1

step "Getting XcodeGen (creates the Xcode project)"
if command -v xcodegen >/dev/null 2>&1; then
  XCODEGEN="$(command -v xcodegen)"
else
  if [ ! -x .tools/xcodegen/bin/xcodegen ]; then
    mkdir -p .tools
    curl -fsSL -o .tools/xcodegen.zip \
      https://github.com/yonaskolb/XcodeGen/releases/latest/download/xcodegen.zip \
      || fail "Could not download XcodeGen. Check your internet connection and try again."
    (cd .tools && unzip -q -o xcodegen.zip && rm -f xcodegen.zip)
  fi
  XCODEGEN="$PWD/.tools/xcodegen/bin/xcodegen"
fi
echo "Using $XCODEGEN"

step "Making the app icon"
mkdir -p build
if [ -f logo.png ]; then
  rm -rf build/AppIcon.iconset && mkdir -p build/AppIcon.iconset Resources
  for size in 16 32 128 256 512; do
    double=$((size * 2))
    sips -z "$size" "$size" logo.png --out "build/AppIcon.iconset/icon_${size}x${size}.png" >/dev/null
    sips -z "$double" "$double" logo.png --out "build/AppIcon.iconset/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns build/AppIcon.iconset -o Resources/AppIcon.icns
  echo "Icon made from logo.png"
else
  rm -f Resources/AppIcon.icns
  echo "No logo.png next to this script, so the app uses the standard icon."
fi

step "Generating the Xcode project"
"$XCODEGEN" generate --quiet

step "Building VMGX (this takes a minute or two)"
if ! xcodebuild \
      -project VMGX.xcodeproj -scheme VMGX -configuration Release \
      -derivedDataPath build/DerivedData \
      CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= \
      build > build/build.log 2>&1; then
  grep "error:" build/build.log | sort -u | head -20 || true
  echo
  tail -25 build/build.log
  fail "The build failed. The full log is in build/build.log."
fi
APP="build/DerivedData/Build/Products/Release/VMGX.app"
[ -d "$APP" ] || fail "The build finished but VMGX.app was not found."

step "Installing in Applications"
osascript -e 'tell application "VMGX" to quit' >/dev/null 2>&1 || true
DEST="/Applications"
if ! { rm -rf "$DEST/VMGX.app" && cp -R "$APP" "$DEST/"; } 2>/dev/null; then
  DEST="$HOME/Applications"
  mkdir -p "$DEST"
  rm -rf "$DEST/VMGX.app"
  cp -R "$APP" "$DEST/"
fi
xattr -dr com.apple.quarantine "$DEST/VMGX.app" 2>/dev/null || true
echo "Installed in $DEST"

step "Registering the app and the Finder preview"
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
"$LSREGISTER" -f -R "$DEST/VMGX.app" || true
pluginkit -a "$DEST/VMGX.app/Contents/PlugIns/VMGXQuickLook.appex" 2>/dev/null || true
pluginkit -e use -i org.vegte.VMGX.QuickLook 2>/dev/null || true
qlmanage -r >/dev/null 2>&1 || true
qlmanage -r cache >/dev/null 2>&1 || true

open "$DEST/VMGX.app"

printf "\n\033[1;32m✓ VMGX is installed.\033[0m\n"
echo "• Open any .vmgx file by double-clicking it."
echo "• Preview one in Finder: select it and press the space bar (try example.vmgx in this folder)."
echo "• If the preview doesn't appear, see 'If the Finder preview doesn't show' in README.md."
