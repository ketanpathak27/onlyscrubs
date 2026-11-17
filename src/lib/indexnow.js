import { siteConfig } from "../config.js";

const ENDPOINT = "https://api.indexnow.org/indexnow";

export function sitemapUrls(xml) {
  return [...String(xml || "").matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((url) => url.startsWith("https://onlyscrubs.org/"));
}

export function indexNowPayload(urls, key = siteConfig.indexNowKey) {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(String(key || ""))) {
    throw new Error("IndexNow key is not valid.");
  }
  const urlList = [...urls];
  if (!urlList.length) throw new Error("IndexNow needs at least one URL.");
  return {
    host: "onlyscrubs.org",
    key,
    keyLocation: `https://onlyscrubs.org/${key}.txt`,
    urlList
  };
}

export async function submitIndexNow(urls, fetchImpl = fetch) {
  const payload = indexNowPayload(urls);
  const res = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  return {
    ok: res.status === 200 || res.status === 202,
    status: res.status,
    count: payload.urlList.length,
    body: text.slice(0, 300)
  };
}
