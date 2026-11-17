import { json, limited, readJson, clientKey, rateLimit } from "../lib/http.js";
import { clean, cleanMultiline, risky, hasDirectContact, validEmail } from "../lib/moderation.js";
import { attachScreen, screenText } from "../lib/screen.js";
import { findById, listByPrefix, strip } from "../lib/store.js";
import { verifyTurnstile, turnstileFailure } from "../lib/turnstile.js";

export const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
export const LISTING_TYPES = ["donate", "request", "swap"];
export const CONDITIONS = ["new", "as-new", "good", "fair"];

function blocked(text) {
  return risky(text) || hasDirectContact(text);
}

export function publicListing(item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    size: item.size,
    brand: item.brand || "",
    colour: item.colour,
    suburb: item.suburb,
    state: item.state,
    condition: item.condition,
    createdAt: item.createdAt,
    status: item.status,
  };
}

export function validateListing(body) {
  const type = clean(body.type);
  const title = clean(body.title);
  const description = cleanMultiline(body.description);
  const size = clean(body.size);
  const brand = clean(body.brand);
  const colour = clean(body.colour);
  const suburb = clean(body.suburb);
  const state = clean(body.state).toUpperCase();
  const condition = clean(body.condition);
  const contactEmail = String(body.contactEmail || "").trim().toLowerCase();
  const contactName = clean(body.contactName);
  if (!LISTING_TYPES.includes(type)) return { error: "Choose donate, request or swap." };
  if (title.length < 4 || title.length > 80) return { error: "Give the listing a short title." };
  if (description.length < 20 || description.length > 800) return { error: "Describe it in 20 to 800 characters." };
  if (size.length < 1 || size.length > 32) return { error: "Add a size." };
  if (brand.length > 40) return { error: "Brand is too long." };
  if (colour.length < 1 || colour.length > 32) return { error: "Add a colour." };
  if (suburb.length < 2 || suburb.length > 48) return { error: "Add a suburb or pickup area." };
  if (!STATES.includes(state)) return { error: "Choose an Australian state or territory." };
  if (!CONDITIONS.includes(condition)) return { error: "Choose a condition." };
  if (!validEmail(contactEmail)) return { error: "Add an email so we can pass on messages. It is not shown publicly." };
  if (contactName.length > 60) return { error: "Name is too long." };
  const blob = [title, description, size, brand, colour, suburb].join(" ");
  return {
    value: { type, title, description, size, brand, colour, suburb, state, condition, contactEmail, contactName },
    screen: screenText(blob)
  };
}

export async function apiListings(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method === "GET") {
    const items = (await listByPrefix(kv, "listing:", "approved")).filter((item) => !item.hiddenAt);
    return json({ listings: items.map(publicListing) });
  }
  if (request.method === "POST") {
    const limit = await rateLimit(kv, "listings:" + (await clientKey(request)), 5, 3600);
    if (!limit.ok) return limited(limit);
    const parsed = await readJson(request);
    if (parsed.error) return json({ error: "Invalid listing." }, parsed.status || 400);
    if (parsed.body.website) return json({ ok: true, status: "pending" });
    const turnstile = await verifyTurnstile(request, env, parsed.body.turnstileToken);
    if (!turnstile.ok) return turnstileFailure(turnstile);
    if (!parsed.body.confirm) return json({ error: "Please confirm the submission rules first." }, 400);
    const result = validateListing(parsed.body);
    if (result.error) return json({ error: result.error }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await kv.put("listing:" + now + ":" + id, JSON.stringify(attachScreen({
      id,
      ...result.value,
      status: "pending",
      createdAt: now,
      reportsCount: 0
    }, result.screen)));
    const body = { ok: true, status: "pending" };
    if (result.screen.flagged) body.held = true;
    if (result.screen.support) body.support = result.screen.support;
    return json(body, 201);
  }
  return json({ error: "Method not allowed" }, 405);
}

export async function apiMessages(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const limit = await rateLimit(kv, "messages:" + (await clientKey(request)), 8, 3600);
  if (!limit.ok) return limited(limit);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: "Invalid message." }, parsed.status || 400);
  if (parsed.body.website) return json({ ok: true, status: "pending" });
  const turnstile = await verifyTurnstile(request, env, parsed.body.turnstileToken);
  if (!turnstile.ok) return turnstileFailure(turnstile);
  if (!parsed.body.confirm) return json({ error: "Please confirm the submission rules first." }, 400);
  const listing = await findById(kv, "listing:", clean(parsed.body.listingId));
  if (!listing || listing.status !== "approved") return json({ error: "Listing not found." }, 404);
  const name = clean(parsed.body.name);
  const email = String(parsed.body.email || "").trim().toLowerCase();
  const message = cleanMultiline(parsed.body.message);
  if (name.length < 2 || name.length > 60) return json({ error: "Add your name." }, 400);
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  if (message.length < 12 || message.length > 800) return json({ error: "Write a short message, between 12 and 800 characters." }, 400);
  if (blocked(name + " " + message)) {
    return json({ error: "Keep the message free of clinical details, workplace names and links." }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await kv.put("relay:" + now + ":" + id, JSON.stringify({
    id,
    listingId: listing.id,
    listingTitle: listing.title,
    toEmail: listing.contactEmail,
    name,
    email,
    message,
    status: "new",
    createdAt: now
  }));
  return json({ ok: true, status: "pending" }, 201);
}
