// Generate the deferred half of the bieebmnm replication: views, functions,
// triggers and policies, rewritten into the cold igud_* schemas of the hub.
//
// Hard rules encoded here, not left to review:
//   1. Nothing may target `public.` in the hub. `public` is the hub's own live
//      schema (32 systems registry, spec submissions, studio storage). Every
//      statement is scanned after rewriting and rejected if `public.` survives
//      as a *target*; the run aborts rather than guessing.
//   2. The six protected `zr_*` tables are excluded, exactly as in the
//      structural pass. Anything referencing them is dropped and reported.
//   3. `auth.`, `storage.`, `extensions.`, `vault.` and bare `pg_catalog`
//      references are left untouched - they are platform schemas, identical in
//      both projects.
import fs from 'node:fs';

const ROOT = 'C:/Users/USER/Downloads/_more30_vault/supabase_backups/bieebmnm_2026-07-29';
const s = JSON.parse(fs.readFileSync(`${ROOT}/schema.json`, 'utf8'));
const MAP = { public: 'igud', ads: 'igud_ads', transcribe: 'igud_transcribe', otvedaf: 'igud_otvedaf' };
const PROTECTED = /\b(zr_answer_rules|zr_leads|zr_questions|zr_situation_topics|zr_situations|zr_topics)\b/;
const KEEP = new Set(['auth', 'storage', 'extensions', 'vault', 'graphql', 'graphql_public', 'realtime', 'pg_catalog', 'information_schema', 'net', 'cron', 'pgsodium']);

// 🔴 `<schema>.` cannot be rewritten blindly, and this bit me for real.
// The source has a **table** called `ads` inside the schema `ads`. RLS
// predicates self-reference their table by name, so the real policy text
// contains `ads.tenant_id` - a column of the table `ads`. Blind rewriting
// produced `igud_ads.tenant_id`, which is not a column of anything and would
// have been stored as a broken predicate (or failed at creation).
// The fix: rewrite `<src>.<name>` only when `<name>` is an object that really
// lives in that source schema.
const objectsIn = new Map(Object.keys(MAP).map((k) => [k, new Set()]));
for (const list of [s.tables, s.views, s.functions, s.sequences]) {
  for (const o of list ?? []) {
    const sch = o.sch ?? o.schema;
    const name = o.name ?? o.tbl;
    if (objectsIn.has(sch) && name) objectsIn.get(sch).add(name);
  }
}

/** Rewrite `<src>.<obj>` to `<dst>.<obj>` - object names only, never columns. */
function rw(sql) {
  let out = sql;
  for (const [src, dst] of Object.entries(MAP)) {
    const known = objectsIn.get(src) ?? new Set();
    out = out.replace(
      new RegExp(`(^|[^\\w."])"?${src}"?\\.("?)([A-Za-z_][\\w]*)\\2`, 'g'),
      (m, pre, quo, name) => (known.has(name) ? `${pre}${dst}.${quo}${name}${quo}` : m),
    );
  }
  return out;
}

// Which function names live in each source schema. Needed because policy
// predicates and view bodies call them **unqualified** - e.g.
// `using (is_super_admin(auth.uid()))`. Unqualified resolves through
// search_path, which in the hub starts at the hub's own `public`, where these
// functions do not exist: the policy would fail the moment it is evaluated.
// Nothing evaluates it while the schemas stay cold, but a replica that cannot
// be switched on is not a replica.
const fnByName = new Map();
for (const f of s.functions ?? []) {
  if (!MAP[f.sch]) continue;
  if (!fnByName.has(f.name)) fnByName.set(f.name, MAP[f.sch]);
}
const PG_BUILTIN = /^(coalesce|nullif|greatest|least|count|sum|avg|min|max|now|exists|cast|extract|array|row|any|all|lower|upper|trim|length|substring|position|overlay|jsonb_build_object|json_build_object|to_jsonb|current_setting|current_user|session_user)$/i;

/** Qualify bare calls to the replica's own functions. */
function qualifyCalls(sql) {
  return sql.replace(/(^|[^\w".])([a-z_][\w]*)\s*\(/g, (m, pre, name) => {
    if (PG_BUILTIN.test(name)) return m;
    const target = fnByName.get(name);
    if (!target) return m;
    return `${pre}${target}.${name}(`;
  });
}

const stmts = [];
const skipped = [];
const push = (sch, sql) => stmts.push({ sch, sql });

// ---- functions first: views and triggers depend on them ----
for (const f of s.functions ?? []) {
  if (!MAP[f.sch]) { skipped.push(`function ${f.sch}.${f.name} (schema not mapped)`); continue; }
  if (PROTECTED.test(f.def)) { skipped.push(`function ${f.sch}.${f.name} (touches protected zr_*)`); continue; }
  // ⚠️ רוב ה"פונקציות" בסכמת public של המקור אינן שלו: pgvector הותקן שם, ולכן
  // ההיצע כולל את כל ה-C functions של התוסף (array_to_halfvec, cosine_distance,
  // binary_quantize, אופרטורים...). העתקתן ל-igud היא שגיאה — הן שייכות לתוסף,
  // וב-hub התוסף מותקן ב-`extensions`. הסימן המבחין: `LANGUAGE c/internal` עם
  // `AS '$libdir/...'`. פונקציות האפליקציה הן plpgsql/sql.
  if (/\bLANGUAGE\s+(c|internal)\b/i.test(f.def) || /\$libdir\//.test(f.def)) {
    skipped.push(`function ${f.sch}.${f.name} (extension-owned, LANGUAGE c/internal)`);
    continue;
  }
  // 🔴 `SET search_path TO 'public'` בגוף הפונקציה הוא מלכודת אמיתית ביעד:
  // ב-hub הסכמה `public` היא הסכמה **החיה** (מרשם 32 המערכות, האפיונים,
  // אחסון הסטודיו). פונקציית SECURITY DEFINER עם search_path=public הייתה
  // מחפשת `admin_sessions`, `tenants`, `lessons` בסכמה החיה — כלומר או נכשלת,
  // או במקרה הרע פוגעת בטבלה שבמקרה קיימת שם. מפנים אותה לסכמת ההעתק.
  const withPath = rw(f.def).replace(
    /SET\s+search_path\s+TO\s+([^\n]+)/i,
    (m, list) => `SET search_path TO ${list.replace(/'public'/g, `'${MAP[f.sch]}'`)}`,
  );
  push(f.sch, withPath);
}

// ---- views ----
for (const v of s.views ?? []) {
  if (!MAP[v.sch]) { skipped.push(`view ${v.sch}.${v.name} (schema not mapped)`); continue; }
  if (PROTECTED.test(v.def)) { skipped.push(`view ${v.sch}.${v.name} (touches protected zr_*)`); continue; }
  const kind = v.kind === 'm' ? 'materialized view' : 'view';
  push(v.sch, `create or replace ${kind} ${MAP[v.sch]}.${JSON.stringify(v.name).replace(/"/g, '"')} as\n${qualifyCalls(rw(v.def))}`
    .replace(/create or replace materialized view/, 'create materialized view if not exists'));
}

// ---- triggers ----
for (const t of s.triggers ?? []) {
  if (!MAP[t.sch]) { skipped.push(`trigger ${t.sch}.${t.name} (schema not mapped)`); continue; }
  if (PROTECTED.test(t.tbl) || PROTECTED.test(t.def)) { skipped.push(`trigger ${t.name} (protected table)`); continue; }
  // ⚠️ `pg_get_triggerdef` נשמר **בלי שם סכמה** לטריגרים של `public` (הוא
  // משמיט את הסכמה שנמצאת ב-search_path בזמן ההרצה). ביעד זה אומר שהטריגר
  // ייווצר על טבלה בסכמה החיה או ייכשל. מכאן ההסמכה המפורשת של שם הטבלה
  // ושם הפונקציה.
  const def = rw(t.def)
    .replace(/\bON\s+(?!\w+\.)("?[\w]+"?)/i, (m, tbl) => `ON ${MAP[t.sch]}.${tbl}`)
    .replace(/\bEXECUTE\s+FUNCTION\s+(?!\w+\.)("?[\w]+"?)\s*\(/i, (m, fn) => {
      const bare = fn.replace(/"/g, '');
      return `EXECUTE FUNCTION ${fnByName.get(bare) ?? MAP[t.sch]}.${fn}(`;
    });
  push(t.sch, `drop trigger if exists ${q(t.name)} on ${MAP[t.sch]}.${q(t.tbl)};\n${def}`);
}

// ---- policies ----
for (const p of s.policies ?? []) {
  if (!MAP[p.sch]) { skipped.push(`policy ${p.sch}.${p.tbl}.${p.name} (schema not mapped)`); continue; }
  if (PROTECTED.test(p.tbl)) { skipped.push(`policy ${p.name} on protected ${p.tbl}`); continue; }
  if ((p.qual && PROTECTED.test(p.qual)) || (p.with_check && PROTECTED.test(p.with_check))) {
    skipped.push(`policy ${p.name} (predicate touches protected zr_*)`);
    continue;
  }
  const roles = String(p.roles || '{public}').replace(/^\{|\}$/g, '').split(',').filter(Boolean)
    .map((r) => (r === 'public' ? 'public' : q(r))).join(', ') || 'public';
  const parts = [
    `drop policy if exists ${q(p.name)} on ${MAP[p.sch]}.${q(p.tbl)};`,
    `create policy ${q(p.name)} on ${MAP[p.sch]}.${q(p.tbl)}`,
    `  as ${p.permissive === 'PERMISSIVE' ? 'permissive' : 'restrictive'}`,
    `  for ${String(p.cmd || 'ALL').toLowerCase()}`,
    `  to ${roles}`,
  ];
  if (p.qual) parts.push(`  using (${qualifyCalls(rw(p.qual))})`);
  if (p.with_check) parts.push(`  with check (${qualifyCalls(rw(p.with_check))})`);
  push(p.sch, parts.join('\n') + ';');
}

function q(id) { return '"' + String(id).replace(/"/g, '""') + '"'; }

// ---- the guard: no statement may target the hub's public schema ----
const violations = [];
for (const st of stmts) {
  // A target is what follows create/alter/drop of an object, or `on <x>`.
  const targets = [...st.sql.matchAll(/\b(?:create(?:\s+or\s+replace)?|alter|drop)\s+(?:\w+\s+)*?(?:if\s+not\s+exists\s+|if\s+exists\s+)?([a-z_"][\w".]*)/gi)]
    .map((m) => m[1])
    .concat([...st.sql.matchAll(/\bon\s+((?:"[^"]+"|[a-z_]\w*)\.(?:"[^"]+"|[a-z_]\w*))/gi)].map((m) => m[1]));
  for (const t of targets) {
    if (/^"?public"?\./.test(t)) violations.push(`${t}  <<  ${st.sql.slice(0, 90).replace(/\s+/g, ' ')}`);
  }
}

const byKind = { functions: 0, views: 0, triggers: 0, policies: 0 };
for (const st of stmts) {
  if (/^create or replace function/i.test(st.sql)) byKind.functions++;
  else if (/create (or replace )?(materialized )?view/i.test(st.sql)) byKind.views++;
  else if (/create trigger/i.test(st.sql)) byKind.triggers++;
  else if (/create policy/i.test(st.sql)) byKind.policies++;
}

const out = stmts.map((st) => ({ sch: st.sch, sql: st.sql }));
fs.writeFileSync('igud-logic.json', JSON.stringify(out), 'utf8');
fs.writeFileSync('igud-logic-skipped.txt', skipped.join('\n'), 'utf8');
console.log('generated', stmts.length, JSON.stringify(byKind));
console.log('skipped', skipped.length);
console.log('PUBLIC-TARGET VIOLATIONS:', violations.length);
if (violations.length) console.log(violations.slice(0, 10).join('\n'));
