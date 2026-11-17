# OnlyScrubs

A free Australian resource site for healthcare workers and students: scrub swaps, shift and placement tips, gear notes, wellbeing signposts, and a moderated confessions feed.

Live site: [https://onlyscrubs.org](https://onlyscrubs.org)

This repository is the source for the Cloudflare Worker that serves the site and APIs.

## Stack

- Static HTML, CSS and JS in `public/`
- Cloudflare Worker in `src/worker.js` (API, security headers, caching, rate limits)
- Cloudflare KV namespace `CONFESSIONS_KV` for submissions, comments, votes and rate-limit keys
- `ADMIN_TOKEN` Worker secret for `/admin.html` moderation

`src/assets.js` is generated from `public/`. After editing files in `public/`, run:

```bash
npm run build:assets
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
# put a local-only admin token in .dev.vars
npm run dev
```

Wrangler uses a local KV simulation by default, so local testing does not write to production data.

## Deploy

```bash
npx wrangler deploy
```

The Worker is bound to `onlyscrubs.org`. Keep the existing `ADMIN_TOKEN` secret; deployments should not replace it unless you intend to rotate it.

## Confessions

Public submissions go to `/api/confessions` and stay pending until approved at `/admin.html`. Comments, ratings and reports have additional endpoints under `/api/`. Keyword checks and honeypot fields catch obvious risky or spam submissions; human moderation is still required.

Posts older than one year are archived automatically.

## Compliance

OnlyScrubs is not a clinic and does not provide medical advice, diagnosis or treatment. It is written to avoid regulated-health-service advertising. Review this before adding payments, accounts or public listing boards.
