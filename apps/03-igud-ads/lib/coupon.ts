import { createSupabaseService } from "./supabase/server";

export async function generateCouponCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "ADS-";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function validateAndConsumeCoupon(code: string) {
  const svc = createSupabaseService();
  const { data: coupon, error } = await svc
    .from("ad_coupons")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !coupon) {
    return { ok: false as const, reason: "קוד הקופון לא נמצא או לא פעיל" };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { ok: false as const, reason: "תוקף הקופון פג" };
  }
  if (coupon.used_designs >= coupon.max_designs) {
    return { ok: false as const, reason: "הקופון מוצה במלואו" };
  }
  return { ok: true as const, coupon };
}

export async function incrementCouponUsage(id: string) {
  const svc = createSupabaseService();
  const { data } = await svc.from("ad_coupons").select("used_designs").eq("id", id).maybeSingle();
  if (!data) return;
  await svc
    .from("ad_coupons")
    .update({ used_designs: (data.used_designs || 0) + 1 })
    .eq("id", id);
}
