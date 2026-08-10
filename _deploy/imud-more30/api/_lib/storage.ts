/**
 * שכבת אחסון לפריסה — עותק של apps/04-imud-torani/server/storage.ts,
 * עם שני הבדלים בלבד, שניהם בהגדרות ולא בלוגיקה:
 *
 *   1. לקוח ה-Supabase נבנה כאן (המקור מייבא ./supabase שמספק גם `ws`
 *      ל-realtime; בפונקציה אין realtime ואין צורך בתלות הזאת).
 *   2. ברירות המחדל של הסכימה והטבלה הן אלה של הפריסה הזאת —
 *      public.otvedaf_books — במקום otvedaf.books של ההרצה המקורית.
 *      PostgREST חושף רק את public, ולכן זו הצורה שעובדת מכאן.
 *      שתיהן ניתנות לדריסה ב-ENV, כמו במקור.
 *
 * מיפוי העמודות זהה למקור: DB ב-snake_case, טיפוס Book ב-camelCase,
 * ו-settings/content הם jsonb ב-DB ומחרוזות JSON בטיפוס.
 * אומת מול הטבלה החיה: id הוא identity BY DEFAULT (ולכן insert בלי id תקין),
 * user_id/title/author/template_key text, settings/content jsonb,
 * created_at/updated_at bigint.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Book, InsertBook, UpdateBook } from "./schema";

const TABLE = process.env.SUPABASE_TABLE || "otvedaf_books";
const SCHEMA = process.env.SUPABASE_SCHEMA || "public";
const ANON = "anon";

const SUPABASE_URL = process.env.SUPABASE_URL;
// הטבלה מוגנת ב-RLS ללא policies (נבדק: rowsecurity=true, 0 policies),
// ולכן anon חסום לגמרי וצריך service_role. התמיכה ב-anon נשמרת כמו במקור.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

/** שורה גולמית מ-Supabase */
interface Row {
  id: number;
  user_id: string;
  title: string;
  author: string;
  template_key: string;
  settings: unknown; // jsonb
  content: unknown;  // jsonb
  created_at: number;
  updated_at: number;
}

/** jsonb → מחרוזת JSON (הטיפוס Book מצפה למחרוזת) */
function jsonToStr(v: unknown, fallback: string): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return fallback;
  }
}

/** מחרוזת JSON → אובייקט (עבור עמודת jsonb) */
function strToJson(v: unknown, fallback: unknown): unknown {
  if (v == null) return fallback;
  if (typeof v !== "string") return v; // כבר אובייקט
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function rowToBook(r: Row): Book {
  return {
    id: r.id,
    title: r.title,
    author: r.author ?? "",
    templateKey: r.template_key ?? "regular",
    settings: jsonToStr(r.settings, "{}"),
    content: jsonToStr(r.content, "[]"),
    createdAt: Number(r.created_at) || 0,
    updatedAt: Number(r.updated_at) || 0,
  };
}

/**
 * נבנה בבקשה הראשונה ולא בטעינת המודול: פונקציה שקורסת ב-import מחזירה
 * 500 בלי גוף, ואז אי אפשר לדעת מהדפדפן מה חסר. כך חוסר הגדרה מגיע
 * כשגיאה עם שם המשתנה בתוכה.
 */
// הטיפוס רופף במכוון: supabase-js גוזר את טיפוסי הטבלאות משם הסכימה כליטרל,
// וכאן שם הסכימה מגיע מ-ENV ולכן הוא string. בלי זה כל .from() מקבל never.
let client: SupabaseClient<any, any, any> | null = null;

export function supabaseOrThrow(): SupabaseClient<any, any, any> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "חסרים משתני סביבה בפרויקט הפריסה: SUPABASE_URL + SUPABASE_SERVICE_KEY (או SUPABASE_ANON_KEY)."
    );
  }
  if (!client) {
    client = createClient<any, any, any>(SUPABASE_URL, SUPABASE_KEY, {
      db: { schema: SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export interface IStorage {
  listBooks(userId: string): Promise<Book[]>;
  getBook(id: number, userId: string): Promise<Book | undefined>;
  createBook(book: InsertBook, userId: string): Promise<Book>;
  updateBook(id: number, patch: UpdateBook, userId: string): Promise<Book | undefined>;
  deleteBook(id: number, userId: string): Promise<boolean>;
}

export class SupabaseStorage implements IStorage {
  async listBooks(userId: string): Promise<Book[]> {
    const { data, error } = await supabaseOrThrow()
      .from(TABLE)
      .select("*")
      .eq("user_id", userId || ANON)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`Supabase listBooks: ${error.message}`);
    return (data as unknown as Row[]).map(rowToBook);
  }

  async getBook(id: number, userId: string): Promise<Book | undefined> {
    const { data, error } = await supabaseOrThrow()
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId || ANON)
      .maybeSingle();
    if (error) throw new Error(`Supabase getBook: ${error.message}`);
    return data ? rowToBook(data as unknown as Row) : undefined;
  }

  async createBook(insert: InsertBook, userId: string): Promise<Book> {
    const now = Date.now();
    const payload = {
      user_id: userId || ANON,
      title: insert.title,
      author: insert.author ?? "",
      template_key: insert.templateKey ?? "regular",
      settings: strToJson(insert.settings, {}),
      content: strToJson(insert.content, []),
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabaseOrThrow()
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(`Supabase createBook: ${error.message}`);
    return rowToBook(data as unknown as Row);
  }

  async updateBook(id: number, patch: UpdateBook, userId: string): Promise<Book | undefined> {
    // ודא בעלות לפני עדכון
    const existing = await this.getBook(id, userId);
    if (!existing) return undefined;

    const upd: Record<string, unknown> = { updated_at: Date.now() };
    if (patch.title !== undefined) upd.title = patch.title;
    if (patch.author !== undefined) upd.author = patch.author;
    if (patch.templateKey !== undefined) upd.template_key = patch.templateKey;
    if (patch.settings !== undefined) upd.settings = strToJson(patch.settings, {});
    if (patch.content !== undefined) upd.content = strToJson(patch.content, []);

    const { data, error } = await supabaseOrThrow()
      .from(TABLE)
      .update(upd)
      .eq("id", id)
      .eq("user_id", userId || ANON)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`Supabase updateBook: ${error.message}`);
    return data ? rowToBook(data as unknown as Row) : undefined;
  }

  async deleteBook(id: number, userId: string): Promise<boolean> {
    const { data, error } = await supabaseOrThrow()
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", userId || ANON)
      .select("id");
    if (error) throw new Error(`Supabase deleteBook: ${error.message}`);
    return Array.isArray(data) && data.length > 0;
  }
}

export const storage = new SupabaseStorage();
