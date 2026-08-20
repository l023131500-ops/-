#!/usr/bin/env node
/**
 * בקלות — Design Tokens build
 * ---------------------------------
 * קורא tokens.json (מקור-אמת יחיד) ומייצר:
 *   1. bkalot-theme.css  — CSS גלובלי לכל המערכות (משתני :root + dark + רכיבים)
 *
 * שימוש:  node build.js
 * שנה tokens.json → הרץ שוב → העלה את bkalot-theme.css ל-Supabase Storage.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "tokens.json"), "utf8"));

/* ---- אוסף את כל המשתנים ל-:root ---- */
const rootVars = [];
const push = (name, val) => rootVars.push(`  --${name}: ${val};`);

for (const grp of ["brand", "surface", "text", "semantic"]) {
  for (const [k, o] of Object.entries(tokens.color[grp])) push(k, o.value);
}
for (const [k, o] of Object.entries(tokens.font)) {
  if (k === "google") continue;
  push(`font-${k}`, o.value);
}
for (const [k, o] of Object.entries(tokens.size)) push(k, o.value);
push("shadow", tokens.shadow.shadow.value);
push("shadow-lg", tokens.shadow["shadow-lg"].value);

/* ---- background tokens (gradients + patterns) ---- */
if (tokens.background) {
  for (const sub of ["gradient", "pattern"]) {
    const g = tokens.background[sub];
    if (!g) continue;
    for (const [k, o] of Object.entries(g)) push(`bg-${sub}-${k}`, o.value);
  }
}

/* ---- component tokens (table + form) as CSS vars ---- */
if (tokens.component) {
  for (const grp of ["table", "form"]) {
    const g = tokens.component[grp];
    if (!g) continue;
    for (const [k, o] of Object.entries(g)) {
      if (k === "desc" || !o || typeof o !== "object") continue;
      push(`${grp}-${k}`, o.value);
    }
  }
}

/* ---- dark mode ---- */
const darkComponent = tokens.component && tokens.component.dark
  ? Object.entries(tokens.component.dark)
      .filter(([k, o]) => k !== "desc" && o && typeof o === "object")
      .map(([k, o]) => `  --${k}: ${o.value};`)
  : [];

const darkVars = Object.entries(tokens.color.dark)
  .map(([k, o]) => `  --${k}: ${o.value};`)
  .concat([`  --shadow: ${tokens.shadow["shadow-dark"].value};`])
  .concat(darkComponent)
  .join("\n");

/* ---- CSS output ---- */
const css = `/* =====================================================================
   בקלות — מערכת עיצוב גלובלית (bkalot-theme.css)
   נוצר אוטומטית מ-tokens.json  ·  גרסה ${tokens.$meta.version}
   אל תערוך ידנית — ערוך את tokens.json והרץ build.js
   ===================================================================== */
@import url('${tokens.font.google.value}');

:root{
${rootVars.join("\n")}
}
[data-theme="dark"]{
${darkVars}
}

/* ---- Base ---- */
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.6;font-size:16px}
h1,h2,h3,h4{font-family:var(--font-heading);line-height:1.2;color:var(--teal-d)}
a{color:var(--teal);text-decoration:none;transition:color .18s}
.bk-hidden{display:none!important}

/* ---- Buttons (bk- prefix — לא מתנגש בקוד קיים) ---- */
.bk-btn{display:inline-block;background:var(--teal);color:#fff;font-weight:700;font-size:1rem;padding:12px 26px;border:none;border-radius:999px;cursor:pointer;transition:background .2s,transform .15s;box-shadow:0 6px 18px rgba(32,128,141,.28)}
.bk-btn:hover{background:var(--teal-d);transform:translateY(-2px)}
.bk-btn--ghost{background:var(--surface);border:1px solid var(--border);color:var(--teal-d);font-weight:600;box-shadow:none}
.bk-btn--ghost:hover{border-color:var(--teal);color:var(--teal);transform:none}
.bk-btn--danger{background:transparent;color:var(--must);border:1px solid #e6c4bf;box-shadow:none}
.bk-btn--danger:hover{background:var(--must);color:#fff;border-color:var(--must)}

/* ---- Card ---- */
.bk-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px}

/* ---- Badges (עדיפויות / סיכוי זכאות) ---- */
.bk-badge{display:inline-block;font-size:.8rem;font-weight:700;padding:3px 12px;border-radius:999px}
.bk-badge--must{background:rgba(178,59,46,.12);color:var(--must)}
.bk-badge--rec{background:rgba(184,134,11,.14);color:var(--rec)}
.bk-badge--tip{background:rgba(63,122,34,.14);color:var(--tip)}

/* ---- Spinner ---- */
.bk-spinner{width:38px;height:38px;border:3px solid var(--border);border-top-color:var(--teal);border-radius:50%;animation:bk-spin .8s linear infinite;margin:0 auto 14px}
@keyframes bk-spin{to{transform:rotate(360deg)}}

/* ---- Data Table (bk-table — רכיב משותף לכל המערכות) ---- */
.bk-table{width:100%;border-collapse:collapse;font-family:var(--font-body);font-size:var(--table-cell-size);color:var(--text);background:var(--surface);border-radius:var(--radius-sm);overflow:hidden;box-shadow:var(--shadow)}
.bk-table thead th{background:var(--table-head-bg);color:var(--table-head-text);font-size:var(--table-head-size);font-weight:var(--table-head-weight);text-align:start;padding:var(--table-cell-pad-y) var(--table-cell-pad-x);border-bottom:1px solid var(--border);white-space:nowrap}
.bk-table tbody td{padding:var(--table-cell-pad-y) var(--table-cell-pad-x);border-bottom:1px solid var(--border);text-align:start;vertical-align:middle}
.bk-table tbody tr:last-child td{border-bottom:none}
.bk-table tbody tr:nth-child(even){background:var(--table-row-zebra)}
.bk-table tbody tr:hover{background:var(--table-row-hover)}
.bk-table--num td,.bk-table--num th{font-variant-numeric:tabular-nums lining-nums}
.bk-table__wrap{width:100%;overflow-x:auto}

/* ---- Form fields (bk-input / bk-select / bk-textarea / bk-label) ---- */
.bk-field{display:flex;flex-direction:column;gap:6px;margin-bottom:var(--form-gap)}
.bk-label{font-size:var(--form-label-size);font-weight:var(--form-label-weight);color:var(--form-label-color)}
.bk-input,.bk-select,.bk-textarea{width:100%;font-family:var(--font-body);font-size:var(--form-field-size);color:var(--text);background:var(--form-field-bg);border:1px solid var(--border);border-radius:var(--form-field-radius);padding:var(--form-field-pad-y) var(--form-field-pad-x);transition:border-color .18s,box-shadow .18s;text-align:start}
.bk-textarea{min-height:96px;resize:vertical;line-height:1.5}
.bk-select{cursor:pointer;background-image:none}
.bk-input:focus,.bk-select:focus,.bk-textarea:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px var(--form-focus-ring)}
.bk-input::placeholder,.bk-textarea::placeholder{color:var(--faint)}
.bk-input:disabled,.bk-select:disabled,.bk-textarea:disabled{background:var(--surface-2);color:var(--muted);cursor:not-allowed}
.bk-input--error,.bk-select--error,.bk-textarea--error{border-color:var(--must)}
.bk-input--error:focus,.bk-textarea--error:focus{box-shadow:0 0 0 3px rgba(178,59,46,.16)}
.bk-help{font-size:.78rem;color:var(--muted)}
.bk-help--error{color:var(--must)}

/* ---- Font variants (bk-font-*) — כל הפונטים הנוספים, זמינים כשכבה על כל אלמנט ---- */
.bk-font-body{font-family:var(--font-body)}
.bk-font-heading{font-family:var(--font-heading)}
.bk-font-display{font-family:var(--font-display)}
.bk-font-formal{font-family:var(--font-formal)}
.bk-font-modern{font-family:var(--font-modern)}
.bk-font-friendly{font-family:var(--font-friendly)}
.bk-font-alt-body{font-family:var(--font-alt-body)}

/* ---- Backgrounds (bk-bg-*) — גרדיאנטים לקטעי הירו/כותרת + טקסטורות עדינות למשטחים ---- */
.bk-bg-brand{background:var(--bg-gradient-brand);color:#fff}
.bk-bg-hero{background:var(--bg-gradient-hero);color:#fff}
.bk-bg-gold{background:var(--bg-gradient-gold);color:#fff}
.bk-bg-subtle{background:var(--bg-gradient-subtle)}
.bk-bg-dots{background-image:var(--bg-pattern-dots);background-color:var(--surface)}
.bk-bg-grid{background-image:var(--bg-pattern-grid);background-color:var(--surface)}
`;

fs.writeFileSync(path.join(ROOT, "bkalot-theme.css"), css, "utf8");
console.log("✓ bkalot-theme.css נוצר (" + css.length + " תווים, גרסה " + tokens.$meta.version + ")");
