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
  ["/guides.html", "Guides", "book"],
  ["/scrub-rack.html", "Scrub Rack", "shirt"],
  ["/shift-kit.html", "Shift Kit", "briefcase"],
  ["/student-bay.html", "Student Bay", "cap"],
  ["/gear-guide.html", "Gear", "stethoscope"],
  ["/shop.html", "Shop", "bag"],
  ["/confessions.html", "Confessions", "chat"],
  ["/wellbeing.html", "Wellbeing", "heart"],
  ["/about.html", "About", "info"]
];

const LEGAL_NAV = [
  ["/privacy.html", "Privacy"],
  ["/terms.html", "Terms"],
  ["/disclaimer.html", "Disclaimer"],
  ["/complaints.html", "Complaints"]
];

export function normalizeNavPath(path) {
  if (!path) return "";
  let current = String(path).split("?")[0].split("#")[0].trim();
  if (!current.startsWith("/")) current = "/" + current;
  if (current.length > 1 && current.endsWith("/")) current = current.slice(0, -1);
  if (current === "/index.html" || current === "/index") return "/";
  if (current !== "/" && !/\.[a-z0-9]+$/i.test(current)) current += ".html";
  return current;
}

export function navHrefIsCurrent(href, path) {
  const current = normalizeNavPath(path);
  const target = normalizeNavPath(href);
  if (!current || !target) return false;
  if (current === target) return true;
  if (target === "/guides.html" && current.startsWith("/guides/")) return true;
  return false;
}

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
    <button class="button primary" type="submit">Send the notes, not a 3am page</button>
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

const NAV_PATHS = {
  book: '<path d="M5 19.5A2 2 0 0 1 7 17.5h13"/><path d="M7 3.5h13v17H7A2 2 0 0 1 5 18.5v-13a2 2 0 0 1 2-2z"/><path d="M9.5 8h7M9.5 12h7"/>',
  shirt: '<path d="M9 4.5 12 6l3-1.5 3.5 3L16 9.5V20H8V9.5L5.5 7.5 9 4.5z"/><path d="M9 4.5c.6 1.4 1.7 2 3 2s2.4-.6 3-2"/>',
  briefcase: '<rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3.5 12h17"/>',
  cap: '<path d="M3 10 12 5l9 5-9 5-9-5z"/><path d="M7 12.2v4.2c0 .7 2.2 2.1 5 2.1s5-1.4 5-2.1v-4.2"/><path d="M21 10v5.5"/>',
  stethoscope: '<path d="M4.5 3v7.5a3.5 3.5 0 0 0 7 0V3"/><path d="M4.5 3H2.8M11.5 3h1.7"/><path d="M11.5 10.5c.2 4 3 6.5 5.2 6.5"/><circle cx="19" cy="17" r="3"/>',
  bag: '<path d="M6.5 8h11l1.2 12.5H5.3L6.5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  chat: '<path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/>',
  heart: '<path d="M12 19.5S5 14.2 5 9.6A3.6 3.6 0 0 1 12 8a3.6 3.6 0 0 1 7 1.6c0 4.6-7 9.9-7 9.9z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6M12 7.5h.01"/>',
  logout: '<path d="M10 20.5H6.5A2 2 0 0 1 4.5 18.5v-13a2 2 0 0 1 2-2H10"/><path d="M15 16.5 20 12l-5-4.5M20 12H9.5"/>',
  top: '<path d="M5 14.5 12 7.5l7 7"/><path d="M12 8v10"/>'
};

function navIcon(name) {
  const paths = NAV_PATHS[name];
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
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
    active,
    tearoom = false
  } = options;
  const fullTitle = title.includes("OnlyScrubs") ? title : `${title} | OnlyScrubs`;
  const canonicalPath = path === "/" ? "/" : path;
  const canonical = `https://onlyscrubs.org${canonicalPath === "/" ? "/" : canonicalPath}`;
  const jsonScripts = jsonLd.map((obj) => {
    const json = JSON.stringify(obj).replace(/</g, "\\u003c");
    return `<script type="application/ld+json">${json}</script>`;
  });
  const currentPath = path || active || "";
  const nav = NAV.map(([href, label, glyph], index) => {
    const current = navHrefIsCurrent(href, currentPath) ? ' aria-current="page"' : "";
    return `<a href="${href}"${current} style="--i:${index}">${navIcon(glyph)}<span>${label}</span></a>`;
  }).join("");
  const legal = LEGAL_NAV.map(([href, label]) => {
    const current = navHrefIsCurrent(href, currentPath) ? ' aria-current="page"' : "";
    return `<a href="${href}"${current}>${label}</a>`;
  }).join("");
  const footerNews = newsletter === "footer"
    ? `<div><p class="kicker">Occasional notes</p><h2>A short email when there is something useful. No full-moon specials.</h2>${newsletterForm()}</div>`
    : `<div><strong>OnlyScrubs</strong><p>For people who live in scrubs and still somehow care.</p></div>`;
  const tearoomBlock = tearoom
    ? `<p class="tearoom" data-tearoom><span data-tearoom-line>Cold coffee is still coffee. This is the science.</span></p><p class="night-note">Night shift. The printer is haunted and the coffee is a rumour. Don't say the Q word.</p>`
    : "";
  // No <a> without a real URL. site.js adds the link here only when /api/config returns one.
  const support = `<span class="support-slot" data-support-slot hidden></span>`;
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
    <div class="header-bar">
      <a class="brand" href="/"><span class="brand-mark">OS</span><span>OnlyScrubs</span></a>
      <div class="header-tools">
        <button class="nav-logout header-logout" type="button" data-admin-logout hidden>Log out</button>
        <a class="icon-button nav-lock" href="/admin.html" data-admin-lock hidden aria-label="Admin"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
        <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch colour theme">${icon("sun")}${icon("moon")}</button>
        <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>
      </div>
      <nav class="site-nav" id="site-nav" data-nav aria-label="Primary">
        <div class="nav-handle" data-nav-handle aria-hidden="true"><span></span></div>
        <div class="nav-primary">${nav}<button class="nav-logout" type="button" data-admin-logout hidden style="--i:${NAV.length}">${navIcon("logout")}<span>Log out</span></button></div>
        <div class="nav-legal" role="group" aria-label="Legal">${legal}</div>
      </nav>
    </div>
    ${tearoomBlock}
    <div class="nav-scrim" data-nav-scrim aria-hidden="true"></div>
  </header>
  <main id="main">${main}</main>
  <footer class="site-footer">
    ${footerNews}
    <div>
      <nav class="footer-nav" aria-label="Footer">
        <div class="footer-col"><p class="footer-head">Explore</p><a href="/guides.html">Guides</a><a href="/shop.html">Shop</a><a href="/wellbeing.html">Wellbeing</a><a href="/about.html">About</a></div>
        <div class="footer-col"><p class="footer-head">Community</p><a href="/submit.html">Submit</a><a href="/submission-rules.html">Rules</a><a href="/moderation.html">How we moderate</a><a href="/advertise.html">Advertise</a></div>
        <div class="footer-col"><p class="footer-head">Legal</p><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/disclaimer.html">Disclaimer</a><a href="/complaints.html">Complaints</a></div>
      </nav>
      <p class="affiliation">OnlyScrubs is not affiliated with AHPRA, the Nursing and Midwifery Board of Australia (NMBA), any union, health service or employer.</p>
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
  <button class="back-to-top" type="button" data-back-to-top aria-label="Back to top" aria-hidden="true" tabindex="-1">${navIcon("top")}<span class="visually-hidden">Back to top</span></button>
</body>
</html>`;
}
