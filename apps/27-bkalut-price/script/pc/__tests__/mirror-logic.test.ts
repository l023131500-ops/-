/**
 * Validates the mirror's SQLite-writing logic against the REAL price-comparison
 * module schema (no Supabase needed). Confirms:
 *  - binding creates all pc_ tables + runtime columns
 *  - column-intersection insert copies only shared columns
 *  - boolean/object coercion to SQLite-compatible values
 *  - full-refresh (DELETE + re-insert) preserves IDs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { bindPriceComparisonDb } from "../../../server/price-comparison";

function sqliteColumns(db: Database.Database, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function mirrorTable(db: Database.Database, table: string, rows: Record<string, unknown>[]) {
  const sqliteCols = sqliteColumns(db, table);
  const srcKeys = rows.length ? Object.keys(rows[0]) : [...sqliteCols];
  const cols = srcKeys.filter((k) => sqliteCols.has(k));
  const placeholders = cols.map(() => "?").join(",");
  const insert = db.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`);
  const toSqlite = (v: unknown): unknown => {
    if (v === null || v === undefined) return null;
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "object") return JSON.stringify(v);
    return v as string | number;
  };
  const run = db.transaction((data: Record<string, unknown>[]) => {
    db.exec(`DELETE FROM ${table}`);
    let n = 0;
    for (const r of data) { insert.run(...cols.map((c) => toSqlite(r[c]))); n++; }
    return n;
  });
  return { inserted: run(rows), columns: cols };
}

test("mirror copies products + prices into module schema, preserving ids", () => {
  const db = new Database(":memory:");
  bindPriceComparisonDb(db);

  // pc_products row shaped like a Supabase row (includes a column the SQLite
  // schema may not have, plus a boolean to coerce).
  const products = [
    { id: 101, category_id: 4, name: "חלב תנובה 3%", brand: "תנובה", unit: "1 ליטר", barcode: "7290000000001", image_url: null, active: true, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-30T00:00:00Z", made_up_extra_col: "ignore-me" },
    { id: 102, category_id: null, name: "קפה עלית", brand: "עלית", unit: "200 גרם", barcode: "7290000000002", image_url: null, active: true, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-30T00:00:00Z" },
  ];
  const r1 = mirrorTable(db, "pc_products", products);
  assert.equal(r1.inserted, 2);
  assert.ok(!r1.columns.includes("made_up_extra_col"), "extra Supabase-only column must be dropped");

  const got = db.prepare("SELECT id, name, barcode, active FROM pc_products ORDER BY id").all() as any[];
  assert.equal(got.length, 2);
  assert.equal(got[0].id, 101, "id preserved");
  assert.equal(got[0].active, 1, "boolean true coerced to 1");
  assert.equal(got[0].barcode, "7290000000001");

  // Prices reference the product ids above — proves FK ids stay valid.
  const prices = [
    { id: 9001, product_id: 101, store_id: 1, price: 6.9, currency: "ILS", on_sale: false, source: "import", created_at: "2026-06-30T00:00:00Z", updated_at: "2026-06-30T00:00:00Z" },
    { id: 9002, product_id: 101, store_id: 2, price: 7.2, currency: "ILS", on_sale: true, source: "import", created_at: "2026-06-30T00:00:00Z", updated_at: "2026-06-30T00:00:00Z" },
  ];
  const r2 = mirrorTable(db, "pc_prices", prices);
  assert.equal(r2.inserted, 2);
  const pr = db.prepare("SELECT product_id, price, on_sale FROM pc_prices ORDER BY id").all() as any[];
  assert.equal(pr[0].product_id, 101);
  assert.equal(pr[1].on_sale, 1, "boolean true coerced to 1 in prices");

  // Full-refresh: re-running with one row wipes the rest.
  const r3 = mirrorTable(db, "pc_products", [products[0]]);
  assert.equal(r3.inserted, 1);
  const after = db.prepare("SELECT count(*) AS c FROM pc_products").get() as any;
  assert.equal(after.c, 1, "full refresh removed stale rows");

  db.close();
});

test("mirror handles empty table without throwing", () => {
  const db = new Database(":memory:");
  bindPriceComparisonDb(db);
  const r = mirrorTable(db, "pc_promotions", []);
  assert.equal(r.inserted, 0);
  db.close();
});
