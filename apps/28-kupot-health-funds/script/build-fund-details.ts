/* Extracts the real per-fund coverage detail and writes hf_fund_details.json.
 *
 * The comparison screen had nothing to compare with: `fundsAvailable` holds the
 * identical four-fund list for all 435 topics, so it says only "all four cover
 * this", never how. The substance — which plan, at what rate, up to what amount,
 * after what waiting period — lives in the source workbook that app 06 was built
 * from (site/site-data.json), one column per fund. This pulls that across, keyed
 * by catalog number, which lines up 435/435 with this app's topics.
 *
 * Run: npx tsx script/build-fund-details.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "../06-kupot-holim/site/site-data.json";
const OUT = "hf_fund_details.json";
const FUNDS = ["clalit", "maccabi", "meuhedet", "leumit"] as const;

type Plan = {
  plan: string;
  code: string;
  text: string;
  rate?: string;
  amount?: string;
  waiting?: string;
};

/* Each cell is a run of "<plan> · <CODE> · <free text>" segments. The plan/code
   pairs are a closed set — nine of them, each appearing in all 435 topics — so we
   split on the exact pairs. Splitting on a generic "something · CODE ·" pattern
   instead lets the tail of one plan's text be mistaken for the next plan's name,
   which silently truncates the text a reader is meant to compare. */
const PLANS: Record<string, { plan: string; code: string }[]> = {
  clalit: [
    { plan: "מושלם זהב", code: "PROG09" },
    { plan: "מושלם פלטינום", code: "PROG10" },
  ],
  maccabi: [
    { plan: "מכבי כסף", code: "PROG14" },
    { plan: "מכבי זהב", code: "PROG15" },
    { plan: "מכבי שלי", code: "PROG16" },
  ],
  meuhedet: [
    { plan: "מאוחדת עדיף", code: "PROG19" },
    { plan: "מאוחדת שיא", code: "PROG20" },
  ],
  leumit: [
    { plan: "לאומית כסף", code: "PROG24" },
    { plan: "לאומית זהב", code: "PROG25" },
  ],
};

const NO_INFO = /^אין מידע/;

function parseCell(raw: string, fund: string): Plan[] {
  const text = (raw || "").trim();
  if (!text) return [];
  const spec = PLANS[fund] ?? [];

  const marks: { plan: string; code: string; start: number; end: number }[] = [];
  for (const { plan, code } of spec) {
    const re = new RegExp("(\\S+)\\s*·\\s*" + code + "\\s*·", "g");
    const m = re.exec(text);
    if (m) marks.push({ plan, code, start: m.index, end: m.index + m[0].length });
  }
  if (!marks.length) return [{ plan: "", code: "", text: clip(text) }];
  marks.sort((a, b) => a.start - b.start);

  return marks.map((h, i) => {
    const body = text
      .slice(h.end, i + 1 < marks.length ? marks[i + 1].start : undefined)
      .trim();
    const plan: Plan = { plan: h.plan, code: h.code, text: NO_INFO.test(body) ? "" : clip(body) };
    const rate = body.match(/שיעור:\s*([0-9]{1,3}%)/);
    const amount = body.match(/סכום:\s*([^|\n]{1,80}?)(?=\s*(?:\||המתנה:|$))/);
    const waiting = body.match(/המתנה:\s*([^|\n]{1,60}?)(?=\s*(?:\||שיעור:|סכום:|$))/);
    if (rate) plan.rate = rate[1];
    if (amount) plan.amount = amount[1].trim();
    if (waiting) plan.waiting = waiting[1].trim();
    return plan;
  });
}

function clip(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 1200 ? t.slice(0, 1200) + "…" : t;
}

const src = JSON.parse(readFileSync(SOURCE, "utf8"));
const out: Record<string, Record<string, Plan[]>> = {};
let cells = 0;
let withNumbers = 0;

for (const row of src.topics as any[]) {
  const per: Record<string, Plan[]> = {};
  for (const f of FUNDS) {
    const plans = parseCell(row[f], f);
    if (plans.length) {
      per[f] = plans;
      cells++;
      if (plans.some((p) => p.rate || p.amount || p.waiting)) withNumbers++;
    }
  }
  if (Object.keys(per).length) out[String(row.catalog)] = per;
}

writeFileSync(OUT, JSON.stringify(out), "utf8");
// eslint-disable-next-line no-console
console.log(
  `topics: ${Object.keys(out).length} | fund cells: ${cells} | cells with rate/amount/waiting: ${withNumbers}`
);
