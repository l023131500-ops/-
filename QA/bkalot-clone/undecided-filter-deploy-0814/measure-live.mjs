// דפדפן אמיתי, 1280x900, על הכתובת החיה more30.com/bkalot-studio/admin — לא על
// שרת סטטי מקומי. זה כל ההבדל בין הפעימה הזו ל-ac527e0: שם נמדד הקוד, כאן
// המוצר, דרך ה-rewrite של vercel.json ומעל 236 הבייטים ש-NetFree מזריק.
//
// cache-buster ולא הכתובת החשופה: שניות אחרי פריסה, דפדפן טרי קיבל את ה-HTML
// הישן על הכתובת החשופה בעוד ש-fetch על אותה מכונה קיבל את החדש (נרשם ב-f2001e0).
//
// מה שנמדד כאן הוא ה-DOM שהדפדפן בנה מהמסמך שהוגש, ולא צילום של המסך: תיבת
// «הכרעה ידנית» יושבת ב-#screen-list שמוסתר עד ההתחברות. ההפרדה הזו נאמרת
// במפורש בכל שדה — `dom_*` הוא DOM, `screen_*` הוא מה שעומד מול העיניים.
// למה לא נמדדה הרשימה המסוננת: ראה README, סעיף «מה שלא נמדד».
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = "https://more30.com/bkalot-studio/admin?cachebust=undecidedfilter0814";

const out = { url: LIVE, console_messages: [], failed_requests: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => out.console_messages.push(m.type() + ": " + m.text()));
page.on("requestfailed", (r) => out.failed_requests.push(r.url() + " :: " + (r.failure()?.errorText || "")));

const res = await page.goto(LIVE, { waitUntil: "load" });
out.http_status = res.status();
// צילום ריק מ-DOM בריא — תקלת playwright-blank-screenshot; שינוי גודל אחד
// לפני הצילום מונע אותה.
await page.setViewportSize({ width: 1280, height: 901 });
await page.setViewportSize({ width: 1280, height: 900 });

// הגרסה שהוגשה נמדדת מתוך הדפדפן עצמו ולא רק ב-HTTP: מסמך ממטמון היה נותן
// את כל שאר המדידה על קובץ שאינו זה שנפרס.
out.served_version = await page.evaluate(() => ({
  has_new_control: !!document.getElementById("f-decided"),
  has_removed_lastfilters: document.documentElement.innerHTML.includes(
    'kind: $("f-kind").value, q: $("f-q").value.trim()',
  ),
  html_bytes: new Blob([document.documentElement.outerHTML]).size,
}));

// התיבה עצמה — DOM, לא מסך. ה-select נבנה בזמן ריצה מהקבוע DECIDED, ולכן
// אפשרויות שנקראות מכאן מוכיחות שהלולאה החדשה רצה בייצור ולא רק שה-HTML הגיע.
out.dom_control = await page.evaluate(() => {
  const el = document.getElementById("f-decided");
  if (!el) return { present: false };
  const lab = document.querySelector('label[for="f-decided"]');
  const filters = document.getElementById("filters");
  const controls = [...filters.querySelectorAll("select,input")].map((x) => x.id);
  return {
    present: true,
    tag: el.tagName,
    label: lab ? lab.textContent.trim() : null,
    options: [...el.options].map((o) => [o.value, o.textContent]),
    value: el.value,
    disabled: el.disabled,
    index_in_filters: controls.indexOf("f-decided"),
    controls_in_order: controls,
  };
});

// ה-CSS החדש נמדד כפי שהדפדפן חישב אותו מהמסמך החי, ולא כמחרוזת בקובץ.
out.dom_grid = await page.evaluate(() => {
  const f = document.getElementById("filters");
  const cs = getComputedStyle(f);
  return { columns_raw: cs.gridTemplateColumns, column_count: cs.gridTemplateColumns.split(/\s+/).length };
});

// רגרסיה: מה שעומד מול העיניים בכניסה לא זז — מסך ההתחברות, לא הרשימה.
out.screen_state = await page.evaluate(() => ({
  login_visible: !document.getElementById("screen-login").hidden,
  list_hidden: document.getElementById("screen-list").hidden,
  case_hidden: document.getElementById("screen-case").hidden,
  title: document.title,
}));
await page.screenshot({ path: join(HERE, "01-live-login.png") });

await browser.close();
writeFileSync(join(HERE, "measure-out.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
