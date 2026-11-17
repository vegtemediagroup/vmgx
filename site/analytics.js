/*!
 * analytics.js — Google Tag Manager for the VMGX website, with visitor consent.
 * Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
 *
 * Every page of the site includes this file once, in its <head>:
 *     <script src="analytics.js"></script>
 *
 * Tag Manager (and with it Google Analytics) loads only after the visitor clicks
 * "Accept" in the banner. The choice is remembered in this browser. Any element
 * with the attribute data-cookie-settings reopens the banner, so visitors can
 * change their mind (a "Cookie settings" link in each page's footer).
 */
(function () {
  "use strict";

  var GTM_ID = "GTM-MP3KH9BM";
  var KEY = "vmgx-analytics-consent"; // "granted" or "denied"
  var loaded = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Google Consent Mode: everything denied until the visitor chooses.
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });

  function readChoice() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function saveChoice(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* storage unavailable */ }
  }

  // Google's official Tag Manager loader.
  function loadTagManager() {
    if (loaded) return;
    loaded = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(s, first);
  }

  function removeAnalyticsCookies() {
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^_ga/.test(name) || /^_gid$/.test(name)) {
        var host = location.hostname, parts = host.split(".");
        var domains = ["", host];
        for (var i = 1; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));
        domains.forEach(function (d) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
  }

  // ---- Banner -------------------------------------------------------------
  var CSS =
    "#vmgx-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:560px;margin:0 auto;" +
    "background:#0b1530;color:#e6e9f2;border:1px solid rgba(200,162,74,.45);border-radius:8px;" +
    "box-shadow:0 18px 40px rgba(7,14,34,.45);padding:18px 20px;font:15px/1.55 'Outfit',system-ui,-apple-system,sans-serif}" +
    "#vmgx-consent[hidden]{display:none}" +
    "#vmgx-consent h2{font:600 1.15rem/1.3 'Cormorant Garamond',Georgia,serif;margin:0 0 6px;color:#fff;border:0;padding:0}" +
    "#vmgx-consent p{margin:0 0 14px;color:#c9d0e0}" +
    "#vmgx-consent .row{display:flex;gap:10px;flex-wrap:wrap}" +
    "#vmgx-consent button{flex:1 1 140px;font:500 .95rem 'Outfit',system-ui,sans-serif;padding:10px 16px;border-radius:6px;cursor:pointer;" +
    "border:1px solid #c8a24a;background:transparent;color:#e2c77f}" +
    "#vmgx-consent button:hover{background:rgba(200,162,74,.12);color:#fff}" +
    "#vmgx-consent button:focus-visible{outline:2px solid #e2c77f;outline-offset:2px}";

  var banner;

  function choose(value) {
    var before = readChoice();
    saveChoice(value);
    banner.hidden = true;
    if (value === "granted") {
      loadTagManager();
    } else {
      gtag("consent", "update", { analytics_storage: "denied" });
      removeAnalyticsCookies();
      // Tag Manager cannot be unloaded from a page, so reload to stop it.
      if (before === "granted" && loaded) location.reload();
    }
  }

  function buildBanner() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    banner = document.createElement("section");
    banner.id = "vmgx-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-labelledby", "vmgx-consent-title");
    banner.hidden = true;
    banner.innerHTML =
      '<h2 id="vmgx-consent-title">Cookies and statistics</h2>' +
      "<p>We would like to use Google Analytics to see how visitors use this site, so we can improve it. " +
      "It sets cookies and only starts if you accept. You can change your choice at any time under " +
      "“Cookie settings” at the bottom of the page.</p>" +
      '<div class="row"><button type="button" data-choice="denied">Decline</button>' +
      '<button type="button" data-choice="granted">Accept</button></div>';
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-choice]");
      if (b) choose(b.getAttribute("data-choice"));
    });
    document.body.appendChild(banner);

    document.addEventListener("click", function (e) {
      var link = e.target.closest("[data-cookie-settings]");
      if (link) {
        e.preventDefault();
        banner.hidden = false;
        var btn = banner.querySelector("button");
        if (btn) btn.focus();
      }
    });

    if (!readChoice()) banner.hidden = false;
  }

  if (readChoice() === "granted") loadTagManager();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildBanner);
  else buildBanner();

  window.VMGXConsent = {
    open: function () { if (banner) banner.hidden = false; },
    choice: readChoice
  };
})();
