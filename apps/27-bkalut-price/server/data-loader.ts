import XLSX from "xlsx";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { RightRow, OrgRow, MetaResponse } from "@shared/schema";
import * as customRights from "./custom-rights";

// Resolve __dirname both for ESM (dev) and CJS (build bundle)
function getDirname(): string {
  if (typeof __dirname !== "undefined") return __dirname;
  // @ts-ignore - import.meta only in ESM
  return path.dirname(fileURLToPath(import.meta.url));
}

function resolveXlsxPath(): string {
  const here = getDirname();
  const candidates = [
    path.resolve(here, "data", "bklot.xlsx"),     // production: dist/data/bklot.xlsx (alongside dist/index.cjs)
    path.resolve(here, "..", "server", "data", "bklot.xlsx"),
    path.resolve(process.cwd(), "server", "data", "bklot.xlsx"),
    path.resolve(process.cwd(), "dist", "data", "bklot.xlsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    "bklot.xlsx not found. Searched: \n" + candidates.join("\n"),
  );
}

export const XLSX_PATH = resolveXlsxPath();

// ----- header maps -----
export const RIGHTS_HEADERS: Record<keyof RightRow, string | null> = {
  id: null,
  priority: "סדר עדיפות",
  category: "קטגוריה",
  subCategory: "תת קטגוריה",
  topic: "שם הנושא",
  treatingBody: "גוף מטפל",
  audience: "קהל יעד ברור",
  whatReceived: "מה ניתן לקבל בפועל וסוג התשלום",
  eligibility: "תנאי זכאות ברורים",
  qualifyingCases: "מקרים שמזכים / לא מזכים",
  preparation: "מה צריך להכין מראש",
  documents: "מסמכים שצריך לצרף",
  howToApply: "איך מגישים בפועל",
  officialLinks: "קישורים וטפסים רשמיים",
  bkalutCost: "עלות שירות בקלות",
  publicSiteText: "הסבר פשוט לפרסום באתר",
  faq: "שאלות נפוצות לציבור",
  goldTip: "טיפ זהב של בקלות ⭐",
  eligibilityJson: "שאלות לבדיקת זכאות (JSON)",
  intakeJson: "שאלון פרטני (JSON)",
  documentsJson: "מסמכים נדרשים בטופס (JSON)",
  podcastScript: "נוסח פודקאסט / מערכת קולית ארוך",
  voiceShort: "נוסח הודעה קולית קצרה ללקוח",
  emailScript: "נוסח מייל / הודעה תכלס ללקוח",
  aiSearch: "AI לסוכן חיפוש",
  aiExtra: "מידע נוסף לסוכן AI",
  haredi: "התאמה לפרסום לציבור חרדי",
  serviceUrl: "קישור לשירות",
};

export const ORG_HEADERS: Record<keyof OrgRow, string | null> = {
  id: null,
  order: "סדר",
  category: "קטגוריה",
  name: "ארגון / גוף",
  bodyType: "סוג הגוף",
  audience: "למי מיועד",
  helpProvided: "מה הסיוע בפועל",
  conditions: "תנאים ודגשים",
  preparation: "מה צריך להכין מראש",
  requirements: "מסמכים / פרטים נדרשים",
  howToContact: "איך פונים בפועל",
  phoneEmail: "טלפון / מייל מרכזי",
  sourceLink: "קישור מקור",
  haredi: "התאמה לציבור חרדי",
  internalNotes: "הערות שימוש במאגר",
};

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function normalizeNumberField(key: string, value: unknown): number | null {
  if (key === "priority" || key === "order") return n(value);
  return null;
}

function writeSheetRow<T extends object>(
  sheetName: string,
  id: number,
  headerMap: Record<string, string | null>,
  patch: Partial<T>,
) {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found: ${sheetName}`);
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    defval: null,
    raw: false,
  });
  if (!Number.isInteger(id) || id < 1 || id > rows.length) {
    throw new Error("Invalid row id");
  }

  const excelRow = id + 1;
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  const headerToColumn = new Map<string, number>();
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    const header = s(cell?.v);
    if (header) headerToColumn.set(header, c);
  }

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "id") return;
    const header = headerMap[key];
    if (!header) return;
    const col = headerToColumn.get(header);
    if (col === undefined) return;
    const addr = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
    const numericValue = normalizeNumberField(key, value);
    if (key === "priority" || key === "order") {
      ws[addr] = numericValue === null ? { t: "s", v: "" } : { t: "n", v: numericValue };
    } else {
      ws[addr] = { t: "s", v: s(value) };
    }
  });

  XLSX.writeFile(wb, XLSX_PATH);
  cache = null;
}

export function updateRightRow(id: number, patch: Partial<RightRow>): RightRow {
  writeSheetRow<RightRow>("מאגר לפי נושאים", id, RIGHTS_HEADERS, patch);
  const updated = loadAll().rights.find((r) => r.id === id);
  if (!updated) throw new Error("Right not found after update");
  return updated;
}

export function updateOrgRow(id: number, patch: Partial<OrgRow>): OrgRow {
  writeSheetRow<OrgRow>("עמותות וארגונים", id, ORG_HEADERS, patch);
  const updated = loadAll().orgs.find((o) => o.id === id);
  if (!updated) throw new Error("Org not found after update");
  return updated;
}

function isEmptyRow(o: Record<string, unknown>): boolean {
  return Object.values(o).every((v) => v === null || v === undefined || s(v) === "");
}

interface Loaded {
  rights: RightRow[];
  orgs: OrgRow[];
  meta: MetaResponse;
}

let cache: Loaded | null = null;

/** Invalidate the cached rights/orgs data. Use after writes (custom_rights add). */
export function invalidateCache() {
  cache = null;
}

export function loadAll(): Loaded {
  if (cache) return cache;

  const wb = XLSX.readFile(XLSX_PATH);

  // Rights sheet
  const rightsWS = wb.Sheets["מאגר לפי נושאים"];
  const rightsRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(rightsWS, {
    defval: null,
    raw: false,
  });

  const rights: RightRow[] = [];
  rightsRaw.forEach((row, idx) => {
    if (isEmptyRow(row)) return;
    const id = idx + 1;
    rights.push({
      id,
      priority: n(row[RIGHTS_HEADERS.priority!]),
      category: s(row[RIGHTS_HEADERS.category!]),
      subCategory: s(row[RIGHTS_HEADERS.subCategory!]),
      topic: s(row[RIGHTS_HEADERS.topic!]),
      treatingBody: s(row[RIGHTS_HEADERS.treatingBody!]),
      audience: s(row[RIGHTS_HEADERS.audience!]),
      whatReceived: s(row[RIGHTS_HEADERS.whatReceived!]),
      eligibility: s(row[RIGHTS_HEADERS.eligibility!]),
      qualifyingCases: s(row[RIGHTS_HEADERS.qualifyingCases!]),
      preparation: s(row[RIGHTS_HEADERS.preparation!]),
      documents: s(row[RIGHTS_HEADERS.documents!]),
      howToApply: s(row[RIGHTS_HEADERS.howToApply!]),
      officialLinks: s(row[RIGHTS_HEADERS.officialLinks!]),
      bkalutCost: s(row[RIGHTS_HEADERS.bkalutCost!]),
      publicSiteText: s(row[RIGHTS_HEADERS.publicSiteText!]),
      faq: s(row[RIGHTS_HEADERS.faq!]),
      goldTip: s(row[RIGHTS_HEADERS.goldTip!]),
      eligibilityJson: s(row[RIGHTS_HEADERS.eligibilityJson!]),
      intakeJson: s(row[RIGHTS_HEADERS.intakeJson!]),
      documentsJson: s(row[RIGHTS_HEADERS.documentsJson!]),
      podcastScript: s(row[RIGHTS_HEADERS.podcastScript!]),
      voiceShort: s(row[RIGHTS_HEADERS.voiceShort!]),
      emailScript: s(row[RIGHTS_HEADERS.emailScript!]),
      aiSearch: s(row[RIGHTS_HEADERS.aiSearch!]),
      aiExtra: s(row[RIGHTS_HEADERS.aiExtra!]),
      haredi: s(row[RIGHTS_HEADERS.haredi!]),
      serviceUrl: s(row[RIGHTS_HEADERS.serviceUrl!]) || `/#/service/${id}`,
    });
  });

  // Append admin-managed custom rights AFTER the XLSX rows so the existing
  // rights database order/IDs stay intact. Custom rows use a high ID offset
  // so they never collide with XLSX row indices.
  try {
    for (const r of customRights.listAll()) rights.push(r);
  } catch (err) {
    console.warn("[data] custom_rights merge skipped:", (err as Error).message);
  }

  // Orgs sheet
  const orgsWS = wb.Sheets["עמותות וארגונים"];
  const orgsRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(orgsWS, {
    defval: null,
    raw: false,
  });
  const orgs: OrgRow[] = [];
  orgsRaw.forEach((row, idx) => {
    if (isEmptyRow(row)) return;
    orgs.push({
      id: idx + 1,
      order: n(row[ORG_HEADERS.order!]),
      category: s(row[ORG_HEADERS.category!]),
      name: s(row[ORG_HEADERS.name!]),
      bodyType: s(row[ORG_HEADERS.bodyType!]),
      audience: s(row[ORG_HEADERS.audience!]),
      helpProvided: s(row[ORG_HEADERS.helpProvided!]),
      conditions: s(row[ORG_HEADERS.conditions!]),
      preparation: s(row[ORG_HEADERS.preparation!]),
      requirements: s(row[ORG_HEADERS.requirements!]),
      howToContact: s(row[ORG_HEADERS.howToContact!]),
      phoneEmail: s(row[ORG_HEADERS.phoneEmail!]),
      sourceLink: s(row[ORG_HEADERS.sourceLink!]),
      haredi: s(row[ORG_HEADERS.haredi!]),
      internalNotes: s(row[ORG_HEADERS.internalNotes!]),
    });
  });

  // Meta
  const rightsCategories = uniqSorted(rights.map((r) => r.category));
  const rightsSubCategories = uniqSorted(rights.map((r) => r.subCategory));
  const treatingBodies = uniqSorted(rights.map((r) => r.treatingBody));
  const haredi = uniqSorted(rights.map((r) => r.haredi));
  const orgCategories = uniqSorted(orgs.map((o) => o.category));
  const orgBodyTypes = uniqSorted(orgs.map((o) => o.bodyType));
  const orgHaredi = uniqSorted(orgs.map((o) => o.haredi));
  const sensitiveCount =
    rights.filter((r) => r.haredi && (r.haredi.includes("צניעות") || r.haredi.includes("צנוע") || r.haredi.includes("רגיש"))).length +
    orgs.filter((o) => o.haredi && (o.haredi.includes("צניעות") || o.haredi.includes("צנוע") || o.haredi.includes("רגיש"))).length;

  const meta: MetaResponse = {
    rightsCount: rights.length,
    orgsCount: orgs.length,
    categoriesCount: rightsCategories.length,
    sensitiveCount,
    rightsCategories,
    rightsSubCategories,
    treatingBodies,
    haredi,
    orgCategories,
    orgBodyTypes,
    orgHaredi,
  };

  cache = { rights, orgs, meta };
  console.log(
    `[data] loaded ${rights.length} rights, ${orgs.length} orgs, ${rightsCategories.length} categories`,
  );
  return cache;
}

function uniqSorted(arr: string[]): string[] {
  const set = new Set(arr.filter((v) => v && v.length > 0));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
}
