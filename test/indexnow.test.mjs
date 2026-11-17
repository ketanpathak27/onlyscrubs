import assert from "node:assert/strict";
import test from "node:test";
import { siteConfig } from "../src/config.js";
import { indexNowPayload, sitemapUrls, submitIndexNow } from "../src/lib/indexnow.js";
import { apiAdminIndexNow } from "../src/routes/admin.js";

test("indexnow payload uses the public key and onlyscrubs.org URLs", () => {
  const urls = sitemapUrls(`<urlset><loc>https://onlyscrubs.org/</loc><loc>https://onlyscrubs.org/guides.html</loc><loc>https://example.com/nope</loc></urlset>`);
  assert.deepEqual(urls, ["https://onlyscrubs.org/", "https://onlyscrubs.org/guides.html"]);
  const payload = indexNowPayload(urls);
  assert.equal(payload.host, "onlyscrubs.org");
  assert.equal(payload.key, siteConfig.indexNowKey);
  assert.match(payload.key, /^[A-Za-z0-9-]{8,128}$/);
  assert.equal(payload.keyLocation, `https://onlyscrubs.org/${siteConfig.indexNowKey}.txt`);
  assert.equal(JSON.stringify(payload).includes("ADMIN_TOKEN"), false);
});

test("indexnow submission reports the endpoint status", async () => {
  let sent;
  const result = await submitIndexNow(["https://onlyscrubs.org/"], async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return new Response("", { status: 202 });
  });
  assert.equal(sent.url, "https://api.indexnow.org/indexnow");
  assert.equal(sent.body.keyLocation, `https://onlyscrubs.org/${siteConfig.indexNowKey}.txt`);
  assert.equal(result.ok, true);
  assert.equal(result.status, 202);
  assert.equal(result.count, 1);
});

function memoryKv() {
  const store = new Map();
  return {
    async get() { return null; },
    async put(key, value) { store.set(key, value); }
  };
}

test("indexnow admin action requires a moderator and submits the sitemap", async () => {
  const sitemap = `<?xml version="1.0"?><urlset><url><loc>https://onlyscrubs.org/</loc></url><url><loc>https://onlyscrubs.org/guides.html</loc></url></urlset>`;
  const env = {
    ADMIN_TOKEN: "local-only",
    CONFESSIONS_KV: memoryKv(),
    ASSETS: { async fetch() { return new Response(sitemap, { status: 200 }); } }
  };
  const denied = await apiAdminIndexNow(new Request("https://onlyscrubs.org/api/admin/indexnow", { method: "POST" }), env);
  assert.equal(denied.status, 401);

  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Accepted", { status: 200 });
  try {
    const ok = await apiAdminIndexNow(new Request("https://onlyscrubs.org/api/admin/indexnow", {
      method: "POST",
      headers: { authorization: "Bearer local-only" }
    }), env);
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.ok, true);
    assert.equal(body.count, 2);
  } finally {
    globalThis.fetch = original;
  }
});
