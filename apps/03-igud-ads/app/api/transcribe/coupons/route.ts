import { NextResponse } from "next/server";
import { createTranscribeService } from "@/lib/supabase/transcribe-server";

/** בדיקת קופון מצד הלקוח (לפני העלאה). שימוש משרת בלבד דרך service-role. */
export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "קוד קופון חסר" }, { status: 400 });
    }
    const sb = createTranscribeService();
    const { data, error } = await sb
      .from("coupon_codes")
      .select("id, max_uploads, used_uploads, expires_at, is_active")
      .eq("code", code.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "קופון לא קיים" }, { status: 404 });
    if (!data.is_active) return NextResponse.json({ error: "קופון מושהה" }, { status: 403 });
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "פג תוקף הקופון" }, { status: 403 });
    }
    if (data.used_uploads >= data.max_uploads) {
      return NextResponse.json({ error: "הקופון מוצה" }, { status: 403 });
    }
    return NextResponse.json({
      coupon: {
        id: data.id,
        remaining: data.max_uploads - data.used_uploads,
        max_uploads: data.max_uploads,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "שגיאה" }, { status: 500 });
  }
}
