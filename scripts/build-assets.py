#!/usr/bin/env python3
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
public = root / "public"
mapping = {
    "/": "index.html",
    "/index.html": "index.html",
    "/404.html": "404.html",
    "/admin.html": "admin.html",
    "/confessions.html": "confessions.html",
    "/scrub-rack.html": "scrub-rack.html",
    "/shift-kit.html": "shift-kit.html",
    "/student-bay.html": "student-bay.html",
    "/gear-guide.html": "gear-guide.html",
    "/wellbeing.html": "wellbeing.html",
    "/submit.html": "submit.html",
    "/submission-rules.html": "submission-rules.html",
    "/privacy.html": "privacy.html",
    "/disclaimer.html": "disclaimer.html",
    "/styles.css": "styles.css",
    "/confessions.js": "confessions.js",
    "/admin.js": "admin.js",
    "/robots.txt": "robots.txt",
    "/sitemap.xml": "sitemap.xml",
    "/favicon.svg": "favicon.svg",
}
aliases = {
    "/confessions": "/confessions.html",
    "/admin": "/admin.html",
    "/scrub-rack": "/scrub-rack.html",
    "/shift-kit": "/shift-kit.html",
    "/student-bay": "/student-bay.html",
    "/gear-guide": "/gear-guide.html",
    "/wellbeing": "/wellbeing.html",
    "/submit": "/submit.html",
    "/privacy": "/privacy.html",
    "/disclaimer": "/disclaimer.html",
    "/submission-rules": "/submission-rules.html",
}
assets = {url: (public / name).read_text() for url, name in mapping.items()}
out = root / "src" / "assets.js"
out.write_text(
    "/* Generated from public/. Re-run python scripts/build-assets.py after editing public files. */\n"
    "export const FILES = " + json.dumps(assets, ensure_ascii=False, indent=2) + ";\n"
    "export const ALIASES = " + json.dumps(aliases, indent=2) + ";\n"
)
print(f"wrote {out}")
