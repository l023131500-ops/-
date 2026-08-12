import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/*
 * IVR API for ימות המשיח (Yemot HaMashiach) integration.
 *
 * Authentication: POST /ivr-api?action=login  { id_number, pin }
 *   → Returns user_id + name for greeting
 *
 * Extensions (all require user_id):
 *   1 – Expenses
 *       1.1 – One-time expense
 *       1.2 – Fixed expense
 *       1.3 – Expense on specific date
 *   2 – Income (one-time / fixed)
 *   3 – Budget summary (listen to totals + future transactions)
 *   4 – Tasks & reminders + rights search
 *   5 – Profile update
 *   9 – Smart system update
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200, ttsText?: string) {
  // If tts_text exists in data, return it for Yemot's say_api_answer
  const body = ttsText
    ? ttsText
    : JSON.stringify(data);
  const contentType = ttsText ? "text/plain; charset=utf-8" : "application/json";
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": contentType },
  });
}

function ttsResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ─── Schemas ───
const LoginSchema = z.object({
  id_number: z.string().min(5).max(15),
  pin: z.string().length(6),
});

const ExpenseSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().positive(),
  subcategory: z.string().min(1).max(100),
  category: z.enum(["fixed_monthly", "one_time"]).default("one_time"),
  description: z.string().max(255).optional(),
  payment_method: z.enum(["credit_card", "cash", "bank_transfer", "check", "standing_order"]).default("cash"),
  installments: z.number().int().min(1).max(60).default(1),
  due_date: z.string().optional(), // for specific-date expenses
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_business: z.boolean().default(false),
});

const IncomeSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().positive(),
  subcategory: z.string().min(1).max(100),
  category: z.enum(["fixed_monthly", "one_time"]).default("one_time"),
  description: z.string().max(255).optional(),
  payment_method: z.enum(["credit_card", "cash", "bank_transfer", "check", "standing_order"]).default("bank_transfer"),
});

const TaskSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  due_date: z.string().optional(),
  category: z.string().max(50).optional(),
  remind_channel: z.enum(["email", "phone", "whatsapp"]).optional(),
});

const CompleteTaskSchema = z.object({
  user_id: z.string().uuid(),
  task_id: z.string().uuid(),
  completion_note: z.string().min(1).max(500),
});

const ProfileUpdateSchema = z.object({
  user_id: z.string().uuid(),
  field: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Gate — this whole function runs on the service role and reads/writes any
  // user's profile, budget and tasks by user_id alone. Its only legitimate
  // caller is the Yemot HaMashiach gateway, so it is machine-to-machine and
  // fails closed: with no IVR_API_KEY set the endpoint is off entirely.
  {
    const expected = Deno.env.get("IVR_API_KEY");
    if (!expected) {
      return new Response(
        JSON.stringify({ error: "ivr-api disabled: IVR_API_KEY is not configured" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Yemot dialplans can only issue plain URLs, so the key is also accepted
    // as ?key= — set it long and rotate it if the URL is ever shared.
    const provided = req.headers.get("x-api-key") || new URL(req.url).searchParams.get("key");
    if (provided !== expected) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const ext = url.searchParams.get("ext");
  const isTts = url.searchParams.get("format") === "tts" || url.searchParams.get("tts") === "1";

  // Helper: return TTS plain text or JSON based on format param
  function respond(data: Record<string, unknown>, ttsText: string) {
    if (isTts) return ttsResponse(ttsText);
    return jsonResponse({ ...data, tts_text: ttsText });
  }

  try {
    // ═══════════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════════
    if (action === "login" && req.method === "POST") {
      const body = await req.json();
      const parsed = LoginSchema.safeParse(body);
      if (!parsed.success) {
        if (isTts) return ttsResponse("שגיאה. נא להזין תעודת זהות ו-PIN בן 6 ספרות.");
        return jsonResponse({ error: "נא להזין תעודת זהות ו-PIN בן 6 ספרות" }, 400);
      }

      const { id_number, pin } = parsed.data;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, name, id_number, ivr_pin")
        .eq("id_number", id_number)
        .eq("ivr_pin", pin)
        .maybeSingle();

      if (error || !profile) {
        if (isTts) return ttsResponse("שגיאה. פרטי ההזדהות שגויים. נסה שנית.");
        return jsonResponse({ error: "פרטי ההזדהות שגויים" }, 401);
      }

      const greeting = `שלום ${profile.name}. להזנת הוצאה הקש 1. להזנת הכנסה הקש 2. לשמיעת תקציב הקש 3. למשימות הקש 4. לעדכון פרופיל הקש 5. לעדכון חכם הקש 9.`;
      return respond({
        status: "authenticated",
        user_id: profile.id,
        greeting: `שלום ${profile.name}`,
      }, greeting);
    }

    // ═══════════════════════════════════════════
    // EXTENSION 1 — Expenses
    // ═══════════════════════════════════════════
    if (action === "add_expense" && req.method === "POST") {
      const body = await req.json();
      const parsed = ExpenseSchema.safeParse(body);
      if (!parsed.success) {
        if (isTts) return ttsResponse("שגיאה בנתונים. נסה שנית.");
        return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
      }
      const d = parsed.data;

      let endDate = d.end_date || null;
      if (d.installments > 1 && !endDate && d.start_date) {
        const start = new Date(d.start_date);
        start.setMonth(start.getMonth() + d.installments);
        endDate = start.toISOString().split("T")[0];
      }

      const { data, error } = await supabase.from("budget_items").insert({
        user_id: d.user_id,
        type: "expense",
        category: d.category,
        subcategory: d.subcategory,
        description: d.description || d.subcategory,
        amount: d.amount,
        payment_method: d.payment_method,
        installments: d.installments,
        is_business: d.is_business,
        is_active: true,
        start_date: d.start_date || new Date().toISOString().split("T")[0],
        due_date: d.due_date || null,
        end_date: endDate,
      }).select().single();

      if (error) {
        if (isTts) return ttsResponse("שגיאה בשמירת ההוצאה. נסה שנית.");
        return jsonResponse({ error: error.message }, 500);
      }
      const ttsMsg = `הוצאה של ${d.amount} שקלים נרשמה בהצלחה. קטגוריה: ${d.subcategory}.`;
      return respond({ status: "created", message: ttsMsg, item: data }, ttsMsg);
    }

    // ═══════════════════════════════════════════
    // EXTENSION 2 — Income
    // ═══════════════════════════════════════════
    if (action === "add_income" && req.method === "POST") {
      const body = await req.json();
      const parsed = IncomeSchema.safeParse(body);
      if (!parsed.success) {
        if (isTts) return ttsResponse("שגיאה בנתונים. נסה שנית.");
        return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
      }
      const d = parsed.data;

      const { data, error } = await supabase.from("budget_items").insert({
        user_id: d.user_id,
        type: "income",
        category: d.category,
        subcategory: d.subcategory,
        description: d.description || d.subcategory,
        amount: d.amount,
        payment_method: d.payment_method,
        is_business: false,
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
        installments: 1,
      }).select().single();

      if (error) {
        if (isTts) return ttsResponse("שגיאה בשמירת ההכנסה. נסה שנית.");
        return jsonResponse({ error: error.message }, 500);
      }
      const ttsMsg = `הכנסה של ${d.amount} שקלים נרשמה בהצלחה. קטגוריה: ${d.subcategory}.`;
      return respond({ status: "created", message: ttsMsg, item: data }, ttsMsg);
    }

    // ═══════════════════════════════════════════
    // EXTENSION 3 — Budget Summary (GET)
    // ═══════════════════════════════════════════
    if (action === "get_summary" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      if (!userId) return jsonResponse({ error: "user_id required" }, 400);

      const { data: items } = await supabase
        .from("budget_items")
        .select("type, amount, category, subcategory, payment_method, start_date, end_date, installments, due_date")
        .eq("user_id", userId)
        .eq("is_active", true);

      const allItems = items || [];
      const fixedIncome = allItems.filter((i: any) => i.type === "income" && i.category === "fixed_monthly");
      const fixedExpenses = allItems.filter((i: any) => i.type === "expense" && i.category === "fixed_monthly");
      const oneTimeExpenses = allItems.filter((i: any) => i.type === "expense" && i.category === "one_time");

      const totalFixedIncome = fixedIncome.reduce((s: number, i: any) => s + Number(i.amount), 0);
      const totalFixedExpenses = fixedExpenses.reduce((s: number, i: any) => s + Number(i.amount), 0);
      const totalOneTimeExpenses = oneTimeExpenses.reduce((s: number, i: any) => s + Number(i.amount), 0);

      // Future transactions (items with due_date in the future)
      const today = new Date().toISOString().split("T")[0];
      const futureItems = allItems.filter((i: any) => i.due_date && i.due_date >= today);

      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending");

      const ttsText = `הסיכום החודשי שלך: הכנסות קבועות ${totalFixedIncome} שקלים, הוצאות קבועות ${totalFixedExpenses} שקלים, יתרה חודשית ${totalFixedIncome - totalFixedExpenses} שקלים. יש לך ${taskCount || 0} משימות פתוחות.`;
      return respond({
        summary: {
          total_fixed_income: totalFixedIncome,
          total_fixed_expenses: totalFixedExpenses,
          total_one_time_expenses: totalOneTimeExpenses,
          monthly_balance: totalFixedIncome - totalFixedExpenses,
          net_balance: totalFixedIncome - totalFixedExpenses - totalOneTimeExpenses,
        },
        pending_tasks: taskCount || 0,
      }, ttsText);
    }

    if (action === "get_budget" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      if (!userId) return jsonResponse({ error: "user_id required" }, 400);

      const { data } = await supabase
        .from("budget_items")
        .select("id, type, category, subcategory, amount, payment_method, is_active, start_date, end_date, installments, due_date")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      return jsonResponse({ items: data || [] });
    }

    // ═══════════════════════════════════════════
    // EXTENSION 4 — Tasks & Reminders
    // ═══════════════════════════════════════════
    if (action === "get_tasks" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      if (!userId) return jsonResponse({ error: "user_id required" }, 400);

      const { data } = await supabase
        .from("tasks")
        .select("id, title, description, due_date, status, category")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(20);

      const tasks = data || [];
      const ttsText = tasks.length === 0
        ? "אין לך משימות פתוחות כרגע."
        : `יש לך ${tasks.length} משימות פתוחות. ${tasks.slice(0, 5).map((t: any, i: number) => `משימה ${i + 1}: ${t.title}, תאריך יעד: ${t.due_date}`).join(". ")}`;

      return respond({ tasks }, ttsText);
    }

    if (action === "add_task" && req.method === "POST") {
      const body = await req.json();
      const parsed = TaskSchema.safeParse(body);
      if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
      const d = parsed.data;

      const { data, error } = await supabase.from("tasks").insert({
        user_id: d.user_id,
        title: d.title,
        description: d.description || "",
        due_date: d.due_date || new Date().toISOString().split("T")[0],
        category: d.category || "general",
        status: "pending",
        remind_channel: d.remind_channel || null,
      }).select().single();

      if (error) {
        if (isTts) return ttsResponse("שגיאה ביצירת המשימה.");
        return jsonResponse({ error: error.message }, 500);
      }
      const ttsMsg = `משימה ${d.title} נוצרה בהצלחה.`;
      return respond({ status: "created", task: data }, ttsMsg);
    }

    if (action === "complete_task" && req.method === "POST") {
      const body = await req.json();
      const parsed = CompleteTaskSchema.safeParse(body);
      if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
      const d = parsed.data;

      const { error } = await supabase.from("tasks").update({
        status: "completed",
        completion_note: d.completion_note,
        completed_at: new Date().toISOString(),
      }).eq("id", d.task_id).eq("user_id", d.user_id);

      if (error) {
        if (isTts) return ttsResponse("שגיאה בסיום המשימה.");
        return jsonResponse({ error: error.message }, 500);
      }
      return respond({ status: "completed" }, "המשימה סומנה כהושלמה.");
    }

    // Search rights/benefits
    if (action === "search_rights" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      const query = url.searchParams.get("q") || "";
      if (!userId) return jsonResponse({ error: "user_id required" }, 400);

      // Get user profile for matching
      const { data: profile } = await supabase
        .from("profiles")
        .select("family_status, children_count, sector, city, health_fund, residential_status")
        .eq("id", userId)
        .single();

      const ttsRights = `חיפוש זכויות עבור ${query}. הנתונים מבוססים על הפרופיל שלך. לפרטים מלאים היכנס לאתר.`;
      return respond({ profile_summary: profile, search_query: query }, ttsRights);
    }

    // ═══════════════════════════════════════════
    // EXTENSION 5 — Profile Update
    // ═══════════════════════════════════════════
    if (action === "update_profile" && req.method === "POST") {
      const body = await req.json();
      const parsed = ProfileUpdateSchema.safeParse(body);
      if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
      const d = parsed.data;

      const allowedFields = [
        "name", "family_status", "children_count", "city", "sector",
        "health_fund", "residential_status", "rent_amount", "mortgage_monthly",
        "special_health_needs", "living_standard",
      ];

      if (!allowedFields.includes(d.field)) {
        return jsonResponse({ error: `שדה ${d.field} לא ניתן לעדכון דרך המערכת הקולית` }, 400);
      }

      const { error } = await supabase
        .from("profiles")
        .update({ [d.field]: d.value, updated_at: new Date().toISOString() })
        .eq("id", d.user_id);

      if (error) {
        if (isTts) return ttsResponse("שגיאה בעדכון הפרופיל.");
        return jsonResponse({ error: error.message }, 500);
      }
      const ttsMsg = `השדה ${d.field} עודכן בהצלחה.`;
      return respond({ status: "updated" }, ttsMsg);
    }

    if (action === "get_profile" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      if (!userId) return jsonResponse({ error: "user_id required" }, 400);

      const { data, error } = await supabase
        .from("profiles")
        .select("name, family_status, children_count, city, sector, health_fund, residential_status, rent_amount, mortgage_monthly, living_standard")
        .eq("id", userId)
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        profile: data,
        updatable_fields: {
          "1": "שם",
          "2": "מצב משפחתי",
          "3": "מספר ילדים",
          "4": "עיר",
          "5": "מגזר",
          "6": "קופת חולים",
          "7": "סטטוס מגורים",
          "8": "שכר דירה",
          "9": "משכנתא",
        },
      });
    }

    // ═══════════════════════════════════════════
    // EXTENSION 9 — Smart Update (batch)
    // ═══════════════════════════════════════════
    if (action === "smart_update" && req.method === "POST") {
      const body = await req.json();
      const userId = body.user_id;
      if (!userId) return jsonResponse({ error: "user_id required" }, 400);

      const results: any[] = [];

      // Process multiple updates in one call
      if (body.expenses && Array.isArray(body.expenses)) {
        for (const exp of body.expenses) {
          const { error } = await supabase.from("budget_items").insert({
            user_id: userId,
            type: "expense",
            category: exp.category || "one_time",
            subcategory: exp.subcategory || "כללי",
            amount: exp.amount,
            payment_method: exp.payment_method || "cash",
            is_business: false,
            is_active: true,
            start_date: new Date().toISOString().split("T")[0],
            installments: exp.installments || 1,
          });
          results.push({ type: "expense", subcategory: exp.subcategory, status: error ? "error" : "ok" });
        }
      }

      if (body.incomes && Array.isArray(body.incomes)) {
        for (const inc of body.incomes) {
          const { error } = await supabase.from("budget_items").insert({
            user_id: userId,
            type: "income",
            category: inc.category || "one_time",
            subcategory: inc.subcategory || "כללי",
            amount: inc.amount,
            is_business: false,
            is_active: true,
            start_date: new Date().toISOString().split("T")[0],
            installments: 1,
          });
          results.push({ type: "income", subcategory: inc.subcategory, status: error ? "error" : "ok" });
        }
      }

      if (body.tasks && Array.isArray(body.tasks)) {
        for (const task of body.tasks) {
          const { error } = await supabase.from("tasks").insert({
            user_id: userId,
            title: task.title,
            description: task.description || "",
            due_date: task.due_date || new Date().toISOString().split("T")[0],
            category: task.category || "general",
            status: "pending",
          });
          results.push({ type: "task", title: task.title, status: error ? "error" : "ok" });
        }
      }

      const ttsMsg = `עודכנו ${results.length} פריטים בהצלחה.`;
      return respond({ status: "batch_complete", results }, ttsMsg);
    }

    // ═══════════════════════════════════════════
    // IVR Menu Tree (for Yemot HaMashiach config)
    // ═══════════════════════════════════════════
    if (action === "menu" && req.method === "GET") {
      return jsonResponse({
        main_menu: {
          greeting: "שלום, ברוכים הבאים למערכת FinanceHub",
          auth: "הקש תעודת זהות ולאחר מכן סיסמה בת 6 ספרות",
          extensions: {
            "1": {
              title: "הזנת הוצאה",
              sub: {
                "1": "הוצאה חד פעמית — הקישו סכום, בחרו קטגוריה ואמצעי תשלום",
                "2": "הוצאה קבועה — הקישו סכום, בחרו קטגוריה, תאריך התחלה ואמצעי תשלום",
                "3": "הוצאה בתאריך מסוים — הקישו סכום, תאריך, קטגוריה ואמצעי תשלום",
              },
              payment_options: {
                "1": "אשראי",
                "2": "מזומן",
                "3": "העברה בנקאית",
                "4": "צ'ק",
                "5": "הוראת קבע",
              },
              installments: "אם התשלום בתשלומים — הקישו מספר תשלומים, או 0 לדילוג",
            },
            "2": {
              title: "הזנת הכנסה",
              sub: {
                "1": "הכנסה חד פעמית",
                "2": "הכנסה קבועה",
              },
            },
            "3": {
              title: "שמיעת תקציב",
              description: "האזנה לסיכום הכנסות והוצאות קבועות, יתרה חודשית, ותנועות עתידיות",
            },
            "4": {
              title: "משימות ותזכורות",
              sub: {
                "1": "שמיעת משימות פתוחות",
                "2": "הוספת משימה חדשה",
                "3": "סימון משימה כהושלמה",
                "4": "חיפוש זכויות",
              },
            },
            "5": {
              title: "עדכון פרופיל",
              sub: {
                "1": "שם",
                "2": "מצב משפחתי",
                "3": "מספר ילדים",
                "4": "עיר",
                "5": "מגזר",
                "6": "קופת חולים",
                "7": "סטטוס מגורים",
                "8": "שכר דירה",
                "9": "משכנתא",
              },
            },
            "9": {
              title: "עדכון חכם",
              description: "הזנת מספר פריטים בבת אחת — הוצאות, הכנסות ומשימות",
            },
          },
        },
      });
    }

    if (isTts) return ttsResponse("שגיאה. פעולה לא מוכרת.");
    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isTts) return ttsResponse(`שגיאה במערכת. ${msg}`);
    return jsonResponse({ error: msg }, 500);
  }
});
