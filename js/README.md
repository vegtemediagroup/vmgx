# vmgx

The reference JavaScript parser for **VMGX**, a lightweight, human-readable data format for structured records, rich metadata and long-term digital preservation.

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

One file, no dependencies. Works in Node.js and in browsers, and includes TypeScript types. It passes the full VMGX conformance suite.

## Install

```
npm install vmgx
```

In a browser, without npm:

```html
<script src="vmgx.js"></script>  <!-- defines window.VMGX -->
```

## Use

```js
const VMGX = require("vmgx");   // or: import VMGX from "vmgx";

const record = VMGX.parse(text);
record.title;                     // "Northern Light"
record.published.toDate();        // a JavaScript Date
String(record.published);         // "2027-03-01"
record.website.href;              // "https://example.com/books/northern-light"

VMGX.stringify(record);           // back to VMGX text
VMGX.validate(text);              // { valid: true, error: null }

VMGX.toJSON(text);                    // plain JSON: dates and links become strings
VMGX.toJSON(text, { typed: true });   // typed JSON: {"@date": "2027-03-01"} keeps the type
VMGX.fromJSON(json, { typed: true }); // JSON back to VMGX
```

Invalid input throws a `VMGX.VMGXError` with `line`, `column` and `reason`:

```js
try {
  VMGX.parse("name: Alex");
} catch (e) {
  e.line;    // 1
  e.column;  // 7
  e.reason;  // "unrecognized value 'Alex' (text must be in quotes)"
}
```

## Values

| VMGX | JavaScript |
| --- | --- |
| `"text"`, `"""text block"""` | `string` |
| `248`, `19.95` | `number` |
| `true`, `false`, `null` | `boolean`, `null` |
| `2027-03-01` | `VMGX.VDate` |
| `2026-11-14T22:30:00+01:00` | `VMGX.VDateTime` |
| `<https://example.com>` | `VMGX.Link` |
| `{ … }`, `[ … ]` | object, array |

Whole numbers above 2^53 lose precision, because JavaScript stores all numbers that way.

## Learn more

- Specification, playground and conformance suite: <https://vmgx.vegte.org>
- Source code and issues: <https://codeberg.org/vmgx/vmgx>

## License

MIT License. Copyright (c) 2026 Vegte Media Group.
