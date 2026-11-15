/*!
 * Copyright (c) 2026 Vegte Media Group. MIT License: free to use, change and share.
 * SPDX-License-Identifier: MIT
 *
 * vmgx-render.js — shared rendering for VMGX apps and previews (Vegte Media Group)
 * Requires vmgx.js to be loaded first (global VMGX, or require("./vmgx.js") in Node).
 *
 * VMGXRender.analyzeJSON(text, { title, quickLook }) returns a JSON string with:
 *   ok, error {message, reason, line, column, offset}, tokens [{s, l, k}],
 *   json, typedJson, formatted, previewHTML, jsonHTML, typedJsonHTML, summary, version
 * Offsets and lengths are UTF-16 code units, matching NSString and JavaScript strings.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./vmgx.js"));
  else root.VMGXRender = factory(root.VMGX);
})(typeof self !== "undefined" ? self : this, function (VMGX) {
  "use strict";

  // ---- Tokens for syntax highlighting -----------------------------------
  var TOKENS = new RegExp([
    "(@vmgx[ \\t]+[\\d.]+)",
    "(#[^\\n\\r]*)",
    '("""[\\s\\S]*?""")',
    '("(?:\\\\.|[^"\\\\\\n\\r])*")',
    "(<[^>\\s]+>)",
    "(@[A-Za-z_][\\w-]*)(?=[ \\t]*:)",
    "([A-Za-z_][\\w-]*)(?=[ \\t]*:)",
    "(\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:\\d{2})?)?)",
    "(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)",
    "\\b(true|false|null)\\b",
    "([{}\\[\\],:])"
  ].join("|"), "g");
  var KINDS = [null, "head", "com", "text", "str", "link", "meta", "key", "date", "num", "kw", "punc"];

  function tokenize(src) {
    var out = [], m;
    TOKENS.lastIndex = 0;
    while ((m = TOKENS.exec(src))) {
      if (!m[0].length) { TOKENS.lastIndex++; continue; }
      var g = 1;
      while (m[g] === undefined) g++;
      var k = KINDS[g];
      if (g === 4 && /^[ \t]*:/.test(src.slice(TOKENS.lastIndex, TOKENS.lastIndex + 40))) k = "key";
      out.push({ s: m.index, l: m[0].length, k: k });
    }
    return out;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function highlightHTML(src) {
    var html = "", last = 0;
    tokenize(src).forEach(function (t) {
      html += esc(src.slice(last, t.s)) + '<span class="t-' + t.k + '">' + esc(src.substr(t.s, t.l)) + "</span>";
      last = t.s + t.l;
    });
    return html + esc(src.slice(last));
  }

  var JSON_TOKENS = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;
  function highlightJSON(src) {
    var out = "", last = 0, m;
    JSON_TOKENS.lastIndex = 0;
    while ((m = JSON_TOKENS.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) {
        var cls = m[2] ? (m[1].charAt(1) === "@" ? "t-meta" : "t-key") : "t-str";
        out += '<span class="' + cls + '">' + esc(m[1]) + "</span>" + (m[2] ? '<span class="t-punc">' + esc(m[2]) + "</span>" : "");
      } else if (m[3]) out += '<span class="t-num">' + m[3] + "</span>";
      else if (m[4]) out += '<span class="t-kw">' + m[4] + "</span>";
      else out += '<span class="t-punc">' + esc(m[5]) + "</span>";
      last = JSON_TOKENS.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  // ---- Error position in the original text --------------------------------
  // The parser counts lines and columns after removing a byte-order mark and
  // turning CRLF / CR into LF. Map that back onto the text as the editor holds it.
  function offsetOf(text, line, column) {
    var i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    for (var l = 1; l < line && i < text.length; l++) {
      var n = text.slice(i).search(/\r\n|\r|\n/);
      if (n < 0) { i = text.length; break; }
      i += n + (text.substr(i + n, 2) === "\r\n" ? 2 : 1);
    }
    return Math.min(text.length, i + Math.max(0, column - 1));
  }

  // ---- Value rendering -----------------------------------------------------
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  function dateWords(d) { return MONTHS[d.month - 1] + " " + d.day + ", " + d.year; }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function renderValue(v) {
    if (v === null) return '<span class="muted">null</span>';
    if (v === true || v === false) return '<span class="badge">' + v + "</span>";
    if (typeof v === "number") return '<span class="num">' + esc(String(v)) + "</span>";
    if (typeof v === "string") {
      if (!v.length) return '<span class="muted">(empty text)</span>';
      return v.indexOf("\n") >= 0 ? '<div class="text">' + esc(v) + "</div>" : esc(v);
    }
    if (v instanceof VMGX.VDateTime) {
      var tz = v.offset === null ? "no time zone" : v.offset === 0 ? "UTC" :
        "UTC" + (v.offset < 0 ? "−" : "+") + pad2(Math.floor(Math.abs(v.offset) / 60)) + ":" + pad2(Math.abs(v.offset) % 60);
      return '<span class="date">' + esc(dateWords(v)) + ", " + pad2(v.hour) + ":" + pad2(v.minute) +
        (v.second ? ":" + pad2(v.second) : "") + " (" + tz + ')</span> <span class="iso">' + esc(v.toString()) + "</span>";
    }
    if (v instanceof VMGX.VDate) {
      return '<span class="date">' + esc(dateWords(v)) + '</span> <span class="iso">' + esc(v.toString()) + "</span>";
    }
    if (v instanceof VMGX.Link) {
      var safe = /^(https?:|mailto:)/i.test(v.href);
      return safe ? '<a class="link" href="' + esc(v.href) + '">' + esc(v.href) + "</a>"
                  : '<span class="link">' + esc(v.href) + "</span>";
    }
    if (Array.isArray(v)) {
      if (!v.length) return '<span class="muted">(empty list)</span>';
      return '<ol class="list">' + v.map(function (x) { return "<li>" + renderValue(x) + "</li>"; }).join("") + "</ol>";
    }
    var keys = Object.keys(v);
    if (!keys.length) return '<span class="muted">(empty object)</span>';
    return renderTable(v, keys);
  }

  function renderTable(obj, keys) {
    var meta = keys.filter(function (k) { return k.charAt(0) === "@"; });
    var rest = keys.filter(function (k) { return k.charAt(0) !== "@"; });
    return '<table class="rec">' + meta.concat(rest).map(function (k) {
      return '<tr><th class="' + (k.charAt(0) === "@" ? "k-meta" : "k") + '">' + esc(k) + "</th><td>" + renderValue(obj[k]) + "</td></tr>";
    }).join("") + "</table>";
  }

  function sourceWithLines(text, errorLine) {
    var lines = text.replace(/^\ufeff/, "").split(/\r\n|\r|\n/);
    var html = highlightHTML(lines.join("\n")).split("\n");
    return '<div class="src">' + html.map(function (l, i) {
      return '<div class="ln' + (i + 1 === errorLine ? " err" : "") + '"><span class="no">' + (i + 1) + "</span><span class=\"code\">" + (l || " ") + "</span></div>";
    }).join("") + "</div>";
  }

  // ---- Page shell ------------------------------------------------------------
  var CSS = [
    ":root{--bg:#fbf9f4;--fg:#1a1f2e;--muted:#6b7285;--line:#e6dfcf;--card:#fffdf8;--gold:#a8842f;--navy:#12204a;",
    "--key:#8a6a1c;--meta:#b0561a;--str:#2f7a3e;--num:#1f5fa8;--date:#7b3fa0;--link:#137a86;--kw:#b03050;--com:#8a90a0;--punc:#8a90a0;",
    "--errbg:rgba(196,60,50,.12);--errfg:#a33a30;--okfg:#2e7d4f}",
    "@media (prefers-color-scheme:dark){:root{--bg:#0f1528;--fg:#e4e8f2;--muted:#9aa3b8;--line:#253158;--card:#141c34;--gold:#e2c77f;--navy:#e4e8f2;",
    "--key:#e2c77f;--meta:#f0a868;--str:#9fd3a8;--num:#8fc1f0;--date:#d6a8f0;--link:#7fd6e0;--kw:#f08fa0;--com:#6f7a96;--punc:#7d87a3;",
    "--errbg:rgba(240,110,100,.16);--errfg:#f2a69c;--okfg:#7fd0a0}}",
    "*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.55 -apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif}",
    "main{padding:22px 26px 40px;max-width:980px}",
    "header{display:flex;align-items:baseline;justify-content:space-between;gap:16px;border-bottom:2px solid var(--gold);padding-bottom:12px;margin-bottom:18px}",
    "h1{font:600 24px/1.2 'Iowan Old Style','Palatino',Georgia,serif;margin:0;color:var(--navy);word-break:break-word}",
    ".kind{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);white-space:nowrap}",
    "h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:26px 0 8px}",
    ".pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card)}",
    ".pill.ok{color:var(--okfg)}.pill.bad{color:var(--errfg);border-color:var(--errfg)}",
    "table.rec{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:6px}",
    "table.rec table.rec{background:transparent}",
    "table.rec th{width:1%;white-space:nowrap;text-align:left;vertical-align:top;font:500 13px ui-monospace,Menlo,monospace;padding:7px 14px 7px 12px;border-bottom:1px solid var(--line)}",
    "table.rec td{vertical-align:top;padding:7px 12px;border-bottom:1px solid var(--line);word-break:break-word}",
    "table.rec tr:last-child>th,table.rec tr:last-child>td{border-bottom:0}",
    "th.k{color:var(--key)}th.k-meta{color:var(--meta)}",
    ".text{white-space:pre-wrap}.muted{color:var(--muted);font-style:italic}.num{color:var(--num);font-variant-numeric:tabular-nums}",
    ".badge{font:12px ui-monospace,Menlo,monospace;color:var(--kw)}.date{color:var(--date)}",
    ".iso{font:11.5px ui-monospace,Menlo,monospace;color:var(--muted);margin-left:6px}",
    "a.link,.link{color:var(--link);word-break:break-all}",
    "ol.list{margin:0;padding-left:22px}ol.list>li{margin:3px 0}ol.list>li>table.rec{margin:4px 0}",
    ".error{background:var(--errbg);color:var(--errfg);border:1px solid var(--errfg);border-radius:6px;padding:12px 14px;margin-bottom:16px}",
    ".error b{display:block;margin-bottom:2px}",
    ".src{font:12.5px/1.6 ui-monospace,Menlo,monospace;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px 0;overflow-x:auto}",
    ".ln{display:flex;white-space:pre}.ln.err{background:var(--errbg)}",
    ".no{flex:none;width:44px;text-align:right;padding-right:12px;color:var(--muted);user-select:none}.code{padding-right:14px}",
    "pre.json{font:12.5px/1.6 ui-monospace,Menlo,monospace;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 14px;margin:0;white-space:pre;overflow-x:auto}",
    ".t-key{color:var(--key)}.t-meta{color:var(--meta)}.t-str,.t-text{color:var(--str)}.t-num{color:var(--num)}.t-date{color:var(--date)}",
    ".t-link{color:var(--link)}.t-kw{color:var(--kw)}.t-com{color:var(--com);font-style:italic}.t-head{color:var(--gold);font-weight:600}.t-punc{color:var(--punc)}",
    ".note{color:var(--muted);font-size:12.5px;margin:0 0 10px}",
    "footer{margin-top:28px;color:var(--muted);font-size:11.5px}"
  ].join("");

  function page(title, body) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>' +
      esc(title) + "</title><style>" + CSS + "</style></head><body><main>" + body + "</main></body></html>";
  }

  function headerHTML(title, ok, label) {
    return '<header><h1>' + esc(title) + '</h1><span class="kind">VMGX document</span></header>' +
      '<span class="pill ' + (ok ? "ok" : "bad") + '">' + (ok ? "●" : "▲") + " " + esc(label) + "</span>";
  }

  function versionOf(text) {
    var m = /^(?:\ufeff)?(?:[ \t]*(?:#[^\n\r]*)?(?:\r\n|\r|\n))*[ \t]*@vmgx[ \t]+(\d+\.\d+)/.exec(text);
    return m ? m[1] : "1.0";
  }

  // ---- Analysis --------------------------------------------------------------
  function analyze(text, opts) {
    opts = opts || {};
    var res = {
      ok: false, error: null, tokens: tokenize(text), json: null, typedJson: null, formatted: null,
      previewHTML: "", jsonHTML: "", typedJsonHTML: "", summary: "", version: versionOf(text)
    };
    var data;
    try {
      data = VMGX.parse(text);
    } catch (e) {
      if (!(e instanceof VMGX.VMGXError)) throw e;
      res.error = { message: e.message, reason: e.reason, line: e.line || 1, column: e.column || 1,
                    offset: offsetOf(text, e.line || 1, e.column || 1) };
      res.summary = "Line " + res.error.line + ", column " + res.error.column + ": " + e.reason;
      var title = opts.title || "Untitled";
      var errBody = headerHTML(title, false, "Not valid VMGX") +
        '<h2>Problem</h2><div class="error"><b>Line ' + res.error.line + ", column " + res.error.column + "</b>" + esc(e.reason) + "</div>" +
        "<h2>Source</h2>" + sourceWithLines(text, res.error.line);
      res.previewHTML = page(title, errBody);
      var na = page(title, '<p class="note">Fix the problem to see the JSON.</p><div class="error"><b>Line ' +
        res.error.line + ", column " + res.error.column + "</b>" + esc(e.reason) + "</div>");
      res.jsonHTML = res.typedJsonHTML = na;
      return res;
    }

    res.ok = true;
    res.json = VMGX.toJSON(data, { typed: false });
    res.typedJson = VMGX.toJSON(data, { typed: true });
    try { res.formatted = VMGX.stringify(data); } catch (e) { res.formatted = null; }

    var keys = Object.keys(data);
    var meta = keys.filter(function (k) { return k.charAt(0) === "@"; });
    var rest = keys.filter(function (k) { return k.charAt(0) !== "@"; });
    res.summary = "Valid VMGX " + res.version + " · " + rest.length + (rest.length === 1 ? " entry" : " entries") +
      " · " + meta.length + " metadata " + (meta.length === 1 ? "key" : "keys");

    var docTitle = typeof data.title === "string" && data.title ? data.title : (opts.title || "Untitled");
    var body = headerHTML(docTitle, true, res.summary);
    if (meta.length) {
      var m = {};
      meta.forEach(function (k) { m[k] = data[k]; });
      body += "<h2>Metadata</h2>" + renderTable(m, meta);
    }
    if (rest.length) {
      var r = {};
      rest.forEach(function (k) { r[k] = data[k]; });
      body += "<h2>Content</h2>" + renderTable(r, rest);
    }
    if (!keys.length) body += '<p class="note" style="margin-top:16px">This document is empty.</p>';
    if (opts.quickLook) {
      body += "<h2>Source</h2>" + sourceWithLines(text, 0);
      if (opts.title) body += "<footer>" + esc(opts.title) + "</footer>";
    }
    res.previewHTML = page(docTitle, body);
    res.jsonHTML = page(docTitle, '<p class="note">Plain JSON: dates and links become text.</p><pre class="json">' + highlightJSON(res.json) + "</pre>");
    res.typedJsonHTML = page(docTitle, '<p class="note">Typed JSON: dates and links keep their type.</p><pre class="json">' + highlightJSON(res.typedJson) + "</pre>");
    return res;
  }

  function analyzeJSON(text, opts) {
    try {
      return JSON.stringify(analyze(String(text), opts));
    } catch (e) {
      return JSON.stringify({
        ok: false, tokens: [], json: null, typedJson: null, formatted: null, summary: "Internal error",
        version: "1.0", error: { message: String(e && e.message || e), reason: String(e && e.message || e), line: 1, column: 1, offset: 0 },
        previewHTML: page("Error", '<div class="error"><b>Internal error</b>' + esc(String(e && e.message || e)) + "</div>"),
        jsonHTML: "", typedJsonHTML: ""
      });
    }
  }

  return { analyze: analyze, analyzeJSON: analyzeJSON, tokenize: tokenize, offsetOf: offsetOf, highlightHTML: highlightHTML };
});
