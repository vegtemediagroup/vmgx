# Changelog

## 1.0.1 — November 2026

Language version 1.0, specification 1.0.1.

- JSON conversion: plain JSON (data-preserving) and typed JSON (type-preserving)
- Formal rules for metadata, versions and validation
- Rejected: control characters, invalid Unicode, `@vmgx` as a key, numbers too large to store, more than six decimals in a time, nesting deeper than 256 levels
- Conformance suite: 16 valid and 42 invalid cases
- Media type: `application/vnd.vmg.vmgx` (IANA registration pending; previously `application/x-vmgx`)
- Packages for npm and PyPI, with a `vmgx` command-line tool
- VS Code extension and VMGX for Mac
- Code under the MIT License; specification under CC BY 4.0

## 1.0 — November 2026

- First version of the language, with JavaScript and Python parsers and the website
