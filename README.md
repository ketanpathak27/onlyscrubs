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
| `SUPPORT_URL` | No | “Buy the next round of coffee” link. Hidden until this, or `supportUrl` in `src/config.js`, is a real http(s) URL. The owner still needs to supply a Buy Me a Coffee or Ko-fi page |
| `ADS_ENABLED` | No | `true` shows reserved slots on guide and gear pages only. Default off. Never in the confessions feed |

`src/config.js` is the one place in the repo for the support URL, the ads switch, and the public IndexNow key. Environment values override the support URL and the ads switch. Leave `supportUrl` empty until a real page exists. Do not put a placeholder such as `example.com` or `javascript:` there: those are treated as unset and the button stays hidden.

### Turnstile

1. Create a free Turnstile widget for `onlyscrubs.org`.
2. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET` on the Worker.
3. Redeploy is not required for the keys themselves. `/api/config` reads them per request, and the pages ask for that config before drawing the widget.

Until both are set, submissions still work. They keep the honeypot and the rate limits.

### Support link and ads

`SUPPORT_URL` can be a Buy Me a Coffee page, a Ko-fi page, or any other https link. The label stays “Buy the next round of coffee”. Until a real URL is set, the footer does not show the button.

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
| POST | `/api/admin/logout` | Clears the `os_admin` cookie (`Max-Age=0` and an expiry in 1970). The dashboard and the nav Log out button then return to the home page |
| POST | `/api/admin/indexnow` | Signed-in moderator submits the sitemap URLs to IndexNow. Free. No paid search service |
| GET | `/api/admin/session` | `{ signedIn }` only. Does not return the token |
| GET, PATCH | `/api/admin` | Bearer token or the session cookie. Existing actions, plus `reject`, listings, and relay messages |
| POST | `/api/admin/bulk` | `{ kind, action, ids }`, up to 50 |
| GET | `/api/admin/stats` | Old totals, plus listings and messages |
| GET | `/api/admin/newsletter.csv` | CSV download |

The footer has a small Admin link. After a successful sign-in, a lock icon appears in the header and a Log out button appears in the nav (and in the header on small screens). The moderation page has its own Log out button above the queue. Log out calls `POST /api/admin/logout`, expires `os_admin`, and returns to the home page. The password is not stored in the browser; the cookie is signed with the admin token and does not contain it. Scripts that already send `Authorization: Bearer` keep working.

Posts approved more than a year ago are archived, at most once a day on read, or immediately from the admin button. Counts on the dashboard include pending confessions and listings, items approved today in Australia/Sydney, reports, and newsletter signups.

The keyword filter holds confessions, comments and listings for a person to review when they look like they contain profanity or slurs, likely identifiers, or self-harm language. It does not publish them, and it does not bounce them with a refusal. Self-harm language returns Australian support lines to the poster. The flag reason is visible in the admin queue.

Reports from the same hashed IP are counted once per post. Each hashed IP can file a limited number of reports per Sydney day. A post leaves the public feed after three distinct reports, or immediately when the report category is patient information or a threat. A person still approves, rejects or deletes it.

Approved confessions can be upvoted once per hashed IP. The confessions page shows Top this week. An admin can pin one approved post as Shift of the week.

## Weekly digest

`GET /api/admin/digest` previews a note: top confessions of the week, newest guides, and the pinned shift, in HTML and text. `GET /api/admin/digest.html` downloads the HTML. `GET /api/admin/newsletter.csv` downloads subscribers with a personal unsubscribe URL. The HTML uses `{{unsubscribe_url}}` so a sender can merge that column. The note names OnlyScrubs and hello@onlyscrubs.org, and includes the unsubscribe link, for the Spam Act.

Sending is off. Cloudflare Email Sending to arbitrary recipients requires the Workers Paid plan. On the free plan, a `send_email` binding can only reach verified destination addresses in the account, not this list. There is no send button. To turn sending on later, move the Worker to Workers Paid, onboard onlyscrubs.org for Email Sending, add a `send_email` binding, and keep the per-subscriber unsubscribe link. Do not put `ADMIN_TOKEN` in the digest.

The shop at `/shop.html` lists the creator's own Gumroad templates. Checkout stays on Gumroad. The page does not load Gumroad's overlay script.

## Pages

Guides live under `/guides.html`, with reading time, tags, share, and `Article` JSON-LD. The shift planner and placement checklist run in the browser. The checklist uses `localStorage`. Nothing from those tools is uploaded.

Wellbeing numbers were checked against the services’ own sites on 17 November 2026:

- Nurse & Midwife Support, 1800 667 877, [nmsupport.org.au](https://www.nmsupport.org.au/)
- Lifeline, 13 11 14, [lifeline.org.au/get-help](https://www.lifeline.org.au/get-help/)
- Beyond Blue, 1300 22 4636, [beyondblue.org.au/get-support](https://www.beyondblue.org.au/get-support)
- 13YARN, 13 92 76, [13yarn.org.au](https://www.13yarn.org.au/)
- Emergency, 000

## PWA, SEO, caching

`/manifest.webmanifest`, icons (192, 512, and a maskable 512), and `/sw.js` make the site installable. The manifest `id` is `/`, `display` is `standalone`, and the service worker has a fetch handler. It is network-first for pages, cache-first for hashed assets, and ignores `/api/` and `/admin`. Offline navigation falls back to `/offline.html`.

Install app is in the footer. Where the browser fires `beforeinstallprompt`, the button opens that prompt. Safari on iPhone and iPad never fires that event, so the button opens a short sheet: Share, then Add to Home Screen. The same sheet is the fallback on other browsers. The button is hidden when the site is already open standalone (`display-mode: standalone`, or `navigator.standalone` on iOS).

HTML is cached for five minutes. Hashed CSS and JS are immutable for a year. The theme script is inlined so it does not add a render-blocking request. API responses are `no-store`. `/admin` and `/unsubscribe` send `noindex`. `robots.txt` disallows `/admin`, `/api/`, and `/unsubscribe`, and points at the sitemap. The sitemap lists public pages, including the terms and complaints pages and every guide, with `lastmod`.

IndexNow is free and does not need an account. The public key lives in `src/config.js` as `indexNowKey`. The build writes `public/<key>.txt`, and the Worker serves that same file at `/<key>.txt` as `text/plain`. After a production deploy, submit the sitemap once:

```bash
npm run indexnow
```

Or, while signed in, use “Submit pages to IndexNow” on the moderation page. IndexNow checks that `https://onlyscrubs.org/<key>.txt` is already live, so a submission made before that deploy is rejected. Run it after the site is published. Do not add a paid indexing service.

## Legal pages

`/terms.html` is the Terms of Use. `/complaints.html` is the report and takedown page. `/privacy.html` covers the Australian Privacy Principles, including the `os_admin` cookie, hashed IP addresses used for rate limits, overseas processing by Cloudflare, and the fact that a Scrub Rack contact email is not shown on the listing. Footer links are on every page. Submission forms say that posting agrees to the Terms.

Newsletter emails must use `renderNewsletterEmail` in `src/lib/newsletter.js`. That template names OnlyScrubs and hello@onlyscrubs.org and includes the one-click unsubscribe link. The admin CSV has the same link in `unsubscribeUrl`. Do not send a newsletter that skips it. Signup stores consent only when the box is ticked. The signing key is the existing `ADMIN_TOKEN`. This does not rotate it, and the token is not written into the link.

## Deploy

```bash
npx wrangler deploy --dry-run   # build and package, no upload
npx wrangler deploy             # when you mean to ship
npm run indexnow                # after the deploy, once the key file is live
```

The Worker name, route, and KV id in `wrangler.jsonc` match production. A deploy publishes the new code onto that Worker. It does not rotate `ADMIN_TOKEN` unless you run `wrangler secret put`.

Do not point `wrangler dev` at remote KV unless you intend to write production data.
