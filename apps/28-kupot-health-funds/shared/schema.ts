import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// hf_topics — כל נושאי הזכויות (515 שורות): קופות חולים, זכויות ממשלה, עמותות
// שדות המרווח (fundsAvailable) נשמרים כ-JSON text. חשיפה ציבורית בסיסית בלבד:
// audience + rangeText + שמות קופות/מסלולים. לעולם לא שיעור/סכום/המתנה מדויקים.
// ---------------------------------------------------------------------------
export const hfTopics = sqliteTable("hf_topics", {
  id: integer("id").primaryKey(),
  catalogNo: integer("catalog_no"),
  kind: text("kind").notNull(), // "fund" | "gov" | "ngo"
  category: text("category").notNull().default(""),
  subCategory: text("sub_category").notNull().default(""),
  topic: text("topic").notNull(),
  audience: text("audience").notNull().default(""),
  benefitSummary: text("benefit_summary").notNull().default(""),
  rangeText: text("range_text").notNull().default(""),
  bestFund: text("best_fund").notNull().default(""),
  publicSiteText: text("public_site_text").notNull().default(""),
  sourceName: text("source_name").notNull().default(""),
  serviceUrl: text("service_url").notNull().default(""),
  fundsAvailable: text("funds_available").notNull().default("[]"), // JSON: [{key,name,plans[]}]
});

export type HfTopicRow = typeof hfTopics.$inferSelect;

// גרסה מנורמלת לצרכן הפרונט — fundsAvailable כאובייקט מפוענח
export type FundAvailable = { key: string; name: string; plans: string[] };
export type HfTopic = Omit<HfTopicRow, "fundsAvailable"> & {
  fundsAvailable: FundAvailable[];
};

// ---------------------------------------------------------------------------
// hf_switch_leads — פניות "מעבר קופה" (טופס ליד)
// ---------------------------------------------------------------------------
export const hfSwitchLeads = sqliteTable("hf_switch_leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id"),
  topic: text("topic").notNull().default(""),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  idNumber: text("id_number").notNull().default(""),
  city: text("city").notNull().default(""),
  currentFund: text("current_fund").notNull().default(""),
  currentSupplemental: text("current_supplemental").notNull().default(""),
  targetFund: text("target_fund").notNull().default(""),
  peopleCount: text("people_count").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("new"), // new | in_progress | done | irrelevant
  createdAt: text("created_at").notNull(),
});

export const insertSwitchLeadSchema = createInsertSchema(hfSwitchLeads)
  .omit({ id: true, status: true, createdAt: true })
  .extend({
    fullName: z.string().min(2, "נא להזין שם מלא"),
    phone: z
      .string()
      .min(9, "נא להזין מספר טלפון תקין")
      .regex(/^[0-9\-+\s]{9,15}$/, "מספר הטלפון אינו תקין"),
    email: z.string().email("כתובת דוא\"ל אינה תקינה").optional().or(z.literal("")),
  });

export type InsertSwitchLead = z.infer<typeof insertSwitchLeadSchema>;
export type SwitchLead = typeof hfSwitchLeads.$inferSelect;

// ---------------------------------------------------------------------------
// meta — סטטיסטיקות ורשימות קטגוריות (מוגש מקובץ הנתונים, לא נשמר בטבלה)
// ---------------------------------------------------------------------------
export type FundMeta = { key: string; name: string; color: string };
export type HfMeta = {
  title: string;
  fundCount: number;
  govCount: number;
  ngoCount: number;
  fundCategories: string[];
  govCategories: string[];
  ngoCategories: string[];
  funds: FundMeta[];
};

// בקשת היועץ החכם
export const agentRequestSchema = z.object({
  topicId: z.number(),
  question: z.string().min(1).max(500),
});
export type AgentRequest = z.infer<typeof agentRequestSchema>;
