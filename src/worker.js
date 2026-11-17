import { FILES, ALIASES } from './assets.js';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SITE_HOST = 'onlyscrubs.org';

const TYPES = {
  '/styles.css': 'text/css; charset=utf-8',
  '/confessions.js': 'application/javascript; charset=utf-8',
  '/admin.js': 'application/javascript; charset=utf-8',
  '/robots.txt': 'text/plain; charset=utf-8',
  '/sitemap.xml': 'application/xml; charset=utf-8',
  '/favicon.svg': 'image/svg+xml; charset=utf-8',
  '/favicon.ico': 'image/svg+xml; charset=utf-8'
};

const STATIC_CACHE = {
  '/styles.css': 'public, max-age=604800, immutable',
  '/confessions.js': 'public, max-age=604800, immutable',
  '/admin.js': 'public, max-age=604800, immutable',
  '/favicon.svg': 'public, max-age=86400',
  '/favicon.ico': 'public, max-age=86400',
  '/robots.txt': 'public, max-age=86400',
  '/sitemap.xml': 'public, max-age=3600'
};

function securityHeaders(contentType, cacheControl, isHtml) {
  const headers = {
    'content-type': contentType,
    'cache-control': cacheControl,
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'strict-transport-security': 'max-age=15552000; includeSubDomains'
  };
  if (isHtml) {
    headers['content-security-policy'] = [
      "default-src 'self'",
      "script-src 'self' https://static.cloudflareinsights.com",
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      'upgrade-insecure-requests'
    ].join('; ');
  }
  return headers;
}

function text(body, type, status = 200, cacheControl = 'public, max-age=300') {
  const isHtml = String(type).includes('text/html');
  return new Response(body, {
    status,
    headers: securityHeaders(type, cacheControl, isHtml)
  });
}

function json(data, status = 200, extra = {}) {
  const headers = securityHeaders('application/json; charset=utf-8', 'no-store', false);
  if (extra.retryAfter) headers['retry-after'] = String(extra.retryAfter);
  return new Response(JSON.stringify(data), { status, headers });
}

async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a));
  const bb = enc.encode(String(b));
  if (aa.byteLength !== bb.byteLength) {
    await crypto.subtle.digest('SHA-256', aa);
    return false;
  }
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(aa, bb);
  }
  const ha = new Uint8Array(await crypto.subtle.digest('SHA-256', aa));
  const hb = new Uint8Array(await crypto.subtle.digest('SHA-256', bb));
  let out = 0;
  for (let i = 0; i < ha.length; i++) out |= ha[i] ^ hb[i];
  return out === 0;
}

async function auth(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  return timingSafeEqual(header.slice(prefix.length), expected);
}

async function clientKey(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function rateLimit(kv, key, limit, windowSec) {
  if (!kv) return { ok: true };
  const now = Date.now();
  const k = 'rl:' + key;
  const raw = await kv.get(k, { type: 'json' });
  if (!raw || !raw.reset || raw.reset <= now) {
    await kv.put(k, JSON.stringify({ count: 1, reset: now + windowSec * 1000 }), { expirationTtl: windowSec + 5 });
    return { ok: true };
  }
  if (raw.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((raw.reset - now) / 1000)) };
  }
  raw.count += 1;
  const ttl = Math.max(1, Math.ceil((raw.reset - now) / 1000));
  await kv.put(k, JSON.stringify(raw), { expirationTtl: ttl });
  return { ok: true };
}

function limited(check) {
  return json({ error: 'Too many requests. Please try again later.' }, 429, { retryAfter: check.retryAfter });
}

async function read(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function list(kv, prefix, status) {
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

async function find(kv, prefix, id) {
  const items = await list(kv, prefix);
  return items.find((item) => item.id === id) || null;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function risky(text) {
  return /\b(patient|ward|hospital|clinic|diagnos(?:is|ed|e)|medication|surgery|resus|code\s*blue|dob|address|medicare|urn|mr\.?\s+[a-z]|mrs\.?\s+[a-z]|ms\.?\s+[a-z])\b/i.test(text);
}

function strip(obj) {
  const copy = { ...obj };
  delete copy._key;
  return copy;
}

async function archiveOld(kv) {
  let n = 0;
  const items = await list(kv, 'confession:');
  const cutoff = Date.now() - YEAR_MS;
  for (const item of items) {
    if (item.status === 'approved' && Date.parse(item.createdAt) < cutoff) {
      item.status = 'archived';
      item.archivedAt = new Date().toISOString();
      await kv.put(item._key, JSON.stringify(strip(item)));
      n += 1;
    }
  }
  return n;
}

function examples() {
  return [
    {
      id: 'example-1',
      text: 'I packed five pens for one shift and still asked someone else if I could borrow one.',
      createdAt: '2026-06-04T00:00:00.000Z',
      status: 'approved',
      score: 0
    },
    {
      id: 'example-2',
      text: 'My scrub pocket contained a snack wrapper, two pen lids, a mystery glove and absolutely no pen.',
      createdAt: '2026-06-04T00:00:00.000Z',
      status: 'approved',
      score: 0
    }
  ];
}

async function apiConf(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  await archiveOld(kv);
  if (request.method === 'GET') {
    let status = new URL(request.url).searchParams.get('status') || 'approved';
    if (status !== 'approved' && !(await auth(request, env))) return json({ error: 'Admin token required.' }, 401);
    let items = await list(kv, 'confession:', status);
    if (status === 'approved' && !items.length) items = examples();
    return json({ confessions: items.map(strip) });
  }
  if (request.method === 'POST') {
    const limit = await rateLimit(kv, 'confessions:' + await clientKey(request), 5, 3600);
    if (!limit.ok) return limited(limit);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid submission.' }, 400);
    }
    const t = clean(body.text);
    if (body.website) return json({ ok: true, status: 'pending' });
    if (!body.confirm) return json({ error: 'Please confirm the submission rules first.' }, 400);
    if (t.length < 20) return json({ error: 'Make it at least 20 characters.' }, 400);
    if (t.length > 700) return json({ error: 'Keep it under 700 characters.' }, 400);
    if (risky(t)) {
      return json({
        error: 'This looks like it may include patient, workplace or clinical details. Please rewrite it as harmless shift-life humour.'
      }, 400);
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await kv.put('confession:' + now + ':' + id, JSON.stringify({ id, text: t, status: 'pending', createdAt: now, score: 0 }));
    return json({ ok: true, status: 'pending' }, 201);
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function apiComments(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  if (request.method === 'GET') {
    const id = new URL(request.url).searchParams.get('confessionId');
    if (!id) return json({ comments: [] });
    const comments = (await list(kv, 'comment:' + id + ':', 'approved')).map(strip);
    return json({ comments });
  }
  if (request.method === 'POST') {
    const limit = await rateLimit(kv, 'comments:' + await clientKey(request), 10, 3600);
    if (!limit.ok) return limited(limit);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid comment.' }, 400);
    }
    const id = clean(body.confessionId);
    const t = clean(body.text);
    const parent = await find(kv, 'confession:', id);
    if (!parent || parent.status !== 'approved') return json({ error: 'Confession not found.' }, 404);
    if (t.length < 8) return json({ error: 'Comment is too short.' }, 400);
    if (t.length > 500) return json({ error: 'Keep comments under 500 characters.' }, 400);
    if (risky(t)) return json({ error: 'Please remove patient, workplace or clinical details.' }, 400);
    const cid = crypto.randomUUID();
    const now = new Date().toISOString();
    await kv.put('comment:' + id + ':' + now + ':' + cid, JSON.stringify({
      id: cid,
      confessionId: id,
      text: t,
      status: 'pending',
      createdAt: now
    }));
    return json({ ok: true, status: 'pending' }, 201);
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function apiRate(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const hash = await clientKey(request);
  const limit = await rateLimit(kv, 'rate:' + hash, 20, 3600);
  if (!limit.ok) return limited(limit);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid vote.' }, 400);
  }
  const item = await find(kv, 'confession:', clean(body.id));
  if (!item || item.status !== 'approved') return json({ error: 'Confession not found.' }, 404);
  const voteKey = 'vote:' + item.id + ':' + hash;
  if (await kv.get(voteKey)) return json({ ok: true, score: item.score || 0, alreadyRated: true });
  item.score = (Number(item.score) || 0) + 1;
  await kv.put(item._key, JSON.stringify(strip(item)));
  await kv.put(voteKey, '1', { expirationTtl: 60 * 60 * 24 * 365 });
  return json({ ok: true, score: item.score });
}

async function apiReport(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const limit = await rateLimit(kv, 'report:' + await clientKey(request), 10, 3600);
  if (!limit.ok) return limited(limit);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid report.' }, 400);
  }
  const item = await find(kv, 'confession:', clean(body.id));
  if (!item || item.status !== 'approved') return json({ error: 'Confession not found.' }, 404);
  item.reportsCount = (Number(item.reportsCount) || 0) + 1;
  item.lastReportReason = clean(body.reason).slice(0, 220) || 'Community report';
  await kv.put(item._key, JSON.stringify(strip(item)));
  return json({ ok: true });
}

async function apiNewsletter(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const limit = await rateLimit(kv, 'newsletter:' + await clientKey(request), 5, 3600);
  if (!limit.ok) return limited(limit);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
  await kv.put('newsletter:' + email, JSON.stringify({ email, createdAt: new Date().toISOString() }));
  return json({ ok: true });
}

async function apiStats(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  if (!(await auth(request, env))) return json({ error: 'Admin token required.' }, 401);
  const conf = await list(kv, 'confession:');
  const comments = await list(kv, 'comment:');
  return json({
    totals: {
      approved: conf.filter((x) => x.status === 'approved').length,
      pending: conf.filter((x) => x.status === 'pending').length,
      archived: conf.filter((x) => x.status === 'archived').length,
      pendingComments: comments.filter((x) => x.status === 'pending').length,
      reports: conf.reduce((sum, x) => sum + (Number(x.reportsCount) || 0), 0),
      newsletter: (await kv.list({ prefix: 'newsletter:' })).keys.length
    },
    flagged: conf
      .filter((x) => (Number(x.reportsCount) || 0) > 0)
      .sort((a, b) => (b.reportsCount || 0) - (a.reportsCount || 0))
      .slice(0, 10)
      .map(strip)
  });
}

async function apiAdmin(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: 'Storage is not configured' }, 500);
  if (!(await auth(request, env))) return json({ error: 'Admin token required.' }, 401);
  await archiveOld(kv);
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') || 'confession';
    const status = url.searchParams.get('status') || 'pending';
    const prefix = kind === 'comment' ? 'comment:' : 'confession:';
    return json({ items: (await list(kv, prefix, status)).map(strip) });
  }
  if (request.method === 'PATCH') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid admin request.' }, 400);
    }
    if (body.kind === 'confession' && body.action === 'archive-old') {
      return json({ ok: true, archived: await archiveOld(kv) });
    }
    const prefix = body.kind === 'comment' ? 'comment:' : 'confession:';
    const item = await find(kv, prefix, clean(body.id));
    if (!item) return json({ error: 'Item not found.' }, 404);
    if (body.action === 'delete') {
      await kv.delete(item._key);
      return json({ ok: true });
    }
    if (body.action === 'approve') {
      item.status = 'approved';
      item.approvedAt = new Date().toISOString();
    } else if (body.kind === 'confession' && body.action === 'archive') {
      item.status = 'archived';
      item.archivedAt = new Date().toISOString();
    } else if (body.kind === 'confession' && body.action === 'restore') {
      item.status = 'approved';
      item.restoredAt = new Date().toISOString();
    } else {
      return json({ error: 'Unknown action.' }, 400);
    }
    await kv.put(item._key, JSON.stringify(strip(item)));
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}

function normalisePath(pathname) {
  let path = pathname.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return ALIASES[path] || path;
}

function staticResponse(path, status = 200) {
  if (path === '/favicon.ico' && !FILES['/favicon.ico'] && FILES['/favicon.svg']) {
    return text(FILES['/favicon.svg'], TYPES['/favicon.ico'], status, STATIC_CACHE['/favicon.ico']);
  }
  const body = FILES[path];
  if (body == null) return null;
  const type = TYPES[path] || 'text/html; charset=utf-8';
  const cache = STATIC_CACHE[path] || 'public, max-age=300';
  return text(body, type, status, cache);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.' + SITE_HOST) {
      url.hostname = SITE_HOST;
      return new Response(null, {
        status: 301,
        headers: {
          location: url.toString(),
          'strict-transport-security': 'max-age=15552000; includeSubDomains',
          'cache-control': 'public, max-age=3600'
        }
      });
    }

    const path = normalisePath(url.pathname);

    if (path === '/api/confessions') return apiConf(request, env);
    if (path === '/api/comments') return apiComments(request, env);
    if (path === '/api/rate') return apiRate(request, env);
    if (path === '/api/report') return apiReport(request, env);
    if (path === '/api/newsletter') return apiNewsletter(request, env);
    if (path === '/api/admin/stats') return apiStats(request, env);
    if (path === '/api/admin') return apiAdmin(request, env);
    if (path.startsWith('/api/')) return json({ error: 'Not found' }, 404);

    const exact = staticResponse(path);
    if (exact) return exact;
    return staticResponse('/404.html', 404);
  }
};
