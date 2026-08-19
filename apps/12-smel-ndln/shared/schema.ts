import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Local cache of research profiles fetched from the Supabase Edge Function.
// Persistence of leads/profiles is done in Supabase (schema `nadlan`); SQLite
// here is only a lightweight cache so repeat lookups are instant.
export const researchCache = sqliteTable("research_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  address: text("address").notNull().unique(),
  payload: text("payload").notNull(), // full JSON response
  fetchedAt: integer("fetched_at").notNull(), // epoch ms
});

export const insertResearchCacheSchema = createInsertSchema(researchCache).omit({
  id: true,
});
export type InsertResearchCache = z.infer<typeof insertResearchCacheSchema>;
export type ResearchCache = typeof researchCache.$inferSelect;

// Local mirror of a premium lead (also pushed to nadlan.research_leads in Supabase).
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  profileId: integer("profile_id"),
  answers: text("answers"), // JSON of questionnaire answers
  createdAt: integer("created_at").notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ---- API response types (from the Supabase Edge Function) ----
export type ResearchParameter = {
  key: string;
  label: string;
  value: string | number | null;
  unit?: string;
  impact?: string;
  source_key?: string;
  source_url?: string;
};

export type ScoreFactor = { factor: string; points: number; note?: string };
export type SourceRef = { key: string; title: string; url: string };

export type ResearchProfile = {
  ok: boolean;
  query_address: string;
  matched_address: string;
  lat: number;
  lon: number;
  locality_code: number;
  locality_name: string;
  neighborhood_id?: number | string;
  neighborhood_name?: string;
  settlement_id?: number | string;
  parameters: ResearchParameter[];
  opportunity_score: number;
  score_breakdown: ScoreFactor[];
  metrics: Record<string, unknown>;
  sources: SourceRef[];
  profile_id: number;
};
