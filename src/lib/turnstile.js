import { json } from "./http.js";

/** Turnstile runs only when both the site key and secret are configured. */
export function turnstileEnabled(env) {
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET);
}

export function turnstileSiteKey(env) {
  return turnstileEnabled(env) ? env.TURNSTILE_SITE_KEY : null;
}

export async function verifyTurnstile(request, env, token) {
  if (!turnstileEnabled(env)) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: "Please complete the spam check." };
  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET);
  body.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body
    });
    const data = await res.json();
    if (!data?.success) return { ok: false, error: "Spam check failed. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Spam check could not be completed. Please try again." };
  }
}

export function turnstileFailure(result) {
  return json({ error: result.error || "Spam check failed." }, 400);
}
