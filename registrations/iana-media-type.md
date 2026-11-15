# IANA media type registration: application/vnd.vmg.vmgx

**Where to submit:** <https://www.iana.org/form/media-types>
**Procedure:** vendor tree, Expert Review. No fee.

Copy each answer below into the matching field of the form. Fill in the two fields marked ✎ yourself.

> **Privacy:** the contact name and email become part of the public IANA registry. Use a role address for Vegte Media Group (for example `vmgx@…` on your own domain) rather than a personal one. A role name such as "VMGX Maintainers" is acceptable as the contact name.

---

**Type name:**
application

**Subtype name:**
vnd.vmg.vmgx

**Required parameters:**
N/A

**Optional parameters:**
N/A. VMGX is always UTF-8; a charset parameter is not used.

**Encoding considerations:**
8bit. VMGX is UTF-8 text. Lines may end with LF, CRLF or CR. A UTF-8 byte-order mark at the start is allowed and ignored.

**Security considerations:**
VMGX is a data-only format. It has no active content, no executable code, no includes and no references to other files, so reading a document cannot cause code to run or other resources to be loaded. Values written as links (URIs in angle brackets) are data; processors should not dereference them automatically and should only present http, https and mailto links as clickable. Nesting of objects and lists is limited to 256 levels by the specification, so a hostile document cannot exhaust a parser's stack. Very large documents can consume memory in proportion to their size; processors that accept documents from untrusted sources should limit document size. Control characters and invalid Unicode are errors, which prevents some classes of display spoofing. VMGX does not provide integrity or confidentiality; documents may contain personal data in metadata (for example, authors), and should be protected accordingly by the transport or storage that carries them.

**Interoperability considerations:**
VMGX converts losslessly to JSON (RFC 8259) at the data level. In "typed JSON" mode, dates, date-times and links are carried as single-key objects ({"@date": …}, {"@datetime": …}, {"@link": …}) so that their types survive a round trip. Date-times follow RFC 3339 / ISO 8601. A public conformance suite (16 valid and 42 invalid documents) defines exactly what processors must accept and reject; two independent reference implementations (JavaScript and Python) pass it. Source and suite: https://codeberg.org/vmgx/vmgx

**Published specification:**
VMGX Specification 1.0.1, Vegte Media Group, November 2026: https://vmgx.vegte.org/spec.html

**Applications that use this media type:**
Software for storing, archiving, publishing and exchanging structured records and their metadata; the reference parsers "@vmgx/vmgx" (npm) and "vmgx" (PyPI); VMGX for Mac (editor and Finder Quick Look preview); the VMGX extension for Visual Studio Code; the VMGX website playground.

**Fragment identifier considerations:**
N/A

**Additional information:**

- Deprecated alias names for this type: application/x-vmgx
- Magic number(s): A document may begin with the header "@vmgx " followed by a version (hex 40 76 6D 67 78 20), optionally preceded by a UTF-8 byte-order mark (EF BB BF). The header is optional, so not all documents carry it; the specification recommends it for documents meant for archiving or exchange.
- File extension(s): .vmgx
- Macintosh file type code(s): N/A (Uniform Type Identifier: org.vegte.vmgx)
- Object Identifier(s) or OID(s): N/A

**Person & email address to contact for further information:**
✎ [contact name], [role email address]

**Intended usage:**
COMMON

**Restrictions on usage:**
None

**Author:**
Vegte Media Group

**Change controller:**
Vegte Media Group

**Provisional registration?**
No

---

## After you submit

- IANA forwards the request to a media types expert. They may ask questions by email, usually about the security or interoperability text. Reply in plain language; I can help draft answers.
- Optional but encouraged: post the template to the media-types@iana.org mailing list for review first. Reviewers there often spot issues before the expert does.
- Once registered, the site, the spec and the Mac app already use `application/vnd.vmg.vmgx`. Remove "(registration with IANA pending)" from section 2 of the spec.
