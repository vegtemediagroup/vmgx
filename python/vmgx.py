"""
Copyright (c) 2026 Vegte Media Group. MIT License: free to use, change and share.
SPDX-License-Identifier: MIT

vmgx — reference parser for VMGX (Vegte Media Group Extended)
Language version 1.0, specification 1.0.1

A lightweight, human-readable data format for structured records,
rich metadata and long-term digital preservation.

    import vmgx
    data = vmgx.load(open("record.vmgx", encoding="utf-8"))
    text = vmgx.dumps(data)
    json_text = vmgx.to_json(data)               # plain JSON (data-preserving)
    json_text = vmgx.to_json(data, typed=True)   # typed JSON (type-preserving)

Command line (as `vmgx` after `pip install vmgx`, or `python vmgx.py`):
    python vmgx.py check     FILE.vmgx
    python vmgx.py to-json   FILE.vmgx  [--indent N] [--typed]
    python vmgx.py from-json FILE.json  [--typed]
    python vmgx.py fmt       FILE.vmgx
"""
from __future__ import annotations

import datetime as _dt
import json
import math
import re
import sys
import textwrap
from typing import Any

__all__ = ["loads", "load", "dumps", "dump", "to_json", "from_json",
           "Link", "VMGXError", "VERSION", "SPEC_VERSION"]

VERSION = "1.0"        # language version written in headers
SPEC_VERSION = "1.0.1"  # specification this parser follows
TYPED_KEYS = ("@date", "@datetime", "@link")
MAX_DEPTH = 256        # deepest nesting of objects and lists the parser accepts


class VMGXError(ValueError):
    """Raised when VMGX text is invalid. Carries line and column numbers."""

    def __init__(self, msg: str, line: int | None = None, col: int | None = None):
        self.msg, self.line, self.col = msg, line, col
        super().__init__(f"{msg} (line {line}, column {col})" if line else msg)


class Link(str):
    """A URL or URI, written as <https://...> in VMGX."""

    def __repr__(self) -> str:
        return f"Link({str.__repr__(self)})"


_IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_\-]*")
_DATETIME = re.compile(
    r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?")
_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_NUMBER = re.compile(r"-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?")
_HEADER = re.compile(r"@vmgx[ \t]+(\d+)\.(\d+)[ \t]*(?:#[^\n]*)?(?:\n|$)")
_BOUNDARY = set(" \t\n,]}#")
_CONTROL = re.compile(r"[\x00-\x08\x0B-\x1F\x7F]")
_ESC = {'"': '"', "\\": "\\", "/": "/", "n": "\n", "t": "\t",
        "r": "\r", "b": "\b", "f": "\f"}


def _text_body(raw: str) -> str:
    """Turn the raw contents of a \"\"\" text block into its string value."""
    if "\n" not in raw:
        return raw
    lines = raw.split("\n")
    if lines[0].strip() == "":          # newline right after the opening """
        lines = lines[1:]
    if lines and lines[-1].strip() == "":  # indentation before the closing """
        lines = lines[:-1]
    return textwrap.dedent("\n".join(lines))


class _Parser:
    def __init__(self, text: str):
        if text.startswith("\ufeff"):
            text = text[1:]
        self.s = text.replace("\r\n", "\n").replace("\r", "\n")
        self.i = 0
        self.depth = 0
        m = _CONTROL.search(self.s)
        if m:
            self.err(f"control character U+{ord(m.group()):04X} is not allowed", m.start())
        m = re.search(r"[\ud800-\udfff]", self.s)
        if m:
            self.err("invalid Unicode (unpaired surrogate)", m.start())

    # -- helpers ---------------------------------------------------------
    def err(self, msg: str, i: int | None = None):
        i = self.i if i is None else i
        line = self.s.count("\n", 0, i) + 1
        col = i - (self.s.rfind("\n", 0, i) + 1) + 1
        raise VMGXError(msg, line, col)

    def peek(self) -> str:
        return self.s[self.i] if self.i < len(self.s) else ""

    def boundary(self, j: int) -> bool:
        return j >= len(self.s) or self.s[j] in _BOUNDARY

    def skip_inline(self):
        """Skip spaces, tabs and comments, but not new lines."""
        while self.i < len(self.s):
            c = self.s[self.i]
            if c in " \t":
                self.i += 1
            elif c == "#":
                j = self.s.find("\n", self.i)
                self.i = len(self.s) if j < 0 else j
            else:
                break

    def skip_all(self):
        while True:
            self.skip_inline()
            if self.peek() == "\n":
                self.i += 1
            else:
                break

    # -- grammar ---------------------------------------------------------
    def document(self) -> dict:
        self.skip_all()
        m = _HEADER.match(self.s, self.i)
        if m:
            if int(m.group(1)) != 1:
                self.err(f"unsupported VMGX version {m.group(1)}.{m.group(2)}")
            self.i = m.end()
        elif re.match(r"@vmgx[ \t]", self.s[self.i:self.i + 6]):
            self.err("malformed header; expected '@vmgx' followed by major.minor, such as '@vmgx 1.0'")
        return self.members(close="")

    def members(self, close: str) -> dict:
        obj: dict[str, Any] = {}
        self.skip_all()
        while self.peek() != close:
            if not self.peek():
                self.err("unexpected end of file; missing '}'")
            kstart = self.i
            key = self.key()
            self.skip_inline()
            if self.peek() != ":":
                self.err(f"expected ':' after key '{key}'")
            self.i += 1
            self.skip_inline()
            if self.peek() in ("\n", ""):
                self.err(f"missing value for key '{key}'")
            if key in obj:
                self.err(f"duplicate key '{key}'", kstart)
            if key == "@vmgx":
                self.err("'@vmgx' is reserved for the header and cannot be used as a key", kstart)
            obj[key] = self.value()
            self.separator(close)
        return obj

    def separator(self, close: str):
        self.skip_inline()
        c = self.peek()
        if c == ",":
            self.i += 1
        elif c == "\n":
            pass
        elif c == close or c == "":
            return
        else:
            self.err("expected a comma or a new line between entries")
        self.skip_all()

    def key(self) -> str:
        c = self.peek()
        if c == '"':
            return self.string()
        start = self.i
        if c == "@":
            self.i += 1
        m = _IDENT.match(self.s, self.i)
        if not m:
            self.err("expected a key", start)
        self.i = m.end()
        return self.s[start:self.i]

    def value(self) -> Any:
        c = self.peek()
        if c in "{[" and c:
            self.depth += 1
            if self.depth > MAX_DEPTH:
                self.err(f"nesting too deep (more than {MAX_DEPTH} levels)")
            if c == "{":
                self.i += 1
                v = self.members(close="}")
                self.i += 1
            else:
                v = self.list()
            self.depth -= 1
            return v
        if c == '"':
            return self.text() if self.s.startswith('"""', self.i) else self.string()
        if c == "<":
            return self.link()
        for word, val in (("true", True), ("false", False), ("null", None)):
            if self.s.startswith(word, self.i) and self.boundary(self.i + len(word)):
                self.i += len(word)
                return val
        start = self.i
        m = _DATETIME.match(self.s, self.i)
        if m and self.boundary(m.end()):
            self.i = m.end()
            frac = re.search(r"\.(\d+)", m.group())
            if frac and len(frac.group(1)) > 6:
                self.err(f"invalid date-time '{m.group()}' (at most 6 decimals)", start)
            try:
                return _dt.datetime.fromisoformat(m.group().replace("Z", "+00:00"))
            except ValueError:
                self.err(f"invalid date-time '{m.group()}'", start)
        m = _DATE.match(self.s, self.i)
        if m and self.boundary(m.end()):
            self.i = m.end()
            try:
                return _dt.date.fromisoformat(m.group())
            except ValueError:
                self.err(f"invalid date '{m.group()}'", start)
        m = _NUMBER.match(self.s, self.i)
        if m and self.boundary(m.end()):
            self.i = m.end()
            t = m.group()
            if any(ch in t for ch in ".eE"):
                f = float(t)
                if not math.isfinite(f):
                    self.err(f"number out of range '{t}'", start)
                return f
            return int(t)
        word = re.match(r"[^\s,\]}#]+", self.s[self.i:])
        hint = f" '{word.group()}'" if word else ""
        self.err(f"unrecognized value{hint} (text must be in quotes)")

    def list(self) -> list:
        self.i += 1
        out: list[Any] = []
        self.skip_all()
        while self.peek() != "]":
            if not self.peek():
                self.err("unexpected end of file; missing ']'")
            out.append(self.value())
            self.separator("]")
        self.i += 1
        return out

    def string(self) -> str:
        start = self.i
        self.i += 1
        buf: list[str] = []
        while True:
            if self.i >= len(self.s) or self.s[self.i] == "\n":
                self.err("unterminated string (use \"\"\" for text over several lines)", start)
            c = self.s[self.i]
            if c == '"':
                self.i += 1
                break
            if c != "\\":
                buf.append(c)
                self.i += 1
                continue
            e = self.s[self.i + 1:self.i + 2]
            if e in _ESC:
                buf.append(_ESC[e])
                self.i += 2
            elif e == "u" and self.s[self.i + 2:self.i + 3] == "{":
                m = re.match(r"\\u\{([0-9a-fA-F]{1,6})\}", self.s[self.i:])
                if not m or int(m.group(1), 16) > 0x10FFFF:
                    self.err("invalid escape; expected \\u{1F600} form")
                buf.append(chr(int(m.group(1), 16)))
                self.i += m.end()
            elif e == "u":
                h = self.s[self.i + 2:self.i + 6]
                if not re.fullmatch(r"[0-9a-fA-F]{4}", h):
                    self.err("invalid \\u escape")
                buf.append(chr(int(h, 16)))
                self.i += 6
            else:
                self.err(f"invalid escape '\\{e}'")
        out = "".join(buf)
        try:  # join JSON-style surrogate pairs (\uD83D\uDE00)
            out = out.encode("utf-16", "surrogatepass").decode("utf-16")
        except UnicodeDecodeError:
            self.err("invalid surrogate in \\u escape", start)
        return out

    def text(self) -> str:
        start = self.i
        end = self.s.find('"""', self.i + 3)
        if end < 0:
            self.err('unterminated text block; missing closing """', start)
        raw = self.s[self.i + 3:end]
        self.i = end + 3
        return _text_body(raw)

    def link(self) -> Link:
        start = self.i
        end = self.s.find(">", self.i)
        nl = self.s.find("\n", self.i)
        if end < 0 or 0 <= nl < end:
            self.err("unterminated link; missing '>'", start)
        url = self.s[self.i + 1:end].strip()
        if not url or any(ch.isspace() for ch in url):
            self.err("a link cannot be empty or contain spaces", start)
        self.i = end + 1
        return Link(url)


# -- public API ----------------------------------------------------------

def loads(text: str) -> dict:
    """Parse VMGX text into Python data."""
    return _Parser(text).document()


def load(fp) -> dict:
    return loads(fp.read())


def _quote(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def _key(k: Any) -> str:
    if not isinstance(k, str):
        raise TypeError(f"keys must be strings, not {type(k).__name__}")
    if k == "@vmgx":
        raise ValueError("'@vmgx' is reserved for the header and cannot be used as a key")
    bare = k[1:] if k.startswith("@") else k
    return k if _IDENT.fullmatch(bare) else _quote(k)


def _dump_value(v: Any, level: int, ind: int) -> str:
    pad = " " * (level * ind)
    inner = " " * ((level + 1) * ind)
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, Link):
        return f"<{v}>"
    if isinstance(v, _dt.datetime):
        iso = v.isoformat()
        return iso[:-6] + "Z" if iso.endswith("+00:00") else iso
    if isinstance(v, _dt.date):
        return v.isoformat()
    if isinstance(v, (int, float)):
        if isinstance(v, float) and not math.isfinite(v):
            raise ValueError("VMGX numbers cannot be NaN or infinite")
        return repr(v)
    if isinstance(v, str):
        if "\n" in v and '"""' not in v and not re.search(r"[\x00-\x08\x0B-\x1F\x7F]", v):
            block = '"""\n' + "\n".join(inner + ln if ln else "" for ln in v.split("\n")) \
                    + "\n" + inner + '"""'
            if _text_body(block[3:-3]) == v:
                return block
        return _quote(v)
    if isinstance(v, dict):
        if not v:
            return "{}"
        return "{\n" + "\n".join(_dump_members(v, level + 1, ind)) + "\n" + pad + "}"
    if isinstance(v, (list, tuple)):
        if not v:
            return "[]"
        items = [_dump_value(x, level + 1, ind) for x in v]
        if all(not isinstance(x, (dict, list, tuple)) for x in v) \
                and not any("\n" in x for x in items) and sum(map(len, items)) < 60:
            return "[" + ", ".join(items) + "]"
        return "[\n" + "\n".join(inner + x for x in items) + "\n" + pad + "]"
    raise TypeError(f"cannot write {type(v).__name__} to VMGX")


def _dump_members(obj: dict, level: int, ind: int) -> list[str]:
    pad = " " * (level * ind)
    return [f"{pad}{_key(k)}: {_dump_value(v, level, ind)}" for k, v in obj.items()]


def dumps(data: dict, *, header: bool = True, indent: int = 2) -> str:
    """Write Python data as VMGX text. The top level must be a dict."""
    if not isinstance(data, dict):
        raise TypeError("a VMGX document must be an object (dict) at the top level")
    lines = [f"@vmgx {VERSION}", ""] if header else []
    lines += _dump_members(data, 0, indent)
    return "\n".join(lines).rstrip("\n") + "\n"


def dump(data: dict, fp, **kw) -> None:
    fp.write(dumps(data, **kw))


def _iso(v: _dt.date) -> str:
    if isinstance(v, _dt.datetime):
        iso = v.isoformat()
        return iso[:-6] + "Z" if iso.endswith("+00:00") else iso
    return v.isoformat()


def _plain(v: Any, typed: bool) -> Any:
    if isinstance(v, dict):
        return {k: _plain(x, typed) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_plain(x, typed) for x in v]
    if isinstance(v, _dt.datetime):
        return {"@datetime": _iso(v)} if typed else _iso(v)
    if isinstance(v, _dt.date):
        return {"@date": _iso(v)} if typed else _iso(v)
    if isinstance(v, Link):
        return {"@link": str(v)} if typed else str(v)
    return v


def _typed_value(key: str, text: Any) -> Any:
    if not isinstance(text, str):
        raise ValueError(f"typed JSON: '{key}' must hold a string")
    if key == "@link":
        if not text.strip() or any(ch.isspace() for ch in text):
            raise ValueError(f"typed JSON: invalid link {text!r}")
        return Link(text)
    p = _Parser(text)
    try:
        v = p.value()
    except VMGXError:
        v = None
    want = _dt.datetime if key == "@datetime" else _dt.date
    if p.i != len(p.s) or not isinstance(v, want) or (key == "@date" and isinstance(v, _dt.datetime)):
        raise ValueError(f"typed JSON: invalid {key[1:]} {text!r}")
    return v


def _untype(v: Any) -> Any:
    if isinstance(v, dict):
        if len(v) == 1:
            (k, x), = v.items()
            if k in TYPED_KEYS:
                return _typed_value(k, x)
        return {k: _untype(x) for k, x in v.items()}
    if isinstance(v, list):
        return [_untype(x) for x in v]
    return v


def to_json(data: dict | str, *, indent: int | None = 2, typed: bool = False) -> str:
    """Convert VMGX (text or parsed data) to JSON.

    Plain mode (default) is data-preserving: dates, date-times and links become
    strings. Typed mode is type-preserving: they become {"@date": ...},
    {"@datetime": ...} and {"@link": ...}, so from_json(..., typed=True) restores
    them. Comments are never carried into JSON.
    """
    if isinstance(data, str):
        data = loads(data)
    return json.dumps(_plain(data, typed), ensure_ascii=False, indent=indent)


def from_json(json_text: str, *, typed: bool = False, **kw) -> str:
    """Convert a JSON object to VMGX text. With typed=True, {"@date": ...},
    {"@datetime": ...} and {"@link": ...} objects become native values."""
    data = json.loads(json_text)
    if not isinstance(data, dict):
        raise TypeError("only a JSON object can become a VMGX document")
    if typed:
        data = _untype(data)
    return dumps(data, **kw)


# -- command line --------------------------------------------------------

def _main(argv: list[str]) -> int:
    import argparse
    p = argparse.ArgumentParser(prog="vmgx", description=f"VMGX tools (specification {SPEC_VERSION})")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name, helptext in (("check", "validate a .vmgx file"),
                           ("to-json", "convert .vmgx to JSON"),
                           ("from-json", "convert JSON to .vmgx"),
                           ("fmt", "reformat a .vmgx file")):
        sp = sub.add_parser(name, help=helptext)
        sp.add_argument("file")
        if name == "to-json":
            sp.add_argument("--indent", type=int, default=2)
        if name in ("to-json", "from-json"):
            sp.add_argument("--typed", action="store_true",
                            help="keep dates and links as typed objects")
    a = p.parse_args(argv)
    with open(a.file, encoding="utf-8") as f:
        src = f.read()
    try:
        if a.cmd == "check":
            loads(src)
            print(f"{a.file}: valid VMGX")
        elif a.cmd == "to-json":
            print(to_json(src, indent=a.indent, typed=a.typed))
        elif a.cmd == "from-json":
            sys.stdout.write(from_json(src, typed=a.typed))
        elif a.cmd == "fmt":
            sys.stdout.write(dumps(loads(src)))
    except (VMGXError, ValueError, TypeError) as e:
        print(f"{a.file}: {e}", file=sys.stderr)
        return 1
    return 0


def main() -> None:
    """Entry point for the `vmgx` command."""
    sys.exit(_main(sys.argv[1:]))


if __name__ == "__main__":
    main()
