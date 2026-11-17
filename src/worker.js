import { CANONICAL, SCRIPT_HASHES } from "./generated/meta.js";
import { siteConfig, supportLink } from "./config.js";
import { applySecurityHeaders, json } from "./lib/http.js";
import { turnstileSiteKey } from "./lib/turnstile.js";
import { apiComments, apiConfessions, apiNewsletter, apiRate, apiReact, apiReport, apiUnsubscribe } from "./routes/community.js";
import { apiListings, apiMessages } from "./routes/rack.js";
import { apiAdmin, apiAdminBulk, apiAdminIndexNow, apiAdminLogin, apiAdminLogout, apiAdminSession, apiNewsletterExport, apiStats } from "./routes/admin.js";

const SITE_HOST = "onlyscrubs.org";

function normalisePath(pathname) {
  let path = pathname.replace(/\/+/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

function redirect(location, status = 301) {
  return new Response(null, {
    status,
    headers: {
      location,
      "cache-control": "public, max-age=3600",
      "strict-transport-security": "max-age=15552000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}

function indexNowKeyFile() {
  return new Response(siteConfig.indexNowKey, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}

function apiConfig(env) {
  const supportFromEnv = env.SUPPORT_URL;
  const configured = supportFromEnv == null || supportFromEnv === "" ? siteConfig.supportUrl : supportFromEnv;
  const supportUrl = supportLink(configured);
  let adsEnabled = Boolean(siteConfig.adsEnabled);
  if (env.ADS_ENABLED === "true" || env.ADS_ENABLED === "1") adsEnabled = true;
  if (env.ADS_ENABLED === "false" || env.ADS_ENABLED === "0") adsEnabled = false;
  return json({
    turnstileSiteKey: turnstileSiteKey(env),
    supportUrl,
    adsEnabled
  });
}

async function serveAsset(request, env, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  let response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if (response.status === 404 && pathname !== "/404.html") {
    const missing = new URL(request.url);
    missing.pathname = "/404.html";
    const notFound = await env.ASSETS.fetch(new Request(missing.toString(), request));
    response = new Response(notFound.body, { status: 404, headers: notFound.headers });
  }
  const secured = applySecurityHeaders(response, pathname, SCRIPT_HASHES);
  if (response.status === 404) {
    const headers = new Headers(secured.headers);
    headers.set("cache-control", "public, max-age=60");
    return new Response(secured.body, { status: 404, headers });
  }
  return secured;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www." + SITE_HOST) {
      url.hostname = SITE_HOST;
      return redirect(url.toString());
    }

    const path = normalisePath(url.pathname);

    if (path === "/api/confessions") return apiConfessions(request, env);
    if (path === "/api/comments") return apiComments(request, env);
    if (path === "/api/rate") return apiRate(request, env);
    if (path === "/api/react") return apiReact(request, env);
    if (path === "/api/report") return apiReport(request, env);
    if (path === "/api/newsletter") return apiNewsletter(request, env);
    if (path === "/unsubscribe") return apiUnsubscribe(request, env);
    if (path === "/api/listings") return apiListings(request, env);
    if (path === "/api/messages") return apiMessages(request, env);
    if (path === "/api/config") return apiConfig(env);
    if (path === "/api/admin/login") return apiAdminLogin(request, env);
    if (path === "/api/admin/logout") return apiAdminLogout(request);
    if (path === "/api/admin/indexnow") return apiAdminIndexNow(request, env);
    if (path === "/api/admin/session") return apiAdminSession(request, env);
    if (path === "/api/admin/stats") return apiStats(request, env);
    if (path === "/api/admin/bulk") return apiAdminBulk(request, env);
    if (path === "/api/admin/newsletter.csv") return apiNewsletterExport(request, env);
    if (path === "/api/admin") return apiAdmin(request, env);
    if (path.startsWith("/api/")) return json({ error: "Not found" }, 404);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (path === `/${siteConfig.indexNowKey}.txt`) return indexNowKeyFile();

    if (CANONICAL[path]) {
      return redirect(CANONICAL[path] + url.search);
    }

    const target = path === "/" ? "/index.html" : path;
    return serveAsset(request, env, target);
  }
};
