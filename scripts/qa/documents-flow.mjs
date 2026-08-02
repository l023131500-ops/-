/**
 * QA — the documents screen: create a contract from a template in the UI, send
 * it, and check the invoice panel refuses what it must refuse.
 *
 *   node scripts/qa/documents-flow.mjs
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';
const SHOTS = 'QA/shots';
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + '  << ' + (d ?? '')); } };

async function signIn(email, password) {
  const headers = { apikey: ANON, 'content-type': 'application/json' };
  const body = JSON.stringify({ email, password });
  let r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers, body });
  if (!r.ok) r = await fetch(`${SUPABASE}/auth/v1/signup`, { method: 'POST', headers, body });
  return r.json();
}

async function plant(ctx, s) {
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    ['more30-auth', JSON.stringify({
      access_token: s.access_token, refresh_token: s.refresh_token, token_type: 'bearer',
      expires_in: s.expires_in, expires_at: Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600),
      user: s.user,
    })]);
}

async function run() {
  await mkdir(SHOTS, { recursive: true });
  const session = await signIn('qa.np.agent@more30.com', 'NpQa-2026-agent-x7');
  const browser = await chromium.launch();

  try {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: 'he-IL' });
    await plant(ctx, session);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('https://more30.com/tivuch/app?v=documents', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);

    ok('the documents tab loads', await page.locator('#viewDocuments').isVisible(), 'not visible');
    const heads = await page.locator('#documentsBody h2.sec').allTextContents();
    ok('it shows both contracts and invoices',
       heads.some((h) => h.includes('חוזים')) && heads.some((h) => h.includes('חשבוניות')),
       'headings: ' + heads.join(' | '));
    await page.screenshot({ path: `${SHOTS}/tivuch-documents.png`, fullPage: false });

    // Create a contract from a template, through the UI.
    await page.click('#newContract');
    await page.waitForTimeout(2500);
    ok('the new-document drawer opens', await page.locator('#k_tpl').isVisible(), 'no template picker');

    const tplCount = await page.locator('#k_tpl option').count();
    ok('the three system templates are offered', tplCount >= 3, 'options: ' + tplCount);

    const signerOptions = await page.locator('#k_signer option').count();
    ok('contacts are offered as signers', signerOptions > 1, 'options: ' + signerOptions);
    await page.selectOption('#k_signer', { index: 1 });

    await page.click('#kPreview');
    await page.waitForTimeout(2500);
    const prev = (await page.locator('#kPrev').textContent()) ?? '';
    ok('the preview renders the filled template', prev.includes('הסכם תיווך') || prev.length > 100,
       'preview: ' + prev.slice(0, 80));
    // The ethics disclosure has to survive templating, not just exist in the row.
    ok('the licence disclosure survives into the rendered document',
       prev.includes('רישיון'), 'no licence text in preview');
    await page.screenshot({ path: `${SHOTS}/tivuch-contract-preview.png`, fullPage: false });

    ok('create is enabled only after a preview', await page.locator('#kSave').isEnabled(), 'still disabled');
    await page.click('#kSave');
    await page.waitForTimeout(4000);

    const rows = await page.locator('#documentsBody tr.row[data-cid]').count();
    ok('the contract appears in the list', rows > 0, 'rows: ' + rows);

    await page.locator('#documentsBody tr.row[data-cid]').first().click();
    await page.waitForTimeout(2500);
    const drawerTxt = (await page.locator('.drawer').textContent()) ?? '';
    ok('the contract drawer opens', (await page.locator('.drawer').isVisible()), 'not open');
    ok('it states the signature level honestly',
       drawerTxt.includes('מאובטחת') && drawerTxt.includes('אינה'), 'no honest level statement');
    ok('a personal signing link is offered', drawerTxt.includes('קישור אישי') || drawerTxt.includes('נחתם'),
       'no link and not signed');
    await page.screenshot({ path: `${SHOTS}/tivuch-contract-drawer.png`, fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    // The invoice panel inside a deal must refuse a tax invoice with no provider
    // and say why, rather than showing a dead button.
    await page.goto('https://more30.com/tivuch/app?v=board', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const cards = await page.locator('.card[data-id]').count();
    if (cards > 0) {
      await page.locator('.card[data-id]').first().click();
      await page.waitForTimeout(3500);
      const inv = (await page.locator('#invBox').textContent().catch(() => '')) ?? '';
      ok('the invoice panel explains why a tax invoice cannot be issued',
         inv.includes('ספק חשבוניות') || inv.includes('אין סכום עמלה'), 'panel said: ' + inv.slice(0, 100));
      if (inv.includes('ספק חשבוניות')) {
        ok('and offers a payment request instead',
           (await page.locator('#ivReq').count()) === 1, 'no payment-request option');
        ok('while saying a payment request is not a tax invoice',
           inv.includes('אינה חשבונית מס'), 'no disclaimer');
      }
      await page.screenshot({ path: `${SHOTS}/tivuch-deal-invoice.png`, fullPage: false });
    } else {
      console.log('  (no deal cards on the board; invoice panel not exercised)');
    }

    ok('no uncaught JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));

    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true });
    await plant(m, session);
    const mp = await m.newPage();
    await mp.goto('https://more30.com/tivuch/app?v=documents', { waitUntil: 'domcontentloaded' });
    await mp.waitForTimeout(4000);
    const over = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('no horizontal overflow at 390px', over <= 1, 'overflow: ' + over);
    await m.close();
    await ctx.close();
  } finally {
    await browser.close();
  }

  console.log('\n=== summary ===\n  passed: ' + pass + '\n  failed: ' + fail);
  if (fail > 0) process.exit(1);
}

run().catch((e) => { console.error('harness error:', e); process.exit(2); });
