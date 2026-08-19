import { NextResponse } from "next/server";
import { createSupabaseService } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// GET - list all notifications across users
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const svc = createSupabaseService();
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const user = url.searchParams.get("user");

  let q = svc
    .from("ad_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (type) q = q.eq("type", type);
  if (user) q = q.ilike("user_email", `%${user}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message, notifications: [] }, { status: 500 });
  return NextResponse.json({ notifications: data || [] });
}

// POST - send a notification to one user OR broadcast to many
// body: { to?: string, broadcast?: "all" | "active" | "with_coupon",
//         title, body, type?, link_url?, also_email? }
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const svc = createSupabaseService();
  const type = body.type || "custom";

  let recipients: string[] = [];
  if (body.to) {
    recipients = [String(body.to).toLowerCase()];
  } else if (body.broadcast) {
    let q = svc.from("ad_users").select("email");
    if (body.broadcast === "active") q = q.eq("is_active", true);
    else if (body.broadcast === "with_coupon") q = q.not("coupon_id", "is", null);
    const { data: users } = await q;
    recipients = (users || []).map((u: { email: string }) => u.email).filter(Boolean);
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "no recipients" }, { status: 400 });
  }

  const rows = recipients.map((email) => ({
    user_email: email,
    type,
    title: body.title,
    body: body.body || null,
    link_url: body.link_url || null,
    is_read: false,
    metadata: { sent_by_admin: true },
  }));

  const { error } = await svc.from("ad_notifications").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional: send emails
  let emailed = 0;
  if (body.also_email) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    if (baseUrl) {
      await Promise.all(recipients.map(async (to) => {
        try {
          const r = await fetch(`${baseUrl}/api/notifications/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to, subject: body.title, body: body.body || "", type }),
          });
          if (r.ok) emailed++;
        } catch {}
      }));
    }
  }

  await svc.from("ad_audit_log").insert({
    action: "broadcast_notification",
    entity_type: "notification",
    details: { recipients_count: recipients.length, emailed, type, title: body.title },
  });

  return NextResponse.json({ ok: true, sent: recipients.length, emailed });
}
