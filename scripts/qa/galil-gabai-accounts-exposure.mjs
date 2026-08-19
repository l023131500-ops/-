// galil-gabai-accounts-exposure — האם סיסמאות הגבאים של גליל (24) גלויות לכל?
//
// הסריקה §1א (own-login-hash-sweep) סיווגה את גליל כ-unclassified: יש לה מסך
// כניסה משלה, ולא נמצא בו לא Supabase Auth ולא גיבוב. הקריאה בקוד הסבירה
// למה — GabaiPortal.tsx כותב ל-`gabai_accounts.password_hash` את מה שהוקלד,
// כפי שהוקלד (‏`password_hash: newPass.trim()`), מציג אותו חזרה במסך הניהול
// כטקסט («סיסמה: {acc.password_hash}»), וההתחברות היא `select('*')` מהדפדפן
// והשוואה בצד הלקוח. שם העמודה מבטיח hash; מה שיושב בה הוא הסיסמה עצמה.
//
// המיגרציה של המערכת פותחת את הטבלה לגמרי:
//   CREATE POLICY "Gabai accounts writable" ON public.gabai_accounts
//     FOR ALL USING (true) WITH CHECK (true);
//
// זו קריאה במקור, לא ראיה. הסקריפט הזה שואל את הייצור: לוקח את המפתח
// האנונימי מה-bundle ש-more30.com/galil מגיש בפועל, ומנסה לקרוא את הטבלה
// כמו כל אדם ברשת.
//
// ‏⚠️ הסקריפט לא כותב ולא מוחק, ו**אינו שומר סיסמאות לדיסק**: מהערך שחוזר
// נרשמים רק אורך וצורה (bcrypt/‏sha/טקסט גלוי), לעולם לא הערך.
//
// שימוש:  node scripts/qa/galil-gabai-accounts-exposure.mjs
// פלט:    QA/galil/gabai-accounts-0812/_results.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://more30.com/galil/';
const OUT = join(process.cwd(), 'QA', 'galil', 'gabai-accounts-0812');

const UA = { 'User-Agent': 'more30-qa/galil-gabai-exposure' };

// צורת הערך, בלי הערך. bcrypt מתחיל ב-$2a/$2b/$2y, ‏sha256 הוא 64 תווי hex.
function shapeOf(value) {
  if (value === null || value === undefined) return 'null';
  const s = String(value);
  if (/^\$2[aby]\$/.test(s)) return 'bcrypt';
  if (/^[0-9a-f]{64}$/i.test(s)) return 'sha256-hex';
  if (/^[0-9a-f]{32}$/i.test(s)) return 'md5-hex';
  if (/^\$argon2/.test(s)) return 'argon2';
  return 'plaintext-or-unknown';
}

async function main() {
  const out = { probed_at_utc: new Date().toISOString(), site: SITE, steps: [] };

  // 1. ה-HTML של הייצור, כדי למצוא את ה-bundle.
  const htmlRes = await fetch(SITE, { headers: UA, redirect: 'follow' });
  const html = await htmlRes.text();
  out.steps.push({ step: 'site', status: htmlRes.status, final_url: htmlRes.url, bytes: html.length });

  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]);
  out.assets_found = assets.length;

  // 2. המפתח האנונימי, מתוך מה שהייצור מגיש.
  let url = null;
  let key = null;
  for (const a of assets) {
    const abs = new URL(a, SITE).toString();
    const res = await fetch(abs, { headers: UA });
    if (!res.ok) continue;
    const js = await res.text();
    const u = js.match(/https:\/\/([a-z0-9]{20})\.supabase\.co/);
    const k = js.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/);
    if (u && k) { url = `https://${u[1]}.supabase.co`; key = k[0]; out.bundle = abs; break; }
  }
  out.steps.push({ step: 'bundle-credentials', found: Boolean(url && key), project_ref: url ? url.slice(8, 28) : null });

  if (!url || !key) {
    out.verdict = 'inconclusive: no anon credentials found in the served bundle';
    finish(out);
    return;
  }

  const h = { ...UA, apikey: key, Authorization: `Bearer ${key}` };

  // 3. כמה שורות רואה אדם אנונימי? (‏count בלבד, בלי גוף)
  const countRes = await fetch(`${url}/rest/v1/gabai_accounts?select=id`, {
    headers: { ...h, Prefer: 'count=exact', Range: '0-0' },
  });
  const contentRange = countRes.headers.get('content-range');
  out.steps.push({ step: 'anon-select-count', status: countRes.status, content_range: contentRange });

  // 4. האם עמודת הסיסמה עצמה נקראת, ומה יושב בה — צורה בלבד.
  const colRes = await fetch(`${url}/rest/v1/gabai_accounts?select=id,username,is_admin,password_hash&limit=5`, { headers: h });
  const colBody = await colRes.json().catch(() => null);
  const readable = colRes.ok && Array.isArray(colBody);
  out.steps.push({
    step: 'anon-select-password-column',
    status: colRes.status,
    readable,
    rows_returned: readable ? colBody.length : 0,
    // רק צורה ואורך. אף פעם לא הערך.
    shapes: readable
      ? colBody.map((r) => ({
          username_present: Boolean(r.username),
          is_admin: r.is_admin ?? null,
          password_shape: shapeOf(r.password_hash),
          password_length: r.password_hash == null ? 0 : String(r.password_hash).length,
        }))
      : null,
    error: readable ? null : colBody,
  });

  const plaintext = readable && colBody.some((r) => shapeOf(r.password_hash) === 'plaintext-or-unknown');

  out.verdict = !readable
    ? 'anon cannot read gabai_accounts — the open policy is not reachable from the public key'
    : plaintext
      ? 'CONFIRMED: anon key reads gabai_accounts, and the password column holds unhashed values'
      : 'anon key reads gabai_accounts, but the password column is hashed';

  finish(out);
}

function finish(out) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, '_results.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
