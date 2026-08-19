import { NextRequest, NextResponse } from "next/server";
import { listUploaded, listUploadedBy, uploadItem, supabaseReady } from "@/lib/supabase";
import { readOverrides, applyOverrides } from "@/lib/overrides";
import { MAX_UPLOAD_BYTES, isAcceptedType, TOO_LARGE_MSG, BAD_TYPE_MSG } from "@/lib/upload-limits";
import { callerFromRequest, AUTH_REQUIRED_MSG, MINE_AUTH_REQUIRED_MSG } from "@/lib/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const overrides = await readOverrides();

  // `?mine=1` — מה שהקוראת הזאת עצמה העלתה, ורק היא. זה מה שהכניסה פותחת מעבר
  // להעלאה עצמה, ולכן הוא נשאל באותה בדיקת טוקן: בלי חשבון אין "שלי".
  if (req.nextUrl.searchParams.get("mine") === "1") {
    const caller = await callerFromRequest(req);
    if (!caller) return NextResponse.json({ error: MINE_AUTH_REQUIRED_MSG }, { status: 401 });
    // כאן, בשונה מהמדף הציבורי, חומר שהוסתר לא נעלם אלא מסומן: המעלה צריכה
    // לדעת שהחומר שלה כבר לא מוצג, ולא לחשוב שהוא נעלם מהמערכת.
    const items = (await listUploadedBy(caller.id)).map((i) => {
      const o = overrides[i.id];
      return {
        ...i,
        ...(o?.hiddenPages?.length ? { hiddenPages: o.hiddenPages } : {}),
        ...(o?.hidden ? { hidden: true } : {}),
      };
    });
    return NextResponse.json({ ready: supabaseReady, items });
  }

  // Overrides apply to uploaded material too. /shelf/[id] has always honoured
  // them; this list did not, so a hidden upload kept its card (and its download
  // button, which links straight at the file) on the shelf.
  const items = applyOverrides(await listUploaded(), overrides);
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

    const result = await uploadItem({ title, category, sender, file, uploader: caller });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, item: result.item });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "שגיאה בהעלאה" }, { status: 500 });
  }
}
