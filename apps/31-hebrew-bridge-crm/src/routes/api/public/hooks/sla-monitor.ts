import { createFileRoute } from "@tanstack/react-router";

/**
 * SLA Monitor
 *
 * Daily cron-driven endpoint. Finds tasks that are still 'pending' after their
 * due_date, escalates them to 'high' priority, and records a row in
 * communication_logs so admins see them in the in-app feed.
 *
 * Authentication: the pg_cron job calls this with the Supabase anon key in the
 * `apikey` header (standard /api/public/* contract).
 */
export const Route = createFileRoute("/api/public/hooks/sla-monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const nowIso = new Date().toISOString();

        // Find pending tasks past due_date that are not already high priority
        const { data: overdue, error: readErr } = await supabaseAdmin
          .from("tasks")
          .select("id, client_id, partner_id, title, due_date, priority")
          .eq("status", "pending")
          .lt("due_date", nowIso)
          .neq("priority", "high");

        if (readErr) {
          return new Response(JSON.stringify({ error: readErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let escalated = 0;
        for (const t of overdue ?? []) {
          const { error: upErr } = await supabaseAdmin
            .from("tasks")
            .update({ priority: "high" })
            .eq("id", t.id);
          if (upErr) continue;

          await supabaseAdmin.from("communication_logs").insert({
            client_id: t.client_id,
            template_type: "sla_breach",
            channel: "system",
            status: "auto_generated",
            payload: {
              task_id: t.id,
              task_title: t.title,
              due_date: t.due_date,
              previous_priority: t.priority,
              escalated_to: "high",
              detected_at: nowIso,
              note: "משימה חרגה ממועד יעד — עודכנה לעדיפות גבוהה אוטומטית",
            },
          });
          escalated++;
        }

        return new Response(
          JSON.stringify({
            ok: true,
            checked: overdue?.length ?? 0,
            escalated,
            ranAt: nowIso,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
