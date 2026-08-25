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
import type { TabuAnalysis, TabuDocRow } from './requests';
import { computeStreetStats } from './streetstats';
import { hasValuation } from './valuation';

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
    if (!a.mortgages?.length && !a.cautionNotes?.length) {
      lines.push('<b>משכנתאות והערות אזהרה:</b> לא נמצאו בנסח הזה.');
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
  /** מה שהלקוח כתב בטופס. */
  customerName?: string | null;
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
  ${tabuBlock(opts.tabuDocs ?? [])}

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

/**
 * גרסת טקסט — לתוכנות מייל שאינן מציגות HTML, ולסינון ספאם.
 *
 * ⚠️ הגרסה הזו הייתה חסרה שני דברים שקיימים ב-HTML, וזה הפך אותה למטעה ולא
 * רק לדלה: (א) הערת המקור של כל שדה — כך ש"שטח הדירה: 213 מ״ר" הופיע בלי
 * המשפט שאומר שהוא נלקח מדירה אחרת בסביבה; (ב) טבלת העסקאות כולה, בדוח
 * שהכריז "עסקאות בסביבה: 24".
 */
export function reportEmailText(report: PropertyReport): string {
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
