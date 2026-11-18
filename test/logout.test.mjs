import assert from "node:assert/strict";
import test from "node:test";
import { supportLink } from "../src/config.js";
import { apiAdminLogout } from "../src/routes/admin.js";
import worker from "../src/worker.js";

test("logout expires the os_admin cookie and only accepts POST", async () => {
  const res = await apiAdminLogout(new Request("https://onlyscrubs.org/api/admin/logout", { method: "POST" }));
  assert.equal(res.status, 200);
  const cookie = res.headers.get("set-cookie") || "";
  assert.match(cookie, /^os_admin=;/);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.equal(cookie.includes("ADMIN_TOKEN"), false);

  const rejected = await apiAdminLogout(new Request("https://onlyscrubs.org/api/admin/logout", { method: "GET" }));
  assert.equal(rejected.status, 405);

  const viaWorker = await worker.fetch(new Request("https://onlyscrubs.org/api/admin/logout", { method: "POST" }), {});
  assert.match(viaWorker.headers.get("set-cookie") || "", /os_admin=;/);
  assert.match(viaWorker.headers.get("set-cookie") || "", /Max-Age=0/);
});

test("support link stays hidden unless it is a real http(s) URL", async () => {
  assert.equal(supportLink(""), "");
  assert.equal(supportLink("   "), "");
  assert.equal(supportLink("#"), "");
  assert.equal(supportLink("javascript:alert(1)"), "");
  assert.equal(supportLink("https://example.com/coffee"), "");
  assert.equal(supportLink("not a url"), "");
  assert.equal(supportLink("https://buymeacoffee.com/onlyscrubs"), "https://buymeacoffee.com/onlyscrubs");

  const empty = await worker.fetch(new Request("https://onlyscrubs.org/api/config"), {});
  assert.equal((await empty.json()).supportUrl, "https://buymeacoffee.com/onlyscrubs");
  const placeholder = await worker.fetch(new Request("https://onlyscrubs.org/api/config"), { SUPPORT_URL: "javascript:void(0)" });
  assert.equal((await placeholder.json()).supportUrl, "");
  const set = await worker.fetch(new Request("https://onlyscrubs.org/api/config"), { SUPPORT_URL: "https://ko-fi.com/onlyscrubs" });
  assert.equal((await set.json()).supportUrl, "https://ko-fi.com/onlyscrubs");
});
