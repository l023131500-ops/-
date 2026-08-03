/* מאגר הזכויות המרכזי (more30 hub) — טעינה חיה במקום data.json הסטטי.
 *
 * למה: אותו קטלוג משרת גם את הסוכן של "מיצוי זכויות" וגם מערכות אחרות. כל עוד
 * הוא יושב רק בקובץ סטטי בתוך האתר הזה, כל עדכון סכום או תנאי זכאות מחייב
 * פריסה מחדש, והעותקים במערכות האחרות מתפצלים ממנו.
 *
 * הטעינה כאן היא **שכבת שיפור בלבד**: אם המאגר לא זמין מכל סיבה, `init()`
 * נופל חזרה ל-data.json ומתנהג בדיוק כמו קודם. אין כאן שינוי התנהגות למשתמש.
 *
 * המפתח הוא anon (קריאה בלבד) ל-view שחושף רק את הקטלוג — לא לטבלאות עצמן.
 */
(function () {
  const HUB_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
  const HUB_ANON = 'REPLACED_AT_BUILD';

  const H = { apikey: HUB_ANON, Authorization: 'Bearer ' + HUB_ANON };
  const TIMEOUT_MS = 12000;

  async function get(path) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(HUB_URL + '/rest/v1/' + path, { headers: H, signal: ctl.signal });
      if (!res.ok) throw new Error(path + ' ' + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }

  /* PostgREST מחזיר עד 1000 שורות בבקשה; הקטלוג גדול מזה בעתיד, לכן עימוד. */
  async function getAll(path, pageSize) {
    const out = [];
    for (let from = 0; ; from += pageSize) {
      const page = await get(path + '&limit=' + pageSize + '&offset=' + from);
      out.push.apply(out, page);
      if (page.length < pageSize) return out;
    }
  }

  /** בונה את אותו מבנה בדיוק ש-data.json מספק, כדי שהמנוע והתצוגה לא ישתנו. */
  async function load() {
    const [metaRows, sitRows, items] = await Promise.all([
      get('rights_meta_public?select=k,v'),
      get('rights_situation_map?select=situation,codes'),
      getAll('rights_catalog?select=code,no,src,name,cat,sub,prov,amt,prio,likelihood,why,' +
             'benefit,conditions,how,documents,tip,simple,audience,emp,links&order=no', 500),
    ]);

    const meta = {};
    metaRows.forEach(r => { meta[r.k] = r.v; });
    if (!items.length || !meta.questionnaire) throw new Error('empty repo');

    const catalog = {};
    items.forEach(it => {
      catalog[it.code] = {
        no: it.no, src: it.src, name: it.name, cat: it.cat, sub: it.sub, prov: it.prov,
        amt: it.amt, prio: it.prio,
        like: it.likelihood,          // המנוע והתצוגה מצפים ל-`like`
        why: it.why, benefit: it.benefit, conditions: it.conditions, how: it.how,
        documents: it.documents, tip: it.tip, simple: it.simple, audience: it.audience,
        emp: it.emp || [], domain: '', links: it.links || [],
      };
    });

    const situation_map = {};
    sitRows.forEach(r => { situation_map[r.situation] = r.codes; });

    return {
      meta: {
        form_name: (meta.form_name || 'בדיקה מקיפה על כל הזכויות וההטבות שניתן לקבל'),
        situations: meta.situations || {},
        situation_cat: meta.situation_cat || {},
        situation_order: meta.situation_order || [],
        priority_labels: meta.priority_labels || {},
        universal_topics: meta.universal_topics || [],
        version: meta.version || null,
        total: items.length,
        source: 'hub',
      },
      health_pool: meta.health_pool || [],
      catalog: catalog,
      situation_map: situation_map,
      questionnaire: meta.questionnaire || { sections: [] },
      rules: meta.rules || {},
    };
  }

  window.RightsRepo = { load: load };
})();
