# OnlyScrubs

A free, anonymous site for Australian nurses, midwives, healthcare workers and students. Guides, a moderated scrub swap, shift tools, gear notes, wellbeing signposts, and a confessions feed.

Live site: [https://onlyscrubs.org](https://onlyscrubs.org)

The tone is Australian English. The content is general information, not clinical advice. The disclaimer is the page at `/disclaimer.html`.

## Stack

Everything stays on free tiers:

- Cloudflare Workers and Workers static assets
- One existing KV namespace, binding `CONFESSIONS_KV`
- Optional Cloudflare Turnstile (free widget)
- Optional Cloudflare Web Analytics, injected by the zone. The content security policy already allows `static.cloudflareinsights.com`

No paid email, database, or ad network. Scrub Rack messages are stored in KV for a person to forward.

Do not rotate `ADMIN_TOKEN`. It is an existing Worker secret. This repo never contains it.

## Layout

| Path | What it is |
| --- | --- |
| `src/worker.js` | Router, security headers, www to apex redirect |
| `src/routes/` | Confessions, Scrub Rack, admin APIs |
| `src/lib/` | Moderation, rate limits, Turnstile, the shift-planner maths |
| `content/guides/` | Guide markdown |
| `data/gear.json` | Gear notes. `affiliateUrl` is optional |
| `site/` | HTML layout and page templates |
| `client/` | CSS, scripts, fonts, icons |
| `scripts/build.mjs` | Writes `public/` and `src/generated/meta.js` |
| `public/` | Build output. Gitignored. Wrangler serves it |

`npx wrangler deploy` and `npx wrangler dev` run the build first.

## Scripts

```bash
npm install
npm test                 # moderation, listings, planner
npm run check            # build + wrangler deploy --dry-run
npm run dev              # http://127.0.0.1:8787, local KV
npm run smoke            # against a running dev server
```

Copy `.dev.vars.example` to `.dev.vars` for local admin calls. Local dev uses simulated KV and does not write to production.

## Configuration

Set these in the Cloudflare dashboard or with `wrangler secret put` / vars. Do not put empty values in `wrangler.jsonc`. A deploy would overwrite dashboard settings.

| Name | Required | Effect |
| --- | --- | --- |
| `ADMIN_TOKEN` | Yes, already set | Admin password and bearer token. Also the key that signs the session cookie. Leave the existing secret alone |
| `TURNSTILE_SITE_KEY` | No | Public site key. The widget loads only when this and the secret are both set |
| `TURNSTILE_SECRET` | No | Server check for Turnstile. If either value is missing, forms skip the check |
| `SUPPORT_URL` | No | “Buy the next round of coffee” link. Hidden when empty |
| `ADS_ENABLED` | No | `true` shows reserved slots on guide and gear pages only. Default off. Never in the confessions feed |

`src/config.js` holds the same support URL and ads switch as code defaults. Environment values override them.

### Turnstile

1. Create a free Turnstile widget for `onlyscrubs.org`.
2. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` on the Worker.
3. Redeploy is not required for the keys themselves. `/api/config` reads them per request, and the pages ask for that config before drawing the widget.

Until both are set, submissions still work. They keep the honeypot and the rate limits.

### Support link and ads

`SUPPORT_URL` can be a Buy Me a Coffee page or anything else. The label stays “Buy the next round of coffee”.

Ad slots are dashed boxes labelled “Advertisement”. Turning `ADS_ENABLED` on does not load a third-party script. When you add one, update the content security policy in `src/lib/http.js`.

### Gear partner links

In `data/gear.json`, set `affiliateUrl` on an item. The build renders it with a prominent **Sponsored** label and `rel="sponsored nofollow noopener noreferrer"`. Leave it unset and there is no outbound product link. The gear page always shows the affiliate disclosure. Ad slots are labelled **Ad**. Do not invent prices or reviews.

## URLs and APIs

Existing pages keep their `.html` addresses. Extensionless paths redirect: `/confessions` to `/confessions.html`. `www.onlyscrubs.org` redirects to the apex.

Confession records stay compatible with the current KV keys:

- `confession:{createdAt}:{id}`
- `comment:{confessionId}:{createdAt}:{id}`
- `vote:{id}:{ip hash}`
- `newsletter:{email}`
- `rl:{bucket}` for rate limits

New keys use `listing:`, `relay:`, `react:`, and `meta:`.

| Method | Path | Notes |
| --- | --- | --- |
| GET, POST | `/api/confessions` | Same shape as before. Optional `q`, `tag`, `sort=new\|top`. Pending still needs the admin token |
| GET, POST | `/api/comments` | Unchanged contract |
| POST | `/api/rate` | One vote per hashed IP. `{ ok, score, alreadyRated? }` |
| POST | `/api/react` | `{ id, reaction: "same" \| "hug" }`. Separate from ratings |
| POST | `/api/report` | Confessions, or `{ kind: "listing" }`. Hides the item from the public page and keeps it in the reported queue |
| GET, POST | `/api/listings` | Public list is approved only and has no email |
| POST | `/api/messages` | Relay stored for admin. No email is sent |
| POST | `/api/newsletter` | Needs `consent: true`. Stores the address. The response includes an unsubscribe URL. Repeat submits stay `ok` |
| GET, POST | `/unsubscribe?token=` | Signed token. Removes that address from KV immediately. Not indexed |
| GET | `/api/config` | Public flags only |
| POST | `/api/admin/login` | Password is the existing admin token. Sets an HttpOnly, Secure, SameSite=Strict cookie for 12 hours. Five failed tries per IP each 15 minutes |
| POST | `/api/admin/logout` | Clears that cookie |
| GET | `/api/admin/session` | `{ signedIn }` only. Does not return the token |
| GET, PATCH | `/api/admin` | Bearer token or the session cookie. Existing actions, plus `reject`, listings, and relay messages |
| POST | `/api/admin/bulk` | `{ kind, action, ids }`, up to 50 |
| GET | `/api/admin/stats` | Old totals, plus listings and messages |
| GET | `/api/admin/newsletter.csv` | CSV download |

The footer has a small Admin link. After a successful sign-in, a lock icon appears in the header. The password is not stored in the browser; the cookie is signed with the admin token and does not contain it. Scripts that already send `Authorization: Bearer` keep working.

Posts approved more than a year ago are archived, at most once a day on read, or immediately from the admin button. Counts on the dashboard include pending confessions and listings, items approved today in Australia/Sydney, reports, and newsletter signups.

The keyword filter still blocks patient, workplace, and clinical wording. Emails, links, and long phone numbers in public text are blocked too. The private email fields are separate.

## Pages

Guides live under `/guides.html`, with reading time, tags, share, and `Article` JSON-LD. The shift planner and placement checklist run in the browser. The checklist uses `localStorage`. Nothing from those tools is uploaded.

Wellbeing numbers were checked against the services’ own sites on 17 November 2026:

- Nurse & Midwife Support, 1800 667 877, [nmsupport.org.au](https://www.nmsupport.org.au/)
- Lifeline, 13 11 14, [lifeline.org.au/get-help](https://www.lifeline.org.au/get-help/)
- Beyond Blue, 1300 22 4636, [beyondblue.org.au/get-support](https://www.beyondblue.org.au/get-support)
- 13YARN, 13 92 76, [13yarn.org.au](https://www.13yarn.org.au/)
- Emergency, 000

## PWA, SEO, caching

`/manifest.webmanifest`, icons, and `/sw.js` make the site installable. The service worker is network-first for pages, cache-first for hashed assets, and ignores `/api/` and `/admin`. Offline navigation falls back to `/offline.html`.

HTML is cached for five minutes. Hashed CSS and JS are immutable for a year. The theme script is inlined so it does not add a render-blocking request. API responses are `no-store`. `/admin` and `/unsubscribe` send `noindex`. `robots.txt` disallows `/admin`, `/api/`, and `/unsubscribe`, and points at the sitemap. The sitemap lists public pages, including the terms and complaints pages and every guide, with `lastmod`.

## Legal pages

`/terms.html` is the Terms of Use. `/complaints.html` is the report and takedown page. `/privacy.html` covers the Australian Privacy Principles, including the `os_admin` cookie, hashed IP addresses used for rate limits, overseas processing by Cloudflare, and the fact that a Scrub Rack contact email is not shown on the listing. Footer links are on every page. Submission forms say that posting agrees to the Terms.

Newsletter emails must use `renderNewsletterEmail` in `src/lib/newsletter.js`. That template names OnlyScrubs and hello@onlyscrubs.org and includes the one-click unsubscribe link. The admin CSV has the same link in `unsubscribeUrl`. Do not send a newsletter that skips it. Signup stores consent only when the box is ticked. The signing key is the existing `ADMIN_TOKEN`. This does not rotate it, and the token is not written into the link.

## Deploy

```bash
npx wrangler deploy --dry-run   # build and package, no upload
npx wrangler deploy             # when you mean to ship
```

The Worker name, route, and KV id in `wrangler.jsonc` match production. A deploy publishes the new code onto that Worker. It does not rotate `ADMIN_TOKEN` unless you run `wrangler secret put`.

Do not point `wrangler dev` at remote KV unless you intend to write production data.
