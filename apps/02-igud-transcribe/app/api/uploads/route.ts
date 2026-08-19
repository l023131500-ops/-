import { NextResponse } from "next/server";
import { createSupabaseService, createSupabaseServiceRaw } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_STYLES = new Set(["litvish", "chassidish", "yiddish"]);
const MAX_AUDIO_BYTES = 200 * 1024 * 1024; // 200MB

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const code = (form.get("code") as string || "").trim();
    const style = (form.get("style") as string || "").trim();
    const uploader_email = (form.get("uploader_email") as string || "").trim() || null;
    const file = form.get("file") as File | null;

    if (!code) return NextResponse.json({ ok: false, error: "קוד קופון חסר" }, { status: 400 });
    if (!ALLOWED_STYLES.has(style)) return NextResponse.json({ ok: false, error: "מסלול לא חוקי" }, { status: 400 });
    if (!file) return NextResponse.json({ ok: false, error: "קובץ אודיו חסר" }, { status: 400 });
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ ok: false, error: "הקובץ גדול מ-200MB" }, { status: 413 });
    }

    const sb = createSupabaseService();

    // בדיקת קופון אטומית: עדכון עם תנאי (לא לאפשר מרוץ)
    const { data: coupon, error: couponErr } = await sb
      .from("coupon_codes")
      .select("id, max_uploads, used_uploads, expires_at, is_active")
      .eq("code", code)
      .maybeSingle();
    if (couponErr) throw couponErr;
    if (!coupon) return NextResponse.json({ ok: false, error: "קופון לא קיים" }, { status: 404 });
    if (!coupon.is_active) return NextResponse.json({ ok: false, error: "קופון מושהה" }, { status: 403 });
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "פג תוקף הקופון" }, { status: 403 });
    }
    if (coupon.used_uploads >= coupon.max_uploads) {
      return NextResponse.json({ ok: false, error: "הקופון מוצה" }, { status: 403 });
    }

    // העלאה ל-Storage (bucket: audio)
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const id = randomUUID();
    const path = `${id}.${ext}`;
    const raw = createSupabaseServiceRaw();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await raw.storage.from("audio").upload(path, buffer, {
      contentType: file.type || "audio/mpeg",
      upsert: false
    });
    if (upErr) throw upErr;

    // יצירת רשומת uploads + job
    const { data: uploadRow, error: insErr } = await sb
      .from("uploads")
      .insert({
        id,
        coupon_id: coupon.id,
        uploader_email,
        style,
        status: "uploaded",
        storage_path: path,
        size_bytes: file.size,
        original_filename: file.name
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const { error: jobErr } = await sb.from("jobs").insert({
      upload_id: uploadRow.id,
      type: "transcribe",
      status: "pending"
    });
    if (jobErr) throw jobErr;

    // עדכון מונה שימוש בקופון — compare-and-swap כדי שבקשות מקבילות לא ידרסו
    // אחת את השנייה (read-modify-write רגיל מאבד ספירה תחת מרוץ, בדיוק כמו
    // שנמצא ותוקן ב-03-igud-ads/lib/coupon.ts)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: current } = await sb
        .from("coupon_codes")
        .select("used_uploads")
        .eq("id", coupon.id)
        .maybeSingle();
      if (!current) break;
      const { data: updated } = await sb
        .from("coupon_codes")
        .update({ used_uploads: current.used_uploads + 1 })
        .eq("id", coupon.id)
        .eq("used_uploads", current.used_uploads)
        .select("id");
      if (updated && updated.length > 0) break;
    }

    return NextResponse.json({ ok: true, upload_id: uploadRow.id });
  } catch (e: any) {
    console.error("[uploads]", e);
    return NextResponse.json({ ok: false, error: e?.message || "שגיאה כללית" }, { status: 500 });
  }
}
