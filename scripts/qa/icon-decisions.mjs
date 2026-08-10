/**
 * How many icons on a page are DECISIONS, and how many are just records?
 *
 * QA/platform/DESIGN_SAMENESS.md ends with an instruction to whoever continues
 * §6, and this script is that instruction executed:
 *
 *   "מי שממשיך צריך למדוד קודם כמה מהאייקונים בעמוד הם לכל-רשומה ולא
 *    לכל-החלטה, ולהתחיל ממערכת שבה הריבוי נובע מהתבנית עצמה."
 *
 * The work order for §6 was ranked by design-fingerprint.mjs's raw `lucideIcons`
 * count, which put `galil` first at 104. Reading the page showed 70 of those sit
 * in the synagogue directory: MapPin for the address, Clock for the hours, Phone
 * for the phone — one icon per data field, repeated across dozens of records. In
 * the source each appears ONCE. Removing them removes information from a
 * directory, not noise from a template, so the number that led the list was
 * measuring the size of a dataset.
 *
 * The number that answers §6 is the one this script produces: how many distinct
 * icon *placements* a designer chose. An icon rendered 40 times inside a repeated
 * card is one decision. Forty different icons scattered across a landing page is
 * forty — and that is what reads as generated.
 *
 * The grouping is structural, not visual. For every SVG we build a signature from
 * its ancestor chain (tag + classes, five levels up) plus the slot it occupies
 * among its parent's element children. Instances of one component in a list share
 * that signature exactly and collapse to one entry; a hand-placed icon in a hero
 * has a chain nothing else shares and stands alone.
 *
 * The signature deliberately does NOT include the icon's own name. An icon that
 * comes from the data — `<cat.icon />` inside a category grid — renders a
 * different glyph per record while staying in the same slot of the same markup.
 * That is ONE thing a designer chose ("each category carries its own mark"), and
 * keying by name counted it once per record: zchuyot's first measurement said 43
 * decisions when 20 of them were the single `<cat.icon>` at RightsCategories.tsx:210.
 * Two icons that are genuinely separate choices sit in different slots — a clock
 * at slot 0 and a coin at slot 1 of the same row stay two entries — so collapsing
 * by slot loses nothing that was really a choice.
 *
 * `named` keeps the old name-keyed count so the two can be compared.
 *
 *   node scripts/qa/icon-decisions.mjs             # the 9 full-kit systems
 *   node scripts/qa/icon-decisions.mjs /galil      # one
 *   node scripts/qa/icon-decisions.mjs --all       # every route
 *   node scripts/qa/icon-decisions.mjs /zchuyot --list   # the slots themselves
 *
 * Writes QA/platform/_icon-decisions.json and prints the corrected work order.
 *
 * ⚠️ `--list` exists because the count is not actionable on its own, and the
 * last two §6 findings were stopped by reading the page rather than the number.
 * DESIGN_SAMENESS.md ends on that instruction:
 *
 *   "מה שנשאר לבדיקה ידנית הוא ההנחות החד-פעמיות, ואת אלה צריך לראות בעמוד
 *    לפני שנוגעים."
 *
 * A decision slot is a removal candidate only if the glyph carries something the
 * text beside it does not. `--list` prints, per slot, the section it sits in and
 * the text of its own container, so that judgement is made against the rendered
 * page instead of against an import list. It writes a review sheet per system
 * and deliberately does NOT touch _icon-decisions.json — the counts there come
 * from the unfiltered pass and a listing run must not narrow them.
 *
 * ── Two faults the slot count cannot see ────────────────────────────────────
 * The 10/08 zchuyot round fixed two real §6 defects and every number here stayed
 * identical bit-for-bit (git diff on _icon-decisions.json was empty). Neither was
 * a caching problem — the counts simply do not measure those shapes:
 *
 *   A. One control, the same mark twice. The chat launcher drew
 *      lucide-message-circle and, forty pixels later, a 💬 in its own label. An
 *      emoji is a text node, not an SVG, so it was never counted; removing it
 *      could not move `rendered`, `decisions` or `lucide`.
 *   B. One datum, two glyphs. 02-3131500 was drawn with phone-call in the
 *      contact strip and phone in the footer list. Both slots existed before and
 *      after — a swap is not a removal, so nothing shrank.
 *
 *   C. One band, the same glyph in two slots — A drawn entirely in lucide, with
 *      no emoji to trip the check. mthbram's donation band held heart 12px on a
 *      chip and heart 16px on the link below it; egod's tips band held lightbulb
 *      16px on a chip and 24px on the card. Both were found by reading the
 *      review sheet by hand while this file printed "אין".
 *
 *   D. One page, two floating controls wearing the same glyph. zchuyot pins a
 *      chat launcher in each bottom corner — FloatingBot on the left, AIAgent on
 *      the right — both drawing message-circle. Neither sits in a band, so C
 *      could only see it while every landmark-less slot shared the key "—".
 *
 * `doubleMark`, `splitGlyph`, `repeatInBand` and `floatingTwice` measure those four.
 * They are lists, not counts: each entry names a place to look. They deliberately
 * do not feed the `decisions` ranking — the work order stays comparable across
 * rounds.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const ROUTES = {
  torah: '/torah', tamlul: '/tamlul', modaot: '/modaot', imud: '/imud',
  briut: '/briut', bkalot: '/bkalot', smel: '/smel', smachot: '/smachot',
  egod: '/egod', chatzor: '/chatzor/', chizukim: '/chizukim/',
  orech: '/orech', zchuyot: '/zchuyot', mthbram: '/mthbram', galil: '/galil',
  studio: '/studio', mechiron: '/mechiron', kupot: '/kupot',
  nadlan: '/nadlan/', crm: '/crm', gesher: '/gesher', kesef: '/kesef',
  kiosk: '/kiosk/', tivuch: '/tivuch', portal: '/',
};

// The 9 systems DESIGN_SAMENESS.md measured at 4/4 on the shared kit. They are
// the whole of the §6 work list; the other 16 are either partial or already
// carry an identity of their own, and §6 says explicitly not to touch those.
const FULL_KIT = ['imud', 'smel', 'egod', 'chatzor', 'chizukim', 'zchuyot',
                  'mthbram', 'galil', 'gesher'];

const args = process.argv.slice(2);
const all = args.includes('--all');
const listing = args.includes('--list');
const only = args.filter((a) => !a.startsWith('--')).map((s) => s.replace(/^\//, '').replace(/\/$/, ''));
const targets = Object.entries(ROUTES).filter(([k]) =>
  only.length ? only.includes(k) : all ? true : FULL_KIT.includes(k));

/**
 * A filtered run updates the file, it does not replace it — the same trap that
 * cost _design.json 408 lines when design-fingerprint.mjs was run for one system.
 */
const OUT = 'QA/platform/_icon-decisions.json';
let out = {};
if (fs.existsSync(OUT)) {
  try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { out = {}; }
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await settle(page, { minChars: 200 });

    out[key] = await page.evaluate(() => {
      const cls = (el) => (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);

      // lucide writes its component name into the class list (lucide-map-pin).
      // Without a name we fall back to the path data, which is stable per glyph.
      const nameOf = (svg) => {
        const named = cls(svg).find((c) => c.startsWith('lucide-'));
        if (named) return named.replace('lucide-', '');
        const d = svg.querySelector('path')?.getAttribute('d') || '';
        return d ? 'path:' + d.slice(0, 24) : 'svg';
      };

      // Five levels is enough to separate two different cards and not so deep
      // that it reaches the page shell, where everything shares ancestors. The
      // slot index keeps sibling icons apart: two marks in one row are two
      // choices, the same mark repeated down a list is one.
      const chain = (svg) => {
        const parts = [];
        let el = svg.parentElement;
        const slot = el ? [...el.children].indexOf(svg) : 0;
        for (let i = 0; i < 5 && el && el !== document.body; i++) {
          parts.push(el.tagName.toLowerCase() + '.' + cls(el).join('.'));
          el = el.parentElement;
        }
        return '#' + slot + '@' + parts.join('>');
      };

      const txt = (el, max) => (el?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, max);

      // Which band of the page the slot sits in. Two things are needed and they
      // are not the same thing: a NAME a reader recognises, and an IDENTITY that
      // says whether two slots are in the same band.
      //
      // The name is the landmark's own heading, not its class list.
      // The identity is the landmark ELEMENT. Keying the pair check by the name
      // merged every band that has no heading into one: an unheaded <section>
      // prints "section", and a slot with no landmark ancestor at all prints "—",
      // so a floating launcher fixed to the corner of the viewport shared a key
      // with whatever else the page left unheaded. That is exactly how the first
      // run reported message-circle ×2 on zchuyot — a defect DESIGN_SAMENESS
      // 10/08 (ח) recorded as "requires reading" because the tool could not tell
      // one band from two.
      // A control pinned to the viewport is not in any band of the page — it
      // floats over all of them. Two of them are two places, however close their
      // glyphs sit in the markup, so the pinned element is the unit there.
      const LANDMARK = /^(section|footer|header|nav|main)$/;
      const bandElOf = (svg) => {
        let el = svg.parentElement, pinned = null, top = svg;
        while (el && el !== document.body) {
          if (LANDMARK.test(el.tagName.toLowerCase())) return { el, kind: 'landmark' };
          if (!pinned && getComputedStyle(el).position === 'fixed') pinned = el;
          top = el;
          el = el.parentElement;
        }
        // No landmark: a pinned ancestor is a real unit, the page shell is not.
        return pinned ? { el: pinned, kind: 'floating' } : { el: top, kind: 'page' };
      };
      const sectionOf = (svg) => {
        const { el, kind } = bandElOf(svg);
        if (kind !== 'landmark') return kind === 'floating' ? 'צף' : '—';
        const t = el.tagName.toLowerCase();
        const h = el.querySelector('h1, h2, h3');
        return (h && txt(h, 40)) || (t === 'nav' ? 'ניווט' : t);
      };
      const bandIds = new Map();
      const bandOf = (svg) => {
        const { el, kind } = bandElOf(svg);
        if (!bandIds.has(el)) bandIds.set(el, bandIds.size + 1);
        return { band: bandIds.get(el), kind };
      };

      // The text the glyph sits next to. Climb until there IS text: an icon
      // alone in its own <span> says nothing about what it is labelling.
      //
      // Climbing crosses control boundaries, and that is how the sheet named the
      // wrong button. mthbram's 16px `search` marks the search FIELD; the field
      // and the «הוספת שיעור למאגר» button share one flex row, so the first
      // ancestor with any text at all handed back the button's caption
      // (DESIGN_SAMENESS 10/08 (י) — read against production, that button draws
      // Plus only and carries no search glyph). A caption that belongs to a
      // control the icon is not inside is not the text beside the icon.
      //
      // So the climb subtracts foreign controls instead of stopping dead at the
      // nearest one: an icon-only <a> inside a card is still labelled by the
      // card's own heading, which a hard ceiling would have thrown away. Only
      // text sitting inside a control that does NOT contain this svg is dropped.
      const CONTROL = 'a,button,input,textarea,select,label,summary,[role="button"],[role="link"]';
      const textBesides = (el, svg) => {
        let s = '';
        for (const n of el.childNodes) {
          if (n.nodeType === 3) { s += n.nodeValue; continue; }
          if (n.nodeType !== 1) continue;
          if (!n.contains(svg) && n.matches(CONTROL)) continue;   // someone else's control
          if (!n.getClientRects().length) continue;               // not rendered
          s += ' ' + textBesides(n, svg);
        }
        return s;
      };
      // A field with no visible label is marked by the icon, not by whatever
      // text the row happens to hold. Its own accessible name is the honest
      // answer, and saying where it came from keeps the sheet readable.
      const fieldNameNear = (el, svg) => {
        for (const f of el.querySelectorAll('input,textarea,select')) {
          if (f.contains(svg)) continue;
          const n = (f.getAttribute('aria-label') || f.getAttribute('placeholder') ||
                     f.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
          if (n) return n;
        }
        return '';
      };
      const labelOf = (svg) => {
        let el = svg.parentElement;
        for (let i = 0; i < 4 && el && el !== document.body; i++) {
          // innerText where nothing foreign is in the way, so every label that
          // was never crossing a boundary keeps exactly the value it had.
          const foreign = [...el.querySelectorAll(CONTROL)].some((c) => !c.contains(svg));
          const t = foreign
            ? textBesides(el, svg).replace(/\s+/g, ' ').trim().slice(0, 70)
            : txt(el, 70);
          if (t) return t;
          const field = fieldNameNear(el, svg);
          if (field) return 'שדה: ' + field.slice(0, 64);
          el = el.parentElement;
        }
        return '';
      };

      // A glyph is a mark at glyph scale. `egod` ranked second on 17 decisions
      // and one of them was the hero's wave divider — a single 1280px-wide
      // <path> that separates two bands of the page. It is artwork, not an
      // icon, and no §6 reduction could ever apply to it. The rule is narrowed
      // to non-lucide only, so it cannot move a count that came from the icon
      // library: measured 10/08 across the four leaders, `egod` holds the only
      // such SVG (zchuyot 52 · mthbram 24 · galil 68 visible lucide, zero
      // non-lucide each), so this changes exactly one number.
      const decorative = (svg, r) =>
        !(svg.getAttribute('class') || '').includes('lucide') && r.width >= 200;

      const svgs = [...document.querySelectorAll('svg')];
      const groups = new Map();
      const decor = [];
      for (const svg of svgs) {
        const r = svg.getBoundingClientRect();
        // Zero-size SVGs are sprite definitions and defs, not marks on a page.
        if (r.width < 4 || r.height < 4) continue;
        if (decorative(svg, r)) { decor.push(Math.round(r.width) + 'px'); continue; }
        const k = chain(svg);
        const g = groups.get(k) || {
          icon: nameOf(svg), n: 0, names: new Set(),
          section: sectionOf(svg), ...bandOf(svg), label: labelOf(svg),
          size: Math.round(r.width),
        };
        g.n++;
        g.names.add(nameOf(svg));
        groups.set(k, g);
      }

      // ── Fault A: one control, the same mark twice ────────────────────────
      // The container has to be a control, not a band of the page: an icon in a
      // section that also holds an emoji three paragraphs down is not drawing
      // anything twice. The ceiling of 80 characters is what keeps this to
      // buttons, chips and list rows.
      // \p{Extended_Pictographic} alone also matches ©, ® and ™, which every
      // footer carries and which are typography, not marks. The narrowing keeps
      // characters that are drawn as pictures: astral-plane emoji, or a BMP
      // character explicitly given emoji presentation with U+FE0F.
      const PICTO = /\p{Extended_Pictographic}️|[\u{1F000}-\u{1FAFF}]/gu;
      const doubleMark = [];
      const seenDouble = new Set();
      for (const svg of svgs) {
        const r = svg.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        let el = svg.parentElement;
        for (let i = 0; i < 3 && el && el !== document.body; i++) {
          const t = txt(el, 80);
          if (t) {
            const emoji = t.match(PICTO);
            if (emoji) {
              const k = nameOf(svg) + '|' + t;
              if (!seenDouble.has(k)) {
                seenDouble.add(k);
                doubleMark.push(`${nameOf(svg)} + ${[...new Set(emoji)].join('')} — "${t}"`);
              }
            }
            break;                       // the innermost container with text wins
          }
          el = el.parentElement;
        }
      }

      // ── Fault B: one datum, two glyphs ───────────────────────────────────
      // A phone number, an email or a street address is the same fact wherever
      // it appears, so it should carry the same mark. Grouping by the fact
      // instead of by the slot is what makes a swap visible.
      // The first run of this check flagged egod: 02-3131600 carrying `phone`
      // in one place and `message-circle` in another. Reading the page showed
      // the two sit on a tel: link and a wa.me link — one number, two CHANNELS,
      // and the glyph is marking the channel, which is correct. So the datum
      // alone is not the key; the datum *within one channel* is. Two marks for
      // the same number on the same kind of link is the fault; two marks on a
      // call and a chat is a label.
      const channelOf = (svg) => {
        const href = svg.closest('a')?.getAttribute('href') || '';
        const m = href.match(/^(tel|mailto|sms|whatsapp):/i);
        if (m) return m[1].toLowerCase();
        if (/^https?:/i.test(href)) { try { return new URL(href).hostname; } catch { return 'http'; } }
        return href ? 'other' : '—';
      };
      const DATUM = /[\w.+-]+@[\w.-]+\.\w{2,}|0\d{1,2}-?\d{7}|\+972[-\d]{8,}/g;
      const byDatum = new Map();
      for (const svg of svgs) {
        const r = svg.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (decorative(svg, r)) continue;
        const ch = channelOf(svg);
        for (const d of new Set((labelOf(svg).match(DATUM) || []).map((s) => s.replace(/-/g, '')))) {
          const k = d + ' @' + ch;
          if (!byDatum.has(k)) byDatum.set(k, new Set());
          byDatum.get(k).add(nameOf(svg));
        }
      }
      const splitGlyph = [...byDatum.entries()]
        .filter(([, names]) => names.size > 1)
        .map(([k, names]) => `${k} → ${[...names].join(' / ')}`);

      const list = [...groups.values()]
        .map((g) => ({
          icon: g.icon, n: g.n, names: [...g.names],
          section: g.section, band: g.band, kind: g.kind, label: g.label, size: g.size,
        }))
        .sort((a, b) => b.n - a.n);

      // ── Fault C: one band, the same glyph in two slots ───────────────────
      // Fault A above only sees an SVG paired with an emoji, because that is the
      // shape the zchuyot launcher had. The next two findings were the same
      // defect drawn entirely in lucide and it missed both: mthbram's donation
      // band held heart 12px on a chip reading «שותפים בהפצת התורה» and heart
      // 16px on the link below it (Footer.tsx:21/36), and egod's tips band held
      // lightbulb 16px on a chip whose first word is «טיפים» and lightbulb 24px
      // on the card under it (TipsSection.tsx:39/57). Both were found by reading
      // the review sheet by hand; the tool said the page was clean.
      //
      // Two slots, not two icons: a glyph repeated down a list is one slot and
      // is not this. Slots whose glyph comes from the data are skipped — their
      // name is a per-record value, so a collision there says nothing about a
      // choice someone made. Bands are compared by the landmark ELEMENT the slot
      // sits in (see `bandOf`), not by the heading text, so two bands that happen
      // to share a name — or share the absence of one — stay two bands.
      //
      // This is a list of places to open, like A and B, and deliberately stays
      // out of the `decisions` ranking: a repeat is one glyph to remove, not a
      // reason to reorder the work. Two entries here are already known and
      // fixed in source, waiting on a deploy (core.issues #83).
      const bands = new Map();
      for (const g of list) {
        if (g.names.length > 1) continue;          // glyph comes from the data
        const k = g.band + '|' + g.icon;
        if (!bands.has(k)) bands.set(k, []);
        bands.get(k).push(g);
      }
      // A slot drawn once per record is a list marker, not a second placement:
      // chatzor's arrow-left sits on four synagogue cards and again on the CTA
      // under them, and smel draws check on every bullet of two plan tiers. That
      // is one affordance marked consistently — the same per-record repetition
      // `decisions` already refuses to count. Both hand-found defects were slots
      // of one. So the pairs where every slot is a one-off are the finding, and
      // the rest are kept apart rather than dropped, under `repeatPerRecord`.
      // Fault B and fault C pull in opposite directions on one shape, and the
      // first run hit it: zchuyot's phone band draws `phone` on 02-3131500 twice,
      // which is a repeat — but it is a repeat the 10/08 round *created on
      // purpose*, unifying a phone-call/phone split that fault B had flagged as
      // one datum wearing two glyphs. Flagging it back would ask the next round
      // to re-split the number. When both slots carry the same datum, fault B
      // wins and the pair is recorded as settled, not as a defect.
      const datumOf = (g) => new Set((g.label.match(DATUM) || []).map((s) => s.replace(/-/g, '')));
      const sharesDatum = (gs) => {
        const first = datumOf(gs[0]);
        return first.size > 0 && gs.slice(1).every((g) => [...datumOf(g)].some((d) => first.has(d)));
      };
      const allPaired = [...bands.entries()].filter(([, gs]) => gs.length > 1);
      const paired = allPaired.filter(([, gs]) => !sharesDatum(gs));
      const repeatSameDatum = allPaired.filter(([, gs]) => sharesDatum(gs));
      // The key is an element id, which means nothing to a reader — the band is
      // named from the slots themselves, which all sit in that one landmark.
      const describe = ([, gs]) => {
        const where = gs.map((g) => `${g.size}px "${(g.label || '—').slice(0, 40)}"`).join(' + ');
        return `${gs[0].section} · ${gs[0].icon} ×${gs.length} — ${where}`;
      };
      const oneOff = paired.filter(([, gs]) => gs.every((g) => g.n === 1));
      // Only a landmark is a band. A pair with no landmark over it sits in the
      // page shell, which every slot on the page shares — that is not evidence
      // of one placement made twice, and it is reported apart rather than
      // dropped, because the shape it hides is real (see `floatingTwice`).
      const repeatInBand = oneOff.filter(([, gs]) => gs[0].kind === 'landmark').map(describe);
      const repeatUnbanded = oneOff.filter(([, gs]) => gs[0].kind === 'page').map(describe);
      const repeatPerRecord = paired.filter(([, gs]) => gs.some((g) => g.n > 1)).map(describe);
      const settledByDatum = repeatSameDatum.map(describe);

      // ── Fault D: one page, two floating controls wearing the same glyph ──
      // Not a band repeat and not one control marked twice: two separate pinned
      // buttons, each its own unit, drawing the same mark. zchuyot ships both
      // AIAgent (bottom-6 right-6, MessageCircle 20px) and FloatingBot (bottom-6
      // left-6, MessageCircle 28px) — two chat launchers in two corners of one
      // viewport. The first version of fault C reported this pair only because
      // every landmark-less slot shared the key "—"; it was right by accident,
      // and this is the check that is right on purpose.
      const byFloat = new Map();
      for (const g of list) {
        if (g.kind !== 'floating' || g.names.length > 1 || g.n > 1) continue;
        if (!byFloat.has(g.icon)) byFloat.set(g.icon, new Map());
        byFloat.get(g.icon).set(g.band, g);
      }
      const floatingTwice = [...byFloat.entries()]
        .filter(([, byBand]) => byBand.size > 1)
        .map(([icon, byBand]) => {
          const gs = [...byBand.values()];
          return `${icon} ×${gs.length} פקדים צפים — ` +
            gs.map((g) => `${g.size}px "${(g.label || '—').slice(0, 40)}"`).join(' + ');
        });
      const rendered = list.reduce((s, g) => s + g.n, 0);
      // The old name-keyed count, kept so a jump between the two is visible
      // instead of silently rewriting a number the work order was built on.
      const named = new Set();
      for (const svg of svgs) {
        const r = svg.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (decorative(svg, r)) continue;
        named.add(nameOf(svg) + '@' + chain(svg));
      }
      return {
        rendered,                                     // every icon the visitor sees
        decisions: list.length,                       // distinct placements a person chose
        named: named.size,                            // the previous, name-keyed count
        perRecord: rendered - list.length,            // repetition owed to the data
        decor,                                        // page artwork, excluded above
        lucide: document.querySelectorAll('svg.lucide, svg[class*="lucide"]').length,
        // Placements whose glyph comes from the data: one slot, many names. These
        // are the whole of the gap between `decisions` and `named`.
        dataDriven: list.filter((g) => g.names.length > 1)
          .map((g) => `${g.names.length} names in 1 slot (${g.names.slice(0, 3).join(', ')}…)`),
        // The heaviest repeats, so the ranking can be checked by eye rather than
        // trusted — the last two §6 findings were measurement errors.
        top: list.filter((g) => g.n > 1).slice(0, 5).map((g) => `${g.icon}×${g.n}`),
        // The two shapes the counts above are blind to. Lists of places to look,
        // deliberately outside the `decisions` ranking.
        doubleMark,
        splitGlyph,
        repeatInBand,
        floatingTwice,
        repeatUnbanded,
        repeatPerRecord,
        settledByDatum,
        // every slot with its on-page context. Stripped before the JSON is
        // written; only --list keeps it, and only into the review sheet.
        slots: list,
      };
    });
  } catch (e) {
    out[key] = { error: String(e.message).slice(0, 100) };
  }
  await page.close();

  const f = out[key];
  const slots = f.slots || [];
  delete f.slots;                 // the JSON keeps counts, not the page dump

  if (listing && !f.error) {
    const sheet = `QA/platform/_icon-slots-${key}.md`;
    const rows = slots.map((g, i) => {
      const fromData = g.names.length > 1;
      const glyph = fromData ? `${g.names.length} גליפים` : g.icon;
      // A slot whose glyph comes from the data is a single choice carrying a
      // per-record value — DESIGN_SAMENESS 10/08 (ב). Not a removal candidate.
      const verdict = fromData ? 'מהנתונים — נושא מידע' : (g.n > 1 ? `×${g.n} ברשימה` : 'הנחה חד-פעמית');
      return `| ${i + 1} | ${g.section} | \`${glyph}\` | ${g.size}px | ${g.n} | ${verdict} | ${g.label || '—'} |`;
    });
    const fromData = slots.filter((g) => g.names.length > 1).length;
    fs.mkdirSync('QA/platform', { recursive: true });
    fs.writeFileSync(sheet,
      `# ${key} — ${slots.length} החלטות אייקון, סלוט־סלוט\n\n` +
      `> נמדד מול https://more30.com${route} · \`node scripts/qa/icon-decisions.mjs ${route} --list\`\n` +
      `> ${slots.length} סלוטים · ${fromData} מהם מקבלים את הגליף מהנתונים · ` +
      `${f.rendered} אייקונים מוצגים בפועל.\n\n` +
      `העמודה האחרונה היא הטקסט שיושב ליד האייקון. **אם הטקסט כבר אומר את מה\n` +
      `שהאייקון מצייר — האייקון קישוט.** אם אין טקסט כלל, האייקון הוא הפקד\n` +
      `היחיד ואסור להסיר אותו בלי להחליף אותו בתווית.\n\n` +
      `| # | סקשן | גליף | גודל | מוצג | סוג | הטקסט לידו |\n` +
      `|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`,
      'utf8');
    console.log(`   -> ${sheet}`);
  }

  console.log(
    key.padEnd(10) +
      (f.error
        ? 'ERROR ' + f.error
        : `rendered=${String(f.rendered).padStart(3)}  decisions=${String(f.decisions).padStart(3)}` +
          `  (named=${String(f.named).padStart(3)})  per-record=${String(f.perRecord).padStart(3)}` +
          `  ${f.top.join(' ')}${f.dataDriven.length ? '  | ' + f.dataDriven.join(' ') : ''}`),
  );
  // Printed under the line rather than on it: these are addresses to open, not
  // figures to rank, and folding them into the row would hide the text that
  // says which control to look at.
  for (const d of f.doubleMark || []) console.log(`   ⚠ סמל כפול באותו פקד: ${d}`);
  for (const s of f.splitGlyph || []) console.log(`   ⚠ אותו נתון, שני גליפים: ${s}`);
  for (const s of f.repeatInBand || []) console.log(`   ⚠ אותו גליף פעמיים ברצועה: ${s}`);
  for (const s of f.floatingTwice || []) console.log(`   ⚠ שני פקדים צפים, אותו גליף: ${s}`);
  // Not a warning and not hidden either: the pairs set aside as list markers are
  // counted out loud so the filter above can be audited from the run itself.
  if (f.repeatPerRecord?.length) {
    console.log(`   · ${f.repeatPerRecord.length} זוגות הוצאו כסימני רשימה (repeatPerRecord ב-JSON)`);
  }
  if (f.repeatUnbanded?.length) {
    console.log(`   · ${f.repeatUnbanded.length} זוגות בלי רצועה משותפת (repeatUnbanded ב-JSON — לפתוח ולקרוא)`);
  }
  for (const s of f.settledByDatum || []) console.log(`   ✓ חזרה שתקלה B דורשת — אותו נתון, אותו גליף: ${s}`);
}

await browser.close();

fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

// The corrected work order: by decisions, not by rendered icons. A system whose
// two numbers are far apart is a directory and belongs at the bottom; a system
// where they are nearly equal is carrying that many separate choices, and that
// is the one to start on.
const good = Object.entries(out).filter(([, f]) => !f.error);
console.log('\n=== §6 work order, ranked by icon DECISIONS ===');
for (const [k, f] of good.sort((a, b) => b[1].decisions - a[1].decisions)) {
  const share = f.rendered ? Math.round((f.perRecord / f.rendered) * 100) : 0;
  console.log(
    `  ${String(f.decisions).padStart(3)} decisions  ${String(f.rendered).padStart(3)} rendered` +
      `  ${String(share).padStart(3)}% from records   ${k}`,
  );
}

// The two fault lists get their own roll-up. They do not reorder anything above:
// a system can sit last on `decisions` and still be drawing one phone number two
// different ways, and that is a fix worth a round on its own.
const faults = good.filter(([, f]) =>
  (f.doubleMark?.length || f.splitGlyph?.length || f.repeatInBand?.length || f.floatingTwice?.length));
console.log('\n=== ליקויים שהדירוג לעיל עיוור אליהם ===');
if (!faults.length) console.log('  אין');
for (const [k, f] of faults) {
  console.log(
    `  ${k}: ${f.doubleMark?.length || 0} סמל כפול · ${f.splitGlyph?.length || 0} נתון עם שני גליפים` +
      ` · ${f.repeatInBand?.length || 0} גליף כפול ברצועה` +
      ` · ${f.floatingTwice?.length || 0} גליף על שני פקדים צפים`);
}
console.log(`-> ${OUT} (${Object.keys(out).length} systems)`);
