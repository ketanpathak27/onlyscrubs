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
      "@type": "WebSite",
      name: "OnlyScrubs",
      url: `${SITE}/`,
      description: "Practical, anonymous resources for Australian nurses, midwives, students and healthcare workers.",
      inLanguage: "en-AU"
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
          <p>Guides and site news only. Stored so we can email you. Deleted if you ask.</p>
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
          <label>Email, kept private<input name="contactEmail" type="email" required autocomplete="email"></label>
          <label class="check"><input name="confirm" type="checkbox" required><span>I confirm this does not name a workplace, patient, or clinical matter.</span></label>
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
      ? `<p><a href="${esc(item.affiliateUrl)}" rel="sponsored nofollow noopener noreferrer">Partner link</a></p>`
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
      <p class="disclosure">If a link is ever marked as a partner link, OnlyScrubs may earn a commission at no extra cost to you. There are no partner links on this page today. Ordinary links are not ads.</p></section>
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
    main: `<section class="wrap page-hero"><p class="eyebrow">Send it in</p><h1>Submit</h1><p class="lede">Scrub listing, resource idea, or a confession that could survive a regulator with Wi-Fi.</p></section>
    <section class="wrap section"><div class="grid cards">
      <a class="card link-card" href="/scrub-rack.html#list-form"><h3>Scrub Rack</h3><p>Donate, request or swap. Your email stays off the public card.</p></a>
      <a class="card link-card" href="/confessions.html"><h3>Confession</h3><p>Write it on the site. It waits for moderation.</p></a>
      <a class="card link-card" href="mailto:hello@onlyscrubs.org?subject=Resource%20idea"><h3>Resource idea</h3><p>Suggest a guide. Do not include a patient story in the email either.</p></a>
    </div></section>`
  });
}

export function wellbeing(assets) {
  return page({
    title: "Wellbeing",
    description: "Australian support lines for nurses, midwives and students, including Nurse & Midwife Support, Lifeline, Beyond Blue and 13YARN, plus a short breathing exercise.",
    path: "/wellbeing.html",
    active: "/wellbeing.html",
    assets,
    scripts: [assets.breathe],
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
    </section>`
  });
}

export function rules(assets) {
  return page({
    title: "Submission rules",
    description: "What OnlyScrubs will and will not publish: confessions, comments, scrub listings and relay messages.",
    path: "/submission-rules.html",
    active: "",
    assets,
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
      <p>Ratings, Same and Hug reactions are for approved posts only. One of each per person. Reports go to the moderation queue.</p>
    </section>`
  });
}

export function privacy(assets) {
  return page({
    title: "Privacy",
    description: "What OnlyScrubs stores: confessions, scrub listings, relay messages, newsletter addresses, and hashed IP keys for rate limits.",
    path: "/privacy.html",
    active: "",
    assets,
    main: `<section class="wrap page-hero prose"><p class="eyebrow">Privacy first</p><h1>Privacy</h1>
      <p>OnlyScrubs is a small community site. We store what we need to moderate it and to run the features on the page. We do not sell data. Email <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a> to ask for a removal.</p>
      <h2>Confessions and comments</h2>
      <p>We store the text you submit, the time, optional tags, and later the public counts for ratings, Same and Hug. Submissions stay pending until approved. Posts older than a year move to an archive. Do not include patient, colleague or workplace details. There is nowhere to put your name, and you should not add one.</p>
      <h2>Scrub Rack and messages</h2>
      <p>A listing stores the public details you typed, plus the email and optional name in fields that are not shown on the public card. A relay message stores the sender's name, email and message so a moderator can pass it on. We do not run a paid email service. Passing a message on is a manual step.</p>
      <h2>Newsletter</h2>
      <p>If you join the list, we store the email address and the date. We use it to send occasional OnlyScrubs notes. We do not give it to advertisers. Ask us and we will delete it. You can also remove it from the admin tools if you operate the site.</p>
      <h2>Rate limits and reactions</h2>
      <p>To slow spam and to stop repeat votes, we store a shortened hash of the connection address, not the address itself, next to a counter or a vote marker. We do not build a profile from it.</p>
      <h2>Spam check and analytics</h2>
      <p>If Turnstile keys are configured, forms ask Cloudflare Turnstile to check the submission. The site works without those keys. If Cloudflare Web Analytics is turned on for the domain, Cloudflare may collect aggregated visit metrics. We do not add a separate advertising tracker. Reserved ad slots on guides and the gear guide stay empty unless ads are explicitly switched on, and they never appear in the confessions feed.</p>
      <h2>Where it sits</h2>
      <p>Text is stored in Cloudflare KV, which is a global service. We do not promise that data stays in Australia. The contact for privacy requests is hello@onlyscrubs.org.</p>
    </section>`
  });
}

export function disclaimer(assets) {
  return page({
    title: "Disclaimer",
    description: "OnlyScrubs is general information and community humour. It is not medical advice, treatment, or a regulated health service.",
    path: "/disclaimer.html",
    active: "",
    assets,
    main: `<section class="wrap page-hero prose"><p class="eyebrow">Important boundary</p><h1>Disclaimer</h1>
      <p>OnlyScrubs provides general information, practical resources, humour and community support for healthcare workers and students. It does not provide medical advice, mental health treatment, diagnosis, clinical services, legal advice, employment advice, financial advice, or professional supervision.</p>
      <h2>Medical and emergency help</h2>
      <p>If you need medical advice, contact a qualified health practitioner. If you are in immediate danger or need urgent help in Australia, call 000. Support lines are listed on the <a href="/wellbeing.html">wellbeing page</a>.</p>
      <h2>Professional obligations</h2>
      <p>Healthcare workers and students remain responsible for privacy, confidentiality, workplace, professional and registration obligations, including standards set by the Nursing and Midwifery Board of Australia where those apply.</p>
      <h2>Regulated health services</h2>
      <p>OnlyScrubs is not intended to advertise regulated health services. Do not submit testimonials, treatment claims, clinical advice, or content that encourages unnecessary use of health services.</p>
      <h2>Tools on this site</h2>
      <p>The shift planner, breathing exercise, checklists and gear notes are general education. They are not personalised care. Gear pages do not invent prices or reviews. Partner links, if they are added later, will be marked.</p>
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
        <h1>Moderation</h1>
        <p>Approve, reject or delete pending confessions and listings. Reports stay on the item.</p>
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
