# VMGX Specification

**Language version 1.0 · Specification 1.0.1 · November 2026**

Published by Vegte Media Group. This specification is licensed under CC BY 4.0.

VMGX (Vegte Media Group Extended) is a lightweight, human-readable data format for structured records, rich metadata and long-term digital preservation. It keeps JSON's simplicity and adds what archives and publishers need: comments, real dates, links, multi-line text and metadata on any record.

The key words "must", "must not", "should" and "may" are used as in RFC 2119.

## 1. Example

```
@vmgx 1.0
# A publication record

@id: "vmg-pub-0001"
@type: "publication"
@created: 2026-11-14T22:30:00+01:00

title: "Northern Light"
authors: ["Alex Morgan"]
published: 2027-03-01
pages: 248
website: <https://example.com/books/northern-light>

summary: """
    A photo book about "slow light" on the coast.
    It follows one harbor through a full year of seasons.
    """

editions: [
  { format: "paperback", year: 2027 }
  { format: "ebook", year: 2027 }
]
```

## 2. Files

- File extension: `.vmgx`
- Media type: `application/vnd.vmg.vmgx` (registration with IANA pending)
- Encoding: UTF-8. A byte-order mark at the start is allowed and ignored.
- Line endings: LF, CRLF or CR. Parsers treat all three as one line break.
- A file must not contain control characters (U+0000 to U+001F, and U+007F) other than tab and line breaks.
- A file must be valid Unicode. Unpaired surrogates are not allowed.

## 3. Header and versions

The first non-empty, non-comment line may be a header: `@vmgx` followed by the language version as `major.minor`.

```
@vmgx 1.0
```

- A file without a header is read as version 1.0.
- Files meant for archiving or exchange should start with the header, so tools can recognize them without relying on the file name.
- A header with a patch number, such as `@vmgx 1.0.1`, is an error.
- **Major versions** may change the rules. A parser must reject a major version it does not support.
- **Minor versions** only add to the language. A 1.x parser reads any 1.x file and reports an error only where it meets syntax it does not know.
- **Specification revisions**, such as 1.0.1, clarify rules without changing the language. Files keep the header `@vmgx 1.0`.

## 4. Documents and entries

A document is an object whose outer braces are left out: the file itself is the object.

Each entry is written as `key: value`. Entries are separated by a line break or a comma. Commas between lines are optional, and a trailing comma before a closing bracket is allowed. A value must start on the same line as its key; objects and lists may then span several lines. Objects and lists may be nested up to 256 levels deep.

```
name: "Vegte Media Group"
founded: 2026, active: true
```

## 5. Keys

- **Bare keys** use letters, digits, `_` and `-`, and start with a letter or `_`. Examples: `title`, `first-name`, `isbn_13`.
- **Quoted keys** are any text in double quotes: `"two words": 1`.
- **Metadata keys** are bare keys that start with `@`, such as `@id` (see section 10).
- Keys are case-sensitive. A key must not appear twice in the same object.
- `@vmgx` must not be used as a key; it is reserved for the header.

## 6. Values

| Type | Written as | Example |
| --- | --- | --- |
| Text | double quotes | `"Lisbon"` |
| Text block | triple quotes | `"""…"""` |
| Integer | digits, optional minus | `248`, `-3` |
| Decimal | digits with `.` or an exponent | `19.95`, `1.5e3` |
| Boolean | `true`, `false` | `true` |
| Null | `null` | `null` |
| Date | `YYYY-MM-DD` | `2027-03-01` |
| Date-time | ISO 8601 with time | `2026-11-14T22:30:00+01:00` |
| Link | angle brackets | `<https://example.com>` |
| Object | curly braces | `{ city: "Lisbon" }` |
| List | square brackets | `[1, 2, 3]` |

Text is always in quotes. `name: Alex` is an error; write `name: "Alex"`.

Numbers follow JSON: no leading zeros, no leading `+`, no trailing `.`, and no `NaN` or infinity. A number too large to store, such as `1e999`, is an error.

## 7. Text and text blocks

Quoted text stays on one line. It supports these escapes:

| Escape | Meaning |
| --- | --- |
| `\"` `\\` `\/` | quote, backslash, slash |
| `\n` `\t` `\r` `\b` `\f` | line feed, tab, carriage return, backspace, form feed |
| `\uXXXX` | a UTF-16 code unit as four hex digits; surrogate pairs are joined |
| `\u{1F600}` | any Unicode code point, one to six hex digits |

Text blocks hold text over several lines without escapes:

```
bio: """
    First line.
    Second line, with "quotes" and no escaping.
    """
```

- A line break right after the opening `"""` is removed.
- The last line is removed if it holds only spaces or tabs before the closing `"""`.
- Leading whitespace shared by all non-blank lines is removed. Lines holding only spaces or tabs become empty.
- The content is raw: escapes are not processed and `#` is not a comment.
- A text block cannot contain `"""`. Use quoted text for that.
- Text that starts and ends on one line, such as `"""say "hi" """`, is taken as written.

## 8. Dates and times

- Dates: `YYYY-MM-DD`. Impossible dates, such as `2026-02-30`, are errors.
- Date-times: `YYYY-MM-DDTHH:MM`, with optional seconds, optional fractions of a second (one to six digits), and an optional time zone: `Z` for UTC or an offset such as `+01:00`.
- For archiving, a date-time should include a time zone. Without one, it has no fixed moment in time.
- Writers output date-times in canonical form: seconds always present, fractions as six digits when not zero, and `Z` for UTC. For example, `2026-01-01T09:00Z` is written back as `2026-01-01T09:00:00Z`.

## 9. Links and comments

A link is a URL or URI in angle brackets, such as `<https://example.com/book>`, `<mailto:info@example.com>` or `<urn:isbn:9780000000000>`. Spaces just inside the brackets are ignored. A link must not be empty or contain spaces.

`#` starts a comment that runs to the end of the line, on its own line or after a value. A `#` inside quoted text or a text block is part of the text.

## 10. Metadata

A key that starts with `@` is metadata: information about the object it sits in, not part of its content. Metadata at the top of a file describes the whole document.

| Key | Meaning |
| --- | --- |
| `@id` | Unique identifier of the record |
| `@type` | Kind of record, such as `"publication"` |
| `@created` | When the record was created (date-time) |
| `@modified` | When it last changed (date-time) |
| `@author` | Who created or is responsible for it |
| `@source` | Where the material came from (provenance) |
| `@license` | Usage rights, such as `"CC BY 4.0"` |
| `@lang` | Language code, such as `"en"` |
| `@version` | Version of the record |

- Metadata applies only to the object it sits in. Nested objects do not inherit it.
- Metadata keys follow the same rules as other keys, so a duplicate `@` key is an error.
- Other `@` keys are allowed. Tools must keep `@` keys they do not recognize.
- `@created` and `@modified` should be date-times with a time zone.

## 11. Converting to and from JSON

VMGX converts to JSON in two modes. Comments are not carried into JSON in either mode.

| Mode | Dates, date-times and links become | Round trip back to VMGX |
| --- | --- | --- |
| Plain JSON (data-preserving) | Strings, such as `"2027-03-01"` | Values survive; dates and links return as text |
| Typed JSON (type-preserving) | `{"@date": "…"}`, `{"@datetime": "…"}`, `{"@link": "…"}` | Values and types survive |

- Text blocks become ordinary strings. `@` keys keep their names, such as `"@id"`.
- JSON to VMGX: the JSON must be an object at the top level. In plain mode, strings stay text.
- In typed mode, an object whose only key is `@date`, `@datetime` or `@link`, holding a string, becomes that native value. An invalid value, such as `{"@date": "2026-02-30"}`, is an error.

## 12. Errors

A parser must reject the whole file when it finds any of the following, and should report the line and column:

- unquoted text, a missing `:` or a missing value
- a duplicate key in one object, metadata keys included, or `@vmgx` used as a key
- unclosed quotes, text blocks, links, objects or lists
- two entries on one line without a comma, or two commas in a row
- an invalid escape, date, time or number
- a control character or invalid Unicode
- objects and lists nested more than 256 levels deep
- an unsupported major version, or a malformed header

## 13. Grammar

```
document  = [header] members
header    = "@vmgx" 1*WSP major "." minor
members   = [member *(sep member) [","]]
member    = key ":" value
key       = ident / "@" ident / string
ident     = (ALPHA / "_") *(ALPHA / DIGIT / "_" / "-")
value     = object / list / string / text / number / date / datetime
          / link / "true" / "false" / "null"
object    = "{" members "}"
list      = "[" [value *(sep value) [","]] "]"
sep       = "," / newline
string    = DQUOTE *(char / escape) DQUOTE
text      = 3DQUOTE *any-except-3DQUOTE 3DQUOTE
link      = "<" 1*non-space ">"
comment   = "#" *any-except-newline
```

Whitespace (spaces and tabs) and comments may appear between any two tokens. Line breaks may appear wherever a separator is allowed, and after `{`, `[` and before `}`, `]`.

## 14. Conformance

A parser conforms to VMGX 1.0 when it passes every case in the conformance suite:

- Each `valid/NAME.vmgx` must parse. Converted to typed JSON, the result must equal `valid/NAME.json`, and writing it back to VMGX and parsing it again must give the same data.
- Each `invalid/NAME.vmgx` must be rejected.

The suite has 16 valid and 42 invalid cases. It is published with the reference parsers at <https://codeberg.org/vmgx/vmgx>. The reference parsers `vmgx.js` and `vmgx.py` pass all of them.

## 15. Security

- VMGX is data only. It has no includes, references to other files, or code execution, so reading a file cannot run anything.
- Links are data. Tools should not fetch them automatically, and should only make `http`, `https` and `mailto` links clickable.
- Nesting is limited to 256 levels, so a hostile file cannot exhaust a parser's stack. Very large files can still use a lot of memory; tools that read files from untrusted sources should limit file size.

## 16. License and name

This specification is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0). The reference code is under the MIT License. Software may say it "reads VMGX", "supports VMGX" or is "VMGX-compatible" when it passes the conformance suite, but must not suggest it is made or endorsed by Vegte Media Group.

## Changes

- **1.0.1 (November 2026):** clarified JSON conversion and added typed JSON; formal rules for metadata, versions and validation; control characters, invalid Unicode and nesting deeper than 256 levels rejected; conformance suite added.
- **1.0 (November 2026):** first version.
