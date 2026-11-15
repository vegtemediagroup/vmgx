# VMGX for Mac

A Mac app for reading, viewing and editing `.vmgx` files, with a Finder preview.

- **Editor:** syntax colors, live error checking (click the error to jump to it), and a Format button that tidies the layout.
- **Preview pane:** shows the file as a readable record, as plain JSON or as typed JSON.
- **Export:** Copy JSON and Export JSON in the toolbar.
- **Finder preview:** select a `.vmgx` file and press the space bar.
- **Default app:** `.vmgx` files open in VMGX when you double-click them.

The app reads files with the same `vmgx.js` engine as the website, so both always agree on what is valid. It needs macOS 13 (Ventura) or later.

## Install

You build the app once on your own Mac. It takes about 10 minutes, most of it downloading Xcode.

1. **Install Xcode** from the Mac App Store. It's free but large (about 7 GB to download). Open it once and let it finish its setup, then quit it.
2. **Optional: add your logo.** Put `logo.png` (square, ideally 1024 × 1024 pixels) in this folder. It becomes the app icon.
3. **Run the build script.** Open **Terminal** (in Applications → Utilities), type `bash ` (with a space), drag `build.sh` from this folder into the Terminal window, and press Return.

The script downloads XcodeGen (a small tool that creates the Xcode project), builds the app, installs it in Applications and turns on the Finder preview. When it's done, VMGX opens.

To try the preview, select `example.vmgx` in this folder and press the space bar.

## Updating

To rebuild after a change (for example, a new logo), run `build.sh` again the same way. It replaces the installed app.

## If something goes wrong

**"Xcode is needed" although Xcode is installed.** Run this in Terminal, enter your Mac password, and run the script again:

    sudo xcode-select -s /Applications/Xcode.app

**The build asks about a license.** Run `sudo xcodebuild -license accept` in Terminal, then run the script again.

**The build failed.** The script shows the main errors. The full log is in `build/build.log`; send it to whoever is helping you.

**If the Finder preview doesn't show:**

1. Open VMGX once, then quit it.
2. Open **System Settings → General → Login Items & Extensions**. Under **Quick Look**, make sure **VMGX** is turned on. On macOS 13 and 14 this is under **System Settings → Privacy & Security → Extensions → Quick Look**.
3. In Terminal, run `qlmanage -r` and try the space bar again.

## Signing and sharing

The app is signed only for your own Mac ("Sign to Run Locally"), which needs no Apple Developer account. It works fully on the Mac that built it.

To offer the app on the website later, it needs a Developer ID signature and Apple's notarization; otherwise macOS warns other people that it can't verify the app. That requires the Apple Developer Program (€99 a year). The project is ready for it: set your team and signing certificate, then archive and notarize from Xcode.

## What's inside

| Path | What it is |
| --- | --- |
| `App/` | The app: document handling, editor, preview pane, toolbar |
| `QuickLook/` | The Finder preview extension |
| `Shared/VMGXEngine.swift` | Runs the VMGX JavaScript through JavaScriptCore (built into macOS) |
| `Shared/js/vmgx.js` | The VMGX parser, the same file as on the website |
| `Shared/js/vmgx-render.js` | Syntax colors and the preview pages, shared by the app and the Finder preview |
| `project.yml` | Project description; `build.sh` turns it into `VMGX.xcodeproj` |
| `build.sh` | Builds, installs and registers everything |

To work on the app in Xcode, run `build.sh` once and then open the `VMGX.xcodeproj` it creates.

## License

MIT License. Copyright (c) 2026 Vegte Media Group. You may use, change and share this code freely, including in commercial apps, as long as the copyright notice stays in. See `LICENSE`.

## Releasing for other Macs

`build.sh` signs the app for your own Mac only. To offer it for download without security warnings, you need the Apple Developer Program (€99 a year). Then, once:

1. In Xcode, open **Settings → Accounts**, add your Apple ID, select your team and click **Manage Certificates → + → Developer ID Application**.
2. Create an app-specific password at <https://account.apple.com> (**Sign-In and Security → App-Specific Passwords**).
3. In Terminal, save your notarization login (use your own Apple ID, team ID and the password from step 2):

       xcrun notarytool store-credentials VMGX --apple-id "you@example.com" --team-id TEAMID1234

For each release, run `release.sh` with your signing identity. Find its exact name with `security find-identity -v -p codesigning`.

    bash release.sh "Developer ID Application: Your Name (TEAMID1234)"

The script builds, signs, notarizes and staples the app, and leaves `build/release/VMGX-for-Mac-<version>.zip` ready to upload. To release a new version, raise `MARKETING_VERSION` in `project.yml` first.
