import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { layout } from "../site/layout.mjs";
import { parseGuide } from "../site/markdown.mjs";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  about,
  guideArticle,
  guideMetaDescription,
  home,
  siteOrganization
} from "../site/pages.mjs";

const assets = { styles: "/assets/styles.css", site: "/assets/site.js" };
const guides = Array.from({ length: 4 }, (_, i) => ({
  slug: "g" + i,
  path: "/guides/g" + i + ".html",
  title: "Guide " + i,
  description: "About guide " + i,
  tags: ["study"],
  minutes: 3
}));

function metaContent(html, name) {
  const named = html.match(new RegExp(`<meta name="${name}" content="([^"]+)"`));
  const prop = html.match(new RegExp(`<meta property="${name}" content="([^"]+)"`));
  return (named || prop)?.[1];
}

test("homepage title and descriptions lead with education and support for Australian healthcare workers", () => {
  const html = home(assets, guides);
  const expectedTitle = `${HOME_TITLE} | OnlyScrubs`;
  assert.equal(HOME_TITLE, "Education and support for Australian healthcare workers");
  assert.match(HOME_DESCRIPTION, /^Education and support for Australian healthcare workers/);
  assert.match(HOME_DESCRIPTION, /nurses, midwives, doctors and students/);
  assert.match(HOME_DESCRIPTION, /CPD/);
  assert.match(HOME_DESCRIPTION, /AHPRA/);
  assert.match(HOME_DESCRIPTION, /NMBA/);
  assert.match(HOME_DESCRIPTION, /placements/);
  assert.match(HOME_DESCRIPTION, /graduate programs/i);
  assert.match(HOME_DESCRIPTION, /tax/i);
  assert.match(html, new RegExp(`<title>${expectedTitle}</title>`));
  assert.equal(metaContent(html, "description"), HOME_DESCRIPTION);
  assert.equal(metaContent(html, "og:title"), expectedTitle);
  assert.equal(metaContent(html, "og:description"), HOME_DESCRIPTION);
  assert.equal(metaContent(html, "twitter:title"), expectedTitle);
  assert.equal(metaContent(html, "twitter:description"), HOME_DESCRIPTION);
  assert.match(html, /og:image:alt" content="OnlyScrubs, education and support for Australian healthcare workers"/);
  assert.match(html, /twitter:image:alt" content="OnlyScrubs, education and support for Australian healthcare workers"/);
});

test("homepage hero states the education line plainly, and guides come before confessions", () => {
  const html = home(assets, guides);
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.match(main, /class="hero-plain">Education and support for Australian healthcare workers\.</);
  assert.match(main, /Nurses, midwives, doctors and students/);
  const guidesAt = main.indexOf('aria-labelledby="home-guides"');
  const communityAt = main.indexOf('aria-labelledby="home-community"');
  const toolsAt = main.indexOf('aria-labelledby="home-tools"');
  assert.ok(guidesAt > 0 && toolsAt > guidesAt, "guides and tools are present");
  assert.ok(communityAt > toolsAt, "community / confessions sit below guides and tools");
  assert.match(main, /The tearoom, minus the patient stories/);
  assert.match(main, /Never about patients/);
});

test("homepage JSON-LD is a WebSite plus an Organization with healthcare education topics, and invents no legal entity", () => {
  const html = home(assets, guides);
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, /"@type":"Organization"/);
  assert.match(html, /"knowsAbout":\[/);
  for (const topic of [
    "Healthcare education",
    "Continuing professional development for nurses and midwives",
    "AHPRA registration",
    "NMBA registration renewal",
    "Clinical placements",
    "Graduate nursing and midwifery programs",
    "Tax for nurses and midwives"
  ]) {
    assert.match(html, new RegExp(`"${topic}"`));
  }
  const org = siteOrganization();
  assert.equal(org["@type"], "Organization");
  assert.equal(org.email, "hello@onlyscrubs.org");
  assert.equal(org.description, HOME_DESCRIPTION);
  assert.doesNotMatch(JSON.stringify(org), /taxID|vatID|leiCode|duns|"ABN"|EducationalOrganization/);
  assert.doesNotMatch(html, /EducationalOrganization|"taxID"|"vatID"/);
});

test("About page says it is an independent project by an Australian healthcare worker, not a registered business, with no ABN", () => {
  const html = about(assets);
  assert.match(html, /independent project made by an Australian healthcare worker/);
  assert.match(html, /not a registered business/i);
  assert.match(html, /does not have an ABN/);
  assert.match(html, /mailto:hello@onlyscrubs\.org/);
  assert.match(html, />hello@onlyscrubs\.org</);
  assert.match(html, /"@type":"AboutPage"/);
  assert.match(html, /"knowsAbout":\[/);
  assert.doesNotMatch(html, /ABN\s*\d|registered (business|organisation|organization) with an ABN/i);
  assert.equal(
    metaContent(html, "description"),
    "OnlyScrubs is an independent project made by an Australian healthcare worker, offering education and support for nurses, midwives, doctors and students. It is not a registered business and does not have an ABN."
  );
});

test("footer on every page links to About, Contact, Privacy and Terms", () => {
  const html = layout({ title: "T", description: "D", path: "/guides.html", main: "<p>x</p>", assets });
  const start = html.indexOf('<footer class="site-footer">');
  const end = html.indexOf("</footer>", start);
  const footer = html.slice(start, end);
  assert.match(footer, /href="\/about\.html">About</);
  assert.match(footer, /href="mailto:hello@onlyscrubs\.org">Contact</);
  assert.match(footer, /href="\/privacy\.html">Privacy</);
  assert.match(footer, /href="\/terms\.html">Terms</);
  assert.match(footer, /href="mailto:hello@onlyscrubs\.org"/);
});

test("every guide has a description, and a missing one falls back to the education pattern", () => {
  const dir = new URL("../content/guides/", import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith(".md"));
  assert.ok(files.length >= 20, "guides are present");
  for (const file of files) {
    const guide = parseGuide(readFileSync(new URL(file, dir), "utf8"), file.replace(/\.md$/, ""));
    assert.ok(String(guide.description || "").trim(), `${file} has a description`);
    assert.equal(guideMetaDescription(guide), guide.description.trim());
  }

  const fallback = guideMetaDescription({ title: "Recording your CPD" });
  assert.match(fallback, /^Recording your CPD\. /);
  assert.match(fallback, /free education guide for Australian healthcare workers/i);

  const html = guideArticle(assets, {
    title: "Untitled topic",
    description: "   ",
    path: "/guides/untitled-topic.html",
    date: "2026-11-18",
    updated: "2026-11-18",
    tags: ["cpd"],
    minutes: 2,
    html: "<h2>Hello</h2><p>Body.</p>"
  }, []);
  assert.match(html, /<meta name="description" content="Untitled topic\. A free education guide for Australian healthcare workers/);
});
