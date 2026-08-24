/**
 * ערוץ קליטה 3 — הקשה במרכזייה (ימות המשיח).
 *
 * המתקשר שומע "הקישו את מספר הנושא", מקיש מספר, והשלוחה מדווחת לכאן.
 * אנחנו רושמים אותו לתור התוכן שלנו ומחזירים הקראה בעברית.
 *
 * ── למה זה קיים בכלל
 * המפרט (BKALOT_AUTOMATION_BUILD.md §2) מבקש ארבעה ערוצי כניסה שכולם נופלים
 * לאותו מנוע. הפונקציה הזאת היא **מתאם פרוטוקול בלבד**: היא מתרגמת את
 * הפרמטרים של ימות לקריאת ה-RPC, ולא מחזיקה שום היגיון עסקי ושום החלטת
 * בטיחות משלה. שלושת השערים — הסכמה · יעד בדיקה מאושר · live חסום — יושבים
 * ב-`bkalot_auto.queue_enqueue_internal` במסד, ולכן אי אפשר לעקוף אותם על ידי
 * זיוף בקשה לכתובת הזאת. מי שיקרא לה ידנית יקבל בדיוק את אותן בדיקות.
 *
 * ── הסכמה בשיחת טלפון
 * `p_consent` כאן הוא `true` רק כשהמתקשר הקיש **1** על שאלת ההסכמה. חיוג
 * לשלוחה אינו הסכמה לקבל דיוור, ולכתוב `consent: true` רק מפני שהתקבלה שיחה
 * היה הופך את השער הראשון לחותמת גומי. בלי ההקשה — הפנייה נרשמת ביומן
 * ונדחית.
 *
 * ── מה עוד לא אומת (NEEDS_USER)
 * מחרוזת ה-`read=` היא תחביר תוכנית-החיוג של ימות, וגרסאות שונות של החשבון
 * מפרשות את השדות הממוקמים אחרי שם המשתנה אחרת. התחביר כאן הוא הצורה
 * המקובלת, אבל הוא **לא נבדק מול חשבון ימות אמיתי** — אין כאן אישורי חשבון.
 * לפני חיבור השלוחה יש להריץ שיחת בדיקה אחת ולוודא שהמערכת אכן מחזירה את
 * `topic` ואת `consent` בבקשה הבאה.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/﻿/g, '').trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').replace(/﻿/g, '').trim();

export const config = { maxDuration: 30 };

/** ימות שולחת GET עם query, ולפעמים POST עם גוף form-encoded. שתיהן מתקבלות. */
function params(req: any): Record<string, string> {
  const out: Record<string, string> = {};
  const url = new URL(req.url ?? '/', 'https://more30.com');
  url.searchParams.forEach((v, k) => (out[k] = v));
  const body = req.body;
  if (body && typeof body === 'object') {
    for (const [k, v] of Object.entries(body)) out[k] = String(v);
  } else if (typeof body === 'string') {
    new URLSearchParams(body).forEach((v, k) => (out[k] = v));
  }
  return out;
}

/**
 * ימות קוראת את התשובה כטקסט, וכל תו שאינו עברית/ספרות עלול להישבר בהקראה.
 * מנקים סוגריים, נקודתיים ותווי בקרה — לא מסננים תוכן, רק מגינים על הפרוטוקול.
 */
function say(text: string): string {
  return text.replace(/[=&,\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function intake(topicNo: number, phone: string, consent: boolean) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_auto_intake`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_app: 'bkalot',
      p_topic_no: topicNo,
      p_name: null,
      p_email: null,
      p_phone: phone,
      p_consent: consent,
      p_source: 'yemot',
    }),
  });
  if (!res.ok) return { ok: false, reason: `rpc_${res.status}` };
  return (await res.json()) as any;
}

export default async function handler(req: any, res: any) {
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.setHeader('cache-control', 'no-store');

  if (!SUPABASE_URL || !ANON_KEY) {
    // גם התקלה נאמרת בעברית — המתקשר על הקו, ושתיקה נשמעת כמו ניתוק.
    res.status(200).send('id_list_message=t-המערכת אינה זמינה כעת. נסו מאוחר יותר.&go_to_folder=hangup');
    return;
  }

  const p = params(req);
  const phone = String(p.ApiPhone ?? p.ApiCallerId ?? '').trim();

  // שלב א׳ — עוד לא הוקש נושא.
  if (!p.topic) {
    res
      .status(200)
      .send('read=t-שלום. להצטרפות לעדכוני זכויות, הקישו את מספר הנושא ולאחריו סולמית.=topic,,2,1,,,,,,,');
    return;
  }

  // שלב ב׳ — יש נושא, חסרה הסכמה מפורשת.
  if (!p.consent) {
    res
      .status(200)
      .send('read=t-לאישור קבלת עדכונים בנושא זה הקישו 1. לביטול הקישו 2.=consent,,1,1,,,,,,,');
    return;
  }

  const topicNo = Number(String(p.topic).replace(/\D/g, ''));
  const consent = String(p.consent).trim() === '1';

  if (!Number.isFinite(topicNo) || topicNo <= 0) {
    res.status(200).send('id_list_message=t-מספר הנושא אינו תקין.&go_to_folder=hangup');
    return;
  }

  let r: any;
  try {
    r = await intake(topicNo, phone, consent);
  } catch {
    // fetch עצמה נכשלה (רשת) או שהתשובה אינה JSON תקין — בלי לתפוס את זה כאן
    // הפונקציה הייתה קורסת בלי תשובה בכלל, והמתקשר שומע שקט/ניתוק במקום הודעה.
    res.status(200).send('id_list_message=t-המערכת אינה זמינה כעת. נסו מאוחר יותר.&go_to_folder=hangup');
    return;
  }

  // ההודעה למתקשר משקפת את מה שקרה באמת. "נרשמת" למי שנחסם היה שקר שהוא
  // ישמע פעם אחת ויאמין לו לתמיד.
  let msg: string;
  if (r?.ok === false && r?.reason === 'no_consent') msg = 'לא נרשמת. תודה ולהתראות.';
  else if (r?.reason === 'no_such_topic') msg = 'לא נמצא נושא במספר שהקשת.';
  else if (r?.reason === 'no_valid_contact') msg = 'לא זוהה מספר טלפון תקין.';
  else if (r?.queued === true) msg = 'נרשמת בהצלחה. העדכון יישלח אליך בקרוב.';
  else msg = 'הפנייה נרשמה ותיבדק. תודה.';

  res.status(200).send(`id_list_message=t-${say(msg)}&go_to_folder=hangup`);
}
