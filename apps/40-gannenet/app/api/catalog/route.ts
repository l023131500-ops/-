import { NextRequest, NextResponse } from "next/server";
import { listUploaded, uploadItem, supabaseReady } from "@/lib/supabase";
import { readOverrides, applyOverrides } from "@/lib/overrides";
import { MAX_UPLOAD_BYTES, isAcceptedType, TOO_LARGE_MSG, BAD_TYPE_MSG } from "@/lib/upload-limits";
import { callerFromRequest, AUTH_REQUIRED_MSG } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Overrides apply to uploaded material too. /shelf/[id] has always honoured
  // them; this list did not, so a hidden upload kept its card (and its download
  // button, which links straight at the file) on the shelf.
  const items = applyOverrides(await listUploaded(), await readOverrides());
  return NextResponse.json({ ready: supabaseReady, items });
}

export async function POST(req: NextRequest) {
  if (!supabaseReady) {
    return NextResponse.json(
      { error: "אחסון הענן אינו מוגדר עדיין. יש להזין משתני SUPABASE_URL ו-SUPABASE_ANON_KEY." },
      { status: 503 }
    );
  }
  // לפני קריאת הגוף, לא אחריה: העלאה אנונימית לא צריכה להגיע לשרת בכלל, וכל
  // בייט שנקרא כאן הוא בייט שקורא בלי חשבון גרם לנו להעביר. הצפייה וההורדה
  // (GET למעלה) נשארות פתוחות לכולם — רק הכתיבה למדף דורשת חשבון.
  const caller = await callerFromRequest(req);
  if (!caller) {
    return NextResponse.json({ error: AUTH_REQUIRED_MSG }, { status: 401 });
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
    // 25MB before — above the 4.5MB the platform lets into the request body at
    // all, so the check could only ever run for files the edge had already let
    // through. lib/upload-limits.ts has the reasoning and the one number.
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: TOO_LARGE_MSG }, { status: 413 });
    }
    if (!isAcceptedType(file.type)) {
      return NextResponse.json({ error: BAD_TYPE_MSG }, { status: 400 });
    }

    const result = await uploadItem({ title, category, sender, file });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, item: result.item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "שגיאה בהעלאה" }, { status: 500 });
  }
}
