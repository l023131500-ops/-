import { hfTopics, hfSwitchLeads } from "@shared/schema";
import type {
  HfTopic,
  HfTopicRow,
  FundAvailable,
  InsertSwitchLead,
  SwitchLead,
  HfMeta,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import path from "node:path";

// במצב Supabase (פרודקשן/Vercel) — לא נוגעים ב-SQLite בכלל.
const DATA_STORE_SUPABASE =
  process.env.DATA_STORE === "supabase" &&
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

// טעינה עצלה של better-sqlite3 — רק כשלא במצב Supabase.
// חשוב ל-Vercel: import סטטי של המודול הנייטיב מפיל את הפונקציה בזמן טעינה.
let drizzle: any = null;
let sqlite: any = null;
if (!DATA_STORE_SUPABASE) {
  // טעינה עצלה לחלוטין — שם המודול מורכב ממשתנה כדי ש-esbuild/@vercel/node
  // לא ינסו לאגד את המודול הנייטיב (שמפיל את פונקציית ה-serverless).
  // ב-Vercel (מצב Supabase) הענף הזה לא רץ בכלל.
  const req: any = eval("require");
  const sqliteMod = "better" + "-sqlite3";
  const drizzleMod = "drizzle-orm/" + "better-sqlite3";
  const Database = req(sqliteMod);
  drizzle = req(drizzleMod).drizzle;
  sqlite = new Database("data.db");
  sqlite.pragma("journal_mode = WAL");
}

// יצירת הטבלאות אם אינן קיימות (במקום migrate — פשוט ועמיד)
if (sqlite) sqlite.exec(`
  CREATE TABLE IF NOT EXISTS hf_topics (
    id INTEGER PRIMARY KEY,
    catalog_no INTEGER,
    kind TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    sub_category TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT '',
    benefit_summary TEXT NOT NULL DEFAULT '',
    range_text TEXT NOT NULL DEFAULT '',
    best_fund TEXT NOT NULL DEFAULT '',
    public_site_text TEXT NOT NULL DEFAULT '',
    source_name TEXT NOT NULL DEFAULT '',
    service_url TEXT NOT NULL DEFAULT '',
    funds_available TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS hf_switch_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    topic TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    id_number TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    current_fund TEXT NOT NULL DEFAULT '',
    current_supplemental TEXT NOT NULL DEFAULT '',
    target_fund TEXT NOT NULL DEFAULT '',
    people_count TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  );
`);

export const db = sqlite ? drizzle(sqlite) : (null as any);

// ---------------------------------------------------------------------------
// טעינת קובץ הנתונים + זריעה (seed) לטבלה אם ריקה
// ---------------------------------------------------------------------------
type RawExport = { meta: HfMeta; topics: any[] };

function loadExport(): RawExport {
  // הקובץ יושב בשורש הפרויקט (ליד data.db) — נטען יחסית ל-cwd
  const candidates = [
    path.resolve(process.cwd(), "hf_data_export.json"),
    path.resolve(process.cwd(), "..", "hf_data_export.json"),
    // נתיבים אפשריים ב-Vercel serverless (שורש הפרויקט/הפונקציה)
    path.resolve(process.cwd(), "..", "..", "hf_data_export.json"),
    "/var/task/hf_data_export.json",
  ];
  for (const p of candidates) {
    try {
      const txt = readFileSync(p, "utf-8");
      return JSON.parse(txt) as RawExport;
    } catch {
      /* נסה את הבא */
    }
  }
  throw new Error("hf_data_export.json not found");
}

const rawExport = loadExport();
export const hfMeta: HfMeta = rawExport.meta;

function seedIfEmpty() {
  if (!sqlite) return;
  const row = sqlite.prepare("SELECT COUNT(*) as c FROM hf_topics").get() as {
    c: number;
  };
  if (row.c > 0) return;
  const insert = sqlite.prepare(`
    INSERT INTO hf_topics (id, catalog_no, kind, category, sub_category, topic,
      audience, benefit_summary, range_text, best_fund, public_site_text,
      source_name, service_url, funds_available)
    VALUES (@id,@catalogNo,@kind,@category,@subCategory,@topic,@audience,
      @benefitSummary,@rangeText,@bestFund,@publicSiteText,@sourceName,
      @serviceUrl,@fundsAvailable)
  `);
  const tx = sqlite.transaction((topics: any[]) => {
    for (const t of topics) {
      insert.run({
        id: t.id,
        catalogNo: t.catalogNo ?? null,
        kind: t.kind ?? "fund",
        category: t.category ?? "",
        subCategory: t.subCategory ?? "",
        topic: t.topic ?? "",
        audience: t.audience ?? "",
        benefitSummary: t.benefitSummary ?? "",
        rangeText: t.rangeText ?? "",
        bestFund: t.bestFund ?? "",
        publicSiteText: t.publicSiteText ?? "",
        sourceName: t.sourceName ?? "",
        serviceUrl: t.serviceUrl ?? "",
        fundsAvailable: JSON.stringify(t.fundsAvailable ?? []),
      });
    }
  });
  tx(rawExport.topics);
  // eslint-disable-next-line no-console
  console.log(`[seed] inserted ${rawExport.topics.length} hf_topics`);
}
seedIfEmpty();

function parseRow(r: HfTopicRow): HfTopic {
  let funds: FundAvailable[] = [];
  try {
    funds = JSON.parse(r.fundsAvailable) as FundAvailable[];
  } catch {
    funds = [];
  }
  return { ...r, fundsAvailable: funds };
}

export interface IStorage {
  getMeta(): HfMeta;
  listTopics(): HfTopic[];
  getTopic(id: number): HfTopic | undefined;
  createSwitchLead(lead: InsertSwitchLead): SwitchLead;
  listSwitchLeads(): SwitchLead[];
  updateSwitchLeadStatus(id: number, status: string): SwitchLead | undefined;
}

export class DatabaseStorage implements IStorage {
  getMeta(): HfMeta {
    return hfMeta;
  }

  listTopics(): HfTopic[] {
    const rows = db
      .select()
      .from(hfTopics)
      .orderBy(sql`catalog_no asc`)
      .all();
    return rows.map(parseRow);
  }

  getTopic(id: number): HfTopic | undefined {
    const row = db.select().from(hfTopics).where(eq(hfTopics.id, id)).get();
    return row ? parseRow(row) : undefined;
  }

  createSwitchLead(lead: InsertSwitchLead): SwitchLead {
    return db
      .insert(hfSwitchLeads)
      .values({ ...lead, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  listSwitchLeads(): SwitchLead[] {
    return db
      .select()
      .from(hfSwitchLeads)
      .orderBy(sql`created_at desc`)
      .all();
  }

  updateSwitchLeadStatus(id: number, status: string): SwitchLead | undefined {
    return db
      .update(hfSwitchLeads)
      .set({ status })
      .where(eq(hfSwitchLeads.id, id))
      .returning()
      .get();
  }
}

export const storage = new DatabaseStorage();
