# PRONOM submission: VMGX

PRONOM is the file format registry of The National Archives (UK). Archives and digital preservation tools worldwide (including DROID, Siegfried and Archivematica) use it to identify files. An entry gives VMGX a permanent identifier (a "PUID", such as `fmt/1234`), which archives can cite and which Wikidata can link to.

**Where to submit:** the PRONOM request form at
<https://www.nationalarchives.gov.uk/contact-us/submit-information-for-pronom/pronom-request-form/>
Choose **New entry**. Your contact details are used only for follow-up questions; they are not published.

**When:** PRONOM prioritizes formats that matter to the preservation community. A submission is stronger once VMGX is in real use (your own archive or publishing records count) and the packages are published. It is fine to submit early; mention current use honestly.

**Attach:** `vmgx-pronom-samples.zip` (sample files that carry the header, and two without it).

---

## Answers for the form

**Format name:** VMGX (Vegte Media Group Extended)

**Version:** 1.0

**Other names:** VMGX document

**Format type / classification:** Dataset; Text (structured)

**Description:**
VMGX is a lightweight, human-readable, text-based format for structured records and their metadata, designed for creative work, archiving and web publishing. It is derived from JSON's data model and adds comments, native date and date-time values, native links (URIs), multi-line text blocks, and a metadata convention in which keys beginning with "@" (such as @id, @created, @source and @license) describe the record they belong to. Documents are UTF-8 text. VMGX converts to JSON without loss of data, and to "typed JSON" without loss of types. The format is fully specified, has a public conformance suite, and two reference implementations (JavaScript and Python).

**Developer / Supported by:** Vegte Media Group

**Release date:** November 2026 (language 1.0; specification 1.0.1)

**Specification:** VMGX Specification 1.0.1 — https://vmgx.vegte.org/spec.html (CC BY 4.0)

**Source code and conformance suite:** https://codeberg.org/vmgx/vmgx

**File extension:** vmgx

**MIME type:** application/vnd.vmg.vmgx (IANA registration pending; previously application/x-vmgx)

**Byte order:** N/A (UTF-8 text)

**Character encoding:** UTF-8, optional byte-order mark

**Disclosure / openness:** Open. Specification under CC BY 4.0; reference code under the MIT License.

**Compression:** None

**Internal signatures:**
A VMGX document may begin with a version header. When present, it is the first non-empty line. Files meant for archiving or exchange are recommended to carry it.

| Signature | Position | Byte sequence (hex) | Meaning |
| --- | --- | --- | --- |
| VMGX 1.x header | BOF, offset 0 | `40 76 6D 67 78 20 31 2E` | `@vmgx 1.` |
| VMGX 1.x header after BOM | BOF, offset 0 | `EF BB BF 40 76 6D 67 78 20 31 2E` | BOM + `@vmgx 1.` |

In DROID byte-sequence notation: `40766D677820312E` and `EFBBBF40766D677820312E`, both anchored at BOF offset 0. The header may also be preceded by blank lines or `#` comment lines; such files, and files without a header, can only be identified by extension. The PRONOM team may prefer to refine the signature; any variant matching `@vmgx` followed by a space or tab and a major version digit at the start of the file is safe.

**Related formats:** Derived from JSON (the "JSON Data Interchange Format" entry in PRONOM). Converts to JSON.

**Software that creates or reads it:** vmgx (npm, JavaScript), vmgx (PyPI, Python, with command-line tool), VMGX for Mac, VMGX for Visual Studio Code.

**Notes:**
A public conformance suite of 16 valid and 42 invalid documents defines exactly which documents are VMGX. Nesting is limited to 256 levels. Control characters and invalid Unicode are not allowed.
