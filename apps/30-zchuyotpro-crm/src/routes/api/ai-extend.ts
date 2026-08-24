import { createFileRoute } from "@tanstack/react-router";

// AI extension assistant (flagship spec item 2): a manager describes in free
// text what to add to the own CRM; Claude returns a structured proposal
// (custom fields to add, modules to show/hide). The proposal is only a
// suggestion — the client applies approved actions itself under RLS, so this
// route never writes anything.
//
// Anthropic is called over raw HTTP: this deploy builds from a frozen bun
// lockfile, so adding @anthropic-ai/sdk here would break the Vercel build.

const MODEL = "claude-opus-4-8";

const CATEGORIES = ["personal", "family", "financial", "housing", "vehicles", "other"];
const FIELD_TYPES = ["text", "number", "date", "boolean", "select", "multiselect"];
const MODULE_KEYS = ["financial", "cashflow", "housing", "vehicles", "property-media", "referrals"];

const PROPOSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "actions"],
  properties: {
    summary: { type: "string", description: "סיכום קצר בעברית של ההצעה" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "reason"],
        properties: {
          kind: { type: "string", enum: ["add_field", "enable_module", "disable_module", "note"] },
          reason: { type: "string", description: "משפט בעברית: למה הפעולה הזו עונה על הבקשה" },
          // add_field
          category: { type: "string", enum: CATEGORIES },
          label: { type: "string" },
          field_type: { type: "string", enum: FIELD_TYPES },
          options: { type: "array", items: { type: "string" } },
          visible_to_client: { type: "boolean" },
          client_editable: { type: "boolean" },
          // enable_module / disable_module
          module_key: { type: "string", enum: MODULE_KEYS },
          // note — advice that needs no system change
          note: { type: "string" },
        },
      },
    },
  },
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/ai-extend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return json({ error: "נדרשת התחברות" }, 401);

          const body = await request.json().catch(() => null);
          const ask = typeof body?.request === "string" ? body.request.trim() : "";
          if (!ask) return json({ error: "יש לתאר מה להוסיף למערכת" }, 400);
          if (ask.length > 2000) return json({ error: "הבקשה ארוכה מדי (עד 2000 תווים)" }, 400);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData.user) return json({ error: "ההתחברות אינה תקפה" }, 401);

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, role, tenant_id")
            .eq("auth_user_id", userData.user.id)
            .maybeSingle();
          if (!profile) return json({ error: "המשתמש אינו איש צוות" }, 403);
          if (profile.role !== "admin" && profile.role !== "manager") {
            return json({ error: "רק מנהל יכול להרחיב את המערכת" }, 403);
          }

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return json(
              { error: "עוזר ה-AI אינו מוגדר בסביבה זו (חסר ANTHROPIC_API_KEY). ניתן להוסיף שדות ומודולים ידנית בלשונית זו." },
              503,
            );
          }

          // ground the proposal in what already exists so it doesn't duplicate
          const { data: existingDefs } = await supabaseAdmin
            .from("custom_field_definitions")
            .select("category, field_key, label, field_type")
            .eq("tenant_id", profile.tenant_id);
          const { data: tenant } = await supabaseAdmin
            .from("tenants")
            .select("settings")
            .eq("id", profile.tenant_id)
            .maybeSingle();
          const modules = (tenant?.settings as { modules?: Record<string, boolean> } | null)?.modules ?? {};

          const system = [
            "אתה עוזר-הרחבה של מערכת CRM רב-דיירית לניהול לקוחות ומימוש זכויות בעברית.",
            "מנהל המשרד מתאר יכולת שחסרה לו, ואתה מציע שינויי תצורה קונקרטיים בלבד, מהסוגים:",
            "- add_field: שדה לקוח מותאם (בקטגוריה המתאימה, עם סוג נתון נכון; ל-select/multiselect חובה options בעברית).",
            "- enable_module / disable_module: הצגה/הסתרה של מודול קיים במערכת.",
            "- note: עצה קצרה כשאין צורך בשינוי תצורה (למשל כשהיכולת כבר קיימת).",
            "כללים: אל תציע שדה שכבר קיים; תוויות (label) בעברית; visible_to_client=true רק כשהמידע מיועד גם ללקוח; client_editable=true רק כשמצופה שהלקוח ימלא בעצמו; עדיף מעט פעולות מדויקות על הרבה כלליות.",
            `מודולים קיימים (key: מוצג/מוסתר): ${MODULE_KEYS.map((k) => `${k}: ${modules[k] === false ? "מוסתר" : "מוצג"}`).join(", ")}`,
            `שדות מותאמים קיימים: ${(existingDefs ?? []).length === 0 ? "אין" : (existingDefs ?? []).map((d) => `${d.label} (${d.category}/${d.field_type})`).join(", ")}`,
          ].join("\n");

          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: 4000,
              system,
              output_config: { format: { type: "json_schema", schema: PROPOSAL_SCHEMA } },
              messages: [{ role: "user", content: `בקשת המנהל: ${ask}` }],
            }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            console.error("[ai-extend] anthropic error", res.status, errText.slice(0, 500));
            return json({ error: "עוזר ה-AI אינו זמין כרגע, נסו שוב מאוחר יותר" }, 502);
          }

          const message = await res.json();
          if (message.stop_reason === "refusal") {
            return json({ error: "הבקשה נדחתה על ידי עוזר ה-AI — נסחו אותה מחדש" }, 422);
          }
          const text = (message.content ?? []).find((b: { type: string }) => b.type === "text")?.text;
          if (!text) return json({ error: "עוזר ה-AI לא החזיר הצעה" }, 502);

          let proposal: { summary?: string; actions?: unknown[] };
          try {
            proposal = JSON.parse(text);
          } catch {
            console.error("[ai-extend] unparseable output", text.slice(0, 300));
            return json({ error: "עוזר ה-AI החזיר תשובה לא תקינה" }, 502);
          }

          return json({ ok: true, summary: proposal.summary ?? "", actions: proposal.actions ?? [] });
        } catch (e) {
          console.error("[ai-extend]", e);
          return json({ error: "internal" }, 500);
        }
      },
    },
  },
});
