// torah-anon-key-pairing — האם החבילה שמוגשת ב-more30.com/torah מצמידה
// את המפתח של פרויקט אחד ל-URL של פרויקט אחר.
//
// own-form-login-roundtrip קיבל 401 "Invalid API key" על torah (01), עם
// URL של bieebmnmkffwbqlsfozh ומפתח anon שה-ref שלו uhnrgujbdxhhmoxcjria.
// אבל אותו סקריפט לקח את ההתאמה הראשונה של כל סוג מתוך **כל** החבילות
// יחד, ולכן יכול היה להצמיד URL מקובץ אחד למפתח מקובץ אחר. כאן כל קובץ
// נבדק לחוד: אילו URL-ים ואילו מפתחות יש **בו**, ומה המרחק ביניהם.
//
// שימוש:  node scripts/qa/torah-anon-key-pairing.mjs
// פלט:    QA/torah/anon-key-pairing-0812/_results.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = 'https://more30.com/torah/';
const OUT = join(process.cwd(), 'QA', 'torah', 'anon-key-pairing-0812');

const decode = (k) => {
  try {
    const b = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString('utf8'));
    return { role: b.role ?? null, ref: b.ref ?? null };
  } catch {
    return { role: null, ref: null };
  }
};

const page = await fetch(PAGE);
const html = await page.text();
const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], PAGE).href);

const files = [{ href: PAGE, body: html }];
for (const href of srcs) {
  const r = await fetch(href);
  if (r.ok) files.push({ href, body: await r.text() });
}

const perFile = [];
for (const f of files) {
  const urls = [...f.body.matchAll(/https:\/\/([a-z]{20})\.supabase\.co/g)].map((m) => ({
    ref: m[1],
    at: m.index,
  }));
  const keys = [...f.body.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g)].map((m) => ({
    ...decode(m[0]),
    at: m.index,
    len: m[0].length,
  }));
  if (!urls.length && !keys.length) continue;
  perFile.push({
    file: f.href.replace('https://more30.com', ''),
    bytes: f.body.length,
    url_refs: [...new Set(urls.map((u) => u.ref))],
    keys: keys.map((k) => ({ role: k.role, ref: k.ref, len: k.len })),
    // כמה תווים מפרידים בין ה-URL הראשון למפתח הראשון באותו קובץ.
    // צמידות (עשרות תווים) = זוג אמיתי; אלפים = שני מקורות שונים.
    first_url_to_first_key_distance:
      urls.length && keys.length ? Math.abs(keys[0].at - urls[0].at) : null,
  });
}

// הבדיקה המכריעה: כל צירוף URL×מפתח שמופיע באותו קובץ, מול שרת האמת.
const pairs = [];
for (const f of perFile) {
  for (const ref of f.url_refs) {
    for (const k of f.keys) {
      const id = `${ref}|${k.ref}`;
      if (pairs.some((p) => p.id === id)) continue;
      pairs.push({ id, url_ref: ref, key_ref: k.ref, key_role: k.role, file: f.file });
    }
  }
}

// מוצאים את המפתח המלא כדי לירות אותו באמת (רק ל-refs שנמצאו).
const allKeys = new Map();
for (const f of files) {
  for (const m of f.body.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g)) {
    const d = decode(m[0]);
    if (d.ref && !allKeys.has(d.ref)) allKeys.set(d.ref, m[0]);
  }
}

for (const p of pairs) {
  const key = allKeys.get(p.key_ref);
  const res = await fetch(`https://${p.url_ref}.supabase.co/auth/v1/settings`, { headers: { apikey: key } });
  const body = await res.text();
  p.settings_status = res.status;
  p.settings_says = res.status === 200 ? 'accepted' : body.slice(0, 120);
}

mkdirSync(OUT, { recursive: true });
const out = { at: new Date().toISOString(), page: PAGE, files_read: files.length, perFile, pairs };
writeFileSync(join(OUT, '_results.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 2));
