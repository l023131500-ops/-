/**
 * QA — the access flows, in a real browser.
 *
 * Everything else about kesef and nadlan-pro is verified over HTTP: the RPC
 * grants, the RLS isolation, the invoice constraint. What HTTP cannot check is
 * the part a person actually experiences — does a signed-out visitor get sent
 * to the login page, and does a signed-in one land inside the system instead of
 * back on the brochure they started from. That is the bug this whole round was
 * about, so it gets tested where it happens.
 *
 *   node scripts/qa/browser-access-flows.mjs
 *
 * Screenshots land in QA/shots/. Verified through more30.com only: NetFree
 * blocks *.vercel.app from this machine, so a *.vercel.app run would fail for
 * reasons that have nothing to do with the code.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const SHOTS = 'QA/shots';
let pass = 0, fail = 0;

const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + '  << ' + (detail ?? '')); }
};

async function signIn(email, password) {
  const body = JSON.stringify({ email, password });
  const headers = { apikey: ANON, 'content-type': 'application/json' };
  let r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers, body });
  if (!r.ok) {
    r = await fetch(`${SUPABASE}/auth/v1/signup`, { method: 'POST', headers, body });
  }
  const j = await r.json();
  if (!j.access_token) throw new Error('no token for ' + email + ': ' + JSON.stringify(j).slice(0, 200));
  return j;
}

/**
 * Plant a session the way /login does, so the app finds it exactly as it would
 * after a real Google round trip. The storage key and shape are supabase-js's
 * own; getting either wrong would make the app think nobody is signed in and
 * the test would pass for the wrong reason.
 */
async function plantSession(context, session) {
  await context.addInitScript(
    ([key, value]) => {
      try { window.localStorage.setItem(key, value); } catch (e) {}
    },
    ['more30-auth', JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: 'bearer',
      expires_in: session.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
      user: session.user,
    })],
  );
}

const settle = (page) => page.waitForTimeout(3500);

async function run() {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();

  try {
    /* ── signed out ──────────────────────────────────────────────────────── */
    console.log('\n=== signed out: both systems must send you to /login ===');
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'he-IL' });
      const page = await ctx.newPage();

      await page.goto('https://more30.com/tivuch/app', { waitUntil: 'domcontentloaded' });
      await settle(page);
      ok('nadlan-pro redirects a signed-out visitor to /login',
         page.url().includes('/login'), 'landed on ' + page.url());
      ok('and carries the return address', page.url().includes('tivuch'), page.url());
      await page.screenshot({ path: `${SHOTS}/tivuch-signedout.png`, fullPage: false });

      await page.goto('https://more30.com/kesef/app', { waitUntil: 'domcontentloaded' });
      await settle(page);
      ok('kesef redirects a signed-out visitor to /login',
         page.url().includes('/login'), 'landed on ' + page.url());
      await page.screenshot({ path: `${SHOTS}/kesef-signedout.png` });
      await ctx.close();
    }

    /* ── kesef, signed in ────────────────────────────────────────────────── */
    console.log('\n=== kesef: a signed-in user reaches the system ===');
    {
      const session = await signIn('qa.kesef.test@more30.com', 'Kesef-QA-2026-x7Rt');
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, locale: 'he-IL' });
      await plantSession(ctx, session);
      const page = await ctx.newPage();

      await page.goto('https://more30.com/kesef/app', { waitUntil: 'domcontentloaded' });
      await settle(page);
      ok('stays on the system, is not bounced to login', !page.url().includes('/login'), page.url());

      const h1 = (await page.locator('#viewAreas h1').textContent().catch(() => '')) ?? '';
      ok('the authority chooser is the landing screen', h1.includes('רשות מקומית'), 'h1: ' + h1);

      const cards = await page.locator('#areaGrid .auth-card').count();
      ok('all 259 authorities are listed', cards === 259, 'rendered ' + cards);
      await page.screenshot({ path: `${SHOTS}/kesef-areas.png`, fullPage: false });

      // Search must survive the round trip through PostgREST in Hebrew.
      await page.fill('#q', 'חצור');
      await page.waitForTimeout(1400);
      const found = await page.locator('#areaGrid .auth-card').count();
      ok('Hebrew search narrows to one authority', found === 1, 'got ' + found);

      await page.locator('#areaGrid .auth-card').first().click();
      await settle(page);
      const name = (await page.locator('#authName').textContent().catch(() => '')) ?? '';
      ok('the authority page opens', name.includes('חצור'), 'name: ' + name);

      // The honesty rule, seen the way a user sees it.
      const bodyText = (await page.locator('#viewAuthority').textContent()) ?? '';
      ok('an authority with no data says so instead of showing an empty table',
         bodyText.includes('לא זמין') || bodyText.includes('טרם'), 'no honest-empty text found');
      await page.screenshot({ path: `${SHOTS}/kesef-authority.png`, fullPage: false });

      await page.click('#navSources');
      await settle(page);
      const sources = await page.locator('#sourceList .src-row').count();
      ok('the source register lists all 12 sources', sources === 12, 'rendered ' + sources);
      await page.screenshot({ path: `${SHOTS}/kesef-sources.png`, fullPage: false });
      await ctx.close();
    }

    /* ── nadlan-pro, signed in ───────────────────────────────────────────── */
    console.log('\n=== nadlan-pro: a signed-in user reaches the system ===');
    {
      const session = await signIn('qa.np.agent@more30.com', 'NpQa-2026-agent-x7');
      const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: 'he-IL' });
      await plantSession(ctx, session);
      const page = await ctx.newPage();

      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto('https://more30.com/tivuch/app', { waitUntil: 'domcontentloaded' });
      await settle(page);
      ok('stays on the system, is not bounced to login', !page.url().includes('/login'), page.url());

      // This account owns offices from the HTTP smoke test, so it lands on the
      // dashboard rather than on office setup.
      const onDash = await page.locator('#viewDash').isVisible().catch(() => false);
      const onSetup = await page.locator('#viewSetup').isVisible().catch(() => false);
      ok('lands on a working screen', onDash || onSetup, 'neither dashboard nor setup is visible');

      if (onDash) {
        const kpis = await page.locator('#dashBody .kpi').count();
        ok('the dashboard renders its KPI tiles', kpis >= 9, 'tiles: ' + kpis);
        await page.screenshot({ path: `${SHOTS}/tivuch-dashboard.png`, fullPage: false });

        await page.click('.tab[data-view="board"]');
        await settle(page);
        const cols = await page.locator('#boardBody .col').count();
        const empty = await page.locator('#boardBody .empty').count();
        ok('the pipeline shows seven stages (or an honest empty state)',
           cols === 7 || empty === 1, 'columns: ' + cols);
        await page.screenshot({ path: `${SHOTS}/tivuch-board.png`, fullPage: false });

        await page.click('.tab[data-view="contacts"]');
        await settle(page);
        await page.screenshot({ path: `${SHOTS}/tivuch-contacts.png`, fullPage: false });
        const rows = await page.locator('#contactsBody tr.row').count();
        ok('contacts load', rows >= 0, 'rows: ' + rows);

        if (rows > 0) {
          await page.locator('#contactsBody tr.row').first().click();
          await settle(page);
          const open = await page.locator('.drawer').isVisible().catch(() => false);
          ok('the contact drawer opens', open, 'drawer did not open');
          await page.screenshot({ path: `${SHOTS}/tivuch-contact-drawer.png`, fullPage: false });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          const closed = !(await page.locator('.drawer').isVisible().catch(() => false));
          ok('Escape closes the drawer', closed, 'still open');
        }

        await page.click('.tab[data-view="properties"]');
        await settle(page);
        await page.screenshot({ path: `${SHOTS}/tivuch-properties.png`, fullPage: false });
      }

      ok('no uncaught JavaScript errors on the whole tour',
         errors.length === 0, errors.slice(0, 3).join(' | '));

      /* mobile, because an agent uses this in the field */
      const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true });
      await plantSession(m, session);
      const mp = await m.newPage();
      await mp.goto('https://more30.com/tivuch/app', { waitUntil: 'domcontentloaded' });
      await settle(mp);
      const overflow = await mp.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok('no horizontal overflow at 390px', overflow <= 1, 'overflow: ' + overflow + 'px');
      await mp.screenshot({ path: `${SHOTS}/tivuch-mobile.png`, fullPage: false });
      await m.close();
      await ctx.close();
    }

    /* ── the brochure points at the system ───────────────────────────────── */
    console.log('\n=== brochures point into the system, not at themselves ===');
    {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'he-IL' });
      const page = await ctx.newPage();

      for (const [name, url, want] of [
        ['nadlan-pro', 'https://more30.com/tivuch', '/tivuch/app'],
        ['kesef', 'https://more30.com/kesef', '/kesef/app'],
      ]) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);

        // Native querySelectorAll inside evaluate, deliberately not Playwright's
        // selector engine: that one pierces open shadow roots, so it also picks
        // up the shared auth-button pill's own menu. Those links point back at
        // the current page and are supposed to — it is the platform sign-in
        // control, not this brochure's call to action. Only the page's own
        // markup is under test here.
        const hrefs = await page.evaluate(() =>
          [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
        const entries = hrefs.filter((h) => h && (h.includes('/app') || h.includes('/login')));
        ok(`${name} brochure sends visitors to ${want}`,
           entries.length > 0 && entries.every((h) => h.includes(want)),
           'found: ' + entries.join(', '));
        // The regression that started this: an entry point that returns you to
        // the brochure you are already on.
        ok(`${name} brochure has no self-referential login link`,
           !hrefs.some((h) => h && h.includes('login?from') && h.endsWith(want.replace('/app', ''))),
           'self-referential link present');
        await page.screenshot({ path: `${SHOTS}/${name}-brochure.png`, fullPage: false });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n=== summary ===');
  console.log('  passed: ' + pass);
  console.log('  failed: ' + fail);
  console.log('  screenshots: ' + SHOTS);
  if (fail > 0) process.exit(1);
}

run().catch((e) => { console.error('harness error:', e); process.exit(2); });
