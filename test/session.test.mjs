import assert from "node:assert/strict";
import test from "node:test";
import { apiAdminLogin } from "../src/routes/admin.js";
import { sessionCookie, signSession, verifySession, SESSION_SECONDS } from "../src/lib/session.js";

test("session cookie is signed, expiring, and does not contain the token", async () => {
  const token = "local-admin-secret-value";
  const now = Date.parse("2026-11-17T00:00:00.000Z");
  const value = await signSession(token, now);
  assert.equal(value.includes(token), false);
  assert.equal(await verifySession(token, value, now + 1000), true);
  assert.equal(await verifySession("other-secret", value, now + 1000), false);
  assert.equal(await verifySession(token, value, now + SESSION_SECONDS * 1000 + 1), false);
  const [payload, signature] = value.split(".");
  const flipped = signature.slice(0, -1) + (signature.endsWith("a") ? "b" : "a");
  assert.equal(await verifySession(token, payload + "." + flipped, now + 1000), false);
  const header = sessionCookie(value);
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, new RegExp("Max-Age=" + SESSION_SECONDS));
});

function memoryKv() {
  const store = new Map();
  return {
    async get(key, options) {
      const value = store.get(key);
      if (value == null) return null;
      return options?.type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    }
  };
}

test("failed admin logins stop after five in fifteen minutes", async () => {
  const env = { ADMIN_TOKEN: "correct-horse", CONFESSIONS_KV: memoryKv() };
  const requestFor = (password) => new Request("https://onlyscrubs.org/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.8" },
    body: JSON.stringify({ password })
  });
  for (let i = 0; i < 5; i++) {
    const res = await apiAdminLogin(requestFor("wrong"), env);
    assert.equal(res.status, 401);
  }
  const blocked = await apiAdminLogin(requestFor("correct-horse"), env);
  assert.equal(blocked.status, 429);
  const otherIp = new Request("https://onlyscrubs.org/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.9" },
    body: JSON.stringify({ password: "correct-horse" })
  });
  const ok = await apiAdminLogin(otherIp, env);
  assert.equal(ok.status, 200);
  const cookie = ok.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.equal(cookie.includes("correct-horse"), false);
});
