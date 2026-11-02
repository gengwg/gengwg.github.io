// Cloudflare Worker: proxy for the digital-twin chat on gengwg.github.io.
// Holds the Gemini key server-side and adds per-IP rate limiting.
// Free tier: 100,000 requests/day.

const MODEL = "gemini-3.1-flash-lite";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";

const SITE_ORIGIN = "https://gengwg.github.io";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const MAX_BODY_BYTES = 8192;
const RATE_LIMIT_PER_MIN = 10; // per IP

// In-memory sliding window per IP (per worker instance — good enough for casual abuse)
const buckets = new Map();

// Exact origin match (a prefix match would admit gengwg.github.io.evil.com).
// Any port on localhost so local dev servers work. Returns the origin or null.
function allowedOrigin(value) {
  try {
    const u = new URL(value);
    if (u.origin === SITE_ORIGIN) return u.origin;
    if (u.protocol === "http:" && LOCAL_HOSTS.includes(u.hostname)) return u.origin;
  } catch {}
  return null;
}

function clientAllowed(request) {
  return allowedOrigin(request.headers.get("Origin") || request.headers.get("Referer")) !== null;
}

function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  let entry = buckets.get(ip);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    buckets.set(ip, entry);
  }
  entry.count++;
  // keep the map bounded
  if (buckets.size > 10_000) buckets.clear();
  return entry.count > RATE_LIMIT_PER_MIN;
}

function corsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request.headers.get("Origin")) || SITE_ORIGIN,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat") {
      return new Response("ok", { status: 200 });
    }
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }
    if (!clientAllowed(request)) {
      return json({ error: "origin not allowed" }, 403, request);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return json({ error: "rate limit exceeded, try again in a minute" }, 429, request);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400, request);
    }
    if (JSON.stringify(body).length > MAX_BODY_BYTES) {
      return json({ error: "request too large" }, 413, request);
    }

    const upstream = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  },
};

function json(obj, status, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}
