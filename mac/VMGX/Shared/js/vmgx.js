/*!
 * Copyright (c) 2026 Vegte Media Group. MIT License: free to use, change and share.
 * SPDX-License-Identifier: MIT
 *
 * vmgx.js — reference parser for VMGX (Vegte Media Group Extended)
 * Language version 1.0, specification 1.0.1 · Vegte Media Group
 *
 * A lightweight, human-readable data format for structured records,
 * rich metadata and long-term digital preservation.
 *
 * Browser:  <script src="vmgx.js"></script>  →  window.VMGX
 * Node:     const VMGX = require("./vmgx.js")
 *
 *   const data = VMGX.parse(text);          // VMGX text → JavaScript value
 *   const text = VMGX.stringify(data);      // JavaScript value → VMGX text
 *   const json = VMGX.toJSON(text);                  // plain JSON (data-preserving)
 *   const json = VMGX.toJSON(text, { typed: true }); // typed JSON (type-preserving)
 *   const vmgx = VMGX.fromJSON(jsonText, { typed: true });
 *
 * Dates, date-times and links are returned as VMGX.VDate, VMGX.VDateTime and
 * VMGX.Link objects. Each has toString() and toJSON(), so JSON.stringify works.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VMGX = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0";          // language version written in headers
  var SPEC_VERSION = "1.0.1";   // specification this parser follows
  var TYPED_KEYS = ["@date", "@datetime", "@link"];
  var MAX_DEPTH = 256;          // deepest nesting of objects and lists the parser accepts

  // -- value classes -----------------------------------------------------

  class VMGXError extends SyntaxError {
    constructor(reason, line, column) {
      super(line ? reason + " (line " + line + ", column " + column + ")" : reason);
      this.name = "VMGXError";
      this.reason = reason;
      this.line = line;
      this.column = column;
    }
  }

  /** A URL or URI, written as <https://...> in VMGX. */
  class Link {
    constructor(href) { this.href = String(href); }
    toString() { return this.href; }
    toJSON() { return this.href; }
  }

  function pad(n, w) { return String(n).padStart(w, "0"); }
  function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  /** A calendar date with no time, such as 2027-03-01. */
  class VDate {
    constructor(year, month, day) {
      if (!(month >= 1 && month <= 12 && day >= 1 && day <= daysIn(year, month)) || year < 1)
        throw new RangeError("invalid date");
      this.year = year; this.month = month; this.day = day;
    }
    toString() { return pad(this.year, 4) + "-" + pad(this.month, 2) + "-" + pad(this.day, 2); }
    toJSON() { return this.toString(); }
    /** Midnight UTC on this date, as a JavaScript Date. */
    toDate() { var d = new Date(Date.UTC(2000, this.month - 1, this.day)); d.setUTCFullYear(this.year); return d; }
  }

  /**
   * A date and time, such as 2026-11-14T22:30:00+01:00.
   * offset is minutes east of UTC, or null when the time zone is not given.
   */
  class VDateTime {
    constructor(year, month, day, hour, minute, second, fraction, offset) {
      new VDate(year, month, day); // validates the date part
      if (hour > 23 || minute > 59 || second > 59) throw new RangeError("invalid time");
      if (offset !== null && Math.abs(offset) >= 24 * 60) throw new RangeError("invalid offset");
      this.year = year; this.month = month; this.day = day;
      this.hour = hour; this.minute = minute; this.second = second;
      this.fraction = fraction || ""; // digits after the decimal point, up to 6
      this.offset = offset;
    }
    toString() {
      var s = pad(this.year, 4) + "-" + pad(this.month, 2) + "-" + pad(this.day, 2) + "T" +
        pad(this.hour, 2) + ":" + pad(this.minute, 2) + ":" + pad(this.second, 2);
      if (this.fraction && /[1-9]/.test(this.fraction)) s += "." + this.fraction.padEnd(6, "0");
      if (this.offset === null) return s;
      if (this.offset === 0) return s + "Z";
      var a = Math.abs(this.offset);
      return s + (this.offset < 0 ? "-" : "+") + pad(Math.floor(a / 60), 2) + ":" + pad(a % 60, 2);
    }
    toJSON() { return this.toString(); }
    /** As a JavaScript Date. A date-time without a time zone is read as UTC. */
    toDate() {
      var ms = Number((this.fraction + "000").slice(0, 3));
      var t = Date.UTC(2000, this.month - 1, this.day, this.hour, this.minute, this.second, ms);
      var d = new Date(t); d.setUTCFullYear(this.year);
      return new Date(d.getTime() - (this.offset || 0) * 60000);
    }
  }

  // -- parser -------------------------------------------------------------

  var IDENT = /[A-Za-z_][A-Za-z0-9_\-]*/y;
  var IDENT_FULL = /^[A-Za-z_][A-Za-z0-9_\-]*$/;
  var DATETIME = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:\d{2})?/y;
  var DATE = /(\d{4})-(\d{2})-(\d{2})/y;
  var NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  var HEADER = /@vmgx[ \t]+(\d+)\.(\d+)[ \t]*(?:#[^\n]*)?(?:\n|$)/y;
  var BOUNDARY = " \t\n,]}#";
  var ESC = { '"': '"', "\\": "\\", "/": "/", n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };
  var LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  function matchAt(re, s, i) { re.lastIndex = i; return re.exec(s); }

  function dedent(s) {
    var lines = s.split("\n"), margin = null;
    lines.forEach(function (l) {
      if (/^[ \t]*$/.test(l)) return;
      var ind = /^[ \t]*/.exec(l)[0];
      if (margin === null) { margin = ind; return; }
      var k = 0;
      while (k < margin.length && k < ind.length && margin[k] === ind[k]) k++;
      margin = margin.slice(0, k);
    });
    return lines.map(function (l) {
      return /^[ \t]+$/.test(l) ? "" : l.slice(margin ? margin.length : 0);
    }).join("\n");
  }

  /** Turn the raw contents of a """ text block into its string value. */
  function textBody(raw) {
    if (raw.indexOf("\n") < 0) return raw;
    var lines = raw.split("\n");
    if (/^\s*$/.test(lines[0])) lines.shift();
    if (lines.length && /^\s*$/.test(lines[lines.length - 1])) lines.pop();
    return dedent(lines.join("\n"));
  }

  function Parser(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    this.s = text.replace(/\r\n?/g, "\n");
    this.i = 0;
    this.depth = 0;
    var m = /[\x00-\x08\x0B-\x1F\x7F]/.exec(this.s);
    if (m) this.err("control character U+" + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") +
      " is not allowed", m.index);
    m = LONE_SURROGATE.exec(this.s);
    if (m) this.err("invalid Unicode (unpaired surrogate)", m.index + (m[1] || "").length);
  }

  Parser.prototype = {
    err: function (msg, at) {
      var i = at === undefined ? this.i : at;
      var before = this.s.slice(0, i);
      var line = before.split("\n").length;
      var col = i - (before.lastIndexOf("\n") + 1) + 1;
      throw new VMGXError(msg, line, col);
    },
    peek: function () { return this.i < this.s.length ? this.s[this.i] : ""; },
    boundary: function (j) { return j >= this.s.length || BOUNDARY.indexOf(this.s[j]) >= 0; },
    skipInline: function () {
      while (this.i < this.s.length) {
        var c = this.s[this.i];
        if (c === " " || c === "\t") this.i++;
        else if (c === "#") { var j = this.s.indexOf("\n", this.i); this.i = j < 0 ? this.s.length : j; }
        else break;
      }
    },
    skipAll: function () {
      for (;;) { this.skipInline(); if (this.peek() === "\n") this.i++; else break; }
    },

    document: function () {
      this.skipAll();
      var m = matchAt(HEADER, this.s, this.i);
      if (m) {
        if (Number(m[1]) !== 1) this.err("unsupported VMGX version " + m[1] + "." + m[2]);
        this.i = HEADER.lastIndex;
      } else if (/^@vmgx[ \t]/.test(this.s.slice(this.i, this.i + 6))) {
        this.err("malformed header; expected '@vmgx' followed by major.minor, such as '@vmgx 1.0'");
      }
      return this.members("");
    },

    members: function (close) {
      var obj = {};
      this.skipAll();
      while (this.peek() !== close) {
        if (!this.peek()) this.err("unexpected end of file; missing '}'");
        var kstart = this.i, key = this.key();
        this.skipInline();
        if (this.peek() !== ":") this.err("expected ':' after key '" + key + "'");
        this.i++;
        this.skipInline();
        if (this.peek() === "\n" || this.peek() === "") this.err("missing value for key '" + key + "'");
        if (Object.prototype.hasOwnProperty.call(obj, key)) this.err("duplicate key '" + key + "'", kstart);
        if (key === "@vmgx") this.err("'@vmgx' is reserved for the header and cannot be used as a key", kstart);
        var v = this.value();
        Object.defineProperty(obj, key, { value: v, enumerable: true, writable: true, configurable: true });
        this.separator(close);
      }
      return obj;
    },

    separator: function (close) {
      this.skipInline();
      var c = this.peek();
      if (c === ",") this.i++;
      else if (c === "\n") { /* fine */ }
      else if (c === close || c === "") return;
      else this.err("expected a comma or a new line between entries");
      this.skipAll();
    },

    key: function () {
      var c = this.peek();
      if (c === '"') return this.string();
      var start = this.i;
      if (c === "@") this.i++;
      var m = matchAt(IDENT, this.s, this.i);
      if (!m) this.err("expected a key", start);
      this.i = IDENT.lastIndex;
      return this.s.slice(start, this.i);
    },

    value: function () {
      var c = this.peek(), m, start = this.i;
      if (c === "{" || c === "[") {
        if (++this.depth > MAX_DEPTH) this.err("nesting too deep (more than " + MAX_DEPTH + " levels)");
        var v;
        if (c === "{") { this.i++; v = this.members("}"); this.i++; }
        else v = this.list();
        this.depth--;
        return v;
      }
      if (c === '"') return this.s.startsWith('"""', this.i) ? this.text() : this.string();
      if (c === "<") return this.link();
      var words = [["true", true], ["false", false], ["null", null]];
      for (var w = 0; w < words.length; w++) {
        var word = words[w][0];
        if (this.s.startsWith(word, this.i) && this.boundary(this.i + word.length)) {
          this.i += word.length;
          return words[w][1];
        }
      }
      m = matchAt(DATETIME, this.s, this.i);
      if (m && this.boundary(DATETIME.lastIndex)) {
        this.i = DATETIME.lastIndex;
        var off = null;
        if (m[8] === "Z") off = 0;
        else if (m[8]) off = (m[8][0] === "-" ? -1 : 1) * (Number(m[8].slice(1, 3)) * 60 + Number(m[8].slice(4, 6)));
        if (m[7] && m[7].length > 6) this.err("invalid date-time '" + m[0] + "' (at most 6 decimals)", start);
        try {
          return new VDateTime(+m[1], +m[2], +m[3], +m[4], +m[5], m[6] ? +m[6] : 0, m[7] || "", off);
        } catch (e) { this.err("invalid date-time '" + m[0] + "'", start); }
      }
      m = matchAt(DATE, this.s, this.i);
      if (m && this.boundary(DATE.lastIndex)) {
        this.i = DATE.lastIndex;
        try { return new VDate(+m[1], +m[2], +m[3]); }
        catch (e) { this.err("invalid date '" + m[0] + "'", start); }
      }
      m = matchAt(NUMBER, this.s, this.i);
      if (m && this.boundary(NUMBER.lastIndex)) {
        this.i = NUMBER.lastIndex;
        var n = Number(m[0]);
        if (!isFinite(n)) this.err("number out of range '" + m[0] + "'", start);
        return n;
      }
      var bad = /^[^\s,\]}#]+/.exec(this.s.slice(this.i));
      this.err("unrecognized value" + (bad ? " '" + bad[0] + "'" : "") + " (text must be in quotes)");
    },

    list: function () {
      this.i++;
      var out = [];
      this.skipAll();
      while (this.peek() !== "]") {
        if (!this.peek()) this.err("unexpected end of file; missing ']'");
        out.push(this.value());
        this.separator("]");
      }
      this.i++;
      return out;
    },

    string: function () {
      var start = this.i, buf = "";
      this.i++;
      for (;;) {
        if (this.i >= this.s.length || this.s[this.i] === "\n")
          this.err('unterminated string (use """ for text over several lines)', start);
        var c = this.s[this.i];
        if (c === '"') { this.i++; break; }
        if (c !== "\\") { buf += c; this.i++; continue; }
        var e = this.s[this.i + 1] || "";
        if (Object.prototype.hasOwnProperty.call(ESC, e)) { buf += ESC[e]; this.i += 2; }
        else if (e === "u" && this.s[this.i + 2] === "{") {
          var mm = /^\\u\{([0-9a-fA-F]{1,6})\}/.exec(this.s.slice(this.i, this.i + 12));
          if (!mm || parseInt(mm[1], 16) > 0x10ffff) this.err("invalid escape; expected \\u{1F600} form");
          buf += String.fromCodePoint(parseInt(mm[1], 16));
          this.i += mm[0].length;
        } else if (e === "u") {
          var h = this.s.slice(this.i + 2, this.i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(h)) this.err("invalid \\u escape");
          buf += String.fromCharCode(parseInt(h, 16));
          this.i += 6;
        } else this.err("invalid escape '\\" + e + "'");
      }
      if (LONE_SURROGATE.test(buf)) this.err("invalid surrogate in \\u escape", start);
      return buf;
    },

    text: function () {
      var start = this.i, end = this.s.indexOf('"""', this.i + 3);
      if (end < 0) this.err('unterminated text block; missing closing """', start);
      var raw = this.s.slice(this.i + 3, end);
      this.i = end + 3;
      return textBody(raw);
    },

    link: function () {
      var start = this.i, end = this.s.indexOf(">", this.i), nl = this.s.indexOf("\n", this.i);
      if (end < 0 || (nl >= 0 && nl < end)) this.err("unterminated link; missing '>'", start);
      var url = this.s.slice(this.i + 1, end).trim();
      if (!url || /\s/.test(url)) this.err("a link cannot be empty or contain spaces", start);
      this.i = end + 1;
      return new Link(url);
    }
  };

  // -- writer -------------------------------------------------------------

  function quote(s) {
    return JSON.stringify(s);
  }

  function writeKey(k) {
    if (k === "@vmgx") throw new TypeError("'@vmgx' is reserved for the header and cannot be used as a key");
    var bare = k.charAt(0) === "@" ? k.slice(1) : k;
    return IDENT_FULL.test(bare) ? k : quote(k);
  }

  function isContainer(v) { return v !== null && typeof v === "object" && (Array.isArray(v) || isPlain(v)); }
  function isPlain(v) {
    if (v === null || typeof v !== "object") return false;
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }

  function writeValue(v, level, ind) {
    var pad = " ".repeat(level * ind), inner = " ".repeat((level + 1) * ind);
    if (v === null || v === undefined) return "null";
    if (v === true) return "true";
    if (v === false) return "false";
    if (v instanceof Link || v instanceof VDate || v instanceof VDateTime)
      return v instanceof Link ? "<" + v.href + ">" : v.toString();
    if (v instanceof Date) {
      if (isNaN(v)) throw new TypeError("cannot write an invalid Date");
      return v.toISOString().replace(/\.000Z$/, "Z");
    }
    if (typeof v === "number") {
      if (!isFinite(v)) throw new TypeError("VMGX numbers cannot be NaN or infinite");
      return String(v);
    }
    if (typeof v === "bigint") return v.toString();
    if (typeof v === "string") {
      if (v.indexOf("\n") >= 0 && v.indexOf('"""') < 0 && !/[\x00-\x08\x0B-\x1F\x7F]/.test(v)) {
        var block = '"""\n' + v.split("\n").map(function (l) { return l ? inner + l : ""; }).join("\n") +
          "\n" + inner + '"""';
        if (textBody(block.slice(3, -3)) === v) return block;
      }
      return quote(v);
    }
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      var items = v.map(function (x) { return writeValue(x, level + 1, ind); });
      var flat = !v.some(isContainer) && !items.some(function (x) { return x.indexOf("\n") >= 0; }) &&
        items.join("").length < 60;
      if (flat) return "[" + items.join(", ") + "]";
      return "[\n" + items.map(function (x) { return inner + x; }).join("\n") + "\n" + pad + "]";
    }
    if (isPlain(v)) {
      var keys = Object.keys(v);
      if (!keys.length) return "{}";
      return "{\n" + writeMembers(v, level + 1, ind).join("\n") + "\n" + pad + "}";
    }
    throw new TypeError("cannot write " + Object.prototype.toString.call(v) + " to VMGX");
  }

  function writeMembers(obj, level, ind) {
    var pad = " ".repeat(level * ind);
    return Object.keys(obj).filter(function (k) { return obj[k] !== undefined; }).map(function (k) {
      return pad + writeKey(k) + ": " + writeValue(obj[k], level, ind);
    });
  }

  // -- public API ---------------------------------------------------------

  /** Parse VMGX text into a JavaScript object. Throws VMGXError on invalid input. */
  function parse(text) {
    if (typeof text !== "string") throw new TypeError("VMGX.parse expects a string");
    return new Parser(text).document();
  }

  /** Write a JavaScript object as VMGX text. options: { header: true, indent: 2 } */
  function stringify(data, options) {
    options = options || {};
    var header = options.header !== false, ind = options.indent === undefined ? 2 : options.indent;
    if (!isPlain(data)) throw new TypeError("a VMGX document must be an object at the top level");
    var lines = header ? ["@vmgx " + VERSION, ""] : [];
    lines = lines.concat(writeMembers(data, 0, ind));
    return lines.join("\n").replace(/\n+$/, "") + "\n";
  }

  /** Check VMGX text. Returns { valid: true } or { valid: false, error }. */
  function validate(text) {
    try { parse(text); return { valid: true, error: null }; }
    catch (e) { if (e instanceof VMGXError) return { valid: false, error: e }; throw e; }
  }

  function plain(v, typed) {
    if (v instanceof VDateTime) return typed ? { "@datetime": v.toString() } : v.toString();
    if (v instanceof VDate) return typed ? { "@date": v.toString() } : v.toString();
    if (v instanceof Link) return typed ? { "@link": v.href } : v.href;
    if (Array.isArray(v)) return v.map(function (x) { return plain(x, typed); });
    if (isPlain(v)) {
      var o = {};
      Object.keys(v).forEach(function (k) {
        Object.defineProperty(o, k, { value: plain(v[k], typed), enumerable: true, writable: true, configurable: true });
      });
      return o;
    }
    return v;
  }

  function typedValue(key, text) {
    if (typeof text !== "string") throw new TypeError("typed JSON: '" + key + "' must hold a string");
    if (key === "@link") {
      if (!text.trim() || /\s/.test(text)) throw new TypeError("typed JSON: invalid link " + JSON.stringify(text));
      return new Link(text);
    }
    var p = new Parser(text), v = null;
    try { v = p.value(); } catch (e) { v = null; }
    var ok = p.i === p.s.length &&
      (key === "@datetime" ? v instanceof VDateTime : v instanceof VDate);
    if (!ok) throw new TypeError("typed JSON: invalid " + key.slice(1) + " " + JSON.stringify(text));
    return v;
  }

  function untype(v) {
    if (Array.isArray(v)) return v.map(untype);
    if (isPlain(v)) {
      var keys = Object.keys(v);
      if (keys.length === 1 && TYPED_KEYS.indexOf(keys[0]) >= 0) return typedValue(keys[0], v[keys[0]]);
      var o = {};
      keys.forEach(function (k) {
        Object.defineProperty(o, k, { value: untype(v[k]), enumerable: true, writable: true, configurable: true });
      });
      return o;
    }
    return v;
  }

  /**
   * Convert VMGX (text or parsed data) to JSON text.
   * options: { indent: 2, typed: false }  (a number is read as the indent)
   * Plain mode is data-preserving: dates, date-times and links become strings.
   * Typed mode is type-preserving: they become {"@date": ...}, {"@datetime": ...}
   * and {"@link": ...}, which fromJSON(..., { typed: true }) turns back.
   */
  function toJSON(input, options) {
    if (typeof options === "number") options = { indent: options };
    options = options || {};
    var data = typeof input === "string" ? parse(input) : input;
    return JSON.stringify(plain(data, !!options.typed), null, options.indent === undefined ? 2 : options.indent);
  }

  /** Convert JSON text (an object at the top level) to VMGX text.
   *  options: { typed: false, header: true, indent: 2 } */
  function fromJSON(jsonText, options) {
    options = options || {};
    var data = JSON.parse(jsonText);
    if (!isPlain(data)) throw new TypeError("only a JSON object can become a VMGX document");
    if (options.typed) data = untype(data);
    return stringify(data, options);
  }

  return {
    VERSION: VERSION, SPEC_VERSION: SPEC_VERSION, MAX_DEPTH: MAX_DEPTH, parse: parse, stringify: stringify, validate: validate,
    toJSON: toJSON, fromJSON: fromJSON,
    Link: Link, VDate: VDate, VDateTime: VDateTime, VMGXError: VMGXError
  };
});
