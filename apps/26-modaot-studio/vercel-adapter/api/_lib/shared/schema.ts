import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * תבנית עיצוב — מוגדרת מראש (או נשמרת ע"י המשתמש).
 * layersJson = מערך שכבות (ראה shared/layers.ts) בפורמט JSON.
 */
export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), // מפתח קטגוריה מ-knowledge.ts
  style: text("style").notNull(), // malchut | chasidic_royal | modern_torani | classic | evel
  format: text("format").notNull(), // ig_feed_45 | ig_square | story | a4_print | ...
  name: text("name").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  thumbnail: text("thumbnail"), // data URL תצוגה מקדימה
  layersJson: text("layers_json").notNull(), // מערך השכבות
  builtin: integer("builtin").notNull().default(0), // 1 = תבנית מערכת
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

/**
 * פרויקט — מודעה ערוכה של המשתמש (מצב השכבות הנוכחי).
 */
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("מודעה חדשה"),
  category: text("category").notNull(),
  style: text("style").notNull(),
  format: text("format").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  layersJson: text("layers_json").notNull(), // מצב ערוך
  thumbnail: text("thumbnail"),
  // בעלים אופציונלי (auth.users.id). NULL = עבודה אנונימית, בדיוק כמו היום.
  userId: text("user_id"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true, // מתויג בשרת מה-JWT, לא מגוף הבקשה
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

/**
 * מותג — פרויקט מיתוג של המשתמש (מחלקת המיתוג).
 * briefJson = תשובות שאלון הבריף; kitJson = ערכת המותג המלאה (אסטרטגיה/צבע/טיפוגרפיה);
 * logoPng = הלוגו שנוצר (data URL); logoSvg = הלוגו הווקטורי (SVG טקסט).
 */
export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brandName: text("brand_name").notNull().default("מותג חדש"),
  briefJson: text("brief_json").notNull().default("{}"),
  kitJson: text("kit_json"), // BrandKit כ-JSON
  logoPng: text("logo_png"), // data URL של ה-PNG שנוצר
  logoSvg: text("logo_svg"), // תוכן ה-SVG הווקטורי
  // בעלים אופציונלי (auth.users.id). NULL = עבודה אנונימית, בדיוק כמו היום.
  userId: text("user_id"),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  userId: true, // מתויג בשרת מה-JWT, לא מגוף הבקשה
  createdAt: true,
  updatedAt: true,
});
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brands.$inferSelect;

// ---- טבלת משתמשים (נשארת מהתבנית, נחוצה ל-storage) ----
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
