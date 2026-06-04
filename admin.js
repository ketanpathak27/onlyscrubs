const BLOCKED_PATTERNS = [
  /\bpatient\b/i,
  /\bbed\s*\d+\b/i,
  /\bward\b/i,
  /\bhospital\b/i,
  /\bclinic\b/i,
  /\bdiagnos(?:is|ed|e)\b/i,
  /\bmedication\b/i,
  /\bsurgery\b/i,
  /\bresus\b/i,
  /\bcode\s*blue\b/i,
  /\bmr\.?\s+[a-z]/i,
  /\bmrs\.?\s+[a-z]/i,
  /\bms\.?\s+[a-z]/i
];

const EXAMPLES = [
  {
    id: "example-1",
    text: "I packed five pens for one shift and still asked someone else if I could borrow one.",
    createdAt: "2026-06-04T00:00:00.000Z",
    status: "approved"
  },
  {
    id: "example-2",
    text: "My scrub pocket contained a snack wrapper, two pen lids, a mystery glove and absolutely no pen.",
    createdAt: "2026-06-04T00:00:00.000Z",
    status: "approved"
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function getStore(env) {
  return env.CONFESSIONS_KV;
}

function isAdmin(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${expected}`;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function validateSubmission(input) {
  const text = cleanText(input.text);

  if (input.website) {
    return { ok: true, spam: true, text: "" };
  }

  if (!input.confirm) {
    return { ok: false, error: "Please confirm the submission rules first." };
  }

  if (text.length < 20) {
    return { ok: false, error: "Make it at least 20 characters." };
  }

  if (text.length > 700) {
    return { ok: false, error: "Keep it under 700 characters." };
  }

  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      error: "This looks like it may include patient, workplace or clinical details. Please rewrite it as harmless shift-life humour."
    };
  }

  return { ok: true, text };
}

async function listConfessions(store, status) {
  const listed = await store.list({ prefix: "confession:" });
  const values = await Promise.all(
    listed.keys.map((key) => store.get(key.name, { type: "json" }))
  );

  return values
    .filter(Boolean)
    .filter((item) => item.status === status)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function findKeyById(store, id) {
  const listed = await store.list({ prefix: "confession:" });
  const matches = await Promise.all(
    listed.keys.map(async (key) => {
      const item = await store.get(key.name, { type: "json" });
      return item && item.id === id ? key.name : null;
    })
  );
  return matches.find(Boolean);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") === "pending" ? "pending" : "approved";
  const store = getStore(env);

  if (!store) {
    return json({
      confessions: status === "approved" ? EXAMPLES : [],
      setupNeeded: true
    });
  }

  if (status === "pending" && !isAdmin(request, env)) {
    return json({ error: "Admin token required." }, 401);
  }

  const confessions = await listConfessions(store, status);
  return json({ confessions });
}

export async function onRequestPost({ request, env }) {
  const store = getStore(env);
  if (!store) {
    return json({ error: "Confessions storage is not configured yet." }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch (error) {
    return json({ error: "Invalid submission." }, 400);
  }

  const validation = validateSubmission(input);
  if (validation.spam) {
    return json({ ok: true });
  }
  if (!validation.ok) {
    return json({ error: validation.error }, 400);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const item = {
    id,
    text: validation.text,
    status: "pending",
    createdAt: now
  };

  await store.put(`confession:${now}:${id}`, JSON.stringify(item));
  return json({ ok: true, status: "pending" }, 201);
}

export async function onRequestPatch({ request, env }) {
  const store = getStore(env);
  if (!store) {
    return json({ error: "Confessions storage is not configured yet." }, 503);
  }

  if (!isAdmin(request, env)) {
    return json({ error: "Admin token required." }, 401);
  }

  let input;
  try {
    input = await request.json();
  } catch (error) {
    return json({ error: "Invalid moderation request." }, 400);
  }

  if (!input.id || !["approve", "reject"].includes(input.action)) {
    return json({ error: "Invalid moderation action." }, 400);
  }

  const key = await findKeyById(store, input.id);
  if (!key) {
    return json({ error: "Confession not found." }, 404);
  }

  if (input.action === "reject") {
    await store.delete(key);
    return json({ ok: true });
  }

  const item = await store.get(key, { type: "json" });
  item.status = "approved";
  item.approvedAt = new Date().toISOString();
  await store.put(key, JSON.stringify(item));
  return json({ ok: true });
}
