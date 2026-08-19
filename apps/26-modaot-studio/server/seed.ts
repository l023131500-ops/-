// יצירת טבלאות (אם לא קיימות) וזריעת תבניות מובנות.
import { db, storage } from "./storage";
import { sql } from "drizzle-orm";
import { TEMPLATE_DEFS } from "@shared/templates";
import { getFormat } from "@shared/formats";

export function ensureTables() {
  db.run(sql`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL)`);
  db.run(sql`CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, style TEXT NOT NULL, format TEXT NOT NULL,
    name TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    thumbnail TEXT, layers_json TEXT NOT NULL, builtin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'מודעה חדשה',
    category TEXT NOT NULL, style TEXT NOT NULL, format TEXT NOT NULL,
    width INTEGER NOT NULL, height INTEGER NOT NULL,
    layers_json TEXT NOT NULL, thumbnail TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name TEXT NOT NULL DEFAULT 'מותג חדש',
    brief_json TEXT NOT NULL DEFAULT '{}',
    kit_json TEXT, logo_png TEXT, logo_svg TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
}

export async function seedTemplates() {
  await storage.clearBuiltinTemplates();
  for (const def of TEMPLATE_DEFS) {
    const fmt = getFormat(def.format);
    const doc = def.build(fmt.width, fmt.height);
    await storage.createTemplate({
      category: def.category,
      style: def.style,
      format: def.format,
      name: def.name,
      width: doc.width,
      height: doc.height,
      layersJson: JSON.stringify({ background: doc.background, layers: doc.layers }),
      builtin: 1,
    });
  }
  console.log(`[seed] ${TEMPLATE_DEFS.length} built-in templates ready`);
}
