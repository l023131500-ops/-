/* Recommendation engine v2 — "בדיקה מקיפה על כל הזכויות וההטבות שניתן לקבל"
   Consumes the 74-question questionnaire, 25 situation-triggers, tiered
   main/more/health topic map, and 26 recommendation rules.
   All condition strings come from data.json (rules.situation_triggers / rules.recommendation_rules). */

const THRESH = {
  MIN_WAGE: 6443.85,
  AVG_WAGE: 13623.0,
  WORK_GRANT_MAX_SALARY: 7522,
  GUARANTEED_INCOME_SINGLE: 2076,
  TAX_CREDIT_POINT: 242,
};

/* ---------- Safe condition evaluator ----------
   Supports: == != >= <= > < && || ! ( ), string literals ('...'),
   numbers, true/false, and answer identifiers. No function calls, no member
   access — tokenised and parsed into a tiny recursive-descent AST. */
function evalCondition(expr, ctx) {
  if (!expr || !String(expr).trim()) return false;
  try {
    const tokens = tokenize(String(expr));
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function parseOr() {
      let left = parseAnd();
      while (peek() && peek().v === '||') { next(); const r = parseAnd(); left = left || r; }
      return left;
    }
    function parseAnd() {
      let left = parseNot();
      while (peek() && peek().v === '&&') { next(); const r = parseNot(); left = left && r; }
      return left;
    }
    function parseNot() {
      if (peek() && peek().v === '!') { next(); return !parseNot(); }
      return parseComparison();
    }
    function parseComparison() {
      let left = parsePrimary();
      const t = peek();
      if (t && ['==', '!=', '>=', '<=', '>', '<'].includes(t.v)) {
        next();
        const right = parsePrimary();
        switch (t.v) {
          case '==': return looseEq(left, right);
          case '!=': return !looseEq(left, right);
          case '>=': return num(left) >= num(right);
          case '<=': return num(left) <= num(right);
          case '>': return num(left) > num(right);
          case '<': return num(left) < num(right);
        }
      }
      return truthy(left);
    }
    function parsePrimary() {
      const t = peek();
      if (!t) return undefined;
      if (t.v === '(') { next(); const val = parseOr(); if (peek() && peek().v === ')') next(); return val; }
      next();
      if (t.type === 'str') return t.v;
      if (t.type === 'num') return Number(t.v);
      if (t.v === 'true') return true;
      if (t.v === 'false') return false;
      // identifier -> answer value
      return ctx[t.v];
    }
    const result = parseOr();
    return truthy(result);
  } catch (e) {
    return false;
  }
}

function tokenize(s) {
  const tokens = [];
  const re = /\s*(&&|\|\||==|!=|>=|<=|>|<|!|\(|\)|'[^']*'|"[^"]*"|[0-9]+\.?[0-9]*|[A-Za-z_\u0590-\u05FF][A-Za-z0-9_\u0590-\u05FF]*)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[1] === undefined || m[1] === '') break;
    const v = m[1];
    if (v[0] === "'" || v[0] === '"') tokens.push({ type: 'str', v: v.slice(1, -1) });
    else if (/^[0-9]/.test(v)) tokens.push({ type: 'num', v });
    else tokens.push({ type: 'op_or_id', v });
    if (re.lastIndex <= m.index) re.lastIndex = m.index + 1;
  }
  return tokens;
}
function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function truthy(v) { if (v === '' || v === undefined || v === null) return false; return !!v; }
function looseEq(a, b) {
  if (a === undefined || a === null) a = '';
  if (b === undefined || b === null) b = '';
  if (typeof a === 'boolean' || typeof b === 'boolean') return !!a === !!b;
  if (!isNaN(parseFloat(a)) && !isNaN(parseFloat(b)) && a !== '' && b !== '') return parseFloat(a) === parseFloat(b);
  return String(a) === String(b);
}

/* ---------- Situations ---------- */
function deriveSituations(a, master) {
  const sits = new Set();
  const triggers = (master.rules && master.rules.situation_triggers) || [];
  for (const trig of triggers) {
    if (evalCondition(trig.if, a)) sits.add(trig.activate);
  }
  // Health situation activated by explicit flag
  if (a.want_health_check === true || a.has_health_flag === true) sits.add('health_check');
  // NOTE: intentionally NO fallback situation. If the user gave no details that
  // trigger a specific life-situation, we do NOT flood them with a full situation's
  // topics — they receive only the universal baseline topics + personalized rule notes.
  return sits;
}

/* ---------- Recommendation rules (personalized notes) ---------- */
function applyRules(a, master) {
  const out = [];
  const recRules = (master.rules && master.rules.recommendation_rules) || [];
  for (const r of recRules) {
    if (evalCondition(r.if, a)) {
      out.push({
        id: r.id,
        priority: r.priority || 'recommended',
        likelihood: r.likelihood || 'medium',
        topic: r.topic || '',
        text: interpolate(r.text || '', a),
        source: r.source || '',
      });
    }
  }
  return out;
}
function interpolate(tpl, a) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => {
    const v = a[k];
    if (v === undefined || v === null || v === '') return m;
    if (typeof v === 'number') return v.toLocaleString('he-IL');
    return String(v);
  });
}

/* ---------- Wage / income notes ---------- */
function wageTriggers(a) {
  const notes = [];
  const flags = new Set();
  const sm = parseFloat(a.salary_main || 0) || 0;
  const ss = parseFloat(a.salary_spouse || 0) || 0;
  const fmt = (n) => Math.round(n).toLocaleString('he-IL');

  if (sm > 0 && sm <= THRESH.WORK_GRANT_MAX_SALARY) {
    flags.add('work_grant');
    notes.push(`שכר הפונה (${fmt(sm)} ₪) נמוך מתקרת מענק העבודה (~${THRESH.WORK_GRANT_MAX_SALARY.toLocaleString('he-IL')} ₪) — בדקו זכאות למענק עבודה (מס הכנסה שלילי).`);
  }
  if (ss > 0 && ss <= THRESH.WORK_GRANT_MAX_SALARY) {
    flags.add('work_grant');
    notes.push(`שכר בן/בת הזוג (${fmt(ss)} ₪) נמוך מתקרת מענק העבודה — בדקו זכאות למענק עבודה נפרד.`);
  }
  if (sm >= 10000 || ss >= 10000) {
    flags.add('tax_refund');
    notes.push('שכר חודשי מעל 10,000 ₪ — מומלץ לבדוק החזר מס לשש השנים האחרונות (נקודות זיכוי, תרומות, הפקדות).');
  }
  if (a.two_jobs) {
    flags.add('tax_coord');
    notes.push('שני מקורות הכנסה / יותר ממעסיק אחד — חובה לבצע תיאום מס כדי למנוע ניכוי מס ביתר.');
  }
  if (a.spouse_no_income || (ss === 0 && a.marital === 'נשוי/אה')) {
    flags.add('spouse_credit');
    notes.push(`בן/בת זוג ללא הכנסה — בדקו ניצול נקודות זיכוי לא מנוצלות (כ-${THRESH.TAX_CREDIT_POINT} ₪/חודש לנקודה).`);
  }
  if (a.low_income || ['מובטל/ת', 'לא עובד/ת'].includes(a.employment_status)) {
    flags.add('guaranteed_income');
    notes.push(`הכנסה נמוכה / ללא עבודה — בדקו זכאות להבטחת הכנסה (יחיד ~${THRESH.GUARANTEED_INCOME_SINGLE.toLocaleString('he-IL')} ₪/חודש).`);
  }
  return { flags, notes };
}

/* ---------- Employment match ---------- */
function matchesEmployment(tp, a) {
  const emp = a.employment_status || '';
  const te = tp.emp || [];
  if (!te.length || te.includes('any')) return true;
  const map = {
    'שכיר/ה': 'employee', 'עצמאי/ת': 'self_employed', 'שכיר+עצמאי': 'employee',
    'מובטל/ת': 'unemployed', 'לא עובד/ת': 'unemployed', 'פנסיונר/ת': 'any', 'סטודנט/ית': 'any',
  };
  const cur = map[emp];
  return cur ? te.includes(cur) : true;
}

const PRIO_RANK = { must: 0, recommended: 1, tip: 2 };
const LIKE_RANK = { high: 0, medium: 1, low: 2 };

/* ---------- Main ---------- */
function recommend(answers, master, maxHealth = 60) {
  const sits = deriveSituations(answers, master);
  const { flags, notes } = wageTriggers(answers);
  const ruleNotes = applyRules(answers, master);
  const catalog = master.catalog;
  const sitMap = master.situation_map;
  const meta = master.meta;
  const wantHealth = answers.want_health_check === true || answers.has_health_flag === true || sits.has('health_check');

  // Collect topic uids per tier, dedup across situations
  const seenMain = new Set(), seenMore = new Set(), seenHealth = new Set();
  const mainUids = [], moreUids = [], healthUids = [];
  // health_check is not a topic-situation for main/more purposes
  const topicSits = [...sits].filter(s => s !== 'health_check');
  const orderedSits = topicSits.sort((x, y) => (meta.situation_order.indexOf(x)) - (meta.situation_order.indexOf(y)));

  // Universal baseline topics — relevant to everyone, always shown first in main.
  const universal = Array.isArray(meta.universal_topics) ? meta.universal_topics : [];
  for (const u of universal) if (!seenMain.has(u) && catalog[u]) { seenMain.add(u); mainUids.push(u); }

  for (const s of orderedSits) {
    const block = sitMap[s] || {};
    for (const u of (block.main || [])) if (!seenMain.has(u) && catalog[u]) { seenMain.add(u); mainUids.push(u); }
  }
  for (const s of orderedSits) {
    const block = sitMap[s] || {};
    for (const u of (block.more || [])) if (!seenMore.has(u) && !seenMain.has(u) && catalog[u]) { seenMore.add(u); moreUids.push(u); }
  }
  if (wantHealth) {
    for (const s of orderedSits) {
      const block = sitMap[s] || {};
      for (const u of (block.health || [])) if (!seenHealth.has(u) && catalog[u]) { seenHealth.add(u); healthUids.push(u); }
    }
    // Fallback: if no situation-specific health topics, use the general health pool
    if (healthUids.length < 12 && Array.isArray(master.health_pool)) {
      for (const u of master.health_pool) if (!seenHealth.has(u) && catalog[u]) { seenHealth.add(u); healthUids.push(u); }
    }
  }

  const fundKeyMap = { 'כללית': 'clalit', 'מכבי': 'maccabi', 'מאוחדת': 'meuhedet', 'לאומית': 'leumit' };

  function enrich(u, tier) {
    const tp = catalog[u];
    const rec = {
      catalog_no: tp.no, uid: u, source: tp.src, name: tp.name,
      category: tp.cat, provider: tp.prov, priority: tp.prio,
      priority_label: meta.priority_labels[tp.prio] || '',
      likelihood: tp.like, amount: tp.amt, why: tp.why || '',
      tip: tp.tip || '', tier: tier,
    };
    if (tp.src === 'fund') {
      rec.best_fund = tp.best || '';
      const fk = fundKeyMap[answers.health_fund];
      rec.your_fund_tiers = (fk && tp.ft && tp.ft[fk]) ? tp.ft[fk] : [];
    }
    return rec;
  }

  function sortRecs(arr) {
    return arr.sort((x, y) => {
      const px = PRIO_RANK[x.priority] ?? 9, py = PRIO_RANK[y.priority] ?? 9;
      if (px !== py) return px - py;
      const lx = LIKE_RANK[x.likelihood] ?? 9, ly = LIKE_RANK[y.likelihood] ?? 9;
      if (lx !== ly) return lx - ly;
      return (parseInt(x.catalog_no) || 99999) - (parseInt(y.catalog_no) || 99999);
    });
  }

  const mainRecs = mainUids.filter(u => matchesEmployment(catalog[u], answers)).map(u => enrich(u, 'main'));
  const moreRecs = moreUids.filter(u => matchesEmployment(catalog[u], answers)).map(u => enrich(u, 'more'));
  const healthRecs = healthUids.filter(u => matchesEmployment(catalog[u], answers)).slice(0, maxHealth).map(u => enrich(u, 'health'));

  // Buckets by priority (main + more merged, but main-first via tier tie-break)
  const allPrimary = [...mainRecs, ...moreRecs];
  const must = sortRecs(allPrimary.filter(r => r.priority === 'must'));
  const recommended = sortRecs(allPrimary.filter(r => r.priority === 'recommended'));
  const tips = sortRecs(allPrimary.filter(r => r.priority === 'tip'));

  // Situation labels + categories
  const sitLabels = orderedSits.map(s => meta.situations[s]).filter(Boolean);
  const hasSpecial = orderedSits.some(s => (meta.situation_cat[s] === 'special'));

  return {
    form_name: meta.form_name,
    situations: orderedSits,
    situation_labels: sitLabels,
    has_special: hasSpecial,
    referral_note: meta.referral_note_regular || '',
    wage_flags: [...flags].sort(),
    wage_notes: notes,
    rule_notes: ruleNotes,
    summary: {
      total_recommendations: allPrimary.length + healthRecs.length,
      must_check: must.length, recommended: recommended.length,
      tips: tips.length, health_benefits: healthRecs.length,
      main_count: mainRecs.length, more_count: moreRecs.length,
    },
    main: mainRecs, more: moreRecs,
    must_check: must, recommended, tips, health_benefits: healthRecs,
  };
}

if (typeof window !== 'undefined') {
  window.RightsEngine = { recommend, deriveSituations, wageTriggers, applyRules, evalCondition, THRESH };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { recommend, deriveSituations, wageTriggers, applyRules, evalCondition, THRESH };
}
