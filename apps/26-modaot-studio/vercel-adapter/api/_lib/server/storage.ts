/**
 * Supabase-backed storage for the more30.com/studio deployment.
 *
 * The origin app (apps/26-modaot-studio) keeps this state in a local SQLite
 * file via drizzle + better-sqlite3. A serverless function has no durable
 * filesystem, so the same four tables live in the studio_* tables on the ops
 * Supabase project and are reached with the service_role key (server-side
 * only — the anon role has no grants and RLS is on with no policies).
 *
 * The IStorage surface, method names, field names and unix-epoch timestamps
 * are identical to the origin, so routes.ts and the client are unchanged.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  User, InsertUser,
  Template, InsertTemplate,
  Project, InsertProject,
  Brand, InsertBrand,
} from "../shared/schema";

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("storage: SUPABASE_URL + service key required");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

const now = () => Math.floor(Date.now() / 1000);

/**
 * מזהה משתמש אופציונלי מתוך כותרת Authorization, אם יש ותקפה.
 * בלי כותרת / כותרת לא תקפה → undefined, וזה בדיוק "המשך אנונימי כמו היום"
 * (studio_projects/studio_brands.user_id נשאר NULL, אין סינון).
 */
export async function getUserIdFromToken(authHeader: string | undefined): Promise<string | undefined> {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return undefined;
  try {
    const { data, error } = await sb().auth.getUser(token);
    if (error || !data?.user) return undefined;
    return data.user.id;
  } catch {
    return undefined;
  }
}

/**
 * מכסת AI יומית לפי כתובת IP (לא לפי משתמש מחובר) — כל נתיבי היצירה
 * (רקע/לוגו/וקטוריזציה/אסטרטגיה/קופי/ביקורת) עולים כסף אמיתי לכל קריאה
 * ואין להם היום שום גבול (audit_gaps #2). מכסה לפי משתמש בלבד הייתה
 * מכסה רק תעבורה מחוברת — רוב התעבורה עדיין אנונימית — ולכן זו לפי IP,
 * שחל גם על אנונימי וגם על מחובר. עולה על עודכן אטומית ב-Postgres כדי
 * שקריאות מקבילות לא "יחמקו" בין קריאה לכתיבה (race).
 * כשל ברשת/DB בבדיקת המכסה עצמה → "פתוח" (allowed=true): תקלת תשתית
 * במכסה לא אמורה לחסום משתמש אמיתי שעדיין בתוך הגבול.
 */
export async function bumpAiRateLimit(ipHash: string, dailyLimit: number): Promise<{ allowed: boolean; count: number }> {
  try {
    const { data, error } = await sb().rpc("studio_bump_ai_rate_limit", { p_ip_hash: ipHash, p_limit: dailyLimit });
    if (error || !data) return { allowed: true, count: 0 };
    return data as { allowed: boolean; count: number };
  } catch {
    return { allowed: true, count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Row <-> domain mappers. Postgres gives snake_case columns; the app's types
// are camelCase, exactly as drizzle produced them from the SQLite schema.
// ---------------------------------------------------------------------------
const toTemplate = (r: any): Template => ({
  id: r.id, category: r.category, style: r.style, format: r.format, name: r.name,
  width: r.width, height: r.height, thumbnail: r.thumbnail ?? null,
  layersJson: r.layers_json, builtin: r.builtin, createdAt: Number(r.created_at),
});
const toProject = (r: any): Project => ({
  id: r.id, name: r.name, category: r.category, style: r.style, format: r.format,
  width: r.width, height: r.height, layersJson: r.layers_json,
  thumbnail: r.thumbnail ?? null, userId: r.user_id ?? null,
  createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
});
const toBrand = (r: any): Brand => ({
  id: r.id, brandName: r.brand_name, briefJson: r.brief_json,
  kitJson: r.kit_json ?? null, logoPng: r.logo_png ?? null, logoSvg: r.logo_svg ?? null,
  userId: r.user_id ?? null,
  createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
});

const templateRow = (t: Partial<InsertTemplate>) => prune({
  category: t.category, style: t.style, format: t.format, name: t.name,
  width: t.width, height: t.height, thumbnail: t.thumbnail,
  layers_json: t.layersJson, builtin: t.builtin,
});
const projectRow = (p: Partial<InsertProject>) => prune({
  name: p.name, category: p.category, style: p.style, format: p.format,
  width: p.width, height: p.height, layers_json: p.layersJson, thumbnail: p.thumbnail,
});
const brandRow = (b: Partial<InsertBrand>) => prune({
  brand_name: b.brandName, brief_json: b.briefJson, kit_json: b.kitJson,
  logo_png: b.logoPng, logo_svg: b.logoSvg,
});

/** Drop undefined keys so a PATCH never overwrites a column it didn't mention. */
function prune(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out;
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`supabase: ${res.error.message}`);
  return res.data as T;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(t: InsertTemplate): Promise<Template>;
  clearBuiltinTemplates(): Promise<void>;
  listProjects(limit?: number, userId?: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(p: InsertProject, userId?: string): Promise<Project>;
  updateProject(id: number, patch: Partial<InsertProject>, requesterId?: string): Promise<Project | undefined>;
  deleteProject(id: number, requesterId?: string): Promise<void>;
  listBrands(limit?: number, userId?: string): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  createBrand(b: InsertBrand, userId?: string): Promise<Brand>;
  updateBrand(id: number, patch: Partial<InsertBrand>, requesterId?: string): Promise<Brand | undefined>;
  deleteBrand(id: number, requesterId?: string): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: number) {
    const r = unwrap(await sb().from("studio_users").select("*").eq("id", id).maybeSingle());
    return r ? (r as User) : undefined;
  }
  async getUserByUsername(username: string) {
    const r = unwrap(await sb().from("studio_users").select("*").eq("username", username).maybeSingle());
    return r ? (r as User) : undefined;
  }
  async createUser(u: InsertUser) {
    return unwrap(await sb().from("studio_users").insert(u).select().single()) as User;
  }

  async listTemplates() {
    const r = unwrap(await sb().from("studio_templates").select("*").order("id", { ascending: false }));
    return (r as any[]).map(toTemplate);
  }
  async getTemplate(id: number) {
    const r = unwrap(await sb().from("studio_templates").select("*").eq("id", id).maybeSingle());
    return r ? toTemplate(r) : undefined;
  }
  async createTemplate(t: InsertTemplate) {
    const r = unwrap(await sb().from("studio_templates").insert(templateRow(t)).select().single());
    return toTemplate(r);
  }
  async clearBuiltinTemplates() {
    const { error } = await sb().from("studio_templates").delete().eq("builtin", 1);
    if (error) throw new Error(`supabase: ${error.message}`);
  }

  async listProjects(limit = 50, userId?: string) {
    // בלי userId (לא מחובר / JWT לא תקף) → כל השורות, בדיוק כמו לפני התיוג —
    // אין רגרסיה לזרימה האנונימית הקיימת. עם userId → רק העבודות של המשתמש.
    let q = sb().from("studio_projects").select("*");
    if (userId) q = q.eq("user_id", userId);
    const r = unwrap(await q.order("updated_at", { ascending: false }).limit(limit));
    return (r as any[]).map(toProject);
  }
  async getProject(id: number) {
    const r = unwrap(await sb().from("studio_projects").select("*").eq("id", id).maybeSingle());
    return r ? toProject(r) : undefined;
  }
  async createProject(p: InsertProject, userId?: string) {
    const r = unwrap(
      await sb().from("studio_projects").insert({ ...projectRow(p), user_id: userId ?? null }).select().single(),
    );
    return toProject(r);
  }
  async updateProject(id: number, patch: Partial<InsertProject>, requesterId?: string) {
    // בעלות: פרויקט שנוצר עם user_id (משתמש מחובר) ניתן לעריכה רק ע"י אותו
    // משתמש. פרויקט אנונימי (user_id=NULL, מלפני התיוג) נשאר פתוח לעריכה
    // כמו היום — אין רגרסיה לזרימה האנונימית הקיימת.
    const existing = unwrap(await sb().from("studio_projects").select("user_id").eq("id", id).maybeSingle());
    if (!existing) return undefined;
    if ((existing as { user_id: string | null }).user_id && (existing as { user_id: string | null }).user_id !== requesterId) return undefined;
    const r = unwrap(
      await sb().from("studio_projects")
        .update({ ...projectRow(patch), updated_at: now() })
        .eq("id", id).select().maybeSingle(),
    );
    return r ? toProject(r) : undefined;
  }
  async deleteProject(id: number, requesterId?: string) {
    const existing = unwrap(await sb().from("studio_projects").select("user_id").eq("id", id).maybeSingle());
    if (existing && (existing as { user_id: string | null }).user_id && (existing as { user_id: string | null }).user_id !== requesterId) return;
    const { error } = await sb().from("studio_projects").delete().eq("id", id);
    if (error) throw new Error(`supabase: ${error.message}`);
  }

  async listBrands(limit = 50, userId?: string) {
    let q = sb().from("studio_brands").select("*");
    if (userId) q = q.eq("user_id", userId);
    const r = unwrap(await q.order("updated_at", { ascending: false }).limit(limit));
    return (r as any[]).map(toBrand);
  }
  async getBrand(id: number) {
    const r = unwrap(await sb().from("studio_brands").select("*").eq("id", id).maybeSingle());
    return r ? toBrand(r) : undefined;
  }
  async createBrand(b: InsertBrand, userId?: string) {
    const r = unwrap(
      await sb().from("studio_brands").insert({ ...brandRow(b), user_id: userId ?? null }).select().single(),
    );
    return toBrand(r);
  }
  async updateBrand(id: number, patch: Partial<InsertBrand>, requesterId?: string) {
    const existing = unwrap(await sb().from("studio_brands").select("user_id").eq("id", id).maybeSingle());
    if (!existing) return undefined;
    if ((existing as { user_id: string | null }).user_id && (existing as { user_id: string | null }).user_id !== requesterId) return undefined;
    const r = unwrap(
      await sb().from("studio_brands")
        .update({ ...brandRow(patch), updated_at: now() })
        .eq("id", id).select().maybeSingle(),
    );
    return r ? toBrand(r) : undefined;
  }
  async deleteBrand(id: number, requesterId?: string) {
    const existing = unwrap(await sb().from("studio_brands").select("user_id").eq("id", id).maybeSingle());
    if (existing && (existing as { user_id: string | null }).user_id && (existing as { user_id: string | null }).user_id !== requesterId) return;
    const { error } = await sb().from("studio_brands").delete().eq("id", id);
    if (error) throw new Error(`supabase: ${error.message}`);
  }
}

export const storage: IStorage = new SupabaseStorage();
