import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * np-send-signature — email a signing link to one signer.
 *
 * Why an Edge Function and not a route in the site: the Resend key must never
 * reach a browser, and it lives in core.secrets, which is readable only with the
 * hub service-role key. That key is already present in this runtime's own
 * environment, so the function can fetch the secret without anybody — including
 * whoever deploys this — ever handling it. A serverless route in the Vercel
 * project would have needed the service-role key copied into a second place.
 *
 * Authorisation is delegated, not re-implemented. The caller's own JWT is used
 * to call np_contract_get; RLS decides whether they may see that contract. If
 * they cannot, they get nothing back and the send is refused. There is no path
 * here that trusts a contract id from the request body on its own.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "https://more30.com",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });

/** One secret from core.secrets, via the RPC whose EXECUTE is service_role only. */
async function getSecret(name: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_secrets_fetch`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_scope: null }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ name: string; value: string }>;
  const hit = rows.find((r) => r.name === name);
  // Values written through a PowerShell pipe pick up a UTF-8 BOM, and a BOM
  // inside an API key makes header construction throw far from the cause.
  return hit ? hit.value.replace(/^﻿/, "").trim() : null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "לא מחובר" }, 401);

  let body: { contract_id?: string; signature_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "גוף הבקשה אינו JSON תקין" }, 400);
  }
  if (!body.contract_id || !body.signature_id) {
    return json({ error: "חסר contract_id או signature_id" }, 400);
  }

  // The authorisation check: read the contract AS THE CALLER. RLS answers.
  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/np_contract_get`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ p_id: body.contract_id }),
  });
  if (!cRes.ok) return json({ error: "טעינת המסמך נכשלה" }, 403);
  const data = await cRes.json();
  if (!data || !data.contract) {
    return json({ error: "המסמך לא נמצא, או שאין לך הרשאה אליו" }, 403);
  }

  const signer = (data.signers ?? []).find((s: { id: string }) => s.id === body.signature_id);
  if (!signer) return json({ error: "החותם לא נמצא במסמך הזה" }, 404);
  if (!signer.email) return json({ error: "לחותם אין כתובת דוא״ל" }, 400);
  if (signer.signed_at) return json({ error: "המסמך כבר נחתם על ידי החותם הזה" }, 409);

  const key = await getSecret("RESEND_API_KEY");
  if (!key) {
    return json(
      { error: "RESEND_API_KEY אינו מוגדר ב-core.secrets. לא נשלח דבר." },
      503,
    );
  }

  const link = `https://more30.com/tivuch/sign?t=${signer.token}`;
  const title = data.contract.title ?? "מסמך לחתימה";
  const broker = data.contract.broker_name ?? "";
  const licence = data.contract.broker_license ?? "";

  // Plain, RTL, no images and no tracking pixels — this is a legal document
  // request, and a mail that looks like marketing gets treated like marketing.
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;padding:0;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fc;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:6px;padding:32px 28px;text-align:right">
<tr><td>
<p style="margin:0 0 18px;font-size:15px;color:#1a2233">שלום ${esc(signer.name)},</p>
<p style="margin:0 0 18px;font-size:15px;color:#1a2233;line-height:1.7">
נשלח אליך מסמך לחתימה: <b>${esc(title)}</b>${broker ? ` מאת ${esc(broker)}` : ""}${licence ? ` (רישיון תיווך ${esc(licence)})` : ""}.
</p>
<p style="margin:0 0 26px;font-size:15px;color:#1a2233;line-height:1.7">
הקישור אישי ומיועד לך בלבד. אפשר לקרוא את המסמך במלואו לפני החתימה.
</p>
<p style="margin:0 0 26px">
<a href="${link}" style="display:inline-block;background:#0b7d7c;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:3px;font-size:15px;font-weight:bold">צפייה וחתימה על המסמך</a>
</p>
<p style="margin:0 0 18px;font-size:12.5px;color:#5b6577;line-height:1.7">
אם הכפתור אינו עובד, העתק את הכתובת הזו לדפדפן:<br/>
<span style="color:#0b7d7c;word-break:break-all">${link}</span>
</p>
<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #e3e8f0;font-size:12px;color:#5b6577;line-height:1.7">
החתימה היא <b>חתימה אלקטרונית מאובטחת</b> לפי חוק חתימה אלקטרונית, תשס״א-2001 —
יישמרו מועד החתימה, כתובת ה-IP ותמצית נוסח המסמך. זו אינה חתימה אלקטרונית מאושרת.
<br/><br/>אם לא ציפית למסמך הזה, אפשר להתעלם מהודעה זו ולא ייחתם דבר.
</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#8b93a5">נשלח דרך נדל״ן פרו · more30.com</p>
</td></tr></table></body></html>`;

  const text = `שלום ${signer.name},\n\nנשלח אליך מסמך לחתימה: ${title}${broker ? ` מאת ${broker}` : ""}.\n\nלצפייה וחתימה:\n${link}\n\nהחתימה היא חתימה אלקטרונית מאובטחת לפי חוק תשס"א-2001. אינה חתימה מאושרת.\nאם לא ציפית למסמך הזה, אפשר להתעלם.`;

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: "נדל\"ן פרו <onboarding@resend.dev>",
      to: [signer.email],
      subject: `מסמך לחתימה: ${title}`,
      html,
      text,
    }),
  });

  const sendBody = await send.text();
  if (!send.ok) {
    // The failure is returned, not swallowed: a signer who never got the mail
    // and an office that thinks it sent one is the worst outcome here.
    return json({ error: `שליחת הדוא״ל נכשלה: ${send.status} ${sendBody.slice(0, 300)}` }, 502);
  }

  // Record the send as evidence, with service role so the log is written even
  // though signature_events is append-only for the caller.
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/np_sign_log`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      p_signature: body.signature_id,
      p_event: "emailed",
      p_detail: { to: signer.email, provider: "resend" },
    }),
  }).catch(() => {});

  return json({ ok: true, to: signer.email });
});
