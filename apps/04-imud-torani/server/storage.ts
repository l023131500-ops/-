import type { Book, InsertBook, UpdateBook } from '@shared/schema';
import supabase from "./supabase";

/**
 * שכבת אחסון — Supabase (טבלת otvedaf.books).
 *
 * מיפוי עמודות: DB בסגנון snake_case, טיפוס Book בסגנון camelCase.
 *   template_key ↔ templateKey · created_at ↔ createdAt · updated_at ↔ updatedAt
 *
 * שדות settings/content נשמרים ב-DB כ-jsonb, אך טיפוס Book (וגם ה-DOCX/הלקוח)
 * מצפה למחרוזות JSON. לכן מסדרים/מפענחים בגבול השכבה בלבד.
 *
 * בידוד נתונים לפי משתמש: עמודת user_id (מגיע מכותרת X-Visitor-Id).
 */

// שם הטבלה ניתן לשינוי ב-ENV: בפריסה תחת more30.com הטבלה יושבת ב-public
// כ-`otvedaf_books`, כי PostgREST חושף רק את public. ברירת המחדל נשמרת
// כדי שההרצה המקורית (סכימת otvedaf) תמשיך לעבוד בלי שינוי.
const TABLE = process.env.SUPABASE_TABLE || "books";
const ANON = "anon";

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

export interface IStorage {
  listBooks(userId: string): Promise<Book[]>;
  getBook(id: number, userId: string): Promise<Book | undefined>;
  createBook(book: InsertBook, userId: string): Promise<Book>;
  updateBook(id: number, patch: UpdateBook, userId: string): Promise<Book | undefined>;
  deleteBook(id: number, userId: string): Promise<boolean>;
}

export class SupabaseStorage implements IStorage {
  async listBooks(userId: string): Promise<Book[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId || ANON)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`Supabase listBooks: ${error.message}`);
    return (data as Row[]).map(rowToBook);
  }

  async getBook(id: number, userId: string): Promise<Book | undefined> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId || ANON)
      .maybeSingle();
    if (error) throw new Error(`Supabase getBook: ${error.message}`);
    return data ? rowToBook(data as Row) : undefined;
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
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(`Supabase createBook: ${error.message}`);
    return rowToBook(data as Row);
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

    const { data, error } = await supabase
      .from(TABLE)
      .update(upd)
      .eq("id", id)
      .eq("user_id", userId || ANON)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`Supabase updateBook: ${error.message}`);
    return data ? rowToBook(data as Row) : undefined;
  }

  async deleteBook(id: number, userId: string): Promise<boolean> {
    const { data, error } = await supabase
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
