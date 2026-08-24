// Backend for Igud HaShiurim unified portal
// Uses Supabase REST directly (no SDK) to avoid Node.js WS issues.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars");
  process.exit(1);
}

async function callRpc(fnName, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "igud-portal", time: new Date().toISOString() });
});

function singleQueryParam(v) {
  return Array.isArray(v) ? v[0] : v;
}

function clientIpFor(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// מגביל לפי IP לנתיב ציבורי לא-מאומת שכותב ל-DB (הודעה) - אין לו admin_token
// או JWT שיגביל קצב, אז קורא ללא הגבלה יכול להציף את public_subscription
// leads (אותה תבנית שהוחלה על 19-igud-shiurim-portal/27-bkalut-price/
// 28-kupot-health-funds בסבבים 505-512).
const publicLeadHits = new Map();
function publicLeadRateLimiter(routeKey, maxPerHour = 20) {
  return (req, res, next) => {
    const key = `${routeKey}:${clientIpFor(req)}`;
    const now = Date.now();
    const entry = publicLeadHits.get(key);
    if (!entry || now > entry.resetAt) {
      publicLeadHits.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxPerHour) {
      return res.status(429).json({ error: 'יותר מדי בקשות, נסו שוב מאוחר יותר' });
    }
    next();
  };
}

app.get("/api/directory", async (req, res) => {
  const type = singleQueryParam(req.query.type);
  const city = singleQueryParam(req.query.city);
  const q = singleQueryParam(req.query.q);
  const r = await callRpc("public_directory", {
    p_type: type || null,
    p_city: city || null,
    p_search: q || null,
  });
  if (!r.ok) return res.status(500).json({ error: r.data });
  res.json(r.data);
});

app.get("/api/public/tenant/:token", async (req, res) => {
  const r = await callRpc("get_public_tenant", { p_token: req.params.token });
  if (!r.ok) return res.status(500).json({ error: r.data });
  if (!r.data) return res.status(404).json({ error: "not_found" });
  res.json(r.data);
});

app.get("/api/public/teacher/:token", async (req, res) => {
  const r = await callRpc("get_public_teacher", { p_token: req.params.token });
  if (!r.ok) return res.status(500).json({ error: r.data });
  if (!r.data) return res.status(404).json({ error: "not_found" });
  res.json(r.data);
});

app.get("/api/admin/tenant/:adminToken", async (req, res) => {
  const r = await callRpc("get_admin_tenant", { p_admin_token: req.params.adminToken });
  if (!r.ok) return res.status(500).json({ error: r.data });
  if (!r.data) return res.status(404).json({ error: "not_found" });
  res.json(r.data);
});

app.post("/api/public/tenant/:token/message", publicLeadRateLimiter("tenant-message"), async (req, res) => {
  const { name, phone, email, subject, body } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: "שם והודעה הם שדות חובה" });
  const r = await callRpc("submit_public_lead", {
    p_token: req.params.token,
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_subject: subject || null,
    p_body: body,
  });
  if (!r.ok) return res.status(500).json({ error: r.data });
  res.json({ success: r.data === true, error: r.data === true ? null : "not_found" });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = Number(process.env.PORT || 5000);
app.listen(port, "0.0.0.0", () => {
  console.log(`igud-portal listening on :${port}`);
});
