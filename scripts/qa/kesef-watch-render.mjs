/**
 * 34 kesef — "המעקב שלי" + פאנל הממצאים בדוח, מורצים כלשונם מול payload אמיתי.
 *
 * The RPCs were exercised live over the anon/authed HTTPS path first (see the
 * commit message); this harness answers the other question — does the committed
 * page script actually draw that payload. The inline <script> of my.html and
 * report.html is extracted verbatim and run in a Node vm against a stub DOM;
 * fetch/localStorage are the only fakes, and fetch returns payloads captured
 * from the live hub (or fetched live at run time for the public calls).
 *
 *   node scripts/qa/kesef-watch-render.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const page = (f) => readFileSync(join(ROOT, 'sites', '34-kesef', 'kesef', f), 'utf8');
const inlineScript = (html) => {
  const m = html.match(/<script>\n'use strict';([\s\S]*?)<\/script>/);
  if (!m) throw new Error('inline script not found');
  return "'use strict';" + m[1];
};

let pass = 0, fail = 0;
const ck = (name, cond, extra) => {
  if (cond) { pass++; console.log('ok  ' + name); }
  else { fail++; console.log('FAIL ' + name, extra ?? ''); }
};

const el = (id) => ({
  id, innerHTML: '', textContent: '', hidden: false, value: '', href: '',
  disabled: false, dataset: {}, listeners: {},
  addEventListener(ev, fn) { this.listeners[ev] = fn; },
});
function makeDom(search, html) {
  const els = new Map();
  // seed every id-carrying element with its real initial hidden state, so an
  // element the script never touches asserts as the HTML left it
  for (const m of html.matchAll(/<[a-z][^>]*\bid="([^"]+)"[^>]*>/g)) {
    const e = el(m[1]);
    e.hidden = /\shidden(\s|>|\/)/.test(m[0]);
    els.set(m[1], e);
  }
  const document = {
    title: '',
    getElementById(id) { if (!els.has(id)) els.set(id, el(id)); return els.get(id); },
  };
  const location = { href: 'https://more30.com/kesef/x' + search, search };
  return { els, document, location };
}
function makeCtx({ search = '', session = null, routes = {}, html }) {
  const { els, document, location } = makeDom(search, html);
  const calls = [];
  const ctx = {
    document, location, console,
    history: { replaceState() {} },
    URL, URLSearchParams, Intl, JSON, Math, Number, Object, Array, Date, Promise,
    parseInt, isFinite, encodeURIComponent, setTimeout,
    alert(msg) { calls.push(['alert', msg]); },
    localStorage: {
      getItem(k) { return k === 'more30-auth' && session ? JSON.stringify(session) : null; },
    },
    fetch: async (url, opts) => {
      const fn = String(url).split('/rpc/')[1];
      calls.push(['rpc', fn, opts && opts.headers && opts.headers.Authorization]);
      if (!(fn in routes)) throw new Error('no stub route for ' + fn);
      return { ok: true, json: async () => routes[fn] };
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  return { ctx, els, calls };
}
const tick = () => new Promise((r) => setTimeout(r, 20));

// ---- real payloads, captured from the live hub by the live-path test ----
const myPayload = JSON.parse(readFileSync('/tmp/kesef-my-payload.json', 'utf8'));
const alertsPayload = JSON.parse(readFileSync('/tmp/kesef-alerts-payload.json', 'utf8'));
// public calls fetched live right here — same anon path the browser uses
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';
const liveRpc = async (fn, args) => {
  const r = await fetch('https://uhnrgujbdxhhmoxcjria.supabase.co/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
  });
  if (!r.ok) throw new Error(fn + ' HTTP ' + r.status);
  return r.json();
};
const authList = await liveRpc('kesef_authorities_list');
const report510 = await liveRpc('kesef_authority_report', { p_symbol: 510 });

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const SESSION = { access_token: 'TK-test', expires_at: FUTURE, user: { email: 'test@more30.com' } };

// ================= my.html =================
const myHtml = page('my.html');
const mySrc = inlineScript(myHtml);

// 1) signed out
{
  const { ctx, els } = makeCtx({ routes: {}, html: myHtml });
  vm.runInContext(mySrc, ctx); await tick();
  ck('my: signed-out shows signedOut panel', els.get('signedOut').hidden === false && els.get('content').hidden === true);
  ck('my: signed-out hides loader', els.get('loading').hidden === true);
}
// 2) signed in, one real watch (כפר מנדא, 3 alerts)
{
  const routes = { kesef_my_watchlist: myPayload, kesef_authorities_list: authList };
  const { ctx, els, calls } = makeCtx({ session: SESSION, routes, html: myHtml });
  vm.runInContext(mySrc, ctx); await tick();
  ck('my: content shown for signed-in', els.get('content').hidden === false && els.get('signedOut').hidden === true);
  ck('my: watchlist call used the user token', calls.some((c) => c[1] === 'kesef_my_watchlist' && c[2] === 'Bearer TK-test'));
  const cards = els.get('cards').innerHTML;
  ck('my: card renders authority name linked to its report', cards.includes('כפר מנדא') && cards.includes('/kesef/report?symbol=510'));
  ck('my: 3 alert statements rendered', (cards.match(/class="alert"/g) || []).length === 3);
  ck('my: alert chip says לתשומת לב with the fiscal year', cards.includes('לתשומת לב · 2024'));
  ck('my: metric rows carry year and peer median', cards.includes('(2024)') && cards.includes('חציון שווים'));
  ck('my: card shows the watched-since date', cards.includes('במעקב מ-') && cards.includes(new Date(myPayload.watches[0].watched_at).toLocaleDateString('he-IL')));
  ck('my: remove button carries the symbol', cards.includes('data-remove="510"'));
  ck('my: datalist filled from live authorities list', els.get('authList').innerHTML.split('<option').length - 1 === authList.length);
  ck('my: empty panel hidden, compare hidden below 2 watches', els.get('empty').hidden === true && els.get('cmpAll').hidden === true);
}
// 3) signed in, zero watches
{
  const routes = { kesef_my_watchlist: { watches: [], generated_at: 'x' }, kesef_authorities_list: authList };
  const { ctx, els } = makeCtx({ session: SESSION, routes, html: myHtml });
  vm.runInContext(mySrc, ctx); await tick();
  ck('my: empty state shown when no watches', els.get('empty').hidden === false && els.get('cards').innerHTML === '');
}
// 4) five watches -> compare capped at 4 with a note
{
  const w = myPayload.watches[0];
  const five = { watches: [1, 2, 3, 4, 5].map((i) => ({ ...w, symbol: 100 + i, name: w.name + ' ' + i })) };
  const routes = { kesef_my_watchlist: five, kesef_authorities_list: authList };
  const { ctx, els } = makeCtx({ session: SESSION, routes, html: myHtml });
  vm.runInContext(mySrc, ctx); await tick();
  ck('my: compare link visible with first four symbols', els.get('cmpAll').hidden === false && els.get('cmpAll').href === '/kesef/compare?symbols=101,102,103,104');
  ck('my: truncation note shown for a fifth watch', els.get('cmpNote').hidden === false && els.get('cmpNote').textContent.includes('4'));
}
// 5) expired session behaves as signed out
{
  const { ctx, els } = makeCtx({ session: { ...SESSION, expires_at: 1 }, routes: {}, html: myHtml });
  vm.runInContext(mySrc, ctx); await tick();
  ck('my: expired session shows signedOut', els.get('signedOut').hidden === false);
}
// 6) server-side not_authenticated (revoked token) falls back to signedOut
{
  const routes = { kesef_my_watchlist: { error: 'not_authenticated' }, kesef_authorities_list: authList };
  const { ctx, els } = makeCtx({ session: SESSION, routes, html: myHtml });
  vm.runInContext(mySrc, ctx); await tick();
  ck('my: server not_authenticated shows signedOut', els.get('signedOut').hidden === false && els.get('content').hidden === true);
}

// ================= report.html =================
const repHtml = page('report.html');
const repSrc = inlineScript(repHtml);

// 7) signed out: findings panel renders, watch button offers login
{
  const routes = {
    kesef_authorities_list: authList,
    kesef_authority_report: report510,
    kesef_authority_alerts: alertsPayload,
  };
  const { ctx, els } = makeCtx({ search: '?symbol=510', routes, html: repHtml });
  vm.runInContext(repSrc, ctx); await tick();
  ck('report: renders the authority', els.get('authName').textContent === 'כפר מנדא');
  ck('report: findings panel visible with 3 statements', els.get('alertsPanel').hidden === false && (els.get('alertsList').innerHTML.match(/לתשומת לב · 2024/g) || []).length === 3);
  ck('report: statements are the factual sentences from the DB', els.get('alertsList').innerHTML.includes('נקודות אחוז') || els.get('alertsList').innerHTML.includes('מן ההכנסה השנתית'));
  ck('report: watch button offers login when signed out', els.get('watchBtn').hidden === false && els.get('watchBtn').textContent.includes('כניסה'));
}
// 8) signed in and already watching 510: button shows remove state; toggle flips it
{
  const routes = {
    kesef_authorities_list: authList,
    kesef_authority_report: report510,
    kesef_authority_alerts: alertsPayload,
    kesef_my_watchlist: { watches: [{ symbol: 510 }] },
    kesef_watch_toggle: { symbol: 510, watching: false },
  };
  const { ctx, els } = makeCtx({ search: '?symbol=510', session: SESSION, routes, html: repHtml });
  vm.runInContext(repSrc, ctx); await tick();
  ck('report: signed-in watcher sees the remove state', els.get('watchBtn').textContent.includes('במעקב'));
  await els.get('watchBtn').listeners.click(); await tick();
  ck('report: toggle flips the button to add state', els.get('watchBtn').textContent.includes('הוספה למעקב'));
}
// 9) authority without findings: panel stays hidden
{
  const routes = {
    kesef_authorities_list: authList,
    kesef_authority_report: report510,
    kesef_authority_alerts: { authority: { symbol: 510, name: 'x' }, alerts: [] },
  };
  const { ctx, els } = makeCtx({ search: '?symbol=510', routes, html: repHtml });
  vm.runInContext(repSrc, ctx); await tick();
  ck('report: no findings -> no panel', els.get('alertsPanel').hidden === true);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
