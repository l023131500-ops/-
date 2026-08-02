// report.mjs — turns the raw audit + lighthouse output into the fix list.
//
// Reads QA/platform/_results.json (+ _lighthouse.json when present) and writes
// QA/platform/SUMMARY.md: one row per route with every DESIGN_STANDARD §11
// checkbox resolved to pass/fail, followed by the specific defects per route.
//
// Usage: node report.mjs [dir]

import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] || 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform';
const res = JSON.parse(fs.readFileSync(path.join(DIR, '_results.json'), 'utf8'));
const lhFile = path.join(DIR, '_lighthouse.json');
const lh = fs.existsSync(lhFile) ? JSON.parse(fs.readFileSync(lhFile, 'utf8')) : {};

const yes = '✅';
const no = '❌';
const na = '·';

const rows = [];
const details = [];

for (const [key, r] of Object.entries(res.routes)) {
  const d = r.desktop || {};
  const m = r.mobile || {};
  if (d.error || !d.status) {
    rows.push(`| \`${r.path}\` | ${r.sys} | ${no} נכשל בטעינה | | | | | | | |`);
    details.push(`### \`${r.path}\` — ${r.name}\n\n- 🔴 **העמוד לא נטען:** ${d.error || 'ללא תשובה'}\n`);
    continue;
  }

  const small = [...(d.smallTargets || []), ...(m.smallTargets || [])];
  const unnamed = [...(d.unnamedControls || []), ...(m.unnamedControls || [])];
  const noAlt = [...new Set([...(d.imgsNoAlt || []), ...(m.imgsNoAlt || [])])];
  const errs = [...new Set([...(d.consoleErrors || []), ...(m.consoleErrors || [])])];
  const leaks = [...new Set([...(d.vercelLeak || []), ...(m.vercelLeak || [])])];
  const badCanonical = [d.canonical, d.ogUrl].filter((u) => u && !u.includes('more30.com'));
  const viewportBad = /maximum-scale|user-scalable\s*=\s*no/i.test(d.metaViewport || '');
  const l = lh[key] || {};
  const lhMin = ['performance', 'accessibility', 'bestPractices', 'seo']
    .map((c) => l[c]).filter((v) => typeof v === 'number');
  const lhCell = l.error ? '⚠️' : lhMin.length ? `${l.performance}/${l.accessibility}/${l.bestPractices}/${l.seo}` : na;

  rows.push([
    `| \`${r.path}\``,
    r.sys,
    d.status === 200 ? yes : `${no} ${d.status}`,
    d.lang === 'he' && (d.dir || '').startsWith('rtl') ? yes : no,
    d.h1Count === 1 ? yes : `${no} ${d.h1Count}`,
    d.metaDescription ? yes : no,
    small.length === 0 ? yes : `${no} ${small.length}`,
    unnamed.length === 0 ? yes : `${no} ${unnamed.length}`,
    r.horizontalOverflow ? no : yes,
    errs.length === 0 ? yes : `${no} ${errs.length}`,
    r.darkModeImplemented ? yes : no,
    d.hasAuthScript ? yes : no,
    lhCell,
    ' |',
  ].join(' | '));

  // per-route detail, only what actually failed
  const bad = [];
  if (d.status !== 200) bad.push(`סטטוס ${d.status}`);
  if (!(d.lang === 'he')) bad.push(`\`lang\` הוא "${d.lang || 'ריק'}" ולא \`he\``);
  if (!(d.dir || '').startsWith('rtl')) bad.push(`\`dir\` הוא "${d.dir || 'ריק'}" ולא \`rtl\``);
  if (d.h1Count !== 1) bad.push(`${d.h1Count} תגי \`h1\` (צריך בדיוק אחד)`);
  if (!d.metaDescription) bad.push('אין `meta description`');
  if (viewportBad) bad.push(`\`viewport\` חוסם זום: \`${d.metaViewport}\``);
  if (badCanonical.length) bad.push(`\`canonical\`/\`og:url\` מחוץ ל-more30: ${badCanonical.join(' · ')}`);
  if (leaks.length) bad.push(`קישורי \`vercel.app\` בעמוד: ${leaks.length} (${leaks[0]})`);
  if (small.length) {
    const uniq = [...new Map(small.map((s) => [`${s.tag}|${s.name}`, s])).values()].slice(0, 8);
    bad.push(`${small.length} יעדי מגע מתחת ל-24px: ` + uniq.map((s) => `${s.tag} ${s.w}×${s.h} "${s.name}"`).join(' · '));
  }
  if (unnamed.length) {
    const uniq = [...new Map(unnamed.map((u) => [`${u.tag}|${u.type}|${u.cls}`, u])).values()].slice(0, 8);
    bad.push(`${unnamed.length} פקדים בלי שם נגיש: ` + uniq.map((u) => `${u.tag}${u.type ? `[${u.type}]` : ''} .${u.cls}`).join(' · '));
  }
  if (noAlt.length) bad.push(`${noAlt.length} תמונות בלי \`alt\``);
  if (r.horizontalOverflow) bad.push(`גלישה אופקית במובייל: ${m.scrollW}px בתוך ${m.clientW}px`);
  if (errs.length) bad.push(`${errs.length} שגיאות קונסולה: ${errs.slice(0, 3).join(' | ')}`);
  if (!r.darkModeImplemented) bad.push(`אין מצב כהה — הרקע נשאר \`${d.bodyBg}\` גם ב-\`prefers-color-scheme: dark\``);
  if (!d.hasAuthScript) bad.push('אין את כפתור הכניסה האחיד (`auth-button.js`)');
  if (lhMin.length && Math.min(...lhMin) < 90) {
    bad.push(`Lighthouse מתחת ל-90: perf ${l.performance} · a11y ${l.accessibility} · bp ${l.bestPractices} · seo ${l.seo}` +
      (l.failedAudits?.length ? `\n  - נכשלו: ` + l.failedAudits.slice(0, 8).map((a) => `${a.id}${a.display ? ` (${a.display})` : ''}`).join(' · ') : ''));
  }

  details.push(
    `### \`${r.path}\` — ${r.name} (מערכת ${r.sys})\n\n` +
    `כותרת: **${d.title || '—'}** · h1: ${d.h1 ? `"${d.h1}"` : '—'} · טקסט מרונדר: ${d.textLen} תווים · ` +
    `${d.interactiveCount} אלמנטים אינטראקטיביים · טעינה ${d.loadMs}ms\n\n` +
    (bad.length ? bad.map((b) => `- ${b}`).join('\n') : '- ✅ עובר את כל הבדיקות האוטומטיות.') + '\n\n' +
    `צילומים: \`${d.screenshot}\` · \`${m.screenshot}\` · \`${(r.dark || {}).screenshot}\`\n`,
  );
}

const header = `# QA/platform — מדידה רוחבית של כל המערכות החיות

> נמדד ${res.startedAt?.slice(0, 16).replace('T', ' ')} → ${(res.finishedAt || '').slice(0, 16).replace('T', ' ')} מול הפרודקשן ב-\`more30.com\`.
> נוצר על ידי \`scripts/qa/platform-audit.mjs\` + \`scripts/qa/lighthouse-run.mjs\` → \`scripts/qa/report.mjs\`.
> כל שורה כאן היא מדידה בדפדפן אמיתי, לא הערכה. הסטנדרט: \`DESIGN_STANDARD.md\`.

| נתיב | # | 200 | RTL | h1 | תיאור | מגע≥24 | שמות | ללא גלישה | ללא שגיאות | כהה | כניסה | LH p/a/b/s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

---

## פירוט לפי נתיב

${details.join('\n')}
`;

fs.writeFileSync(path.join(DIR, 'SUMMARY.md'), header, 'utf8');
console.log(`SUMMARY.md written for ${Object.keys(res.routes).length} routes`);
