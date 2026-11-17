import { TAGS } from "../src/lib/moderation.js";
import { adSlot, heroArt, layout, newsletterForm } from "./layout.mjs";
import { esc } from "./markdown.mjs";

const SITE = "https://onlyscrubs.org";

function page(options) {
  return layout(options);
}

const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
  .map((state) => `<option value="${state}">${state}</option>`)
  .join("");

function tags(field = "tag") {
  return TAGS.map((tag) => `<label><input type="checkbox" name="${field}" value="${tag}"> ${esc(tag)}</label>`).join("");
}

const postingTerms = `<p class="disclosure">By posting you agree to the <a href="/terms.html">Terms</a>.</p>`;

function faqPage(pairs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map(([name, text]) => ({
      "@type": "Question",
      name,
      acceptedAnswer: { "@type": "Answer", text }
    }))
  };
}

function faqHtml(pairs) {
  return `<h2>Common questions</h2>\n${pairs.map(([question, answer]) => `<h3>${esc(question)}</h3>\n<p>${answer}</p>`).join("\n")}`;
}

function guideCards(guides) {
  return guides.map((guide) => `<a class="guide-card link-card" href="${guide.path}" data-guide-card data-tags="${esc(guide.tags.join(","))}">
    <p class="kicker">${esc(guide.tags.join(" · "))}</p>
    <h3>${esc(guide.title)}</h3>
    <p>${esc(guide.description)}</p>
    <p class="reading">${guide.minutes} min read</p>
  </a>`).join("");
}

export function home(assets, guides) {
  const featured = guides.slice(0, 3);
  return page({
    title: "OnlyScrubs | Practical stuff for Australian nurses and midwives",
    description: "Free, anonymous guides, scrub swaps, shift tools and moderated confessions for Australian nurses, midwives, students and healthcare workers.",
    path: "/",
    active: "/",
    assets,
    newsletter: "band",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "OnlyScrubs",
      url: `${SITE}/`,
      email: "hello@onlyscrubs.org",
      logo: `${SITE}/icons/icon-512.png`,
      areaServed: { "@type": "Country", name: "Australia" },
      description: "Anonymous practical resources for Australian nurses, midwives, students and healthcare workers."
    }, {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "OnlyScrubs",
      url: `${SITE}/`,
      description: "Practical, anonymous resources for Australian nurses, midwives, students and healthcare workers.",
      inLanguage: "en-AU",
      publisher: { "@type": "Organization", name: "OnlyScrubs", url: `${SITE}/`, email: "hello@onlyscrubs.org" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE}/confessions.html?q={search_term_string}` },
        "query-input": "required name=search_term_string"
      }
    }],
    main: `<section class="wrap hero">
      <div class="hero-copy">
        <p class="eyebrow">Nurses, midwives, students</p>
        <h1>Useful stuff for people in scrubs.</h1>
        <p class="lede">Mildly unhinged, professionally safe. Guides, gear notes, scrub swaps and harmless confessions. No patients. No workplaces named.</p>
        <div class="hero-actions">
          <a class="button primary" href="/guides.html">Read the guides</a>
          <a class="button secondary" href="/confessions.html">Open confessions</a>
        </div>
      </div>
      ${heroArt()}
    </section>
    <div class="wrap"><p class="banner"><strong>Clean boundary.</strong> OnlyScrubs is not a clinic, not medical advice, and not a place for patient stories. It is a resource and mutual-support project for healthcare workers and students.</p></div>
    <section class="section wrap reveal">
      <p class="kicker">Start here</p>
      <h2>Pick a bay.</h2>
      <div class="grid cards">
        <a class="card link-card" href="/guides.html"><span class="icon-blob">01</span><h3>Guides</h3><p>Placement, nights, handover, study, money, and asking for help.</p></a>
        <a class="card link-card" href="/scrub-rack.html"><span class="icon-blob">02</span><h3>Scrub Rack</h3><p>Donate, request or swap clean scrubs. Emails stay private.</p></a>
        <a class="card link-card" href="/shift-kit.html"><span class="icon-blob">03</span><h3>Shift Kit</h3><p>A rest and caffeine planner for rotating shifts.</p></a>
        <a class="card link-card" href="/student-bay.html"><span class="icon-blob">04</span><h3>Student Bay</h3><p>A placement checklist you can save and print.</p></a>
        <a class="card link-card" href="/gear-guide.html"><span class="icon-blob">05</span><h3>Gear</h3><p>Honest notes on shoes, socks, watches, bags and pens.</p></a>
        <a class="card link-card" href="/wellbeing.html"><span class="icon-blob">06</span><h3>Wellbeing</h3><p>Australian support lines, and a short breathing pause.</p></a>
      </div>
    </section>
    <section class="section wrap reveal">
      <p class="kicker">From the guides</p>
      <h2>Practical, and deliberately not clinical.</h2>
      <div class="grid cards">${guideCards(featured)}</div>
    </section>
    <section class="section wrap reveal">
      <div class="split">
        <div>
          <p class="kicker">Cheeky, with rails</p>
          <h2>Confessions are welcome. Identifiers are not.</h2>
          <p>Harmless shift-life humour is fine. Patient information, clinical incidents, colleague call-outs, employer names and treatment claims are not.</p>
          <a class="button primary" href="/submission-rules.html">Read the rules</a>
        </div>
        <div class="stack">
          <article class="quote"><p>“I brought five pens and left with a spoon, a mystery highlighter and personal growth.”</p><span>Allowed. Harmless and non-identifying.</span></article>
          <article class="quote bad"><p>“A patient at my hospital…”</p><span>Not allowed. No patients, locations, dates or clinical detail.</span></article>
        </div>
      </div>
    </section>
    <section class="section wrap" id="newsletter">
      <div class="newsletter-band">
        <div>
          <p class="kicker">Newsletter</p>
          <h2>Occasional notes. No mailing-list theatre.</h2>
          <p>Guides and site news from OnlyScrubs, hello@onlyscrubs.org. Each email has an unsubscribe link that removes you straight away.</p>
        </div>
        ${newsletterForm()}
      </div>
    </section>`
  });
}

export function guideIndex(assets, guides) {
  const tagSet = [...new Set(guides.flatMap((guide) => guide.tags))];
  return page({
    title: "Guides",
    description: "Practical Australian guides for nursing and midwifery students and new clinicians: placement, nights, ISBAR, study, money and asking for help.",
    path: "/guides.html",
    active: "/guides.html",
    assets,
    main: `<section class="wrap page-hero"><p class="eyebrow">Read this, not a patient record</p><h1>Guides</h1><p class="lede">General, practical notes for study, placement and shift life. Not clinical advice. Each guide says so again, on purpose.</p></section>
      <section class="wrap section">
        <div class="filters" data-guide-filters role="group" aria-label="Filter guides">
          <button class="tag-pill" type="button" data-tag="" aria-pressed="true">All</button>
          ${tagSet.map((tag) => `<button class="tag-pill" type="button" data-tag="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`).join("")}
        </div>
        <div class="grid cards">${guideCards(guides)}</div>
      </section>`
  });
}

export function guideArticle(assets, guide, related) {
  const url = `${SITE}${guide.path}`;
  return page({
    title: guide.title,
    description: guide.description,
    path: guide.path,
    active: "/guides.html",
    assets,
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      datePublished: guide.date,
      dateModified: guide.updated || guide.date,
      inLanguage: "en-AU",
      mainEntityOfPage: url,
      image: `${SITE}/og.png`,
      author: { "@type": "Organization", name: "OnlyScrubs", url: `${SITE}/` },
      publisher: { "@type": "Organization", name: "OnlyScrubs", url: `${SITE}/` }
    }],
    main: `<article class="wrap page-hero prose">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/guides.html">Guides</a><span aria-hidden="true">/</span><span aria-current="page">${esc(guide.title)}</span></nav>
      <p class="eyebrow">${esc(guide.tags.join(" · "))}</p>
      <h1>${esc(guide.title)}</h1>
      <p class="reading">${guide.minutes} min read · Updated ${esc(guide.updated || guide.date)}</p>
      <div class="button-row no-print"><button class="button secondary compact" type="button" data-share data-share-title="${esc(guide.title)}">Share</button></div>
      <blockquote class="callout"><p><strong>Not clinical advice.</strong> General information for healthcare workers and students in Australia. It does not replace your university, employer, facilitator, or professional standards.</p></blockquote>
      ${adSlot("guide-top")}
      ${guide.html}
      ${adSlot("guide-end")}
      <h2>Keep going</h2>
      <div class="grid cards">${guideCards(related)}</div>
    </article>`
  });
}

export function scrubRack(assets) {
  return page({
    title: "Scrub Rack",
    description: "Donate, request or swap clean scrubs in Australia. Listings are moderated. Contact emails stay private and messages go through OnlyScrubs.",
    path: "/scrub-rack.html",
    active: "/scrub-rack.html",
    assets,
    scripts: [assets.rack],
    main: `<section class="wrap page-hero"><p class="eyebrow">Donate, request, swap</p><h1>Scrub Rack</h1><p class="lede">A low-drama place for clean scrub gear. Listings are checked before they appear. Your email is never shown on the card.</p></section>
    <section class="wrap section page-split">
      <div>
        <div class="filters" aria-label="Filter listings">
          <label>Search<input id="filter-query" type="search" placeholder="Navy, size 12, woolloomooloo"></label>
          <label>Type<select id="filter-type"><option value="">Any</option><option value="donate">Donate</option><option value="request">Request</option><option value="swap">Swap</option></select></label>
          <label>State<select id="filter-state"><option value="">Any</option>${states}</select></label>
          <label>Condition<select id="filter-condition"><option value="">Any</option><option value="new">New</option><option value="as-new">As new</option><option value="good">Good</option><option value="fair">Fair</option></select></label>
        </div>
        <p id="listing-status" class="visually-hidden" aria-live="polite">Loading listings</p>
        <div id="listing-feed" class="stack" aria-busy="true"><div class="skeleton"></div><div class="skeleton"></div></div>
      </div>
      <div class="panel" id="list-form">
        <h2>List a set</h2>
        <p>No employer names, no clinical supplies, no patient stories. Suburb and state are enough.</p>
        <p class="banner"><strong>Before you post.</strong> The title, description, size, colour, suburb and state are public. Your contact email is not. People write through OnlyScrubs, and a moderator passes on a suitable message. That is the safer contact option. Do not type an email address or phone number into the public fields.</p>
        <form class="form" id="listing-form">
          <label>I want to<select name="type" required><option value="donate">Donate</option><option value="request">Request</option><option value="swap">Swap</option></select></label>
          <label>Title<input name="title" required minlength="4" maxlength="80" placeholder="Navy scrub top, size 12"></label>
          <label>Description<textarea name="description" required minlength="20" maxlength="800" placeholder="Clean, no stains, pickup from a suburb station this month."></textarea></label>
          <label>Size<input name="size" required maxlength="32" placeholder="12 or M"></label>
          <label>Brand, if you know it<input name="brand" maxlength="40"></label>
          <label>Colour<input name="colour" required maxlength="32" placeholder="Navy"></label>
          <label>Suburb or pickup area<input name="suburb" required minlength="2" maxlength="48"></label>
          <label>State<select name="state" required><option value="">Choose</option>${states}</select></label>
          <label>Condition<select name="condition" required><option value="new">New</option><option value="as-new">As new</option><option value="good" selected>Good</option><option value="fair">Fair</option></select></label>
          <label>Your name<input name="contactName" maxlength="60" autocomplete="name"></label>
          <label>Email, kept off the public listing<input name="contactEmail" type="email" required autocomplete="email"></label>
          <label class="check"><input name="confirm" type="checkbox" required><span>I confirm this does not name a workplace, patient, or clinical matter, and that my email is only for OnlyScrubs to pass messages on.</span></label>
          ${postingTerms}
          <input class="honeypot" name="website" tabindex="-1" autocomplete="off">
          <div data-turnstile></div>
          <button class="button primary" type="submit">Submit for moderation</button>
          <p class="form-message" id="listing-message" role="status"></p>
        </form>
      </div>
    </section>`
  });
}

export function shiftKit(assets) {
  return page({
    title: "Shift Kit",
    description: "A client-side sleep and caffeine planner for rotating nursing and midwifery shifts, plus links to the night shift and handover guides.",
    path: "/shift-kit.html",
    active: "/shift-kit.html",
    assets,
    scripts: [assets.planner],
    main: `<section class="wrap page-hero"><p class="eyebrow">Shift tools</p><h1>Shift Kit</h1><p class="lede">Plan rest around a roster. Nothing on this page is uploaded. It is a sketch, not a medical plan.</p></section>
    <section class="wrap section page-split">
      <form class="panel form" data-planner>
        <h2>Rest and caffeine sketch</h2>
        <label>Shift type<select name="shift"><option value="early">Early</option><option value="late">Late</option><option value="night">Night</option><option value="custom">Custom</option></select></label>
        <label>Starts<input name="start" type="time" value="07:00" required></label>
        <label>Finishes<input name="end" type="time" value="15:30" required></label>
        <label>Sleep you want, in hours<input name="sleep" type="number" min="4" max="9" step="0.5" value="7"></label>
        <label>Minutes to get ready and travel<input name="buffer" type="number" min="30" max="180" step="15" value="75"></label>
        <button class="button primary" type="submit">Plan my rest</button>
        <div id="planner-output" class="planner-result" aria-live="polite"></div>
        <p class="disclosure">Caffeine advice here is a common six-hour rule of thumb. If you have been told to limit caffeine, follow that. If you are drowsy, do not drive.</p>
      </form>
      <div>
        <h2>Use it with a guide</h2>
        <div class="stack">
          <a class="card link-card" href="/guides/night-shift.html"><h3>Night shift survival</h3><p>Sleep, food, light, and the drive home.</p></a>
          <a class="card link-card" href="/guides/isbar-handover.html"><h3>Handover, in ISBAR</h3><p>A blank structure, not a patient script.</p></a>
          <a class="card link-card" href="/guides/feet-and-back.html"><h3>Feet and back</h3><p>Shoes, loads, and when to see your own clinician.</p></a>
        </div>
      </div>
    </section>`
  });
}

function checkItem(id, title, detail) {
  return `<label class="check-item"><input type="checkbox" data-check id="${id}"><span><strong>${title}</strong><br><span class="disclosure">${detail}</span></span></label>`;
}

export function studentBay(assets) {
  return page({
    title: "Student Bay",
    description: "A printable placement checklist for Australian nursing and midwifery students, saved in this browser only.",
    path: "/student-bay.html",
    active: "/student-bay.html",
    assets,
    scripts: [assets.checklist],
    main: `<section class="wrap page-hero"><p class="eyebrow">Placement prep</p><h1>Student Bay</h1><p class="lede">Pack the boring things before the shift starts inventing extra problems. Ticks stay in this browser.</p></section>
    <section class="wrap section">
      <form id="placement-checklist">
        <p class="progress" id="check-progress" aria-live="polite">0 packed</p>
        <fieldset class="group"><legend>Documents</legend>
          ${checkItem("doc-id", "Student ID", "The card your university told you to carry.")}
          ${checkItem("doc-letter", "Placement confirmation", "Start time, meeting point, and who to call if you are late.")}
          ${checkItem("doc-checks", "Compliance evidence", "Only what the university asked for, stored the way they asked.")}
          ${checkItem("doc-late", "A way to say you are running late", "The phone number from the brief, not a guess.")}
        </fieldset>
        <fieldset class="group"><legend>Uniform</legend>
          ${checkItem("uni-scrubs", "Approved uniform, washed", "Including a spare top if you can.")}
          ${checkItem("uni-shoes", "Closed shoes that meet the rule", "Already worn in, if they needed it.")}
          ${checkItem("uni-socks", "Socks you can stand in", "A spare pair if the day will be hot.")}
          ${checkItem("uni-hair", "Hair ties, if you need them", "Hair that falls forward is a problem in a bay.")}
          ${checkItem("uni-watch", "Fob watch, if wristwatches are banned", "With a second hand you can actually read.")}
        </fieldset>
        <fieldset class="group"><legend>Bag</legend>
          ${checkItem("bag-water", "Water bottle", "Full, and not leaking onto notes.")}
          ${checkItem("bag-food", "Food you can eat quickly", "Do not assume a canteen is open.")}
          ${checkItem("bag-pens", "More than one black pen", "And a small notebook that will not leave with identifiers in it.")}
          ${checkItem("bag-transport", "Transport card or a fare plan", "Including the early service, and a backup.")}
        </fieldset>
        <fieldset class="group"><legend>The day itself</legend>
          ${checkItem("day-route", "Route checked", "Where you change, and where you meet.")}
          ${checkItem("day-scope", "One question about scope", "What you may do today, and what must wait.")}
          ${checkItem("day-home", "A plan for getting home", "Especially after a late or a night. Do not drive drowsy.")}
        </fieldset>
        <div class="button-row no-print">
          <button class="button secondary" id="check-print" type="button">Print checklist</button>
          <button class="button" id="check-reset" type="button">Reset ticks</button>
        </div>
      </form>
      <div class="grid cards spaced">
        <a class="card link-card" href="/guides/first-clinical-placement.html"><h3>First placement</h3><p>What to organise before the roster starts.</p></a>
        <a class="card link-card" href="/guides/asking-for-help.html"><h3>Asking for help</h3><p>Sentences that work on a busy shift.</p></a>
        <a class="card link-card" href="/guides/budgeting.html"><h3>Budgeting</h3><p>Unpaid placement costs, without invented dollar figures.</p></a>
      </div>
    </section>`
  });
}

export function gearGuide(assets, gear) {
  const cats = [...new Map(gear.map((item) => [item.category, item.category])).keys()];
  const cards = gear.map((item) => {
    const affiliate = item.affiliateUrl
      ? `<p class="sponsored-placement"><span class="ad-label">Sponsored</span> <a href="${esc(item.affiliateUrl)}" rel="sponsored nofollow noopener noreferrer">Sponsored partner link</a></p>`
      : "";
    const blob = [item.title, item.summary, item.category, ...(item.advice || []), ...(item.lookFor || [])].join(" ");
    return `<article class="card gear-card" data-gear="${esc(blob)}" data-category="${esc(item.category)}">
      <p class="kicker">${esc(item.category)}</p>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.summary)}</p>
      ${item.advice.map((para) => `<p>${esc(para)}</p>`).join("")}
      <h4>Worth looking for</h4>
      <ul>${item.lookFor.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
      <h4>Think twice</h4>
      <ul>${item.thinkTwice.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
      ${affiliate}
    </article>`;
  }).join("");
  return page({
    title: "Gear guide",
    description: "Honest buying notes for shoes, compression socks, fob watches, bags, stethoscopes, pens and torches. No invented prices or reviews.",
    path: "/gear-guide.html",
    active: "/gear-guide.html",
    assets,
    scripts: [assets.gear],
    main: `<section class="wrap page-hero"><p class="eyebrow">Comfort is not a personality flaw</p><h1>Gear guide</h1><p class="lede">What to look for before you spend money. No star ratings, no made-up prices, no pretend reviews.</p>
      <p class="disclosure">Anything marked <strong>Sponsored</strong> is a paid or affiliate placement. OnlyScrubs may earn a commission at no extra cost to you. There are no sponsored links on this page unless a card says Sponsored. Slots marked <strong>Ad</strong> are advertisements. Ordinary notes are not ads.</p></section>
    <section class="wrap section">
      ${adSlot("gear-top")}
      <div class="filters">
        <label>Search<input id="gear-search" type="search" placeholder="Shoes, fob, penlight"></label>
      </div>
      <div class="tag-row" id="gear-filters">
        <button class="tag-pill is-active" type="button" data-category="" aria-pressed="true">All</button>
        ${cats.map((cat) => `<button class="tag-pill" type="button" data-category="${esc(cat)}" aria-pressed="false">${esc(cat)}</button>`).join("")}
      </div>
      <div class="stack" id="gear-grid">${cards}</div>
      ${adSlot("gear-end")}
    </section>`
  });
}

export function confessions(assets) {
  const pills = [`<button class="tag-pill is-active" type="button" data-feed-tag="" aria-pressed="true">All</button>`]
    .concat(TAGS.map((tag) => `<button class="tag-pill" type="button" data-feed-tag="${tag}" aria-pressed="false">#${esc(tag)}</button>`))
    .join("");
  return page({
    title: "Confessions",
    description: "Read, rate, and react to moderated, anonymous shift-life confessions. No patients and no workplaces named.",
    path: "/confessions.html",
    active: "/confessions.html",
    assets,
    scripts: [assets.confessions],
    main: `<section class="wrap page-hero"><p class="eyebrow">Harmless shift-life chaos</p><h1>Confessions</h1><p class="lede">Post the funny bit. Rate it, mark Same, or send a hug. Comments wait for moderation.</p></section>
    <section class="wrap section page-split">
      <div>
        <div class="filters">
          <label>Search<input id="feed-search" type="search" placeholder="Pens, nights, placement"></label>
          <label>Sort<select id="feed-sort"><option value="new">Newest</option><option value="top">Top</option></select></label>
        </div>
        <div class="tag-row" id="feed-tags">${pills}</div>
        <p id="feed-status" class="visually-hidden" aria-live="polite">Loading confessions</p>
        <div id="confession-feed" class="stack"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
      </div>
      <div class="panel">
        <h2>Submit a confession</h2>
        <p>It stays pending until a person approves it. Read the <a href="/submission-rules.html">rules</a> first.</p>
        <form class="form" id="confession-form">
          <label for="confession-text">Your confession<textarea id="confession-text" maxlength="700" minlength="20" required placeholder="Example: I came home with three pens, none of them mine, and one of them was somehow a highlighter."></textarea></label>
          <fieldset class="tag-picker"><legend>Tags, if they fit</legend>${tags()}</fieldset>
          <label class="check"><input type="checkbox" id="confession-confirm" required><span>I confirm this does not identify a patient, colleague, hospital, employer, date, incident or clinical detail.</span></label>
          ${postingTerms}
          <input class="honeypot" name="website" tabindex="-1" autocomplete="off">
          <div data-turnstile></div>
          <button class="button primary" type="submit">Submit for moderation</button>
          <p class="form-message" id="confession-message" role="status"></p>
        </form>
      </div>
    </section>`
  });
}

export function submitPage(assets) {
  return page({
    title: "Submit",
    description: "Send OnlyScrubs a scrub listing, a guide idea, or a harmless confession.",
    path: "/submit.html",
    active: "/submit.html",
    assets,
    main: `<section class="wrap page-hero"><p class="eyebrow">Send it in</p><h1>Submit</h1><p class="lede">Scrub listing, resource idea, or a confession that could survive a regulator with Wi-Fi.</p>${postingTerms}</section>
    <section class="wrap section"><div class="grid cards">
      <a class="card link-card" href="/scrub-rack.html#list-form"><h3>Scrub Rack</h3><p>Donate, request or swap. Your email stays off the public card.</p></a>
      <a class="card link-card" href="/confessions.html"><h3>Confession</h3><p>Write it on the site. It waits for moderation.</p></a>
      <a class="card link-card" href="mailto:hello@onlyscrubs.org?subject=Resource%20idea"><h3>Resource idea</h3><p>Suggest a guide. Do not include a patient story in the email either.</p></a>
    </div></section>`
  });
}

const wellbeingFaq = [
  ["What should I do in an emergency in Australia?", "Call 000 for police, fire or ambulance. This page is not an emergency service."],
  ["Who can nurses, midwives and students call?", "Nurse & Midwife Support on 1800 667 877, any time. Lifeline, Beyond Blue and 13YARN are listed on this page."],
  ["Is the breathing exercise treatment?", "No. It is a short pause. Stop if you feel unwell, and contact a health service if you need care."]
];

export function wellbeing(assets) {
  return page({
    title: "Wellbeing",
    description: "Australian support lines for nurses, midwives and students, including Nurse & Midwife Support, Lifeline, Beyond Blue and 13YARN, plus a short breathing exercise.",
    path: "/wellbeing.html",
    active: "/wellbeing.html",
    assets,
    scripts: [assets.breathe],
    jsonLd: [faqPage(wellbeingFaq)],
    main: `<section class="wrap page-hero"><p class="eyebrow">Support signposts</p><h1>Wellbeing</h1><p class="lede">Not therapy and not medical advice. Real services, with the numbers checked on their own sites on 17 November 2026.</p></section>
    <section class="wrap section">
      <h2>If there is immediate danger</h2>
      <div class="panel"><p>In Australia, call <a class="phone" href="tel:000">000</a> for police, fire or ambulance. The Triple Zero site is <a href="https://www.triplezero.gov.au/" rel="noopener noreferrer">triplezero.gov.au</a>.</p></div>
      <h2>Talk to someone</h2>
      <div class="support-list">
        <a class="support-card" href="https://www.nmsupport.org.au/" rel="noopener noreferrer"><strong>Nurse &amp; Midwife Support</strong><span class="phone">1800 667 877</span><p>24/7 confidential support for nurses, midwives and students. <span class="disclosure">nmsupport.org.au</span></p></a>
        <a class="support-card" href="https://www.lifeline.org.au/get-help/" rel="noopener noreferrer"><strong>Lifeline</strong><span class="phone">13 11 14</span><p>24/7 crisis support. <span class="disclosure">lifeline.org.au</span></p></a>
        <a class="support-card" href="https://www.beyondblue.org.au/get-support" rel="noopener noreferrer"><strong>Beyond Blue</strong><span class="phone">1300 22 4636</span><p>Mental health support, including anxiety and depression. <span class="disclosure">beyondblue.org.au</span></p></a>
        <a class="support-card" href="https://www.13yarn.org.au/" rel="noopener noreferrer"><strong>13YARN</strong><span class="phone">13 92 76</span><p>24/7 crisis support for Aboriginal and Torres Strait Islander people. <span class="disclosure">13yarn.org.au</span></p></a>
      </div>
      <h2>A four-minute pause</h2>
      <div class="panel breathe" data-breathe>
        <p>Box breathing: four seconds in, hold, out, hold. Stop if you feel unwell. This is not treatment.</p>
        <div class="orb" aria-hidden="true"></div>
        <p class="phase" data-phase aria-live="polite">Ready when you are</p>
        <div class="button-row">
          <button class="button primary" type="button" data-breathe-start>Start</button>
          <button class="button secondary" type="button" data-breathe-stop>Stop</button>
        </div>
      </div>
      <p><a href="/guides/asking-for-help.html">How to ask for help and debrief</a> without turning a shift into a public story.</p>
      ${faqHtml(wellbeingFaq)}
    </section>`
  });
}

const rulesFaq = [
  ["Can I post a patient story if I remove the name?", "No. Patient stories are not allowed, even when you think they are de-identified."],
  ["Can I name a colleague or a workplace?", "No. Do not name or describe a colleague, hospital, ward, clinic or employer in a way that identifies them."],
  ["How do I report a post or a scrub listing?", "Use the Report button on the item, or the complaints page. A report hides that confession or listing from the public page while it is reviewed."]
];

export function rules(assets) {
  return page({
    title: "Submission rules",
    description: "What OnlyScrubs will and will not publish: confessions, comments, scrub listings and relay messages.",
    path: "/submission-rules.html",
    active: "",
    assets,
    jsonLd: [faqPage(rulesFaq)],
    main: `<section class="wrap page-hero prose"><p class="eyebrow">Keep it kind, keep it safe</p><h1>Submission rules</h1>
      <p>Submissions may be edited, rejected, archived or deleted. A keyword filter catches obvious risks. A person still reads the queue.</p>
      <h2>Allowed</h2>
      <ul>
        <li>Harmless jokes about shift life, pens, socks, coffee, laundry and placement nerves.</li>
        <li>General tips that do not identify a service or give clinical instructions.</li>
        <li>Scrub listings with size, colour, condition and a suburb. Not a workplace.</li>
      </ul>
      <h2>Not allowed</h2>
      <ul>
        <li>Patient stories, even if you think they are de-identified.</li>
        <li>Clinical detail, diagnoses, treatment, incidents, or "code" language.</li>
        <li>Hospital, ward, clinic, employer, colleague or patient identifiers, including in a suburb field.</li>
        <li>Phone numbers, email addresses and links inside the public text. Use the private email field on the Scrub Rack.</li>
        <li>Bullying, harassment, discrimination, sexual content, hate, or workplace call-outs.</li>
        <li>Testimonials or claims about regulated health services.</li>
      </ul>
      <p>Ratings, Same and Hug reactions are for approved posts only. One of each per person. A report hides the confession or listing from the public page and sends it to the moderation queue. Read the <a href="/terms.html">Terms</a> before you post. To raise a concern, use the <a href="/complaints.html">complaints page</a>.</p>
      ${faqHtml(rulesFaq)}
    </section>`
  });
}

export function privacy(assets) {
  return page({
    title: "Privacy",
    description: "How OnlyScrubs handles personal information under the Australian Privacy Principles, including IP hashes, the admin cookie, Scrub Rack emails, and overseas hosting.",
    path: "/privacy.html",
    active: "",
    assets,
    main: `<section class="wrap page-hero prose"><p class="eyebrow">Australian Privacy Principles</p><h1>Privacy</h1>
      <p>This page explains how OnlyScrubs handles personal information. It is general information about this website, not legal advice. It was last updated on 17 November 2026.</p>
      <h2>Who we are</h2>
      <p>OnlyScrubs is an independent community website at onlyscrubs.org, run from Victoria, Australia, for healthcare workers and students. It is not a hospital, clinic, union, university, regulator, or government agency. For privacy questions, access requests, corrections, or complaints, email <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a>.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Confessions and comments.</strong> The text, the time, optional tags, moderation status, and later the public counts for ratings, Same and Hug. There is no name field. Do not add your name, or anyone else's.</li>
        <li><strong>Scrub Rack listings.</strong> The public card shows the type, title, description, size, brand, colour, condition, suburb and state. The contact email, and the name if you typed one, are stored separately and are not shown on the card. See <a href="#scrub-rack-email">email on Scrub Rack listings</a> below.</li>
        <li><strong>Relay messages.</strong> The sender's name, email and message, plus which listing it is about, so a moderator can pass a suitable note on. We do not run a paid email service. Passing a message on is a manual step.</li>
        <li><strong>Newsletter.</strong> The email address, the date you agreed, and the fact that you consented to occasional emails from OnlyScrubs, hello@onlyscrubs.org. We do not add you without that tick.</li>
        <li><strong>Reports.</strong> The reason you type, and a count on the item, so we can hide and review it.</li>
        <li><strong>Connection address, for limits only.</strong> To slow spam and to stop repeat votes and reactions, the site hashes the IP address your connection presents (SHA-256, then a shortened hex string) and stores that hash with a counter or a vote marker. We do not write the raw IP address into our content store, and we do not build a profile from the hash.</li>
        <li><strong>Admin cookie.</strong> <code>os_admin</code> is set only after a successful moderator sign-in. It is HttpOnly, Secure, and SameSite=Strict, lasts 12 hours, and holds a signed expiry, not the admin password. It is not used for analytics or advertising. Visitors who are not signed in as a moderator do not get this cookie.</li>
        <li><strong>On your device only.</strong> The colour theme, the placement checklist ticks, and pages saved by the installable app stay in this browser. They are not uploaded.</li>
      </ul>
      <h2>Why we collect it</h2>
      <p>We use this information to publish and moderate the community, pass Scrub Rack messages to the right person, send the newsletter you asked for, limit abuse, and keep the site available. We do not sell personal information, and we do not use it for advertising profiles.</p>
      <h2>Cookies</h2>
      <p>The only cookie this site sets itself is <code>os_admin</code>, and only for a signed-in moderator. We do not set analytics or advertising cookies, and we do not ask you to accept a tracking banner. If the optional spam check is switched on, Cloudflare Turnstile may process technical data, including on Cloudflare's own domain, to decide whether a form is automated. If Cloudflare Web Analytics is enabled for the domain, it is aggregated and does not add a separate tracker of ours.</p>
      <h2 id="scrub-rack-email">Email on Scrub Rack listings</h2>
      <p>Your contact email is <strong>not</strong> published on the listing. People who are interested send a message through OnlyScrubs. A moderator can then pass that message to the address you gave us. Do not put an email address or phone number in the title, description, suburb, or any other public field. Those fields are visible to anyone. The optional name on the form is also kept off the public card. If you would rather not share an email with us at all, do not list an item. You can still read the rack.</p>
      <h2>Disclosure</h2>
      <p>We do not give the newsletter list or private listing emails to advertisers or other sites. Moderators can see pending and approved records, including private emails, so they can run the queue. We may disclose information if the law requires it, or if it is reasonably necessary to lessen a serious threat to someone's life, health, or safety. Public text you submit can be read by anyone once it is approved.</p>
      <h2>Overseas processing</h2>
      <p>The site is hosted on Cloudflare. Content is stored in Cloudflare KV, which is a global service, and Cloudflare processes requests on a network that is not limited to Australia. That means personal information may be processed and stored overseas, including outside Australia. We do not promise that a particular record stays in Australia. Cloudflare acts as our infrastructure provider. We remain responsible for the handling we ask them to do. Their own privacy notice describes their processing.</p>
      <h2>Retention</h2>
      <ul>
        <li>Confessions stay pending until moderated. Approved posts move to an archive after a year. Rejected or deleted posts are removed from the public site. An archived post is no longer on the public feed.</li>
        <li>Comments follow the same moderation path and are removed if we delete them.</li>
        <li>Scrub Rack listings and relay messages are kept while the listing is live and while a moderator still needs the message. Ask us and we will delete a listing or a message we can find.</li>
        <li>A reported confession or listing is hidden from the public page as soon as the report is lodged. We keep the record in the moderation queue until it is restored or deleted.</li>
        <li>Newsletter addresses are kept until you unsubscribe or ask us to delete them. Unsubscribe takes effect immediately.</li>
        <li>Rate-limit counters expire with the limit window, from minutes up to about an hour. Vote and reaction markers expire after a year. The admin cookie expires after 12 hours, or sooner if the moderator logs out.</li>
      </ul>
      <h2>Access and correction</h2>
      <p>Email <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a> to ask for a copy of personal information we hold about you, or to correct it. Tell us the address you used, and enough detail to find the record, such as the listing title or the approximate date. Confessions do not store a name. If you did not include an email, we may not be able to tell which anonymous post is yours. We will not hand over someone else's information to prove a point. We aim to answer access and correction requests within 30 days.</p>
      <h2>Anonymity</h2>
      <p>You can read the site without identifying yourself. Confessions do not ask for a name. The newsletter and a Scrub Rack listing need an email, because those features do not work without one. Anonymity is not a promise that a story cannot be recognised. Do not post details that identify a patient, a colleague, or a workplace. Do not send us government identifiers such as a Medicare number. We do not ask for them, and we will delete content that contains them.</p>
      <h2>Complaints</h2>
      <p>Email <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a> with the words "privacy complaint", what happened, and how we can reach you. We will acknowledge the complaint and aim to respond within 30 days. If you are not satisfied with our response, you can complain to the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au/" rel="noopener noreferrer">oaic.gov.au</a>. Content complaints and defamation concern notices are handled on the <a href="/complaints.html">complaints page</a>. The rules for using the site are in the <a href="/terms.html">Terms of Use</a>.</p>
    </section>`
  });
}

export function terms(assets) {
  return page({
    title: "Terms of Use",
    description: "Terms for using OnlyScrubs: who it is for, what you may post, anonymity limits, moderation, the content licence, and liability under the Australian Consumer Law.",
    path: "/terms.html",
    active: "",
    assets,
    main: `<section class="wrap page-hero prose"><p class="eyebrow">The rules of the site</p><h1>Terms of Use</h1>
      <p>These terms apply when you use onlyscrubs.org. They are the site's house rules. They are general information about how OnlyScrubs operates, not legal advice. If you need advice about your own situation, ask a lawyer. Last updated 17 November 2026.</p>
      <h2>Who may use OnlyScrubs</h2>
      <p>You must be 18 or older. The site is aimed at healthcare workers and students in Australia, including nurses, midwives, and people training for that work. If you are under 18, do not use the site. If you do not agree to these terms, do not post, list, or subscribe.</p>
      <h2>Acceptable use</h2>
      <p>You may read the guides, use the shift tools, and send harmless, non-identifying community posts. You must not post or send:</p>
      <ul>
        <li>Patient-identifying information, including a story you believe is de-identified, an image, a date of birth, a record number, or a clinical incident.</li>
        <li>Anything that names or identifies a colleague, student, supervisor, or workplace, including a hospital, ward, clinic, employer, or a description that would let a reader work out who you mean.</li>
        <li>Defamatory material, harassment, bullying, hate, sexual content, or threats.</li>
        <li>Illegal content, or content that asks someone else to break the law or a professional obligation.</li>
        <li>Clinical instructions framed as professional advice, treatment claims, or testimonials about a regulated health service.</li>
        <li>Impersonation of another person, a health service, a regulator, a university, or OnlyScrubs.</li>
      </ul>
      <p>The shorter list on the <a href="/submission-rules.html">submission rules</a> page is part of these terms. A keyword filter blocks some risky wording. It does not replace your judgement.</p>
      <h2>Anonymity has limits</h2>
      <p>Confessions do not ask for your name, but anonymity is not absolute. We store a shortened hash of your connection address to limit spam and repeat votes. Moderators can see the private email on a Scrub Rack listing and on a newsletter signup. A post that describes a real shift too closely can identify you even with the name left off. We may disclose information if the law requires it. Do not post anything you would be unwilling to explain to your employer or your university.</p>
      <h2>Moderation</h2>
      <p>We may refuse, edit, hide, archive, or delete any content, and we may stop accepting posts, without notice. Reported confessions and listings are hidden from the public page when the report arrives. We aim to resolve a report or a complaint within 7 days. How to raise one is on the <a href="/complaints.html">complaints page</a>. Our moderation decision is about what stays on this website. It is not a finding about you, your workplace, or the law.</p>
      <h2>Your content</h2>
      <p>You keep ownership of what you submit. You grant OnlyScrubs a non-exclusive, worldwide, royalty-free licence to host, moderate, display, archive, and remove that content on this site for as long as we operate the relevant page. You confirm you have the right to submit it, and that it does not breach these terms or anyone else's rights. You can ask us to delete a post you can identify. Public copies and archives may already have been seen.</p>
      <h2>Not advice</h2>
      <p>Guides, checklists, gear notes, the shift planner, the breathing pause, confessions, and listings are general information or community material. They are not medical, mental health, legal, employment, financial, or other professional advice, and they are not a consultation. You are responsible for your own clinical, professional, and privacy obligations. Read the <a href="/disclaimer.html">disclaimer</a>.</p>
      <h2>Liability and the Australian Consumer Law</h2>
      <p>OnlyScrubs is a free community site. Nothing in these terms excludes, restricts, or modifies any consumer guarantee, right, or remedy under the Australian Consumer Law, or any other law, that cannot lawfully be excluded. Where the law allows a guarantee to be limited, and it is fair and reasonable to do so, our liability for a failure to comply with that guarantee is limited to resupplying the service or paying the cost of resupplying it. To the extent the law allows, we are not liable for loss or damage arising from your use of the site, from relying on general information as if it were professional advice, or from content posted by other people. You use other people's posts and listings at your own judgement.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Victoria, Australia. The courts of Victoria have jurisdiction, subject to any right you have to raise a dispute in another forum that the law does not let us exclude.</p>
      <h2>Contact</h2>
      <p>OnlyScrubs, <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a>. Privacy handling is on the <a href="/privacy.html">privacy page</a>. Concerns about a post are on the <a href="/complaints.html">complaints page</a>.</p>
    </section>`
  });
}

export function complaints(assets) {
  return page({
    title: "Complaints and takedown",
    description: "How to report an OnlyScrubs post or send a defamation concern notice, what to include, and how quickly we hide and review it.",
    path: "/complaints.html",
    active: "",
    assets,
    main: `<section class="wrap page-hero prose"><p class="eyebrow">Tell us</p><h1>Complaints and takedown</h1>
      <p>Use this page to report content on OnlyScrubs, including a defamation concern. This is general information about our process, not legal advice, and it is not itself a concerns notice under defamation law. Last updated 17 November 2026.</p>
      <h2>Report a confession or a listing</h2>
      <p>Open the item and use <strong>Report</strong>. Say what we should look at. The confession or listing is hidden from the public page as soon as the report is lodged, and it appears in the moderation queue. You can also email <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a> if the item is already gone, or if the problem is not a single post.</p>
      <h2>Defamation and other concern notices</h2>
      <p>If you say something on the site is defamatory, or otherwise unlawful, email <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a> with the subject "Concern notice". Include:</p>
      <ul>
        <li>Your name and a contact email or phone number.</li>
        <li>The page address, or enough of the wording and the date for us to find it.</li>
        <li>The words you are concerned about, quoted.</li>
        <li>Why you say they are a problem, including who you say is identified.</li>
        <li>What you want us to do: hide the item, delete it, or correct it.</li>
        <li>A statement that your notice is made in good faith.</li>
      </ul>
      <p>If you are unsure whether a formal concerns notice has to follow a set form, get your own advice. We will still treat an email with the details above as a request to review the content.</p>
      <h2>What we do, and when</h2>
      <p>We hide reported confessions and listings promptly. The Report button does that immediately. If you email us, we hide the item as soon as we have read the email and can find it. We aim to resolve the report within 7 days: leave it hidden, edit it, delete it, or put it back. If you left a contact, we will tell you what we did. Seven days is our target for a decision on the website. It is not a promise about court deadlines.</p>
      <h2>Privacy complaints</h2>
      <p>Privacy complaints, access, and correction are on the <a href="/privacy.html">privacy page</a>. If we cannot resolve a privacy complaint, you can go to the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au/" rel="noopener noreferrer">oaic.gov.au</a>.</p>
      <h2>Contact</h2>
      <p>OnlyScrubs, <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a>. The rules for posting are in the <a href="/terms.html">Terms of Use</a> and the <a href="/submission-rules.html">submission rules</a>.</p>
    </section>`
  });
}

const disclaimerFaq = [
  ["Is OnlyScrubs medical advice?", "No. It is general information, humour and practical notes for healthcare workers and students. It does not diagnose, treat, or replace a clinician."],
  ["What if I need urgent help?", "In Australia, call 000. Support lines are on the wellbeing page."],
  ["Does OnlyScrubs give legal or employment advice?", "No. It is not legal advice, employment advice, financial advice, or professional supervision."]
];

export function disclaimer(assets) {
  return page({
    title: "Disclaimer",
    description: "OnlyScrubs is general information and community humour. It is not medical advice, treatment, or a regulated health service.",
    path: "/disclaimer.html",
    active: "",
    assets,
    jsonLd: [faqPage(disclaimerFaq)],
    main: `<section class="wrap page-hero prose"><p class="eyebrow">Important boundary</p><h1>Disclaimer</h1>
      <p>OnlyScrubs provides general information, practical resources, humour and community support for healthcare workers and students. It does not provide medical advice, mental health treatment, diagnosis, clinical services, legal advice, employment advice, financial advice, or professional supervision.</p>
      <h2>Medical and emergency help</h2>
      <p>If you need medical advice, contact a qualified health practitioner. If you are in immediate danger or need urgent help in Australia, call 000. Support lines are listed on the <a href="/wellbeing.html">wellbeing page</a>.</p>
      <h2>Professional obligations</h2>
      <p>Healthcare workers and students remain responsible for privacy, confidentiality, workplace, professional and registration obligations, including standards set by the Nursing and Midwifery Board of Australia where those apply.</p>
      <h2>Regulated health services</h2>
      <p>OnlyScrubs is not intended to advertise regulated health services. Do not submit testimonials, treatment claims, clinical advice, or content that encourages unnecessary use of health services.</p>
      <h2>Tools on this site</h2>
      <p>The shift planner, breathing exercise, checklists and gear notes are general education. They are not personalised care. Gear pages do not invent prices or reviews. Paid or affiliate placements are marked Ad or Sponsored.</p>
      ${faqHtml(disclaimerFaq)}
    </section>`
  });
}

export function admin(assets) {
  return page({
    title: "Moderation",
    description: "OnlyScrubs moderation queue.",
    path: "/admin.html",
    active: "",
    assets,
    robots: "noindex, nofollow",
    newsletter: "none",
    scripts: [assets.admin],
    main: `<section class="wrap page-hero" id="admin-gate">
      <p class="eyebrow">Private</p>
      <h1>Admin</h1>
      <p>Sign in to review confessions and Scrub Rack listings. This page is not indexed.</p>
      <form class="form panel admin-gate" id="admin-signin">
        <label for="admin-password">Password<input id="admin-password" name="password" type="password" autocomplete="current-password" required></label>
        <button class="button primary" type="submit">Sign in</button>
        <p class="form-message" id="admin-signin-message" role="status"></p>
      </form>
    </section>
    <section class="wrap section" id="admin-app" hidden>
      <div class="page-hero">
        <p class="eyebrow">Signed in</p>
        <h2>Moderation</h2>
        <p>Approve, reject or delete pending confessions and listings. A report hides the item from the public page. Approve it again to show it. Newsletter CSV rows include an unsubscribe link. Every email must name OnlyScrubs, hello@onlyscrubs.org, and include that link.</p>
      </div>
      <div class="metrics" id="admin-headlines"></div>
      <form class="form" id="admin-tools">
        <div class="admin-bar">
          <label>Queue<select id="admin-kind"><option value="confession">Confessions</option><option value="comment">Comments</option><option value="listing">Scrub Rack</option><option value="relay">Messages</option></select></label>
          <label>Status<select id="admin-status"><option value="pending">Pending</option><option value="new">New messages</option><option value="approved">Approved</option><option value="reported">Reported</option><option value="rejected">Rejected</option><option value="archived">Archived</option><option value="read">Read messages</option></select></label>
          <button class="button primary" type="submit">Load</button>
          <button class="button secondary" id="show-reported" type="button">Reported</button>
          <button class="button secondary" id="archive-old" type="button">Archive posts over 1 year</button>
          <button class="button secondary" id="export-newsletter" type="button">Export newsletter CSV</button>
          <button class="button" id="admin-logout" type="button">Log out</button>
        </div>
        <div class="admin-bar">
          <label>Bulk action<select id="bulk-action"><option value="approve">Approve</option><option value="reject">Reject</option><option value="read">Mark read</option><option value="delete">Delete</option></select></label>
          <button class="button compact" id="bulk-apply" type="button">Apply to selected</button>
        </div>
        <p class="form-message" id="admin-message" role="status"></p>
      </form>
      <div class="metrics" id="admin-stats"></div>
      <div class="stack" id="admin-feed"></div>
    </section>`
  });
}

export function notFound(assets) {
  return page({
    title: "Page not found",
    description: "That OnlyScrubs page is not here.",
    path: "/404.html",
    active: "",
    assets,
    newsletter: "none",
    main: `<section class="wrap page-hero"><p class="eyebrow">404</p><h1>That page has left the building.</h1><p class="lede">Try the guides, the rack, or the confessions feed.</p><div class="hero-actions"><a class="button primary" href="/">Home</a><a class="button secondary" href="/guides.html">Guides</a></div></section>`
  });
}

export function offline(assets) {
  return page({
    title: "Offline",
    description: "OnlyScrubs is unreachable right now. Saved pages may still open.",
    path: "/offline.html",
    active: "",
    assets,
    newsletter: "none",
    robots: "noindex",
    main: `<section class="wrap page-hero"><p class="eyebrow">Offline</p><h1>You are not on the network.</h1><p class="lede">Guides you opened recently may still be on this device. Confessions and the Scrub Rack need a connection.</p><div class="hero-actions"><a class="button primary" href="/">Try home</a><a class="button secondary" href="/guides.html">Guides</a></div></section>`
  });
}
