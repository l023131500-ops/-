/**
 * QA — the signing page, end to end, as a client would see it.
 *
 * Creates a real contract through the API, then opens the signing link in a
 * browser with no session at all — because that is who signs: a client who has
 * never heard of more30 and has no account. Draws on the canvas, submits, and
 * checks the evidence landed.
 *
 *   node scripts/qa/sign-flow.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';
const SHOTS = 'QA/shots';

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + '  << ' + (d ?? '')); } };

async function rpc(token, fn, args) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(args ?? {}),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${fn} ${r.status}: ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : null;
}

async function signIn(email, password) {
  const headers = { apikey: ANON, 'content-type': 'application/json' };
  const body = JSON.stringify({ email, password });
  let r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers, body });
  if (!r.ok) r = await fetch(`${SUPABASE}/auth/v1/signup`, { method: 'POST', headers, body });
  const j = await r.json();
  if (!j.access_token) throw new Error('no token: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

async function run() {
  await mkdir(SHOTS, { recursive: true });
  const token = await signIn('qa.np.agent@more30.com', 'NpQa-2026-agent-x7');

  const me = await rpc(token, 'np_me');
  if (!me.offices?.length) throw new Error('QA account has no office — run nadlan-pro-smoke.ps1 first');
  const office = me.offices[0].id;

  console.log('\n=== set up a contract to sign ===');
  const made = await rpc(token, 'np_contract_create', {
    p: {
      office_id: office,
      title: 'הסכם תיווך — בדיקת דפדפן',
      body_html: '<h1>הסכם תיווך במקרקעין</h1><p>נערך לצורך בדיקה אוטומטית.</p>' +
                 '<h2>גילוי נאות</h2><p>המתווך בעל רישיון מספר 12345.</p>',
      broker_name: 'תיווך בדיקה QA',
      broker_license: '12345',
      signers: [{ name: 'ישראל ישראלי', email: 'buyer@example.com', role: 'לקוח' }],
    },
  });
  await rpc(token, 'np_contract_send', { p_id: made.contract_id });
  const link = 'https://more30.com/tivuch/sign?t=' + made.signers[0].token;
  ok('contract created and sent', !!made.signers[0].token, 'no token');

  const browser = await chromium.launch();
  try {
    // No stored session, no cookies: exactly what a client's browser looks like.
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1100 }, locale: 'he-IL' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(link, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);

    ok('the signing page opens without any account',
       await page.locator('#main').isVisible(), 'main not visible');
    const title = (await page.locator('#title').textContent()) ?? '';
    ok('the document title is shown', title.includes('הסכם תיווך'), 'title: ' + title);
    const doc = (await page.locator('#doc').textContent()) ?? '';
    ok('the document body is shown', doc.includes('גילוי נאות'), 'body missing');

    // The legal honesty rule, as the signer reads it.
    const legal = (await page.locator('.legal').textContent()) ?? '';
    ok('it says the signature is secure', legal.includes('מאובטחת'), 'no "secure"');
    ok('and says plainly that it is NOT a certified signature',
       legal.includes('אינה') && legal.includes('מאושרת'), 'no disclaimer of certified');

    ok('no sign-in pill is offered to a client',
       (await page.locator('more30-auth').count()) === 0, 'auth-button present');

    // The terms sit on a white card inside a dark page. If the page's light ink
    // wins the cascade the contract renders at about 1.4:1 on white — readable
    // in a screenshot review only if you already know to look. Measured.
    const contrast = await page.evaluate(() => {
      const p = document.querySelector('#doc p');
      if (!p) return null;
      const lum = (c) => {
        const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = lum(getComputedStyle(p).color);
      const bg = lum(getComputedStyle(document.querySelector('#doc')).backgroundColor);
      const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg];
      return Math.round(((hi + 0.05) / (lo + 0.05)) * 10) / 10;
    });
    ok('the contract text meets AA contrast on its white card',
       contrast !== null && contrast >= 4.5, 'ratio: ' + contrast + ':1');

    ok('submit is disabled before anything is drawn',
       await page.locator('#submit').isDisabled(), 'enabled too early');
    await page.screenshot({ path: `${SHOTS}/sign-before.png`, fullPage: false });

    // Draw a stroke the way a finger would.
    const box = await page.locator('#pad').boundingBox();
    await page.mouse.move(box.x + 60, box.y + 120);
    await page.mouse.down();
    for (let i = 0; i < 22; i++) {
      await page.mouse.move(box.x + 60 + i * 12, box.y + 120 - Math.sin(i / 2.5) * 38);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);
    ok('drawing enables submit', await page.locator('#submit').isEnabled(), 'still disabled');

    await page.click('#submit');
    await page.waitForTimeout(6000);

    const done = (await page.locator('#done').textContent()) ?? '';
    ok('the signature is confirmed on screen', done.includes('נחתם'), 'text: ' + done.slice(0, 120));
    ok('the document hash is shown to the signer',
       (await page.locator('#done .hash').count()) === 1, 'no hash shown');
    await page.screenshot({ path: `${SHOTS}/sign-after.png`, fullPage: false });

    ok('no uncaught JavaScript errors', errors.length === 0, errors.slice(0, 2).join(' | '));

    // Reopening a signed link must not offer to sign again.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    ok('reopening a signed link does not offer to sign again',
       await page.locator('#padWrap').isHidden(), 'pad still shown');

    // Mobile, where most clients will actually sign.
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true });
    const mp = await m.newPage();
    await mp.goto(link, { waitUntil: 'domcontentloaded' });
    await mp.waitForTimeout(3000);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('no horizontal overflow at 390px', overflow <= 1, 'overflow: ' + overflow);
    await mp.screenshot({ path: `${SHOTS}/sign-mobile.png`, fullPage: false });
    await m.close();
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log('\n=== the evidence trail the office sees ===');
  const cg = await rpc(token, 'np_contract_get', { p_id: made.contract_id });
  const s = cg.signers[0];
  ok('the contract is marked signed', cg.contract.status === 'signed', 'status: ' + cg.contract.status);
  ok('the level is recorded as secure, not certified', s.level === 'secure', 'level: ' + s.level);
  ok('a document hash was stored', (s.document_hash || '').length === 64, 'hash: ' + s.document_hash);
  ok('the signer IP was captured from a real browser', !!s.signed_ip, 'no ip');
  const ev = (s.events || []).map((e) => e.event);
  ok('the log records sent, opened and signed',
     ['sent', 'opened', 'signed'].every((x) => ev.includes(x)), 'events: ' + ev.join(','));

  console.log('\n=== summary ===');
  console.log('  passed: ' + pass);
  console.log('  failed: ' + fail);
  if (fail > 0) process.exit(1);
}

run().catch((e) => { console.error('harness error:', e); process.exit(2); });
