import { motion } from "framer-motion";
import { Code2, Copy, CheckCircle2, Lock, Webhook } from "lucide-react";
import { useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  description: string;
  body?: string;
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/input/text",
    title: "TEXT_INPUT — הזנת טקסט",
    description: "שליחת טקסט חופשי (סימולציית WhatsApp). המערכת מפרשת, מסווגת ושומרת אוטומטית.",
    body: `{
  "userId": "c1",
  "timestamp": "${new Date().toISOString()}",
  "inputType": "TEXT_INPUT",
  "category": "auto_detect",
  "rawText": "שילמתי 500 שח על אוכל"
}`,
    response: `{
  "id": "tx_abc123",
  "status": "created",
  "parsedAmount": 500,
  "parsedCategory": "food",
  "healthScoreImpact": -2
}`,
  },
  {
    method: "POST",
    path: "/api/v1/input/audio",
    title: "AUDIO_BLOB — הודעה קולית",
    description: "שליחת blob קולי. המערכת מתמללת, מפרשת ושומרת.",
    body: `{
  "userId": "c1",
  "timestamp": "${new Date().toISOString()}",
  "inputType": "AUDIO_BLOB",
  "category": "auto_detect",
  "audioBlob": "base64_encoded_audio...",
  "mimeType": "audio/webm"
}`,
    response: `{
  "id": "tx_def456",
  "status": "created",
  "transcription": "דלק 250 שקל",
  "parsedAmount": 250,
  "parsedCategory": "car"
}`,
  },
  {
    method: "POST",
    path: "/api/v1/input/structured",
    title: "STRUCTURED_DATA — נתון מובנה",
    description: "שליחת נתון מובנה ישירות מ-Bot/Zapier/Make עם כל השדות.",
    body: `{
  "userId": "c1",
  "timestamp": "${new Date().toISOString()}",
  "inputType": "STRUCTURED_DATA",
  "category": "housing",
  "data": {
    "type": "expense",
    "amount": 4200,
    "description": "שכר דירה חודשי",
    "isRecurring": true,
    "isInstallment": false
  }
}`,
    response: `{
  "id": "tx_ghi789",
  "status": "created",
  "budgetRemaining": 800,
  "categoryLimit": 5000
}`,
  },
  {
    method: "POST",
    path: "/api/v1/expenses",
    title: "הוספת הוצאה (WhatsApp / כללי)",
    description: "יצירת רשומת הוצאה חדשה. מבנה JSON סטנדרטי להוספת הוצאה דרך WhatsApp, בוט או ממשק חיצוני.",
    body: `{
  "user_id": "string",
  "amount": 450,
  "category": "food",
  "description": "קניות בסופר",
  "type": "text"
}`,
    response: `{
  "id": "exp_abc123",
  "status": "created",
  "category_detected": "מזון",
  "budget_remaining": 3050,
  "health_score_impact": -1
}`,
  },
  {
    method: "POST",
    path: "/api/v1/income",
    title: "הוספת הכנסה",
    description: "רישום הכנסה חדשה עם מקור וסכום",
    body: `{
  "userId": "c1",
  "timestamp": "${new Date().toISOString()}",
  "amount": 22000,
  "source": "salary",
  "description": "משכורת חודשית"
}`,
    response: `{
  "id": "inc_xyz789",
  "status": "created"
}`,
  },
  {
    method: "POST",
    path: "/api/v1/tasks",
    title: "יצירת משימה",
    description: "יצירת משימה חדשה עם תאריך יעד ותיוג מצב",
    body: `{
  "userId": "c1",
  "timestamp": "${new Date().toISOString()}",
  "title": "חידוש ביטוח רכב",
  "due_date": "2026-04-15",
  "mode": "household",
  "priority": "high"
}`,
    response: `{
  "id": "task_def456",
  "status": "created",
  "reminder_set": true
}`,
  },
  {
    method: "GET",
    path: "/api/v1/clients/:id/status",
    title: "סטטוס לקוח",
    description: "שליפת סטטוס פיננסי מלא — ציון בריאות, זכויות ויתרות. כולל UserID ו-Timestamp.",
    response: `{
  "client_id": "c1",
  "timestamp": "${new Date().toISOString()}",
  "health_score": 82,
  "benefits_utilized": 5,
  "monthly_balance": 4200,
  "alerts": []
}`,
  },
  {
    method: "GET",
    path: "/api/v1/benefits/scan",
    title: "סריקת זכויות",
    description: "סריקת פרופיל וזיהוי זכויות והטבות זמינות",
    response: `{
  "userId": "c1",
  "timestamp": "${new Date().toISOString()}",
  "total_found": 8,
  "new_discoveries": 2,
  "estimated_annual_saving": 6400,
  "benefits": [...]
}`,
  },
  {
    method: "POST",
    path: "/functions/v1/leads-api",
    title: "יצירת ליד חדש",
    description: "קבלת ליד ממערכת חיצונית (Zapier, Make, n8n, CRM, טפסים). כל ליד נשמר עם מקור המעקב.",
    body: `{
  "name": "ישראל כהן",
  "email": "israel@example.com",
  "phone": "050-1234567",
  "message": "מעוניין בהדגמה",
  "source": "facebook_ads"
}`,
    response: `{
  "success": true,
  "lead": {
    "id": "uuid",
    "name": "ישראל כהן",
    "source": "facebook_ads",
    "created_at": "2026-03-22T..."
  }
}`,
  },
  {
    method: "GET",
    path: "/functions/v1/leads-api",
    title: "שליפת כל הלידים",
    description: "קבלת רשימת לידים עם סינון לפי מקור ותאריך. תומך ב-pagination.",
    body: `// Query params:
// ?limit=100&offset=0
// ?source=facebook_ads
// ?since=2026-01-01T00:00:00Z`,
    response: `{
  "leads": [...],
  "total": 150,
  "limit": 100,
  "offset": 0
}`,
  },
  {
    method: "PUT",
    path: "/functions/v1/leads-api",
    title: "הוספת לידים בכמות (Batch)",
    description: "שליחת מספר לידים בבת אחת ממערכת חיצונית — CRM, קמפיינים, רשימות.",
    body: `{
  "leads": [
    { "name": "שירה לוי", "email": "shira@test.com", "source": "google_ads" },
    { "name": "אורן כהן", "phone": "052-9876543", "source": "referral" }
  ]
}`,
    response: `{
  "success": true,
  "inserted": 2,
  "leads": [...]
}`,
  },
  // ── IVR / ימות המשיח — Full Menu System ──
  {
    method: "POST",
    path: "/functions/v1/ivr-api?action=login",
    title: "IVR — כניסה למערכת (תעודת זהות + PIN)",
    description: "אימות משתמש במערכת הקולית. מחזיר שם לברכה ותפריט שלוחות.",
    body: `{
  "id_number": "123456789",
  "pin": "123456"
}`,
    response: `{
  "status": "authenticated",
  "user_id": "uuid",
  "greeting": "שלום ישראל",
  "menu": {
    "1": "הזנת הוצאה",
    "2": "הזנת הכנסה",
    "3": "שמיעת תקציב",
    "4": "משימות ותזכורות",
    "5": "עדכון פרופיל",
    "9": "עדכון חכם"
  }
}`,
  },
  {
    method: "POST",
    path: "/functions/v1/ivr-api?action=add_expense",
    title: "IVR שלוחה 1 — הזנת הוצאה",
    description: "שלוחה 1: הוצאה חד פעמית (1), קבועה (2), או בתאריך מסוים (3). כולל אמצעי תשלום ותשלומים.",
    body: `{
  "user_id": "uuid",
  "amount": 500,
  "subcategory": "מסעדה",
  "category": "one_time",
  "payment_method": "credit_card",
  "installments": 3,
  "due_date": "2026-05-01"
}`,
    response: `{
  "status": "created",
  "message": "הוצאה של 500 ₪ נרשמה בהצלחה — מסעדה",
  "next_menu": { "1": "חד פעמית", "2": "קבועה", "3": "בתאריך", "*": "חזרה" }
}`,
  },
  {
    method: "POST",
    path: "/functions/v1/ivr-api?action=add_income",
    title: "IVR שלוחה 2 — הזנת הכנסה",
    description: "שלוחה 2: הכנסה חד פעמית או קבועה, כולל אמצעי קבלת התשלום.",
    body: `{
  "user_id": "uuid",
  "amount": 15000,
  "subcategory": "משכורת",
  "category": "fixed_monthly",
  "payment_method": "bank_transfer"
}`,
    response: `{
  "status": "created",
  "message": "הכנסה של 15000 ₪ נרשמה בהצלחה — משכורת"
}`,
  },
  {
    method: "GET",
    path: "/functions/v1/ivr-api?action=get_summary&user_id=UUID",
    title: "IVR שלוחה 3 — שמיעת תקציב",
    description: "שלוחה 3: סיכום הכנסות והוצאות קבועות, יתרה חודשית, תנועות עתידיות. כולל טקסט TTS מוכן להקראה.",
    response: `{
  "summary": {
    "total_fixed_income": 15000,
    "total_fixed_expenses": 11000,
    "monthly_balance": 4000
  },
  "future_transactions": [...],
  "tts_text": "הסיכום החודשי שלך: הכנסות 15000, הוצאות 11000, יתרה 4000 שקלים."
}`,
  },
  {
    method: "GET",
    path: "/functions/v1/ivr-api?action=get_tasks&user_id=UUID",
    title: "IVR שלוחה 4.1 — שמיעת משימות",
    description: "שלוחה 4: האזנה למשימות פתוחות עם תאריכי יעד. כולל טקסט TTS.",
    response: `{
  "tasks": [{ "id": "uuid", "title": "חידוש ביטוח", "due_date": "2026-04-10" }],
  "tts_text": "יש לך 1 משימות פתוחות. משימה 1: חידוש ביטוח..."
}`,
  },
  {
    method: "POST",
    path: "/functions/v1/ivr-api?action=add_task",
    title: "IVR שלוחה 4.2 — הוספת משימה",
    description: "יצירת משימה או תזכורת חדשה עם ערוץ תזכורת.",
    body: `{
  "user_id": "uuid",
  "title": "לחדש ביטוח רכב",
  "due_date": "2026-04-15",
  "remind_channel": "phone"
}`,
    response: `{
  "status": "created",
  "message": "משימה \\"לחדש ביטוח רכב\\" נוצרה בהצלחה"
}`,
  },
  {
    method: "GET",
    path: "/functions/v1/ivr-api?action=search_rights&user_id=UUID&q=ביטוח",
    title: "IVR שלוחה 4.4 — חיפוש זכויות",
    description: "חיפוש חכם במאגר הזכויות לפי נתוני הפרופיל.",
    response: `{
  "profile_summary": { "family_status": "נשוי", "children_count": 3 },
  "tts_text": "חיפוש זכויות עבור ביטוח. לפרטים מלאים היכנס לאתר."
}`,
  },
  {
    method: "GET",
    path: "/functions/v1/ivr-api?action=get_profile&user_id=UUID",
    title: "IVR שלוחה 5 — צפייה בפרופיל",
    description: "שלוחה 5: שליפת נתוני פרופיל עם רשימת שדות הניתנים לעדכון.",
    response: `{
  "profile": { "name": "ישראל", "family_status": "נשוי", "children_count": 3 },
  "updatable_fields": { "1": "שם", "2": "מצב משפחתי", "3": "ילדים", ... }
}`,
  },
  {
    method: "POST",
    path: "/functions/v1/ivr-api?action=update_profile",
    title: "IVR שלוחה 5 — עדכון פרופיל",
    description: "עדכון שדה בודד בפרופיל דרך המערכת הקולית.",
    body: `{
  "user_id": "uuid",
  "field": "children_count",
  "value": 4
}`,
    response: `{
  "status": "updated",
  "message": "השדה children_count עודכן בהצלחה"
}`,
  },
  {
    method: "POST",
    path: "/functions/v1/ivr-api?action=smart_update",
    title: "IVR שלוחה 9 — עדכון חכם (Batch)",
    description: "שלוחה 9: הזנת מספר פריטים בבת אחת — הוצאות, הכנסות ומשימות.",
    body: `{
  "user_id": "uuid",
  "expenses": [{ "amount": 200, "subcategory": "דלק", "payment_method": "credit_card" }],
  "incomes": [{ "amount": 5000, "subcategory": "בונוס" }],
  "tasks": [{ "title": "לבדוק זכויות", "due_date": "2026-05-01" }]
}`,
    response: `{
  "status": "batch_complete",
  "message": "עודכנו 3 פריטים בהצלחה",
  "results": [...]
}`,
  },
  {
    method: "GET",
    path: "/functions/v1/ivr-api?action=menu",
    title: "IVR — עץ תפריטים מלא",
    description: "שליפת מבנה התפריט המלא של המערכת הקולית — לצורך הגדרת ימות המשיח.",
    response: `{
  "main_menu": {
    "greeting": "שלום, ברוכים הבאים למערכת FinanceHub",
    "auth": "הקש תעודת זהות ולאחר מכן סיסמה בת 6 ספרות",
    "extensions": { "1": { "title": "הזנת הוצאה", "sub": {...} }, ... }
  }
}`,
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
  PUT: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  DELETE: "bg-destructive/10 text-destructive border border-destructive/20",
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{label}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 text-xs text-foreground/80 overflow-x-auto font-mono leading-relaxed" dir="ltr">{code}</pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 md:p-12 max-w-4xl mx-auto space-y-8">
      <motion.div variants={item} className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
          <Code2 className="w-7 h-7 gold-text" strokeWidth={1.5} />
          כלי API ואוטומציות
        </h1>
        <p className="text-sm text-muted-foreground">חיבור מוכן ל-Zapier, Make ומערכות חיצוניות — כולל כל שיטות הקלט</p>
      </motion.div>

      {/* Auth */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 border-s-4 border-accent">
        <div className="flex items-center gap-4">
          <Lock className="w-5 h-5 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-bold text-foreground">אימות API</p>
            <p className="text-xs text-muted-foreground mt-1">
              כל הבקשות דורשות <code className="px-2 py-0.5 rounded-md bg-secondary text-xs font-mono" dir="ltr">Authorization: Bearer YOUR_API_KEY</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              כל בקשה חייבת לכלול: <code className="px-1 py-0.5 rounded bg-secondary text-xs font-mono" dir="ltr">userId</code>, <code className="px-1 py-0.5 rounded bg-secondary text-xs font-mono" dir="ltr">timestamp</code>, ומיפוי קטגוריה
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input Methods */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">שיטות קלט נתמכות</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { type: "TEXT_INPUT", desc: "סימולציית WhatsApp — טקסט חופשי בעברית", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
            { type: "AUDIO_BLOB", desc: "הודעה קולית — תמלול אוטומטי ופירוש", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
            { type: "STRUCTURED_DATA", desc: "נתון מובנה — Bot/Zapier/Make", color: "bg-accent/10 text-accent border-accent/20" },
          ].map(m => (
            <div key={m.type} className={`rounded-xl border p-4 space-y-2 ${m.color}`}>
              <p className="text-xs font-bold font-mono" dir="ltr">{m.type}</p>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* WhatsApp Expense JSON Schema */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 space-y-4 border-s-4 border-emerald-500">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="text-lg">📱</span>
          מבנה JSON להוספת הוצאה דרך WhatsApp
        </h3>
        <p className="text-xs text-muted-foreground">כל בקשת הוצאה מ-WhatsApp חייבת לכלול את השדות הבאים:</p>
        <CodeBlock code={`{
  "user_id": "string",     // מזהה ייחודי של המשתמש
  "amount": "number",      // סכום ההוצאה בשקלים
  "category": "string",    // קטגוריה: food, housing, health, car, education, entertainment, other
  "description": "string", // תיאור חופשי בעברית
  "type": "voice/text"     // סוג הקלט: text (טקסט) או voice (הודעה קולית)
}`} label="סכמת JSON — הוצאה מ-WhatsApp" />
      </motion.div>

      {/* Integrations */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        {["Zapier", "Make (Integromat)", "n8n", "Webhooks", "WhatsApp Business", "Telegram Bot", "Facebook Ads", "Google Ads", "CRM חיצוני", "Leads API"].map((name) => (
          <span key={name} className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-muted-foreground">
            {name}
          </span>
        ))}
      </motion.div>

      {/* Endpoints */}
      <div className="space-y-6">
        {endpoints.map((ep) => (
          <motion.div key={ep.path + ep.method} variants={item}
            className="glass-card-gold rounded-2xl overflow-hidden">
            <div className="p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${methodColors[ep.method]}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-foreground/70" dir="ltr">{ep.path}</code>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{ep.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ep.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ep.body && <CodeBlock code={ep.body} label="גוף הבקשה" />}
                <CodeBlock code={ep.response} label="תגובה" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Webhook */}
      <motion.div variants={item} className="glass-card-gold rounded-2xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <Webhook className="w-5 h-5 text-accent" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-foreground">אירועי Webhook</h3>
        </div>
        <p className="text-xs text-muted-foreground">הגדירו webhooks לקבלת עדכונים אוטומטיים:</p>
        <div className="flex flex-wrap gap-2">
          {["expense.created", "income.created", "task.due_soon", "benefit.discovered", "budget.alert", "input.text_parsed", "input.audio_transcribed", "question.answered"].map((ev) => (
            <span key={ev} className="px-3 py-1.5 rounded-lg bg-secondary text-[10px] font-mono text-muted-foreground" dir="ltr">{ev}</span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
