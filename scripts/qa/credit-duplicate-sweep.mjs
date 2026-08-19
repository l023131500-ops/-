/**
 * ‏§7 — "פותח ע״י עולם הסטארטאפים": כמה פעמים הוא מופיע, ולאן הוא מוביל.
 *
 * ‏auth-button.js מזריק את שורת הקרדיט בכל מערכת, ומדלג רק אם כבר קיים
 * בדף אלמנט עם המחלקה `more30-credit`. מערכת שכתבה לעצמה שורת קרדיט
 * משלה — בלי המחלקה הזו — מקבלת **שתיים**: אחת שלה ואחת מוזרקת. וזו
 * שלה, כפי שנמדד בגן-קליק, מצביעה על `more30.com` (קטלוג המערכות)
 * במקום על `/showcase` (אתר התדמית), כלומר בדיוק הטעות ש-§7 מתקן.
 *
 * הסקריפט קורא את ה-HTML שהייצור מגיש בפועל, ולכן הוא מוצא רק קרדיט
 * שנכתב בשרת. מערכת שמציירת את הפוטר ב-JS לא תיתפס כאן — זו מגבלה
 * מוצהרת, לא כיסוי מלא. הרצה: node scripts/qa/credit-duplicate-sweep.mjs
 */
const URLS = process.argv.slice(2);
if (!URLS.length) {
  console.error('usage: node credit-duplicate-sweep.mjs <url> [url...]');
  process.exit(2);
}

const CREDIT_RE = /<a\b[^>]*>[^<]*עולם\s+הסטארטאפים[^<]*<\/a>/g;
const HREF_RE = /href="([^"]*)"/;

const out = [];
for (const url of URLS) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    const hits = html.match(CREDIT_RE) || [];
    // המחלקה `more30-credit` היא מה שמונע הזרקה שנייה; בלעדיה יהיו שתיים.
    const anchors = hits.map((a) => ({
      href: (a.match(HREF_RE) || [])[1] || null,
      hasCreditClass: /class="[^"]*more30-credit/.test(a),
    }));
    out.push({
      url,
      status: res.status,
      serverRenderedCredits: anchors.length,
      anchors,
      // כפילות = קרדיט משלה בלי המחלקה. אז auth-button.js יוסיף עוד אחד.
      willDuplicate: anchors.some((a) => !a.hasCreditClass),
      wrongTarget: anchors.filter((a) => a.href && !/\/showcase/.test(a.href)).map((a) => a.href),
    });
  } catch (e) {
    out.push({ url, error: String(e.message || e) });
  }
}

console.log(JSON.stringify(out, null, 2));
const bad = out.filter((r) => r.willDuplicate);
console.error(`\n${bad.length}/${out.length} systems ship their own credit line (→ duplicate):`);
for (const b of bad) console.error(`  ${b.url}  ${JSON.stringify(b.wrongTarget)}`);
