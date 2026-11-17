/** Public site defaults. Secrets and Turnstile keys come from Worker env, never from here. */
export const siteConfig = {
  siteName: "OnlyScrubs",
  siteUrl: "https://onlyscrubs.org",
  contactEmail: "hello@onlyscrubs.org",
  /** Buy-me-a-coffee style URL. Leave empty to hide the link. Override with SUPPORT_URL. */
  supportUrl: "",
  /** Reserved ad slots on guides and gear pages. Override with ADS_ENABLED=true. */
  adsEnabled: false,
  locale: "en-AU"
};
