export async function read(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listByPrefix(kv, prefix, status) {
  const items = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, cursor, limit: 1000 });
    for (const key of page.keys) {
      const value = await read(kv, key.name);
      if (value && (!status || value.status === status)) items.push({ ...value, _key: key.name });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function findById(kv, prefix, id) {
  if (!id) return null;
  const items = await listByPrefix(kv, prefix);
  return items.find((item) => item.id === id) || null;
}

export async function publicShift(kv) {
  const meta = await read(kv, "meta:shift-of-week");
  if (!meta?.id) return null;
  const item = await findById(kv, "confession:", meta.id);
  if (!item || item.status !== "approved") return null;
  return {
    id: item.id,
    text: item.text,
    createdAt: item.createdAt,
    score: (Number(item.score) || 0) + (Number(item.hugs) || 0) + (Number(item.sames) || 0),
    pinnedAt: meta.pinnedAt || ""
  };
}

export function strip(obj) {
  const copy = { ...obj };
  delete copy._key;
  return copy;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Archive approved confessions older than a year. Throttled to once a day unless forced. */
export async function archiveOld(kv, force = false) {
  if (!force) {
    const stamp = await kv.get("meta:last-archive");
    if (stamp) return 0;
  }
  let count = 0;
  const items = await listByPrefix(kv, "confession:");
  const cutoff = Date.now() - YEAR_MS;
  for (const item of items) {
    if (item.status === "approved" && Date.parse(item.createdAt) < cutoff) {
      item.status = "archived";
      item.archivedAt = new Date().toISOString();
      await kv.put(item._key, JSON.stringify(strip(item)));
      count += 1;
    }
  }
  await kv.put("meta:last-archive", new Date().toISOString(), { expirationTtl: 60 * 60 * 24 });
  return count;
}
