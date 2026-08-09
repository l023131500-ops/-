import { NextRequest, NextResponse } from "next/server";
import { listUploaded, uploadItem, supabaseReady } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listUploaded();
  return NextResponse.json({ ready: supabaseReady, items });
}

export async function POST(req: NextRequest) {
  if (!supabaseReady) {
    return NextResponse.json(
      { error: "אחסון הענן אינו מוגדר עדיין. יש להזין משתני SUPABASE_URL ו-SUPABASE_ANON_KEY." },
      { status: 503 }
    );
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "").trim();
    const sender = String(form.get("sender") || "").trim();

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "לא נבחר קובץ." }, { status: 400 });
    }
    if (!title || !category) {
      return NextResponse.json({ error: "חסרים כותרת או קטגוריה." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 25MB)." }, { status: 400 });
    }
    const okType = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!okType) {
      return NextResponse.json({ error: "יש להעלות קובץ PDF או תמונה בלבד." }, { status: 400 });
    }

    const result = await uploadItem({ title, category, sender, file });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, item: result.item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "שגיאה בהעלאה" }, { status: 500 });
  }
}
