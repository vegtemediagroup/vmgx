# VMGX conformance suite (specification 1.0.1)

A parser conforms to VMGX 1.0 when it passes every case here.

- `valid/NAME.vmgx` must parse. Converted to **typed JSON**, the result must equal
  `valid/NAME.json` (compare parsed JSON values, not text). Writing the result back to
  VMGX and parsing it again must give the same data.
- `invalid/NAME.vmgx` must be rejected with an error. Error wording is up to the parser;
  reporting the line and column is recommended.

Typed JSON writes dates as `{"@date": "..."}`, date-times as `{"@datetime": "..."}` and
links as `{"@link": "..."}`. Date-times are compared in canonical form: seconds always
present, fractions as six digits, `Z` for UTC.

Files are UTF-8. Some cases contain CR, CRLF, a byte-order mark or a control character on
purpose; read them as bytes and decode as UTF-8 without changing line endings.

Run the reference checks:

    python run_conformance.py
    node run_conformance.js

## License

MIT License. Copyright (c) 2026 Vegte Media Group. Free to use, change and share; see LICENSE.
