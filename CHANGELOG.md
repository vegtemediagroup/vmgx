# Changelog

## Unreleased — website

- Website works on phones (menu button, no sideways scrolling)
- Google Tag Manager on every page, loaded only after the visitor accepts the cookie banner; "Cookie settings" link in each footer
- `tools/sync.sh` checks that every page includes `analytics.js`
- New VMGX Editor (`editor.html`): open, edit, check, preview and save `.vmgx` files in the browser
- The VMGX logo (`logo.svg`) is part of the site, in the site's gold so it stands out on the navy header

## npm 1.0.2 — November 2026

- Republished the npm package `@vmgx/vmgx` with all its files; 1.0.1 was incomplete and is deprecated

## 1.0.1 — November 2026

Language version 1.0, specification 1.0.1.

- JSON conversion: plain JSON (data-preserving) and typed JSON (type-preserving)
- Formal rules for metadata, versions and validation
- Rejected: control characters, invalid Unicode, `@vmgx` as a key, numbers too large to store, more than six decimals in a time, nesting deeper than 256 levels
- Conformance suite: 16 valid and 42 invalid cases
- Media type: `application/vnd.vmg.vmgx` (IANA registration pending; previously `application/x-vmgx`)
- Packages for npm (`@vmgx/vmgx`) and PyPI (`vmgx`), with a `vmgx` command-line tool
- VS Code extension and VMGX for Mac
- Code under the MIT License; specification under CC BY 4.0

## 1.0 — November 2026

- First version of the language, with JavaScript and Python parsers and the website
