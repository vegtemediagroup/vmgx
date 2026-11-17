# VMGX

**VMGX** (Vegte Media Group Extended) is a lightweight, human-readable data format for structured records, rich metadata and long-term digital preservation.

```
@vmgx 1.0

@id: "vmg-pub-0001"
@created: 2026-11-14T22:30:00+01:00

title: "Northern Light"
published: 2027-03-01
website: <https://example.com/books/northern-light>
summary: """
    A photo book about the coast,
    over a full year of seasons.
    """
```

It keeps JSON's simplicity and adds what archives and publishers need: comments, real dates, links, multi-line text and metadata on any record.

- **Website and playground:** <https://vmgx.vegte.org>
- **Source code and issues:** <https://codeberg.org/vmgx/vmgx>
- **Specification:** [`spec/vmgx-spec.md`](spec/vmgx-spec.md), also at <https://vmgx.vegte.org/spec.html>

## Install

```
npm install @vmgx/vmgx   # JavaScript and TypeScript
pip install vmgx         # Python 3.11+, includes the `vmgx` command
```

## What's here

| Folder | What it is |
| --- | --- |
| [`spec/`](spec) | The specification (CC BY 4.0) |
| [`js/`](js) | Reference parser for JavaScript: the `@vmgx/vmgx` npm package |
| [`python/`](python) | Reference parser for Python: the `vmgx` PyPI package |
| [`conformance/`](conformance) | 16 valid and 42 invalid test files that define VMGX exactly |
| [`vscode/`](vscode) | Extension for Visual Studio Code |
| [`mac/`](mac) | VMGX for Mac: editor and Finder preview |
| [`site/`](site) | The website |
| [`examples/`](examples) | Example records |
| [`registrations/`](registrations) | IANA, PRONOM and Wikidata submissions |
| [`tools/`](tools) | Scripts to sync files, build the spec page and package the site |

The JavaScript parser (`js/vmgx.js`) and the Python parser (`python/vmgx.py`) are the originals. After changing either, run `bash tools/sync.sh`: it copies them to the site, the VS Code extension and the Mac app, and runs every test.

## Website pages

Every page in `site/` must include `<script src="analytics.js"></script>` in its `<head>` and a `Cookie settings` link (`<a href="#" data-cookie-settings>Cookie settings</a>`) in its footer. `analytics.js` loads Google Tag Manager only after the visitor accepts. `tools/sync.sh` stops with an error if a page is missing it.

## Contributing

Bug reports and suggestions are welcome as issues. Any change to the language starts as a change to the specification and the conformance suite; both parsers must pass the suite.

## License

- Code: MIT License, copyright 2026 Vegte Media Group
- Specification and website text: CC BY 4.0
- The name "VMGX" and its logo: see [`LICENSE`](LICENSE)
