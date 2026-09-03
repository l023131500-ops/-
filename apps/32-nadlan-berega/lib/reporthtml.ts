// ==== רינדור הדוח ל-HTML של מייל ====
//
// המפרט: "כל נתון בשורה נפרדת עם מקור ודרגת וודאות". זה מיושם כאן פשוטו כמשמעו —
// כל נתון הוא שורה בטבלה עם ערך, ודאות ומקור, וכשאין נתון מופיע ההסבר למה אין.
//
// ⚠️ אילוצי מייל שהכתיבו את המימוש: אין CSS חיצוני, אין class-ים (Gmail מסלק
// חלק מהם), אין flex/grid אמין, ואין JS. לכן טבלאות עם `style` בשורה, `dir=rtl`
// על כל בלוק, ורוחב מקסימלי קבוע. תמונות מוגשות דרך `/api/image` בכתובת מלאה —
// כתובת יחסית לא קיימת בתוך תוכנת מייל.

import type { PropertyReport } from './buildreport';
import { dealIdentity } from './buildreport';
import { CERTAINTY_LABEL, TIER_LABEL, tierAllows, formatFactValue } from './report';
import type { Fact } from './report';
import type { TabuAnalysis, TabuDocRow, TikMeidaDocRow } from './requests';
import { computeStreetStats } from './streetstats';
import { hasValuation } from './valuation';
import type { NearbyPlan } from './nearbyplans';
import type { Feasibility } from './feasibility';
import { calcPurchaseTax } from './purchasetax';

const INK = '#141619';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const NAVY = '#0f2f4f';
const TEAL = '#0e7c7b';

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// היחידה מוצגת בנפרד ובגופן קטן, ולכן הערך מעוצב בלעדיה.
function num(f: Fact): string {
  return formatFactValue({ ...f, unit: undefined });
}

/**
 * תאריך בעברית.
 * ⚠️ טבלת העסקאות הציגה תאריכי ISO ("2025-10-16") באותו דוח שבו אותה עסקה
 * עצמה מופיעה כשדה בפורמט "16.10.2025". שני פורמטים לאותו נתון באותו מסמך.
 */
function heDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = String(iso);
  // "2017-11" — חודש ושנה בלי יום, כפי שמוחזר לתאריך צילום רחוב ולמדד.
  const ym = /^(\d{4})-(\d{2})$/.exec(s);
  if (ym) return `${Number(ym[2])}/${ym[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0, 10) : d.toLocaleDateString('he-IL');
}

const CERTAINTY_COLOR: Record<string, string> = {
  verified: '#0e7c7b',
  approx: '#8a6d24',
  estimate: '#6b7280',
};

/**
 * שורת נתון: תווית · ערך · ודאות. כשאין ערך — הסיבה, ולא מקף.
 * ⚠️ שם המקור אינו מוצג ללקוח — הוא נשמר בלוג הפנימי (`lib/sourcelog.ts`).
 */
function factRow(f: Fact): string {
  const value =
    f.value !== null
      ? `<span style="font-weight:700;color:${INK}">${esc(num(f))}</span>${
          f.unit ? ` <span style="color:${MUTED};font-size:12px">${esc(f.unit)}</span>` : ''
        }`
      : `<span style="color:${MUTED}">לא זמין — ${esc(f.missingReason ?? '')}</span>`;

  // ⚠️ הערת המקור מוצגת **רק** כשיש ערך. נמצא במייל אמיתי: אחת-עשרה שורות
  // הציגו "לא זמין — לא נרשמה מכירת דירה בבניין הזה" ומיד מתחתיהן את הערת
  // התבנית "זו העסקה הראשונה של דירה בבניין הזה במרשם" — כלומר הדוח סתר את
  // עצמו שורה אחרי שורה. כשאין ערך, ההסבר הנכון הוא `missingReason` בלבד.
  const note =
    f.value !== null
      ? [f.sourceNote, f.asOf ? `תאריך הנתון: ${heDate(f.asOf)}` : null].filter(Boolean).join(' ')
      : '';

  return `<tr>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};vertical-align:top;width:34%">
    <div style="font-weight:600;color:${NAVY};font-size:14px">${esc(f.label)}</div>
  </td>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};vertical-align:top">
    <div style="font-size:14px;line-height:1.5">${value}</div>
    ${note ? `<div style="margin-top:3px;font-size:11px;line-height:1.6;color:${MUTED}">${esc(note)}</div>` : ''}
  </td>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};vertical-align:top;width:74px;text-align:center">
    <span style="display:inline-block;padding:2px 8px;border-radius:9px;font-size:11px;font-weight:700;color:#fff;background:${CERTAINTY_COLOR[f.certainty]}">${CERTAINTY_LABEL[f.certainty]}</span>
  </td>
</tr>`;
}

function section(title: string, subtitle: string | null, inner: string): string {
  if (!inner.trim()) return '';
  return `<div style="margin-top:26px">
  <div style="font-size:19px;font-weight:800;color:${NAVY}">${esc(title)}</div>
  ${subtitle ? `<div style="margin-top:2px;font-size:13px;color:${MUTED}">${esc(subtitle)}</div>` : ''}
  ${inner}
</div>`;
}

function table(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:10px;border-collapse:collapse;border:1px solid ${LINE};border-radius:8px">${rows}</table>`;
}

function bullets(title: string, items: string[]): string {
  if (!items.length) return '';
  return `<div style="margin-top:12px">
  <div style="font-size:14px;font-weight:700;color:${NAVY}">${esc(title)}</div>
  <ul style="margin:6px 0 0;padding-inline-start:18px;font-size:13px;line-height:1.8;color:${INK}">
    ${items.map((i) => `<li>${esc(i)}</li>`).join('')}
  </ul>
</div>`;
}

function tabuBlock(docs: TabuDocRow[]): string {
  const done = docs.filter((d) => d.analysis);
  if (!done.length) return '';

  const scopeLabel: Record<string, string> = {
    apartment: 'נסח של הדירה',
    entrance: 'נסח של הכניסה',
    building: 'נסח מרוכז של הבניין',
  };

  const blocks = done.map((d) => {
    const a = d.analysis as TabuAnalysis;
    const lines: string[] = [];
    if (a.owners?.length) {
      lines.push(
        `<b>בעלות:</b> ${a.owners
          .map((o) => esc(o.name) + (o.share ? ` (${esc(o.share)})` : ''))
          .join(' · ')}`,
      );
    }
    if (a.mortgages?.length) {
      lines.push(
        `<b>משכנתאות ושעבודים:</b> ${a.mortgages
          .map((m) => esc(m.holder) + (m.amount ? ` — ${esc(m.amount)}` : ''))
          .join(' · ')}`,
      );
    }
    if (a.cautionNotes?.length) {
      lines.push(
        `<b>הערות אזהרה:</b> ${a.cautionNotes
          .map((c) => esc(c.kind) + (c.inFavourOf ? ` לטובת ${esc(c.inFavourOf)}` : ''))
          .join(' · ')}`,
      );
    }
    if (a.leases?.length) {
      lines.push(`<b>חכירות:</b> ${a.leases.map((l) => esc(l.holder)).join(' · ')}`);
    }
    if (a.otherEncumbrances?.length) {
      lines.push(`<b>הגבלות נוספות:</b> ${a.otherEncumbrances.map(esc).join(' · ')}`);
    }
    if (a.perFloorRights?.length) {
      lines.push(
        `<b>פירוט לפי קומה/תת-חלקה:</b> ${a.perFloorRights
          .map((f) => (f.floor ? `קומה ${esc(f.floor)} — ` : '') + esc(f.summary))
          .join(' · ')}`,
      );
    }
    if (!a.mortgages?.length && !a.cautionNotes?.length) {
      lines.push('<b>משכנתאות והערות אזהרה:</b> לא נמצאו בנסח הזה.');
    }
    const areaParts: string[] = [];
    if (a.parcelArea) areaParts.push(`שטח החלקה ${esc(a.parcelArea)}`);
    if (a.subParcelArea) areaParts.push(`שטח תת-החלקה ${esc(a.subParcelArea)}`);
    if (a.sharedAreas) areaParts.push(`שטחים משותפים ${esc(a.sharedAreas)}`);
    if (areaParts.length) {
      lines.push(`<b>שטח רשום בנסח:</b> ${areaParts.join(' · ')}`);
    }
    if (a.unreadable?.length) {
      lines.push(
        `<b>לא ניתן לקרוא מהנסח:</b> ${a.unreadable.map(esc).join(' · ')} — נדרשת קריאה ידנית.`,
      );
    }

    const scope =
      scopeLabel[d.scope] +
      (d.tat_helka ? `, תת-חלקה ${esc(d.tat_helka)}` : '') +
      (d.entrance ? `, כניסה ${esc(d.entrance)}` : '') +
      (d.apartment ? `, דירה ${esc(d.apartment)}` : '');

    return `<div style="margin-top:10px;padding:12px;border:1px solid ${LINE};border-radius:8px;background:#fafafa">
  <div style="font-size:13px;font-weight:800;color:${NAVY}">${esc(scope)}</div>
  ${a.extractDate ? `<div style="font-size:11px;color:${MUTED}">תאריך הנסח: ${esc(a.extractDate)}</div>` : ''}
  <div style="margin-top:6px;font-size:13px;line-height:1.8;color:${INK}">${lines.join('<br>')}</div>
  ${a.summary ? `<div style="margin-top:6px;font-size:12px;line-height:1.7;color:${MUTED}">${esc(a.summary)}</div>` : ''}
</div>`;
  });

  return section(
    'טאבו — מתוך הנסח שהופק',
    'הנתונים הבאים חולצו מנסח טאבו רשמי שצורף לדוח הזה, ומשויכים לנכס לפי היקף הנסח.',
    blocks.join(''),
  );
}

/**
 * "attach to client" של build_tasks id=5 — תיק מידע להיתר שהונפק בפועל
 * ושויך לחלקה הזו (`tikMeidaForProperty`). בשונה מ-`tabuBlock`, אין כאן
 * שדות משפטיים מנותחים בפני עצמם — התיק הוא PDF/תמונה רשמיים, וההערה
 * (`note`) היא תמצות קצר שהצוות הקליד בעת ההעלאה, לא ניתוח AI.
 */
function tikMeidaBlock(docs: TikMeidaDocRow[]): string {
  if (!docs.length) return '';

  const blocks = docs.map((d) => {
    const when = new Date(d.uploaded_at).toLocaleDateString('he-IL');
    return `<div style="margin-top:10px;padding:12px;border:1px solid ${LINE};border-radius:8px;background:#fafafa">
  <div style="font-size:13px;font-weight:800;color:${NAVY}">${esc(d.file_name)}</div>
  <div style="font-size:11px;color:${MUTED}">התקבל מהוועדה המקומית · ${esc(when)}</div>
  ${d.note ? `<div style="margin-top:6px;font-size:13px;line-height:1.8;color:${INK}">${esc(d.note)}</div>` : ''}
</div>`;
  });

  return section(
    'תיק מידע להיתר',
    'המסמך הרשמי שהתקבל מהוועדה המקומית לתכנון ולבנייה, לפי בקשתך.',
    blocks.join(''),
  );
}

/**
 * §7 · שכבת "הרחוב" — זהה בנתונים ל-`StreetPanel.tsx` (המסך), דרך
 * `computeStreetStats` המשותף. לפני הרשומה הזו הסעיף היה קיים במסך בלבד:
 * מי שרואה רק את המייל לא ראה כלל מה נמכר ברחוב הזה, למרות שהמידע כבר זורם
 * לתשובת ה-API בכל רמה (אינו מושך מקור בתשלום).
 */
function streetBlock(report: PropertyReport): string {
  const stats = computeStreetStats(report);
  if (!stats) return '';

  const aliasNote = stats.aliases.length
    ? `<div style="margin-top:4px;font-size:12px;color:${MUTED}">מוכר גם בשם ${esc(stats.aliases.join(' · '))} — ומרשם העסקאות רושם לפעמים תחת הכינוי ולא תחת השם הרשמי, ולכן שני השמות נספרים כאן יחד.</div>`
    : '';

  if (stats.onStreet.length === 0) {
    return section(
      'הרחוב',
      'מה שנמכר ברחוב הזה עצמו — לא באזור.',
      `${aliasNote}<div style="margin-top:8px;font-size:14px;color:${MUTED}">לא נרשמה אף עסקה שנושאת את שם הרחוב הזה בתקופה שנבדקה. זה קורה ברחובות קצרים, ברחובות חדשים, וכשהמרשם רושם את העסקאות תחת כינוי אחר של הרחוב.</div>`,
    );
  }

  const perSqmValue = stats.perSqm ? `${stats.perSqm.median.toLocaleString('he-IL')} ₪` : 'לא זמין';
  const perSqmNote = stats.perSqm
    ? `רוב העסקאות בין ${stats.perSqm.p25.toLocaleString('he-IL')} ל-${stats.perSqm.p75.toLocaleString('he-IL')} ₪ · ${stats.perSqm.count} עסקאות`
    : 'אין עסקה עם שטח ומחיר שאפשר לחשב ממנה';
  const spanValue = stats.span
    ? `${heDate(stats.span.from)} – ${heDate(stats.span.to)}`
    : 'לא זמין';

  const statsRow = `<tr>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};font-size:13px;color:${MUTED}">עסקאות שנרשמו ברחוב</td>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};font-size:14px;font-weight:700;color:${INK}">${stats.onStreet.length}</td>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};font-size:11px;color:${MUTED}">מתוכן ${stats.homeSales} מכירות דירות${stats.suspect ? ` · ${stats.suspect} רשומות חריגות לא נספרו במחירים` : ''}</td>
</tr>
<tr>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};font-size:13px;color:${MUTED}">מחיר למ״ר חציוני ברחוב</td>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};font-size:14px;font-weight:700;color:${INK}">${esc(perSqmValue)}</td>
  <td style="padding:9px 12px;border-bottom:1px solid ${LINE};font-size:11px;color:${MUTED}">${esc(perSqmNote)}</td>
</tr>
<tr>
  <td style="padding:9px 12px;font-size:13px;color:${MUTED}">טווח התאריכים</td>
  <td style="padding:9px 12px;font-size:14px;font-weight:700;color:${INK}">${esc(spanValue)}</td>
  <td style="padding:9px 12px;font-size:11px;color:${MUTED}">מהעסקה הישנה ביותר ועד האחרונה שנמצאה</td>
</tr>`;

  const topRows = stats.rows.slice(0, 8);
  const houseRows = topRows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:10px;border-collapse:collapse;border:1px solid ${LINE}">
  <tr style="background:#f8fafc">
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מספר בית</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">עסקאות</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מכירות דירות</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מחיר למ״ר חציוני</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">העסקה האחרונה</th>
  </tr>
  ${topRows
    .map(
      (r) => `<tr${r.isSubject ? ` style="background:#eefaf9"` : ''}>
    <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px;font-weight:${r.isSubject ? 700 : 400}">${r.houseNum}${r.isSubject ? ' (הנכס שלכם)' : ''}</td>
    <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${r.deals}</td>
    <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${r.homeSales}</td>
    <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${r.medianPerSqm ? r.medianPerSqm.toLocaleString('he-IL') + ' ₪' : '—'}</td>
    <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:12px;color:${MUTED}">${r.lastDate ? heDate(r.lastDate) : '—'}</td>
  </tr>`,
    )
    .join('')}
</table>${
        stats.rows.length > topRows.length
          ? `<div style="margin-top:6px;font-size:11px;color:${MUTED}">מוצגים ${topRows.length} מתוך ${stats.rows.length} מספרי בית — הקרובים ביותר למספר הנכס.</div>`
          : ''
      }`
    : '';

  const subjectMissing =
    stats.subjectNum != null && !stats.rows.some((r) => r.isSubject)
      ? `<div style="margin-top:8px;font-size:12px;color:${MUTED}">במספר ${stats.subjectNum} עצמו לא נרשמה אף עסקה. המספרים שבטבלה הם השכנים הקרובים ביותר שכן נמכר בהם.</div>`
      : '';

  return section(
    'הרחוב',
    'מה שנמכר ברחוב הזה עצמו — לא באזור.',
    `${aliasNote}${table(statsRow)}${houseRows}${subjectMissing}`,
  );
}

/**
 * "סיור רחוב" (build_tasks id=2, `StreetWalkPanel.tsx`) מקודד בדפדפן הצופה
 * ונשמר במטמון ציבורי לפי ה-slug הקבוע של הנכס (`lib/store.ts`,
 * `street_video_cache`) — אבל מעולם לא הגיע למייל שנשלח בפועל ללקוח
 * (`app/api/admin/requests`), רק למסך. מוצג רק כשכבר קיים קליפ שמור לאותו
 * נכס: הקידוד קורה אצל צופה קודם באתר, לא בשרת בזמן שליחת המייל, כך שרוב
 * הדוחות פשוט לא ישאו סעיף הזה — בדיוק כמו כל שדה אחר בקובץ הזה שמותנה
 * בזמינות נתון אמיתי.
 */
function streetVideoBlock(url: string | null | undefined): string {
  if (!url) return '';
  return section(
    'סיור רחוב',
    'קליפ שצולם בעבר לדוח הזה באתר — רצף תמונות רחוב אמיתיות מקודד לווידאו.',
    `<a href="${url}" style="display:inline-block;margin-top:8px;padding:10px 18px;border-radius:8px;background:${TEAL};color:#fff;font-weight:700;font-size:14px;text-decoration:none">▶ צפייה בסיור הרחוב</a>`,
  );
}

/**
 * §4 · "דירות מוצעות כרגע" — זהה בנתונים ל-`Listings.tsx` (המסך). `report.listings`
 * (`lib/apify.ts`, נמשך ב-`buildReport` לכל דוח שאינו חינמי ואינו קרקע) כבר
 * מוצג במסך בקטגוריה `listings`/`rental`/`commercial` — אבל מעולם לא הגיע
 * למייל, למרות שהוא נמשך בתשלום בכל דוח פרימיום/VIP ששולח `app/api/admin/
 * requests` בפועל. כשהשכבה לא נמשכה (רמה חינמית/לא-מוגדר/קרקע) או שלא נמצאו
 * מודעות — אין סעיף, בדיוק כמו ש-`nearbyPlansBlock` לא מציג כלום כשאין נתון.
 */
const LISTINGS_NOUN: Record<string, string> = {
  residential: 'דירות שמוצעות למכירה',
  rental: 'דירות שמוצעות להשכרה',
  commercial: 'נכסים מסחריים המוצעים',
  land: 'מגרשים המוצעים',
};

function listingsBlock(report: PropertyReport): string {
  const listings = report.listings;
  if (!report.listingsStatus?.configured || !listings || !listings.length) return '';

  const noun = LISTINGS_NOUN[report.assetType] ?? LISTINGS_NOUN.residential;
  const ils = (n: number) => n.toLocaleString('he-IL');

  const rows = listings
    .slice(0, 12)
    .map(
      (l) => `<tr>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(l.address ?? 'כתובת לא צוינה')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${l.price ? ils(l.price) + ' ₪' : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${l.pricePerSqm ? ils(l.pricePerSqm) + ' ₪' : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${[l.rooms ? `${l.rooms} חד'` : null, l.areaSqm ? `${l.areaSqm} מ"ר` : null].filter(Boolean).join(' · ') || '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${l.daysListed != null ? (l.daysListed === 0 ? 'עלה היום' : `${l.daysListed} ימים באוויר`) : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:12px;color:${MUTED}">${l.source === 'yad2' ? 'יד2' : 'מדלן'}</td>
</tr>`,
    )
    .join('');

  const sourceNames = report.listingsStatus.sourcesOk
    .map((s) => (s === 'yad2' ? 'יד2' : 'מדלן'))
    .join(' ומ');

  return section(
    noun,
    `${listings.length} ${noun} כרגע באזור${sourceNames ? ` · מקור: ${esc(sourceNames)}` : ''}. אלה מחירי בקשה, לא מחירים שנסגרו בפועל.`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:10px;border-collapse:collapse;border:1px solid ${LINE}">
  <tr style="background:#f8fafc">
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">כתובת</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מחיר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">₪ למ״ר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">חדרים/שטח</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">זמן באוויר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">לוח</th>
  </tr>
  ${rows}
</table>${
      listings.length > 12
        ? `<div style="margin-top:6px;font-size:11px;color:${MUTED}">מוצגות 12 מתוך ${listings.length} מודעות שנמצאו.</div>`
        : ''
    }`,
  );
}

/**
 * §12 · "מה נבנה באזור?" — זהה בנתונים ל-`NearbyPlansPanel.tsx` (המסך).
 * `report.nearbyPlans` (lib/nearbyplans.ts) הוא `null` ברמה חינמית (השכבה
 * לא נשאלת כלל, בדיוק כמו במסך) ולכן אין צורך בבדיקת-רמה נוספת כאן — רק
 * "האם יש בכלל נתון להציג". לפני הרשומה הזו הסעיף לא היה קיים במייל בכלל,
 * למרות שהוא כבר נשלח לדפדפן בכל דוח פרימיום/VIP.
 */
function nearbyPlansBlock(plans: NearbyPlan[] | null | undefined): string {
  if (!plans || !plans.length) return '';

  const rows = plans
    .slice(0, 8)
    .map(
      (p) => `<tr>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(p.planNumber ?? 'ללא מספר')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(p.planName ?? '—')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(p.status ?? '—')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${Number.isFinite(p.distanceM) ? `${Math.round(p.distanceM)} מ'` : '—'}</td>
</tr>`,
    )
    .join('');

  return section(
    'מה נבנה באזור?',
    "תוכניות בנייה ותכנון מאושרות ברדיוס 400 מ' מהנכס, עם מיקום מדויק וסטטוס.",
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:10px;border-collapse:collapse;border:1px solid ${LINE}">
  <tr style="background:#f8fafc">
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מספר תוכנית</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">שם</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מצב</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מרחק מהנכס</th>
  </tr>
  ${rows}
</table>${
      plans.length > 8
        ? `<div style="margin-top:6px;font-size:11px;color:${MUTED}">מוצגות 8 מתוך ${plans.length} תוכניות שנמצאו.</div>`
        : ''
    }`,
  );
}

/**
 * §7 · "היתכנות להיתר נוסף" — זהה בנתונים ל-`FeasibilityPanel.tsx` (המסך).
 * `report.feasibility` נבנה בכל דוח כש-`report.permits` קיים (לא תלוי-רמה,
 * `lib/buildreport.ts`) ומוצג במסך תחת אותה קטגוריית "תכנון והיתרים" כמו
 * `permitGuidance`/`nearbyPlans` שכבר יש להם סעיף כאן — אבל מעולם לא הגיע
 * למייל. בכוונה אין כאן שום מספר של זכויות בנייה (ראו `lib/feasibility.ts`) —
 * רק תוכניות/קווי-בניין/מה לא ידוע, בדיוק כמו הפאנל במסך.
 */
function feasibilityBlock(f: Feasibility | null | undefined): string {
  if (!f) return '';

  const additive = f.additivePlans.length
    ? bullets(
        'תוכניות מאושרות שמכוחן אפשר לבקש תוספת',
        f.additivePlans.map(
          (p) => `${p.planNumber ?? 'תכנית ללא מספר'}${p.planName ? ` · ${p.planName}` : ''} — ${p.why}`,
        ),
      )
    : '';

  const pending = f.pendingPlans.length
    ? bullets(
        'תוכניות בהליך שעשויות לפתוח תוספת (טרם אושרו)',
        f.pendingPlans.map(
          (p) => `${p.planNumber ?? 'ללא מספר'}${p.planName ? ` · ${p.planName}` : ''} — ${p.why}`,
        ),
      )
    : '';

  const lines = [...f.buildingLines, ...f.restrictions];
  const linesBlock = lines.length
    ? bullets(
        'קווי בניין ומגבלות על החלקה',
        lines.map(
          (e) => `${e.name}${e.planNumber ? ` · מתכנית ${e.planNumber}` : ''}${e.status ? ` · ${e.status}` : ''}`,
        ),
      )
    : `<div style="margin-top:8px;font-size:13px;color:${MUTED}">לא אותרו קווי בניין מצוירים על החלקה בשירות המפות.</div>`;

  const unknowns = f.unknowns.length
    ? `<div style="margin-top:12px;padding:12px;border:1px solid #e9d9a8;border-radius:8px;background:#fdf8ec">
  <div style="font-size:13px;font-weight:700;color:#8a6d24">מה אי אפשר לדעת מכאן</div>
  <ul style="margin:6px 0 0;padding-inline-start:18px;font-size:12.5px;line-height:1.8;color:${INK}">
    ${f.unknowns.map((u) => `<li>${esc(u)}</li>`).join('')}
  </ul>
  <div style="margin-top:8px;font-size:12.5px;font-weight:600;color:${INK}">${esc(f.whereToCheck)}</div>
</div>`
    : '';

  return section('היתכנות להיתר נוסף', f.headline, `${additive}${pending}${linesBlock}${unknowns}`);
}

/**
 * §2 · הערכת שווי — זהה בנתונים ל-`ValuationPanel.tsx` (המסך) ולסליידר
 * ה"הערכת שווי" בחפיסה (`Presentation.tsx`), שניהם קוראים מ-`report.valuation`
 * בלי חישוב משלהם. לפני הרשומה הזו הסעיף לא היה קיים במייל בכלל — מי שקורא
 * רק את המייל (הערוץ שדרכו הדוח שנרכש נשלח בפועל, `app/api/admin/requests`)
 * לא ראה את טווח השווי, המספר שבגללו לקוח משלם על הדוח.
 */
function valuationBlock(report: PropertyReport): string {
  const v = report.valuation;
  if (!v) return '';
  const ils = (n: number) => n.toLocaleString('he-IL');

  if (!hasValuation(v)) {
    const reg = v.regional;
    return section(
      'הערכת שווי',
      null,
      `<div style="margin-top:4px;font-size:14px;color:${INK}">${esc(v.notEnoughData)}</div>` +
        (reg
          ? `<div style="margin-top:10px;padding:12px;border:1px solid ${LINE};border-radius:8px;background:#fafafa">
  <div style="font-size:12px;color:${MUTED}">מחיר למ״ר באזור, עדכני</div>
  <div style="margin-top:2px;font-size:20px;font-weight:800;color:${TEAL}">${ils(reg.medianPerSqm)} ₪ למ״ר</div>
  <div style="margin-top:4px;font-size:12px;line-height:1.7;color:${MUTED}">חציון של ${reg.count} עסקאות בסביבה הקרובה, ${esc(reg.windowLabel)}${
              reg.latestDate ? `. העדכנית שבהן מ-${heDate(reg.latestDate)}` : ''
            }. מקור: מרשם העסקאות של רשות המסים.</div>
</div>`
          : ''),
    );
  }

  const compRows = v.comparables
    .slice(0, 12)
    .map(
      (c) => `<tr>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(heDate(c.date))}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(c.address ?? '—')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:12px;direction:ltr;text-align:right">${esc(c.parcelLabel ?? '—')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${c.price ? ils(c.price) + ' ₪' : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${c.areaSqm ?? '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${c.pricePerSqm ? ils(c.pricePerSqm) : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:12px;color:${MUTED}">${esc(c.proximityLabel)}</td>
</tr>`,
    )
    .join('');

  return section(
    'הערכת שווי',
    `${v.basis.label} · ${v.basis.count} עסקאות · ${v.basis.windowLabel}`,
    `<div style="margin-top:6px;font-size:30px;font-weight:800;color:${TEAL}">${ils(v.low)} – ${ils(v.high)} ₪</div>
<div style="margin-top:2px;font-size:13px;color:${MUTED}">אמצע הטווח: ${ils(v.mid)} ₪ · מחיר למ״ר בהשוואה: ${ils(v.medianPerSqm)} ₪ · שטח שעליו חושב: ${ils(v.areaSqm)} מ״ר (${esc(v.areaSource)})</div>
<div style="margin-top:10px;font-size:13.5px;line-height:1.7;color:${INK}">${esc(v.explanation)}</div>
${
  v.wideSpread
    ? `<div style="margin-top:8px;padding:10px 12px;border:1px solid #e6d5a8;background:#fdf8ec;border-radius:8px;font-size:12.5px;line-height:1.7;color:#7a5f1f">${esc(v.wideSpread)}</div>`
    : ''
}
${
  compRows
    ? `<div style="margin-top:12px;font-size:13px;font-weight:700;color:${NAVY}">${v.comparables.length} העסקאות שההערכה נשענת עליהן</div>` +
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:6px;border-collapse:collapse;border:1px solid ${LINE}">
  <tr style="background:#f8fafc">
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">תאריך</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">כתובת</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">גוש/חלקה</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מחיר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מ״ר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">₪ למ״ר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">קרבה</th>
  </tr>
  ${compRows}
</table>`
    : ''
}
<div style="margin-top:10px;font-size:11.5px;line-height:1.7;color:${MUTED}">ההערכה נגזרת ממחירים שנסגרו בפועל ונרשמו במרשם העסקאות של רשות המסים. היא אינה שמאות, אינה מחיר של הנכס הזה, ואינה מביאה בחשבון מצב פיזי, שיפוץ, כיווני אוויר או זכויות נוספות.</div>`,
  );
}

/**
 * "מגמת מחירי הדירות בישראל" — זהה בנתונים ל-`PriceTrend.tsx` (המסך, מוצג מיד
 * אחרי טבלת העסקאות שנסגרו, פרימיום+VIP בלבד — `tier !== 'basic'`).
 * `report.priceTrend` (מדד הלמ"ס הארצי, `lib/cbs.ts`) נבנה בכל דוח ללא תלות
 * ברמה (`buildreport.ts`), אבל השער `tier !== 'basic'` קיים רק במסך עצמו —
 * לפני הרשומה הזו הסעיף לא הגיע לא למייל ולא למצגת/PDF בכלל, אז לקוח שראה
 * רק אחד מהם לא ידע אם השוק הארצי עולה או יורד בתקופה שבה הוא קונה.
 */
function priceTrendBlock(report: PropertyReport): string {
  if (report.tier === 'basic') return '';
  const points = report.priceTrend;
  if (!points || points.length < 3) return '';

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const changePct = first ? Math.round(((last - first) / first) * 1000) / 10 : null;
  const changeLine =
    changePct != null
      ? `<div style="margin-top:4px;font-size:13px;color:${MUTED}">שינוי בתקופה המוצגת: <b style="color:${changePct >= 0 ? TEAL : '#dc2626'}">${changePct > 0 ? '+' : ''}${changePct}%</b></div>`
      : '';

  const shown = points.slice(-8);
  const rows = shown
    .map(
      (p) => `<tr>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(p.period)}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px;font-weight:700">${p.value.toLocaleString('he-IL')}</td>
</tr>`,
    )
    .join('');

  return section(
    'מגמת מחירי הדירות בישראל',
    'המדד הארצי של הלשכה המרכזית לסטטיסטיקה — מתאר את מגמת השוק בכללותו, לא את הנכס הזה.',
    `${changeLine}<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:10px;border-collapse:collapse;border:1px solid ${LINE}">
  <tr style="background:#f8fafc">
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">תקופה</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">ערך המדד</th>
  </tr>
  ${rows}
</table>${
      points.length > shown.length
        ? `<div style="margin-top:6px;font-size:11px;color:${MUTED}">מוצגות ${shown.length} מתוך ${points.length} נקודות המדד — האחרונות ביותר.</div>`
        : ''
    }`,
  );
}

/**
 * ✦ תוספות דוח VIP — זהה בכוונה ל`VipPanel.tsx` (המסך) *חלקית* בלבד: תשואת
 * שכירות, מחשבון משכנתא, תזרים מזומנים ומס שבח דורשים קלט אישי (שכר דירה,
 * תנאי מימון, תאריכי קנייה/מכירה) שאין לשרת שום דרך לדעת בזמן הפקת הדוח —
 * לכן הם נשארים אינטראקטיביים-בלבד במסך, וזה תקין, לא פער. אבל מס רכישה
 * תלוי רק במחיר, ומחיר (`report.valuation.mid`) כבר מחושב ומגיע בכל דוח
 * VIP — כך שהאומדן הזה יכול להגיע גם למי שקורא רק את המייל/PDF, בדיוק כמו
 * `valuationBlock` למעלה. לפני הרשומה הזו כל חמשת המחשבונים היו חסרים
 * ממייל/מצגת/PDF לגמרי, בלי אף רמז שהם קיימים.
 */
function vipEstimatesBlock(report: PropertyReport, baseUrl: string): string {
  if (report.tier !== 'vip') return '';
  const v = report.valuation;
  const ils = (n: number) => n.toLocaleString('he-IL');
  const reportLink = `${baseUrl}/report?q=${encodeURIComponent(report.query)}&tier=vip`;

  const taxPreview =
    v && hasValuation(v)
      ? (() => {
          const tax = calcPurchaseTax(v.mid, 'single');
          if (!tax) return '';
          return `<div style="font-size:13.5px;font-weight:700;color:${NAVY}">מס רכישה משוער</div>
<div style="margin-top:4px;font-size:24px;font-weight:800;color:${TEAL}">${ils(tax.totalTax)} ₪</div>
<div style="margin-top:2px;font-size:13px;color:${MUTED}">לרוכש דירה יחידה, לפי אמצע טווח ההערכה (${ils(v.mid)} ₪). לרוכש דירה נוספת/משקיע, או במחיר עסקה בפועל — השתמש במחשבון החי בדוח באתר.</div>
<div style="margin-top:8px;font-size:11.5px;line-height:1.7;color:${MUTED}">חישוב לפי מדרגות מס הרכישה הרשמיות (מוקפאות 15.1.2026–15.1.2028), ללא הנחות אישיות (עולה חדש/נכה/משפחה מרובת ילדים/רכישה מקבלן). אינו ייעוץ מס — יש לאמת מול הסימולטור הרשמי של רשות המסים לפני החלטה.</div>`;
        })()
      : '';

  return section(
    '✦ תוספות דוח VIP',
    'מחשבונים אישיים',
    `${taxPreview}
<div style="margin-top:${taxPreview ? '14' : '4'}px;padding:14px;border:1px solid ${LINE};border-radius:8px;background:#fafafa">
  <div style="font-size:13.5px;font-weight:700;color:${NAVY}">בדוח באתר — מחשבונים אינטראקטיביים נוספים</div>
  <div style="margin-top:6px;font-size:12.5px;line-height:1.9;color:${MUTED}">
    תשואת שכירות לפי שכר דירה שתזין · מחשבון משכנתא (החזר חודשי, ריבית, LTV) ·
    תזרים מזומנים חודשי נטו · מס שבח לפי תאריכי קנייה/מכירה שלך.
  </div>
  <div style="margin-top:10px"><a href="${reportLink}" style="color:${TEAL};font-weight:700;text-decoration:none">פתיחת המחשבונים בדוח החי ←</a></div>
</div>`,
  );
}

/**
 * אילו עסקאות להציג בטבלה.
 *
 * ⚠️ חיתוך לפי קרבה בלבד ריק את הטבלה מכל עסקת השוואה באזור. נמצא בדוח אמיתי:
 * כל ארבעים השורות היו באותו רחוב, ובהן שתים-עשרה מכירות קרקע זעירות מ-1998–2018
 * במאות שקלים למ״ר — בעוד ששש-עשרה העסקאות שמהן חושב "מחיר למ״ר באזור", המספר
 * הגדול והמצוטט ביותר בדוח, לא הופיעו כלל. הדוח אפילו נקב בתאריך של עסקה
 * באזור שלא הייתה בטבלה. לקוח שמשלם אינו יכול לבדוק את המספר שעליו נשען הדוח.
 *
 * לכן הבחירה מובטחת: קודם כל עסקאות הבניין, אחר כך מכירות דירות ברחוב, אחר כך
 * מכירות דירות בסביבה — ורק מה שנשאר מתמלא לפי קרבה. כך תמיד יש בטבלה גם
 * שורות מכל שכבת השוואה שהדוח מצטט.
 */
export function selectDealsToShow(
  deals: PropertyReport['soldDeals'],
  limit: number,
  /** מזהי העסקאות שמהן חושבו החציונים — אלה חייבות להופיע. */
  comparableKeys: string[] = [],
) {
  const picked: PropertyReport['soldDeals'] = [];
  const taken = new Set<number>();
  const mustShow = new Set(comparableKeys);
  const take = (predicate: (d: PropertyReport['soldDeals'][number]) => boolean, max: number) => {
    let n = 0;
    for (let i = 0; i < deals.length && n < max && picked.length < limit; i++) {
      if (taken.has(i) || !predicate(deals[i])) continue;
      taken.add(i);
      picked.push(deals[i]);
      n++;
    }
  };

  const isBuilding = (d: PropertyReport['soldDeals'][number]) => d.proximityRank === 0;
  const isStreet = (d: PropertyReport['soldDeals'][number]) => d.proximityRank > 0 && d.proximityRank < 1000;
  const isArea = (d: PropertyReport['soldDeals'][number]) => d.proximityRank >= 1000;

  // קודם כל: כל עסקה שנכנסה לחציון מוצג. אחרת הדוח מציג מספר שאין לו כיסוי
  // בטבלה, וזה בדיוק מה שקרה עם "מחיר למ״ר ברחוב".
  take((d) => mustShow.has(dealIdentity(d.date, d.price, d.areaSqm)), limit);
  take(isBuilding, limit);
  take((d) => isStreet(d) && d.isHomeSale, Math.max(4, Math.floor(limit * 0.3)));
  take((d) => isArea(d) && d.isHomeSale, Math.max(6, Math.floor(limit * 0.35)));
  take(() => true, limit); // מה שנשאר, לפי הסדר המקורי (קרבה)

  // ⚠️ הסדר הסופי הוא **כרונולוגי, מהחדש לישן** — ולא לפי קרבה.
  // במייל ובקובץ אין כפתור "הצג שנים קודמות", ולכן הסדר הוא כל ההגנה מפני
  // הטעות שהובילה לשינוי הזה: שורה עליונה עם מחיר בן שנים, שנקראת כשווי היום.
  return picked.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export interface ReportEmailOptions {
  /** כתובת בסיס מלאה, למשל https://more30.com/nadlan — נדרשת לתמונות ולקישורים. */
  baseUrl: string;
  /** נסחי טאבו מנותחים ששויכו לנכס. */
  tabuDocs?: TabuDocRow[];
  /** תיקי מידע להיתר שהונפקו ושויכו לנכס. */
  tikMeidaDocs?: TikMeidaDocRow[];
  /** מה שהלקוח כתב בטופס. */
  customerName?: string | null;
  /** קישור לקליפ "סיור רחוב" שמור לנכס הזה, אם כבר יוצר ע"י צופה קודם. */
  streetVideoUrl?: string | null;
}

/** מבנה הדוח כ-HTML למייל. */
export function reportEmailHtml(report: PropertyReport, opts: ReportEmailOptions): string {
  const t = report.title;
  const tier = report.tier;
  const visible = (f: Fact) => tierAllows(tier, f.tier);

  const imgs: string[] = [];
  if (report.location.lat != null && report.location.lng != null) {
    const q = `lat=${report.location.lat}&lng=${report.location.lng}`;
    if (report.streetView?.available) {
      imgs.push(
        `<img src="${opts.baseUrl}/api/image?kind=street&${q}" width="560" alt="צילום הבניין" style="display:block;width:100%;max-width:560px;border-radius:8px;border:1px solid ${LINE}">`,
      );
    }
    imgs.push(
      `<img src="${opts.baseUrl}/api/image?kind=satellite&${q}" width="560" alt="תצלום אוויר" style="display:block;width:100%;max-width:560px;border-radius:8px;border:1px solid ${LINE};margin-top:8px">`,
    );
    imgs.push(
      `<div style="max-width:560px;margin-top:4px;font-size:11px;color:${MUTED}">מקור תצלום האוויר: Google Maps — גוגל אינו חושף תאריך צילום דרך שירות זה.</div>`,
    );
  }

  const categories = report.categories
    .map((c) => {
      const rows = c.facts.filter(visible).map(factRow).join('');
      const notes = c.notes?.length ? bullets('הרשימה המלאה', c.notes) : '';
      if (!rows && !notes) return '';
      return section(c.title, c.subtitle, (rows ? table(rows) : '') + notes);
    })
    .join('');

  const shownDeals = tier === 'basic' ? 8 : 40;
  const soldRows = selectDealsToShow(report.soldDeals, shownDeals, report.comparableKeys)
    .map(
      (d) => `<tr>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(heDate(d.date))}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${esc(
    d.streetName ? `${d.streetName}${d.houseNum != null ? ' ' + d.houseNum : ''}` : d.address ?? '—',
  )}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:12px;direction:ltr;text-align:right">${esc(d.parcelLabel ?? '—')}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px;font-weight:700">${d.price ? d.price.toLocaleString('he-IL') + ' ₪' : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${d.areaSqm ?? '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:13px">${d.pricePerSqm ? d.pricePerSqm.toLocaleString('he-IL') : '—'}</td>
  <td style="padding:7px 10px;border-bottom:1px solid ${LINE};font-size:12px;color:${MUTED}">${esc(d.proximityLabel)}${d.suspect ? ` — ${esc(d.suspectReason ?? '')}` : ''}</td>
</tr>`,
    )
    .join('');

  const soldTable = soldRows
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;margin-top:10px;border-collapse:collapse;border:1px solid ${LINE}">
  <tr style="background:#f8fafc">
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">תאריך</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">כתובת</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">גוש/חלקה/תת-חלקה</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מחיר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">מ״ר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">₪ למ״ר</th>
    <th style="padding:8px 10px;text-align:right;font-size:12px;color:${MUTED}">קרבה</th>
  </tr>
  ${soldRows}
</table>`
    : '';

  const population = report.background.population;
  const populationBlock = population
    ? `<div style="margin-top:10px;padding:12px;border:1px solid ${LINE};border-radius:8px">
  <div style="font-size:14px;font-weight:800;color:${NAVY}">מי גר באזור <span style="font-weight:600;font-size:11px;color:${MUTED}">(הערכה)</span></div>
  <div style="margin-top:4px;font-size:14px;font-weight:700;color:${INK}">${esc(population.headline)}</div>
  <div style="margin-top:6px;font-size:13px;line-height:1.9;color:${INK}">
    ${population.breakdown.map((b) => `${esc(b.label)}: <b>${b.pct}%</b>`).join(' · ')}
  </div>
  <div style="margin-top:6px;font-size:11px;line-height:1.7;color:${MUTED}">${esc(population.basis)}</div>
</div>`
    : '';

  const backgroundBlock = section(
    'רקע השכונה',
    null,
    // ⚠️ שורה חסרה נמחקת בשקט ונקראת כמו שורה שלא נבדקה. גרסת הטקסט כבר כותבת
    // "לא זמין" עם סיבה, וה-HTML השאיר שני בלוקים ריקים — כלומר שני הערוצים
    // הציגו תוכן שונה לאותו דוח.
    `${
      report.background.neighborhoodDisplay
        ? `<div style="margin-top:8px;font-size:14px;color:${INK}">הנכס נמצא בשכונת <b>${esc(report.background.neighborhoodDisplay)}</b>${t.city ? ` ב${esc(t.city)}` : ''}.</div>`
        : `<div style="margin-top:8px;font-size:14px;color:${MUTED}">שם שכונה: לא זמין — לא נמצא שם שכונה רשמי לנקודה הזו. זה שכיח ביישובים קטנים.</div>`
    }
    ${
      report.buildingAge
        ? ''
        : `<div style="margin-top:8px;font-size:14px;color:${MUTED}">גיל הבניין: לא זמין — לא נרשמו עסקאות בבניין הזה, ואין מאגר ציבורי ארצי של היתרי בנייה.</div>`
    }
    ${
      report.background.buildingCharacter
        ? `<div style="margin-top:8px;font-size:14px;color:${INK}"><b>אופי הבנייה באזור:</b> ${esc(report.background.buildingCharacter.headline)}<div style="margin-top:4px;font-size:13px;color:${MUTED}">${report.background.buildingCharacter.breakdown.map((b) => `${esc(b.label)} ${b.pct}%`).join(' · ')} — נגזר מ-${report.background.buildingCharacter.sampleSize} עסקאות מגורים באזור (מקורב).</div></div>`
        : ''
    }
    ${
      report.buildingAge
        ? `<div style="margin-top:8px;font-size:14px;color:${INK}"><b>גיל הבניין:</b> ${esc(report.buildingAge.headline)}<div style="margin-top:4px;font-size:12px;line-height:1.7;color:${MUTED}">${esc(report.buildingAge.basis)}</div></div>`
        : ''
    }
    ${populationBlock}`,
  );

  const warnings = report.warnings.length
    ? `<div style="margin-top:18px;padding:12px 14px;border:1px solid #e6d5a8;background:#fdf8ec;border-radius:8px">
  <div style="font-size:13px;font-weight:800;color:#7a5f1f">מה חשוב לדעת על הדוח הזה</div>
  <ul style="margin:6px 0 0;padding-inline-start:18px;font-size:13px;line-height:1.8;color:#7a5f1f">
    ${report.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}
  </ul>
</div>`
    : '';

  const filled = report.categories.reduce(
    (s, c) => s + c.facts.filter((f) => visible(f) && f.value !== null).length,
    0,
  );
  const total = report.categories.reduce((s, c) => s + c.facts.filter(visible).length, 0);

  return `<div dir="rtl" lang="he" style="margin:0;padding:0;background:#f4f5f7">
<div style="max-width:620px;margin:0 auto;padding:22px 16px;font-family:Arial,'Segoe UI',Helvetica,sans-serif;color:${INK}">

  <div style="padding:20px;border-radius:10px;background:${NAVY};color:#fff">
    <div style="font-size:11px;letter-spacing:.12em;color:#c8a24a;font-weight:700">נדל״ן ברגע · דוח ${esc(TIER_LABEL[tier])}</div>
    <div style="margin-top:8px;font-size:22px;font-weight:800;line-height:1.35">${esc(t.headline)}</div>
    ${
      t.streetAliases.length
        ? `<div style="margin-top:6px;font-size:12px;color:#dbe6f0">הרחוב מוכר גם בשמות: ${esc(t.streetAliases.join(' · '))}</div>`
        : ''
    }
    <div style="margin-top:8px;font-size:12px;color:#dbe6f0">${esc(report.propertyKind.reason)}</div>
    ${
      opts.customerName
        ? `<div style="margin-top:10px;font-size:13px;color:#fff">שלום ${esc(opts.customerName)}, הדוח שביקשת מוכן.</div>`
        : ''
    }
  </div>

  ${warnings}
  ${imgs.length ? `<div style="margin-top:18px">${imgs.join('')}</div>` : ''}
  ${backgroundBlock}
  ${valuationBlock(report)}
  ${streetBlock(report)}
  ${streetVideoBlock(opts.streetVideoUrl)}
  ${listingsBlock(report)}
  ${nearbyPlansBlock(report.nearbyPlans)}
  ${feasibilityBlock(report.feasibility)}
  ${categories}
  ${
    soldTable
      ? section(
          'טבלת העסקאות',
          // ⚠️ חיתוך ללא הצהרה נקרא כמו "אלה כל העסקאות". נמצא בדוח אמיתי:
          // הוצגו 40 שורות בדוח שהכריז 1,020 עסקאות בסביבה, בלי מילה על כך.
          `מהעסקה החדשה לישנה. כל שורה נושאת כתובת מלאה וגוש/חלקה/תת-חלקה, כדי שאפשר יהיה להשוות אותה שורה מול שורה מול אתר הנדל"ן הממשלתי. שורות שאינן מכירת דירה מסומנות עם הסבר.` +
            (report.soldDeals.length > shownDeals
              ? ` מוצגות ${shownDeals} עסקאות מתוך ${report.soldDeals.length.toLocaleString('he-IL')} — הבחירה מבטיחה שורות מכל שכבת השוואה שהדוח מצטט (הבניין, הרחוב, הסביבה), והסדר בטבלה כרונולוגי.`
              : ''),
          soldTable,
        )
      : ''
  }
  ${priceTrendBlock(report)}
  ${tabuBlock(opts.tabuDocs ?? [])}
  ${tikMeidaBlock(opts.tikMeidaDocs ?? [])}
  ${vipEstimatesBlock(report, opts.baseUrl)}

  <div style="margin-top:26px;padding:14px;border:1px solid ${LINE};border-radius:8px;background:#fff;font-size:12px;line-height:1.8;color:${MUTED}">
    הדוח כולל ${filled} נתונים מתוך ${total} שנבדקו. הופק ב-${new Date(report.generatedAt).toLocaleString('he-IL')}.
    כל נתון מוצג עם רמת הוודאות שלו: <b style="color:${TEAL}">אמת</b> — נתון רשמי על הנכס הזה;
    <b style="color:#8a6d24">מקורב</b> — נתון אמיתי על הסביבה ולא בהכרח על הנכס;
    <b>הערכה</b> — חישוב שלנו. הדוח אינו תחליף לנסח טאבו, לשמאות או לייעוץ משפטי.
    <div style="margin-top:8px">
      <a href="${opts.baseUrl}/report?q=${encodeURIComponent(report.query)}&tier=${tier}" style="color:${TEAL};font-weight:700;text-decoration:none">לצפייה בדוח באתר ←</a>
    </div>
  </div>
</div>
</div>`;
}

const TABU_SCOPE_LABEL_TEXT: Record<string, string> = {
  apartment: 'נסח של הדירה',
  entrance: 'נסח של הכניסה',
  building: 'נסח מרוכז של הבניין',
};

/**
 * גרסת-טקסט של `tabuBlock` — אותם שדות בדיוק, בלי HTML. עד שנוספה הפונקציה
 * הזו, נסח טאבו מנותח (§TABU workflow, core.projects #33) הגיע רק לגרסת
 * ה-HTML של המייל: `reportEmailText` נקראה עם `report` בלבד ב-
 * `app/api/admin/requests/route.ts`, אף על פי שה-route כבר שולף
 * `tabuDocs`/`tikMeidaDocs` ומעביר אותם ל-`reportEmailHtml`. לקוח שקורא רק
 * את חלק-הטקסט של המייל (חלק מכל מייל multipart, וזה שמוצג בתוכנות מייל
 * שאינן מרנדרות HTML) לא ראה את הניתוח המשפטי שהוא שילם עבורו כלל.
 */
function tabuBlockText(docs: TabuDocRow[]): string {
  const done = docs.filter((d) => d.analysis);
  if (!done.length) return '';

  const lines: string[] = ['== טאבו — מתוך הנסח שהופק =='];
  lines.push('הנתונים הבאים חולצו מנסח טאבו רשמי שצורף לדוח הזה, ומשויכים לנכס לפי היקף הנסח.');
  for (const d of done) {
    const a = d.analysis as TabuAnalysis;
    const scope =
      TABU_SCOPE_LABEL_TEXT[d.scope] +
      (d.tat_helka ? `, תת-חלקה ${d.tat_helka}` : '') +
      (d.entrance ? `, כניסה ${d.entrance}` : '') +
      (d.apartment ? `, דירה ${d.apartment}` : '');
    lines.push(`  ${scope}`);
    if (d.extractDate) lines.push(`    תאריך הנסח: ${d.extractDate}`);
    if (a.owners?.length) {
      lines.push(`    בעלות: ${a.owners.map((o) => o.name + (o.share ? ` (${o.share})` : '')).join(' · ')}`);
    }
    if (a.mortgages?.length) {
      lines.push(`    משכנתאות ושעבודים: ${a.mortgages.map((m) => m.holder + (m.amount ? ` — ${m.amount}` : '')).join(' · ')}`);
    } else if (!a.cautionNotes?.length) {
      lines.push('    משכנתאות והערות אזהרה: לא נמצאו בנסח הזה.');
    }
    if (a.cautionNotes?.length) {
      lines.push(`    הערות אזהרה: ${a.cautionNotes.map((c) => c.kind + (c.inFavourOf ? ` לטובת ${c.inFavourOf}` : '')).join(' · ')}`);
    }
    if (a.leases?.length) {
      lines.push(`    חכירות: ${a.leases.map((l) => l.holder).join(' · ')}`);
    }
    if (a.otherEncumbrances?.length) {
      lines.push(`    הגבלות נוספות: ${a.otherEncumbrances.join(' · ')}`);
    }
    if (a.perFloorRights?.length) {
      lines.push(
        `    פירוט לפי קומה/תת-חלקה: ${a.perFloorRights
          .map((f) => (f.floor ? `קומה ${f.floor} — ` : '') + f.summary)
          .join(' · ')}`,
      );
    }
    const areaParts: string[] = [];
    if (a.parcelArea) areaParts.push(`שטח החלקה ${a.parcelArea}`);
    if (a.subParcelArea) areaParts.push(`שטח תת-החלקה ${a.subParcelArea}`);
    if (a.sharedAreas) areaParts.push(`שטחים משותפים ${a.sharedAreas}`);
    if (areaParts.length) lines.push(`    שטח רשום בנסח: ${areaParts.join(' · ')}`);
    if (a.unreadable?.length) {
      lines.push(`    לא ניתן לקרוא מהנסח: ${a.unreadable.join(' · ')} — נדרשת קריאה ידנית.`);
    }
    if (a.summary) lines.push(`    ${a.summary}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** גרסת-טקסט של `tikMeidaBlock` — ראו ההערה מעל `tabuBlockText` לרקע המלא. */
function tikMeidaBlockText(docs: TikMeidaDocRow[]): string {
  if (!docs.length) return '';
  const lines: string[] = ['== תיק מידע להיתר =='];
  lines.push('המסמך הרשמי שהתקבל מהוועדה המקומית לתכנון ולבנייה, לפי בקשתך.');
  for (const d of docs) {
    const when = new Date(d.uploaded_at).toLocaleDateString('he-IL');
    lines.push(`  ${d.file_name} — התקבל מהוועדה המקומית · ${when}`);
    if (d.note) lines.push(`    ${d.note}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * גרסת טקסט — לתוכנות מייל שאינן מציגות HTML, ולסינון ספאם.
 *
 * ⚠️ הגרסה הזו הייתה חסרה שני דברים שקיימים ב-HTML, וזה הפך אותה למטעה ולא
 * רק לדלה: (א) הערת המקור של כל שדה — כך ש"שטח הדירה: 213 מ״ר" הופיע בלי
 * המשפט שאומר שהוא נלקח מדירה אחרת בסביבה; (ב) טבלת העסקאות כולה, בדוח
 * שהכריז "עסקאות בסביבה: 24". סבב 03/09/2026 הוסיף דבר שלישי מאותה מחלקה:
 * נסח טאבו/תיק מידע מנותחים (`tabuDocs`/`tikMeidaDocs`) — ראו `tabuBlockText`.
 */
export function reportEmailText(
  report: PropertyReport,
  docs?: { tabuDocs?: TabuDocRow[]; tikMeidaDocs?: TikMeidaDocRow[]; streetVideoUrl?: string | null },
): string {
  const lines: string[] = [];
  const shownDeals = report.tier === 'basic' ? 8 : 40;
  lines.push(`נדל״ן ברגע — דוח ${TIER_LABEL[report.tier]}`);
  lines.push(report.title.headline);
  if (report.title.streetAliases.length) {
    lines.push(`הרחוב מוכר גם בשמות: ${report.title.streetAliases.join(' · ')}`);
  }
  lines.push(report.propertyKind.reason);
  lines.push('');

  // ⚠️ מקטע הרקע היה קיים ב-HTML בלבד. מי שקורא את גרסת הטקסט — כולל קורא מסך —
  // לא ראה כלל את שם השכונה, את אופי הבנייה ואת "מי גר באזור", שהוא אחד
  // הממצאים המרכזיים בדוח.
  lines.push('== רקע השכונה ==');
  // ⚠️ גם כאן כותבים "לא זמין" ולא משמיטים בשקט, בדיוק כמו בטבלת השדות. שורה
  // שנעלמת נקראת כמו שורה שלא נבדקה.
  lines.push(
    report.background.neighborhoodDisplay
      ? `שכונה: ${report.background.neighborhoodDisplay}`
      : 'שכונה: לא זמין — לא נמצא שם שכונה רשמי לנקודה הזו. זה שכיח ביישובים קטנים.',
  );
  if (!report.buildingAge) {
    lines.push(
      'גיל הבניין: לא זמין — לא נרשמו עסקאות בבניין הזה, ואין מאגר ציבורי ארצי של היתרי בנייה.',
    );
  }
  if (report.background.buildingCharacter) {
    const bc = report.background.buildingCharacter;
    lines.push(`אופי הבנייה באזור: ${bc.headline}  [מקורב]`);
    lines.push(`    ${bc.breakdown.map((b) => `${b.label} ${b.pct}%`).join(' · ')} — נגזר מ-${bc.sampleSize} עסקאות מגורים באזור.`);
  }
  if (report.buildingAge) {
    lines.push(`גיל הבניין: ${report.buildingAge.headline}  [הערכה]`);
    lines.push(`    ${report.buildingAge.basis}`);
  }
  if (report.background.population) {
    const p = report.background.population;
    lines.push(`מי גר באזור: ${p.headline}  [הערכה]`);
    lines.push(`    ${p.breakdown.map((b) => `${b.label} ${b.pct}%`).join(' · ')}`);
    lines.push(`    ${p.basis}`);
  }
  if (report.background.junction) {
    lines.push(
      `הצומת הראשית הקרובה: ${report.background.junction.name}, כ-${report.background.junction.meters} מ' מכאן.`,
    );
  }
  lines.push('');

  // ⚠️ אותה שכבת "הרחוב" ש-HTML/המסך כבר מציגים (§7) — ראו `streetBlock`.
  const streetStats = computeStreetStats(report);
  if (streetStats) {
    lines.push('== הרחוב ==');
    if (streetStats.aliases.length) {
      lines.push(`מוכר גם בשם: ${streetStats.aliases.join(' · ')}`);
    }
    if (streetStats.onStreet.length === 0) {
      lines.push(
        'לא נרשמה אף עסקה שנושאת את שם הרחוב הזה בתקופה שנבדקה. זה קורה ברחובות קצרים, ברחובות חדשים, וכשהמרשם רושם את העסקאות תחת כינוי אחר של הרחוב.',
      );
    } else {
      lines.push(
        `עסקאות שנרשמו ברחוב: ${streetStats.onStreet.length} (מתוכן ${streetStats.homeSales} מכירות דירות${
          streetStats.suspect ? ` · ${streetStats.suspect} רשומות חריגות לא נספרו במחירים` : ''
        })`,
      );
      lines.push(
        `מחיר למ"ר חציוני ברחוב: ${
          streetStats.perSqm ? `${streetStats.perSqm.median.toLocaleString('he-IL')} ₪` : 'לא זמין'
        }`,
      );
      lines.push(
        `טווח התאריכים: ${
          streetStats.span ? `${heDate(streetStats.span.from)} – ${heDate(streetStats.span.to)}` : 'לא זמין'
        }`,
      );
      if (
        streetStats.subjectNum != null &&
        !streetStats.rows.some((r) => r.isSubject)
      ) {
        lines.push(
          `במספר ${streetStats.subjectNum} עצמו לא נרשמה אף עסקה. המספרים שלהלן הם השכנים הקרובים ביותר שכן נמכר בהם.`,
        );
      }
      for (const r of streetStats.rows.slice(0, 8)) {
        lines.push(
          `    מספר ${r.houseNum}${r.isSubject ? ' (הנכס שלכם)' : ''}: ${r.deals} עסקאות, ${r.homeSales} מכירות דירות, ${
            r.medianPerSqm ? `${r.medianPerSqm.toLocaleString('he-IL')} ₪ למ"ר` : '— ₪ למ"ר'
          }, עסקה אחרונה ${r.lastDate ? heDate(r.lastDate) : '—'}`,
        );
      }
    }
    lines.push('');
  }

  // ⚠️ אותו סעיף "סיור רחוב" ש-HTML כבר מציג — ראו `streetVideoBlock`.
  if (docs?.streetVideoUrl) {
    lines.push('== סיור רחוב ==');
    lines.push(`קליפ שצולם בעבר לדוח הזה באתר: ${docs.streetVideoUrl}`);
    lines.push('');
  }

  // ⚠️ אותו סעיף "מה נבנה באזור?" ש-HTML/המסך כבר מציגים (§12) — ראו `nearbyPlansBlock`.
  if (report.nearbyPlans && report.nearbyPlans.length) {
    lines.push('== מה נבנה באזור? ==');
    for (const p of report.nearbyPlans.slice(0, 8)) {
      lines.push(
        `    ${p.planNumber ?? 'ללא מספר'} | ${p.planName ?? '—'} | ${p.status ?? '—'} | ${
          Number.isFinite(p.distanceM) ? `${Math.round(p.distanceM)} מ'` : '—'
        }`,
      );
    }
    if (report.nearbyPlans.length > 8) {
      lines.push(`    מוצגות 8 מתוך ${report.nearbyPlans.length} תוכניות שנמצאו.`);
    }
    lines.push('');
  }

  // ⚠️ אותו סעיף "היתכנות להיתר נוסף" ש-HTML/המסך כבר מציגים (§7) — ראו `feasibilityBlock`.
  const feas = report.feasibility;
  if (feas) {
    lines.push('== היתכנות להיתר נוסף ==');
    lines.push(feas.headline);
    if (feas.additivePlans.length) {
      lines.push('  תוכניות מאושרות שמכוחן אפשר לבקש תוספת:');
      for (const p of feas.additivePlans) {
        lines.push(`    ${p.planNumber ?? 'תכנית ללא מספר'}${p.planName ? ` · ${p.planName}` : ''} — ${p.why}`);
      }
    }
    if (feas.pendingPlans.length) {
      lines.push('  תוכניות בהליך שעשויות לפתוח תוספת (טרם אושרו):');
      for (const p of feas.pendingPlans) {
        lines.push(`    ${p.planNumber ?? 'ללא מספר'}${p.planName ? ` · ${p.planName}` : ''} — ${p.why}`);
      }
    }
    const feasLines = [...feas.buildingLines, ...feas.restrictions];
    if (feasLines.length) {
      lines.push('  קווי בניין ומגבלות על החלקה:');
      for (const e of feasLines) {
        lines.push(`    ${e.name}${e.planNumber ? ` · מתכנית ${e.planNumber}` : ''}${e.status ? ` · ${e.status}` : ''}`);
      }
    } else {
      lines.push('  לא אותרו קווי בניין מצוירים על החלקה בשירות המפות.');
    }
    if (feas.unknowns.length) {
      lines.push('  מה אי אפשר לדעת מכאן:');
      for (const u of feas.unknowns) lines.push(`    ${u}`);
      lines.push(`  ${feas.whereToCheck}`);
    }
    lines.push('');
  }

  // ⚠️ אותו סעיף "הערכת שווי" ש-HTML/המסך כבר מציגים (§2) — ראו `valuationBlock`.
  const v = report.valuation;
  if (v) {
    lines.push('== הערכת שווי ==');
    if (!hasValuation(v)) {
      lines.push(v.notEnoughData);
      if (v.regional) {
        lines.push(
          `מחיר למ"ר באזור, עדכני: ${v.regional.medianPerSqm.toLocaleString('he-IL')} ₪ למ"ר — חציון של ${v.regional.count} עסקאות בסביבה הקרובה, ${v.regional.windowLabel}${
            v.regional.latestDate ? `. העדכנית שבהן מ-${heDate(v.regional.latestDate)}` : ''
          }.`,
        );
      }
    } else {
      lines.push(`${v.basis.label} · ${v.basis.count} עסקאות · ${v.basis.windowLabel}`);
      lines.push(
        `טווח שווי מוערך: ${v.low.toLocaleString('he-IL')} – ${v.high.toLocaleString('he-IL')} ₪  (אמצע: ${v.mid.toLocaleString('he-IL')} ₪)`,
      );
      lines.push(
        `מחיר למ"ר בהשוואה: ${v.medianPerSqm.toLocaleString('he-IL')} ₪ · שטח שעליו חושב: ${v.areaSqm} מ"ר (${v.areaSource})`,
      );
      lines.push(v.explanation);
      if (v.wideSpread) lines.push(v.wideSpread);
      for (const c of v.comparables.slice(0, 12)) {
        lines.push(
          `    ${heDate(c.date)} | ${c.address ?? '—'} | ${c.parcelLabel ?? '—'} | ${c.price ? c.price.toLocaleString('he-IL') + ' ₪' : '—'} | ${c.areaSqm ?? '—'} מ"ר | ${c.pricePerSqm ? c.pricePerSqm.toLocaleString('he-IL') + ' ₪ למ"ר' : '—'} | ${c.proximityLabel}`,
        );
      }
    }
    lines.push('');
  }

  // ⚠️ אותו סעיף "דירות מוצעות כרגע" ש-HTML/המסך כבר מציגים (§4) — ראו `listingsBlock`.
  if (report.listingsStatus?.configured && report.listings.length) {
    const noun = LISTINGS_NOUN[report.assetType] ?? LISTINGS_NOUN.residential;
    lines.push(`== ${noun} ==`);
    lines.push(`${report.listings.length} ${noun} כרגע באזור. אלה מחירי בקשה, לא מחירים שנסגרו בפועל.`);
    for (const l of report.listings.slice(0, 12)) {
      lines.push(
        [
          l.address ?? 'כתובת לא צוינה',
          l.price ? `${l.price.toLocaleString('he-IL')} ₪` : '—',
          l.pricePerSqm ? `${l.pricePerSqm.toLocaleString('he-IL')} ₪ למ"ר` : '—',
          [l.rooms ? `${l.rooms} חד'` : null, l.areaSqm ? `${l.areaSqm} מ"ר` : null].filter(Boolean).join(' · ') || '—',
          l.daysListed != null ? (l.daysListed === 0 ? 'עלה היום' : `${l.daysListed} ימים באוויר`) : '—',
          l.source === 'yad2' ? 'יד2' : 'מדלן',
        ].join(' | '),
      );
    }
    if (report.listings.length > 12) {
      lines.push(`    מוצגות 12 מתוך ${report.listings.length} מודעות שנמצאו.`);
    }
    lines.push('');
  }

  for (const c of report.categories) {
    const facts = c.facts.filter((f) => tierAllows(report.tier, f.tier));
    if (!facts.length) continue;
    lines.push(`== ${c.title} ==`);
    for (const f of facts) {
      const v = f.value !== null ? formatFactValue(f) : `לא זמין — ${f.missingReason ?? ''}`;
      lines.push(`${f.label}: ${v}  [${CERTAINTY_LABEL[f.certainty]}]`);
      if (f.value !== null && f.sourceNote) lines.push(`    ${f.sourceNote}`);
    }
    if (c.notes?.length) lines.push(...c.notes.map((n) => `  - ${n}`));
    lines.push('');
  }

  if (report.soldDeals.length) {
    lines.push(
      `== טבלת העסקאות (מהחדשה לישנה) ==` +
        (report.soldDeals.length > shownDeals
          ? ` — מוצגות ${shownDeals} מתוך ${report.soldDeals.length.toLocaleString('he-IL')}`
          : ''),
    );
    for (const d of selectDealsToShow(report.soldDeals, shownDeals, report.comparableKeys)) {
      lines.push(
        [
          heDate(d.date),
          d.streetName ? `${d.streetName}${d.houseNum != null ? ' ' + d.houseNum : ''}` : d.address ?? '—',
          d.parcelLabel ?? '—',
          d.price ? `${d.price.toLocaleString('he-IL')} ₪` : '—',
          d.areaSqm ? `${d.areaSqm} מ"ר` : '—',
          d.pricePerSqm ? `${d.pricePerSqm.toLocaleString('he-IL')} ₪ למ"ר` : '—',
          d.proximityLabel,
        ].join(' | ') + (d.suspect ? `  << ${d.suspectReason ?? ''}` : ''),
      );
    }
    lines.push('');
  }

  // ⚠️ אותו סעיף "מגמת מחירי הדירות בישראל" ש-HTML/המסך כבר מציגים (מיד אחרי
  // טבלת העסקאות, tier !== 'basic') — ראו `priceTrendBlock`.
  if (report.tier !== 'basic' && report.priceTrend && report.priceTrend.length >= 3) {
    const points = report.priceTrend;
    const first = points[0].value;
    const last = points[points.length - 1].value;
    const changePct = first ? Math.round(((last - first) / first) * 1000) / 10 : null;
    lines.push('== מגמת מחירי הדירות בישראל ==');
    lines.push('המדד הארצי של הלשכה המרכזית לסטטיסטיקה — מתאר את מגמת השוק בכללותו, לא את הנכס הזה.');
    if (changePct != null) {
      lines.push(`שינוי בתקופה המוצגת: ${changePct > 0 ? '+' : ''}${changePct}%`);
    }
    for (const p of points.slice(-8)) {
      lines.push(`    ${p.period}: ${p.value.toLocaleString('he-IL')}`);
    }
    lines.push('');
  }

  // ⚠️ אותם שני סעיפים ש-HTML כבר מציג (`tabuBlock`/`tikMeidaBlock`) — ראו
  // ההערה מעל `tabuBlockText`/`tikMeidaBlockText` לרקע המלא על הפער שנסגר כאן.
  const tabuText = tabuBlockText(docs?.tabuDocs ?? []);
  if (tabuText) lines.push(tabuText);
  const tikMeidaText = tikMeidaBlockText(docs?.tikMeidaDocs ?? []);
  if (tikMeidaText) lines.push(tikMeidaText);

  // ⚠️ אותו סעיף "תוספות דוח VIP" ש-HTML כבר מציג — ראו `vipEstimatesBlock`.
  if (report.tier === 'vip') {
    const v = report.valuation;
    const tax = v && hasValuation(v) ? calcPurchaseTax(v.mid, 'single') : null;
    lines.push('== תוספות דוח VIP ==');
    if (tax) {
      lines.push(
        `מס רכישה משוער לרוכש דירה יחידה, לפי אמצע טווח ההערכה (${v!.mid.toLocaleString('he-IL')} ₪): ${tax.totalTax.toLocaleString('he-IL')} ₪.`,
      );
      lines.push('חישוב לפי מדרגות רשמיות, ללא הנחות אישיות — אינו ייעוץ מס.');
    }
    lines.push(
      'בדוח באתר זמינים גם מחשבונים אינטראקטיביים: תשואת שכירות, מחשבון משכנתא, תזרים מזומנים חודשי ומס שבח — לפי הנתונים שלך.',
    );
    lines.push('');
  }

  if (report.warnings.length) {
    lines.push('== מה חשוב לדעת ==');
    lines.push(...report.warnings.map((w) => `- ${w}`));
    lines.push('');
  }

  lines.push(
    'סימוני הוודאות: [אמת] נתון רשמי על הנכס · [מקורב] נתון אמיתי על הסביבה ' +
      'ולא בהכרח על הנכס · [הערכה] חישוב שלנו.',
  );
  lines.push(`הופק ב-${new Date(report.generatedAt).toLocaleString('he-IL')}.`);
  lines.push('הדוח אינו תחליף לנסח טאבו, לשמאות או לייעוץ משפטי.');
  return lines.join('\n');
}
