import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONSENT_TEXT } from "../src/lib/newsletter.js";
import { esc } from "./markdown.mjs";

const themeBoot = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/theme-init.js"),
  "utf8"
).trim();

const NAV = [
  ["/guides.html", "Guides"],
  ["/scrub-rack.html", "Scrub Rack"],
  ["/shift-kit.html", "Shift Kit"],
  ["/student-bay.html", "Student Bay"],
  ["/gear-guide.html", "Gear"],
  ["/confessions.html", "Confessions"],
  ["/wellbeing.html", "Wellbeing"]
];

export function heroArt() {
  return `<div class="hero-art" role="img" aria-label="Illustration of folded scrubs and a fob watch">
    <svg viewBox="0 0 640 560" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="640" height="560" fill="var(--mist)"/>
      <circle cx="520" cy="96" r="72" fill="var(--coral-fill)" opacity="0.9"/>
      <circle cx="78" cy="470" r="86" fill="var(--gold-fill)" opacity="0.85"/>
      <rect x="150" y="78" width="300" height="400" rx="36" fill="var(--bg-elev)" stroke="var(--line)" stroke-width="3"/>
      <path d="M205 188h70l22 40 22-40h70v210H205z" fill="var(--teal)"/>
      <path d="M275 188c14 36 52 36 66 0" fill="none" stroke="var(--bg-elev)" stroke-width="10" stroke-linecap="round"/>
      <rect x="236" y="286" width="58" height="42" rx="8" fill="#f4f7f5" opacity="0.35"/>
      <circle cx="470" cy="250" r="48" fill="var(--bg-elev)" stroke="var(--teal)" stroke-width="8"/>
      <path d="M470 218v40l20 12" fill="none" stroke="var(--ink)" stroke-width="6" stroke-linecap="round"/>
      <rect x="448" y="308" width="16" height="40" rx="6" fill="var(--coral-fill)"/>
    </svg>
  </div>`;
}

export function adSlot(id) {
  return `<aside class="ad-slot no-print" data-ad-slot="${esc(id)}" hidden aria-label="Ad">
    <p class="ad-label">Ad</p>
    <div class="ad-frame" id="${esc(id)}">Ad slot. No ad network is connected.</div>
  </aside>`;
}

export function newsletterForm() {
  return `<form class="form" data-newsletter>
    <label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
    <label class="check"><input name="consent" type="checkbox" required><span>${esc(CONSENT_TEXT)}</span></label>
    <input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div data-turnstile></div>
    <button class="button primary" type="submit">Send me occasional notes</button>
    <p class="form-message" data-form-message role="status"></p>
    <p class="disclosure">Sender: OnlyScrubs, <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a>. Guides and site news only. Every email includes an unsubscribe link. Read the <a href="/privacy.html">privacy page</a>.</p>
  </form>`;
}

function icon(name) {
  if (name === "sun") {
    return `<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  return `<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 3a8 8 0 1 0 6 13 7 7 0 1 1-6-13z"/></svg>`;
}

export function layout(options) {
  const {
    title,
    description,
    path,
    main,
    assets,
    scripts = [],
    jsonLd = [],
    robots = "",
    newsletter = "footer",
    active
  } = options;
  const fullTitle = title.includes("OnlyScrubs") ? title : `${title} | OnlyScrubs`;
  const canonicalPath = path === "/" ? "/" : path;
  const canonical = `https://onlyscrubs.org${canonicalPath === "/" ? "/" : canonicalPath}`;
  const jsonScripts = jsonLd.map((obj) => {
    const json = JSON.stringify(obj).replace(/</g, "\\u003c");
    return `<script type="application/ld+json">${json}</script>`;
  });
  const nav = NAV.map(([href, label]) => {
    const current = href === active ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${label}</a>`;
  }).join("");
  const footerNews = newsletter === "footer"
    ? `<div><p class="kicker">Occasional notes</p><h2>A short email, when there is something useful.</h2>${newsletterForm()}</div>`
    : `<div><strong>OnlyScrubs</strong><p>For people who live in scrubs and still somehow care.</p></div>`;
  const support = `<a class="button secondary compact" data-support-link hidden rel="noopener noreferrer">Buy the next round of coffee</a>`;
  return `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>${themeBoot}</script>
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  ${robots ? `<meta name="robots" content="${esc(robots)}">` : ""}
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#f3f6f4">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="OnlyScrubs">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="${path.startsWith("/guides/") && path !== "/guides.html" ? "article" : "website"}">
  <meta property="og:site_name" content="OnlyScrubs">
  <meta property="og:locale" content="en_AU">
  <meta property="og:image" content="https://onlyscrubs.org/og.png">
  <meta property="og:image:alt" content="OnlyScrubs, practical notes for Australian healthcare workers">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(fullTitle)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="https://onlyscrubs.org/og.png">
  <meta name="twitter:image:alt" content="OnlyScrubs, practical notes for Australian healthcare workers">
  <link rel="preload" href="/assets/fonts/source-sans-3-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${assets.styles}">
  ${jsonScripts.join("\n  ")}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/"><span class="brand-mark">OS</span><span>OnlyScrubs</span></a>
    <div class="header-tools">
      <button class="nav-logout header-logout" type="button" data-admin-logout hidden>Log out</button>
      <a class="icon-button nav-lock" href="/admin.html" data-admin-lock hidden aria-label="Admin"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
      <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch colour theme">${icon("sun")}${icon("moon")}</button>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>
    </div>
    <nav class="site-nav" id="site-nav" data-nav aria-label="Primary">${nav}<button class="nav-logout" type="button" data-admin-logout hidden>Log out</button></nav>
  </header>
  <main id="main">${main}</main>
  <footer class="site-footer">
    ${footerNews}
    <div>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/wellbeing.html">Wellbeing</a>
        <a href="/submission-rules.html">Rules</a>
        <a href="/terms.html">Terms</a>
        <a href="/complaints.html">Complaints</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/disclaimer.html">Disclaimer</a>
        <a href="/submit.html">Submit</a>
        <a href="/guides.html">Guides</a>
      </nav>
      <p class="fine">General information only. Not a clinic and not medical advice. <a href="/terms.html">Terms</a> · <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a> <a class="admin-entry" href="/admin.html">Admin</a></p>
      <div class="button-row no-print">${support}<button class="button compact" type="button" data-install>Install app</button></div>
    </div>
  </footer>
  <dialog class="sheet" id="install-sheet" data-install-sheet aria-labelledby="install-sheet-title">
    <div class="sheet-card">
      <h2 id="install-sheet-title">Add OnlyScrubs to your home screen</h2>
      <p data-install-intro>You can keep OnlyScrubs on this device and open it like an app.</p>
      <ol data-install-steps></ol>
      <button class="button primary" type="button" data-install-close>Close</button>
    </div>
  </dialog>
  <script src="${assets.site}" defer></script>
  ${scripts.map((src) => `<script src="${src}" defer></script>`).join("\n  ")}
</body>
</html>`;
}
