"""Renders repo/spec/vmgx-spec.md into site/spec.html in the website's style."""
import re
from pathlib import Path
import markdown

root = Path(__file__).resolve().parent.parent
md = (root / "spec/vmgx-spec.md").read_text(encoding="utf-8")
body = markdown.markdown(md, extensions=["tables", "fenced_code", "toc"], output_format="html5")

# Give each h2 an id for the contents list (toc extension adds ids already).
heads = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
toc = "".join(f'<li><a href="#{i}">{t}</a></li>' for i, t in heads)
# Mark example code blocks for VMGX highlighting (the site script colors them).
body = body.replace("<pre><code>", '<pre class="code" data-hl="vmgx"><code>')
body = re.sub(r'(<pre class="code" data-hl="vmgx"><code>)(document  =)', r'<pre class="code"><code>\2', body)
body = body.replace("<table>", '<div class="tablebox"><table>').replace("</table>", "</table></div>")
title_match = re.search(r"<h1[^>]*>(.*?)</h1>", body)
body = re.sub(r"<h1[^>]*>.*?</h1>", "", body, count=1)

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VMGX Specification 1.0.1 — Vegte Media Group Extended</title>
<meta name="description" content="The VMGX specification: syntax, values, metadata, JSON conversion, errors, grammar and conformance.">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="canonical" href="https://vmgx.vegte.org/spec.html">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {{ --navy-950:#070e22; --navy-900:#0b1530; --navy-800:#12204a; --navy-700:#1b2d5e; --gold:#c8a24a; --gold-light:#e2c77f;
    --ivory:#f8f5ee; --paper:#fffdf8; --ink:#1a1f2e; --muted:#5b6275; --line:#e4dccb;
    --serif:"Cormorant Garamond",Georgia,serif; --sans:"Outfit",system-ui,-apple-system,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace; }}
  * {{ box-sizing:border-box }}
  html {{ scroll-behavior:smooth; scroll-padding-top:80px }}
  body {{ margin:0; font:17px/1.7 var(--sans); color:var(--ink); background:var(--ivory) }}
  a {{ color:var(--navy-700); text-decoration-color:var(--gold); text-underline-offset:3px }}
  header.nav {{ position:sticky; top:0; z-index:5; background:rgba(11,21,48,.97); border-bottom:1px solid rgba(200,162,74,.25) }}
  header.nav .in {{ max-width:1120px; margin:0 auto; padding:0 24px; height:64px; display:flex; align-items:center; justify-content:space-between }}
  .brand {{ display:flex; align-items:center; gap:12px; color:#fff; text-decoration:none }}
  .brand img, .brand .mono {{ width:34px; height:34px; border-radius:4px }}
  .mono {{ display:inline-grid; place-items:center; background:var(--gold); color:var(--navy-900); font:700 1.2rem var(--serif) }}
  .brand strong {{ font:700 1.45rem var(--serif); letter-spacing:.06em }}
  header.nav a.back {{ color:#d9deea; text-decoration:none; font-size:.92rem }}
  header.nav a.back:hover {{ color:var(--gold-light) }}
  .layout {{ max-width:1120px; margin:0 auto; padding:56px 24px 96px; display:grid; grid-template-columns:240px 1fr; gap:56px }}
  @media (max-width:900px) {{ .layout {{ grid-template-columns:1fr }} aside {{ display:none }} }}
  aside nav {{ position:sticky; top:96px; font-size:.9rem }}
  aside ol {{ list-style:none; padding:0; margin:0; border-left:2px solid var(--line) }}
  aside li a {{ display:block; padding:5px 0 5px 14px; color:var(--muted); text-decoration:none }}
  aside li a:hover {{ color:var(--navy-800) }}
  .eyebrow {{ font-size:.78rem; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); font-weight:500 }}
  h1 {{ font:600 clamp(2.4rem,5vw,3.4rem)/1.1 var(--serif); margin:.3em 0 .4em }}
  h2 {{ font:600 1.9rem/1.2 var(--serif); margin:2.2em 0 .5em; padding-top:.6em; border-top:1px solid var(--line) }}
  article > p:first-of-type strong {{ color:var(--navy-700) }}
  code {{ font-family:var(--mono); font-size:.85em; background:#efe8d6; color:var(--navy-800); padding:.1em .38em; border-radius:4px }}
  pre.code {{ background:var(--navy-950); color:#d8deeb; font:.85rem/1.7 var(--mono); padding:20px 22px; border-radius:6px; overflow-x:auto; border:1px solid rgba(200,162,74,.22) }}
  pre.code code {{ background:none; color:inherit; padding:0; font-size:inherit }}
  .tablebox {{ background:var(--paper); border:1px solid var(--line); border-radius:6px; overflow-x:auto; margin:1em 0 }}
  table {{ width:100%; border-collapse:collapse; font-size:.95rem }}
  th, td {{ text-align:left; padding:10px 14px; border-bottom:1px solid var(--line); vertical-align:top }}
  th {{ font-size:.76rem; letter-spacing:.14em; text-transform:uppercase; color:var(--navy-700); border-bottom:2px solid var(--gold) }}
  li {{ margin-bottom:.35em }}
  .t-key{{color:#e2c77f}}.t-meta{{color:#f0a868}}.t-str,.t-text{{color:#9fd3a8}}.t-num{{color:#8fc1f0}}.t-date{{color:#d6a8f0}}
  .t-link{{color:#7fd6e0}}.t-kw{{color:#f08fa0}}.t-com{{color:#6f7a96;font-style:italic}}.t-head{{color:#c8a24a;font-weight:500}}.t-punc{{color:#8e98b3}}
  footer {{ background:var(--navy-950); color:#8e98b3; padding:40px 24px; font-size:.9rem; text-align:center }}
  footer a {{ color:var(--gold-light) }}
</style>
</head>
<body>
<header class="nav"><div class="in">
  <a class="brand" href="index.html"><img src="logo.png" alt="" data-fallback="mono"><strong>VMGX</strong></a>
  <a class="back" href="index.html">← Back to the VMGX site</a>
</div></header>
<div class="layout">
  <aside><nav><ol>{toc}</ol></nav></aside>
  <article>
    <span class="eyebrow">Specification</span>
    <h1>{title_match.group(1) if title_match else "VMGX Specification"}</h1>
    {body}
  </article>
</div>
<footer>© 2026 Vegte Media Group · This specification is licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="index.html">vmgx.vegte.org</a></footer>
<script src="vmgx-render.js" defer></script>
<script>
document.querySelectorAll("img[data-fallback]").forEach(function (img) {{
  function swap() {{ var m = document.createElement("span"); m.className = "mono"; m.textContent = "V"; img.replaceWith(m); }}
  if (img.complete && img.naturalWidth === 0) swap(); else img.addEventListener("error", swap);
}});
window.addEventListener("DOMContentLoaded", function () {{
  if (!window.VMGXRender) return;
  document.querySelectorAll('pre[data-hl="vmgx"] code').forEach(function (c) {{
    c.innerHTML = window.VMGXRender.highlightHTML(c.textContent);
  }});
}});
</script>
</body>
</html>
'''
(root / "site/spec.html").write_text(html, encoding="utf-8")
print("spec.html written,", len(heads), "sections")
