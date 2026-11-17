import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGuide } from "../site/markdown.mjs";
import * as pages from "../site/pages.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const gear = JSON.parse(fs.readFileSync(path.join(root, "data", "gear.json"), "utf8"));

const guideOrder = [
  "first-clinical-placement",
  "night-shift",
  "isbar-handover",
  "study-tips",
  "first-graduate-year",
  "feet-and-back",
  "budgeting",
  "asking-for-help"
];

function hash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 10);
}

function resetPublic() {
  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(publicDir, "assets", "fonts"), { recursive: true });
  fs.mkdirSync(path.join(publicDir, "guides"), { recursive: true });
  fs.mkdirSync(path.join(publicDir, "icons"), { recursive: true });
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function writeHashed(name, ext, content) {
  const filename = `${name}.${hash(content)}.${ext}`;
  fs.writeFileSync(path.join(publicDir, "assets", filename), content);
  return `/assets/${filename}`;
}

function loadGuides() {
  return guideOrder.map((slug) => parseGuide(fs.readFileSync(path.join(root, "content", "guides", `${slug}.md`), "utf8"), slug));
}

function related(guide, guides) {
  const scored = guides
    .filter((item) => item.slug !== guide.slug)
    .map((item) => ({ item, score: item.tags.filter((tag) => guide.tags.includes(tag)).length }))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, 3).map((entry) => entry.item);
}

function writeHtml(urlPath, html) {
  const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  const file = path.join(publicDir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return urlPath;
}

function inlineScriptBodies(html) {
  const bodies = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = pattern.exec(html))) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    bodies.push(match[2]);
  }
  return bodies;
}

function cspHash(body) {
  return `sha256-${createHash("sha256").update(body, "utf8").digest("base64")}`;
}

resetPublic();

for (const name of ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "og.png"]) {
  copyFile(path.join(root, "client", "static", name), path.join(publicDir, name));
}
for (const name of fs.readdirSync(path.join(root, "client", "static", "icons"))) {
  copyFile(path.join(root, "client", "static", "icons", name), path.join(publicDir, "icons", name));
}
for (const name of fs.readdirSync(path.join(root, "client", "fonts"))) {
  if (name.endsWith(".woff2")) copyFile(path.join(root, "client", "fonts", name), path.join(publicDir, "assets", "fonts", name));
}

const plannerLib = fs.readFileSync(path.join(root, "src", "lib", "planner.js"), "utf8").replace(/^export function /gm, "function ");
const assets = {
  styles: writeHashed("styles", "css", fs.readFileSync(path.join(root, "client", "styles.css"))),
  site: writeHashed("site", "js", fs.readFileSync(path.join(root, "client", "site.js"))),
  confessions: writeHashed("confessions", "js", fs.readFileSync(path.join(root, "client", "confessions.js"))),
  rack: writeHashed("rack", "js", fs.readFileSync(path.join(root, "client", "rack.js"))),
  gear: writeHashed("gear", "js", fs.readFileSync(path.join(root, "client", "gear.js"))),
  planner: writeHashed("planner", "js", `${plannerLib}\n${fs.readFileSync(path.join(root, "client", "planner.js"), "utf8")}`),
  checklist: writeHashed("checklist", "js", fs.readFileSync(path.join(root, "client", "checklist.js"))),
  breathe: writeHashed("breathe", "js", fs.readFileSync(path.join(root, "client", "breathe.js"))),
  admin: writeHashed("admin", "js", fs.readFileSync(path.join(root, "client", "admin.js")))
};

const guides = loadGuides();
const rendered = new Map();
rendered.set("/", pages.home(assets, guides));
rendered.set("/guides.html", pages.guideIndex(assets, guides));
for (const guide of guides) rendered.set(guide.path, pages.guideArticle(assets, guide, related(guide, guides)));
rendered.set("/scrub-rack.html", pages.scrubRack(assets));
rendered.set("/shift-kit.html", pages.shiftKit(assets));
rendered.set("/student-bay.html", pages.studentBay(assets));
rendered.set("/gear-guide.html", pages.gearGuide(assets, gear));
rendered.set("/confessions.html", pages.confessions(assets));
rendered.set("/submit.html", pages.submitPage(assets));
rendered.set("/wellbeing.html", pages.wellbeing(assets));
rendered.set("/submission-rules.html", pages.rules(assets));
rendered.set("/terms.html", pages.terms(assets));
rendered.set("/complaints.html", pages.complaints(assets));
rendered.set("/privacy.html", pages.privacy(assets));
rendered.set("/disclaimer.html", pages.disclaimer(assets));
rendered.set("/admin.html", pages.admin(assets));
rendered.set("/404.html", pages.notFound(assets));
rendered.set("/offline.html", pages.offline(assets));

const hashes = new Set();
for (const [urlPath, html] of rendered) {
  writeHtml(urlPath, html);
  for (const body of inlineScriptBodies(html)) hashes.add(cspHash(body));
}

const canonical = { "/index.html": "/" };
for (const urlPath of rendered.keys()) {
  if (urlPath.endsWith(".html") && urlPath !== "/index.html") canonical[urlPath.slice(0, -5)] = urlPath;
}

const generatedDir = path.join(root, "src", "generated");
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, "meta.js"), `/** Generated by scripts/build.mjs. Do not edit. */\nexport const CANONICAL = ${JSON.stringify(canonical, null, 2)};\nexport const SCRIPT_HASHES = ${JSON.stringify([...hashes], null, 2)};\n`);

const precache = [
  "/",
  "/offline.html",
  "/guides.html",
  "/confessions.html",
  "/scrub-rack.html",
  "/shift-kit.html",
  "/student-bay.html",
  "/gear-guide.html",
  "/wellbeing.html",
  assets.styles,
  assets.site,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
  "/favicon.svg"
];
const buildId = hash(JSON.stringify(assets));
const sw = `const CACHE = "onlyscrubs-${buildId}";
const PRECACHE = ${JSON.stringify(precache, null, 2)};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(event.request);
        if (fresh.ok && fresh.type === "basic" && !fresh.redirected) cache.put(event.request, fresh.clone());
        return fresh;
      } catch (error) {
        return (await cache.match(event.request)) || (await cache.match("/offline.html")) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(event.request);
    if (hit) return hit;
    const fresh = await fetch(event.request);
    if (fresh.ok && fresh.type === "basic" && url.pathname.startsWith("/assets/")) cache.put(event.request, fresh.clone());
    return fresh;
  })());
});
`;
fs.writeFileSync(path.join(publicDir, "sw.js"), sw);

const manifest = {
  name: "OnlyScrubs",
  short_name: "OnlyScrubs",
  description: "Practical, anonymous resources for Australian nurses, midwives and students.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#f3f6f4",
  theme_color: "#0c6b68",
  lang: "en-AU",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
};
fs.writeFileSync(path.join(publicDir, "manifest.webmanifest"), JSON.stringify(manifest, null, 2));

const builtOn = new Date().toISOString().slice(0, 10);
function lastmod(urlPath) {
  const guide = guides.find((item) => item.path === urlPath);
  return String(guide?.updated || guide?.date || builtOn).slice(0, 10);
}
const sitemapUrls = [...rendered.keys()].filter((urlPath) => !["/admin.html", "/404.html", "/offline.html"].includes(urlPath));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((urlPath) => `  <url><loc>https://onlyscrubs.org${urlPath === "/" ? "/" : urlPath}</loc><lastmod>${lastmod(urlPath)}</lastmod><changefreq>weekly</changefreq></url>`).join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(publicDir, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin\nDisallow: /api/\nDisallow: /unsubscribe\n\nSitemap: https://onlyscrubs.org/sitemap.xml\n`);

console.log(`built ${rendered.size} pages, ${hashes.size} content hashes`);
