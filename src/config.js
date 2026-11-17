/** Public site defaults. Secrets and Turnstile keys come from Worker env, never from here. */
export const siteConfig = {
  siteName: "OnlyScrubs",
  siteUrl: "https://onlyscrubs.org",
  contactEmail: "hello@onlyscrubs.org",
  /**
   * The only place the coffee link is configured in this repo.
   * Leave this empty until the owner supplies a real Buy Me a Coffee or Ko-fi URL.
   * A Worker var named SUPPORT_URL overrides it. Empty, or anything that is not
   * an http(s) URL, hides the button.
   */
  supportUrl: "",
  /** Reserved ad slots on guides and gear pages. Override with ADS_ENABLED=true. */
  adsEnabled: false,
  locale: "en-AU",
  /** Public IndexNow key. Served at /<key>.txt. Not a secret. */
  indexNowKey: "8f686a4ed0d24a66820ce232f9e73175",
  /**
   * Future creator products. An empty url hides the callout.
   * Do not mention these on the site until a real Gumroad URL is set here.
   */
  upcomingProducts: {
    cpdOrganiser: { label: "NMBA CPD & Registration Renewal Organiser", url: "" },
    gradWorkbook: { label: "New Grad Nurse Program Application & Interview Workbook", url: "" },
    placementKit: { label: "Clinical Placement Survival Kit", url: "" },
    expenseLog: { label: "Nurse & Midwife Work Expense Log", url: "" },
    payTracker: {
      label: "Australian Nurse Roster & Pay Tracker",
      url: "https://lofiluffyy.gumroad.com/l/gnacj",
      note: "Pay estimates only. You enter your own award or enterprise agreement rates. No award rates are stated."
    },
    iqnmPlanner: {
      label: "IQNM Registration Planner",
      url: "https://lofiluffyy.gumroad.com/l/nlvlrt",
      note: "Not migration advice, and not an official NMBA or Ahpra product."
    }
  }
};

/** Return a usable support URL, or "" when the button should stay hidden. */
export function supportLink(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  const host = url.hostname.toLowerCase();
  if (!host || host === "example.com" || host.endsWith(".example") || host === "localhost") return "";
  return url.toString();
}
