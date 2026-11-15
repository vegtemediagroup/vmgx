# vmgx

The reference Python parser for **VMGX**, a lightweight, human-readable data format for structured records, rich metadata and long-term digital preservation.

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

One module, standard library only, Python 3.11 or later. It passes the full VMGX conformance suite.

## Install

```
pip install vmgx
```

## Use

```python
import vmgx

with open("record.vmgx", encoding="utf-8") as f:
    record = vmgx.load(f)

record["title"]          # 'Northern Light'
record["published"]      # datetime.date(2027, 3, 1)
record["website"]        # Link('https://example.com/books/northern-light')

vmgx.dumps(record)                   # back to VMGX text
vmgx.to_json(record)                 # plain JSON: dates and links become strings
vmgx.to_json(record, typed=True)     # typed JSON: {"@date": "2027-03-01"} keeps the type
vmgx.from_json(json_text, typed=True)
```

Invalid input raises `vmgx.VMGXError` with `line`, `col` and `msg`:

```python
try:
    vmgx.loads("name: Alex")
except vmgx.VMGXError as e:
    print(e)   # unrecognized value 'Alex' (text must be in quotes) (line 1, column 7)
```

## Command line

```
vmgx check     record.vmgx
vmgx to-json   record.vmgx [--typed] [--indent N]
vmgx from-json data.json   [--typed]
vmgx fmt       record.vmgx
```

## Values

| VMGX | Python |
| --- | --- |
| `"text"`, `"""text block"""` | `str` |
| `248`, `19.95` | `int`, `float` |
| `true`, `false`, `null` | `True`, `False`, `None` |
| `2027-03-01` | `datetime.date` |
| `2026-11-14T22:30:00+01:00` | `datetime.datetime` |
| `<https://example.com>` | `vmgx.Link` (a `str` subclass) |
| `{ … }`, `[ … ]` | `dict`, `list` |

## Learn more

- Specification, playground and conformance suite: <https://vmgx.vegte.org>
- Source code and issues: <https://codeberg.org/vmgx/vmgx>

## License

MIT License. Copyright (c) 2026 Vegte Media Group.
