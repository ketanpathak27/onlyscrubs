# OnlyScrubs Website

This is a static website for `onlyscrubs.org`.

## Pages

- `index.html` - homepage
- `confessions.html` - public confession feed and submission form
- `admin.html` - moderation page
- `scrub-rack.html` - scrub donation, request and swap page
- `shift-kit.html` - practical shift tools
- `student-bay.html` - placement prep for students
- `gear-guide.html` - scrubs, shoes and gear guidance
- `wellbeing.html` - Australian support links
- `submit.html` - mailto submission templates
- `submission-rules.html` - moderation rules
- `privacy.html` - privacy notice
- `disclaimer.html` - professional and medical boundary disclaimer
- `404.html` - not found page
- `functions/api/confessions.js` - Cloudflare Pages Function for storing and moderating confessions
- `confessions.js` and `admin.js` - browser scripts for the feed, form and admin page

## Deploying to Cloudflare Pages

Upload the contents of this folder, including the `assets` folder. If the hero image does not appear after deploy, check that this file exists online:

`https://onlyscrubs.org/assets/hero-scrubs-breakroom.png`

Important: the confession system uses Cloudflare Pages Functions. Cloudflare dashboard drag-and-drop Direct Upload does not activate a `functions` folder. Use either:

- Wrangler Direct Upload from your computer, or
- a GitHub-connected Cloudflare Pages project.

The static pages will still deploy by drag-and-drop, but confession storage and moderation will not work until Functions are deployed.

## Confessions setup

The confessions feature needs Cloudflare KV storage.

1. In Cloudflare, go to Workers & Pages.
2. Open KV and create a namespace called `ONLYSCRUBS_CONFESSIONS`.
3. Open your OnlyScrubs Pages project.
4. Go to Settings, then Functions, then KV namespace bindings.
5. Add a binding named `CONFESSIONS_KV`.
6. Select the `ONLYSCRUBS_CONFESSIONS` namespace.
7. Go to Environment variables.
8. Add `ADMIN_TOKEN` with a long private password/token.
9. Redeploy the site.
10. Visit `/confessions.html` to submit and view approved confessions.
11. Visit `/admin.html` to approve or reject pending confessions.

New confessions do not appear publicly until approved in `/admin.html`.

## Compliance posture

The site is written to avoid regulated-health-service advertising. It does not provide medical advice, diagnosis, treatment, clinical recommendations, patient stories or testimonials about regulated health services.

This is not legal advice. Review before adding payments, donations, accounts, public forms or public listing boards.
