import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Server, Copy, CheckCircle2, Shield, Settings2, ChevronDown, Search, Zap, AlertTriangle, Key } from "lucide-react";
import { Input } from "@/components/ui/input";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/* ─── Copy Block ─── */
function CopyBlock({ text, lang }: { text: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre dir="ltr" className="bg-[hsl(var(--secondary)/0.8)] rounded-lg p-4 text-[11px] text-foreground overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed border border-border/20">{text}</pre>
      <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="absolute top-2 left-2 p-1.5 rounded-lg bg-background/90 hover:bg-background border border-border/40 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {lang && <span className="absolute top-2 right-2 text-[9px] text-muted-foreground/60 font-mono uppercase">{lang}</span>}
    </div>
  );
}

/* ─── Method Badge ─── */
function MethodBadge({ method }: { method: string }) {
  const colors = method === "GET"
    ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
    : "bg-green-500/15 text-green-400 border-green-500/20";
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${colors} font-mono`}>{method}</span>;
}

/* ─── Endpoint Card ─── */
interface EndpointProps {
  action: string;
  method: string;
  title: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
  responseOk?: string;
  responseError?: string;
}

function EndpointCard({ action, method, title, description, params, requestBody, responseOk, responseError }: EndpointProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/30 rounded-xl overflow-hidden bg-card/50 hover:border-border/60 transition-colors">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-5 py-3.5 text-start hover:bg-secondary/30 transition-colors">
        <MethodBadge method={method} />
        <code className="text-xs font-mono font-bold text-foreground">{action}</code>
        <span className="text-xs text-muted-foreground me-auto">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-border/20 pt-4">
              <p className="text-xs text-muted-foreground">{description}</p>

              {params && params.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">פרמטרים</h4>
                  <div className="rounded-lg border border-border/20 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-secondary/50"><th className="text-right py-2 px-3 text-muted-foreground font-semibold">שם</th><th className="text-right py-2 px-3 text-muted-foreground font-semibold">סוג</th><th className="text-right py-2 px-3 text-muted-foreground font-semibold">חובה</th><th className="text-right py-2 px-3 text-muted-foreground font-semibold">תיאור</th></tr></thead>
                      <tbody>
                        {params.map(p => (
                          <tr key={p.name} className="border-t border-border/10">
                            <td className="py-2 px-3 font-mono text-accent">{p.name}</td>
                            <td className="py-2 px-3 text-muted-foreground">{p.type}</td>
                            <td className="py-2 px-3">{p.required ? <span className="text-red-400 text-[10px] font-bold">כן</span> : <span className="text-muted-foreground text-[10px]">לא</span>}</td>
                            <td className="py-2 px-3 text-muted-foreground">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {requestBody && (
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Request Body</h4>
                  <CopyBlock text={requestBody} lang="json" />
                </div>
              )}

              {responseOk && (
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">✅ תגובה (200)</h4>
                  <CopyBlock text={responseOk} lang="json" />
                </div>
              )}

              {responseError && (
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">❌ שגיאה</h4>
                  <CopyBlock text={responseError} lang="json" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Data ─── */
interface EndpointGroup {
  title: string;
  icon: string;
  endpoints: EndpointProps[];
}

const groups: EndpointGroup[] = [
  {
    title: "אימות וכניסה",
    icon: "🔐",
    endpoints: [
      {
        action: "login", method: "POST", title: "כניסה למערכת", description: "אימות לקוח לפי תעודת זהות ו-PIN בן 6 ספרות. מחזיר user_id לשימוש בכל הקריאות הבאות.",
        params: [
          { name: "id_number", type: "string", required: true, description: "תעודת זהות (5-15 ספרות)" },
          { name: "pin", type: "string", required: true, description: "קוד PIN בן 6 ספרות" },
        ],
        requestBody: `{
  "id_number": "012345678",
  "pin": "123456"
}`,
        responseOk: `{
  "status": "authenticated",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "greeting": "שלום ישראל ישראלי",
  "menu": {
    "1": "הזנת הוצאה",
    "2": "הזנת הכנסה",
    "3": "שמיעת תקציב",
    "4": "משימות ותזכורות",
    "5": "עדכון פרופיל",
    "9": "עדכון חכם"
  }
}`,
        responseError: `{ "error": "פרטי ההזדהות שגויים" }   // 401`,
      },
    ],
  },
  {
    title: "שלוחה 1 — הוצאות",
    icon: "💸",
    endpoints: [
      {
        action: "add_expense", method: "POST", title: "הזנת הוצאה", description: "הוספת הוצאה חד פעמית, קבועה, או בתאריך מסוים. תומך בתשלומים ושיטות תשלום שונות.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח (מתקבל מ-login)" },
          { name: "amount", type: "number", required: true, description: "סכום ההוצאה (חיובי)" },
          { name: "subcategory", type: "string", required: true, description: "קטגוריית משנה (מזון, דלק, חשמל...)" },
          { name: "category", type: "enum", required: false, description: "fixed_monthly | one_time (ברירת מחדל: one_time)" },
          { name: "payment_method", type: "enum", required: false, description: "credit_card | cash | bank_transfer | check | standing_order" },
          { name: "installments", type: "number", required: false, description: "מספר תשלומים (1-60, ברירת מחדל: 1)" },
          { name: "start_date", type: "YYYY-MM-DD", required: false, description: "תאריך התחלה" },
          { name: "end_date", type: "YYYY-MM-DD", required: false, description: "תאריך סיום (מחושב אוטומטית לפי תשלומים)" },
          { name: "due_date", type: "YYYY-MM-DD", required: false, description: "תאריך ספציפי להוצאה" },
          { name: "is_business", type: "boolean", required: false, description: "האם הוצאה עסקית (ברירת מחדל: false)" },
          { name: "description", type: "string", required: false, description: "תיאור חופשי" },
        ],
        requestBody: `{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 350,
  "subcategory": "מזון",
  "category": "one_time",
  "payment_method": "credit_card",
  "installments": 1,
  "description": "קניות בסופר"
}`,
        responseOk: `{
  "status": "created",
  "message": "הוצאה של 350 ₪ נרשמה בהצלחה — מזון",
  "item": { "id": "uuid", "amount": 350, "subcategory": "מזון", ... },
  "next_menu": {
    "1": "הוצאה חד פעמית",
    "2": "הוצאה קבועה",
    "3": "הוצאה בתאריך מסוים",
    "*": "חזרה לתפריט ראשי"
  }
}`,
        responseError: `{ "error": { "amount": ["Expected number, received nan"] } }   // 400`,
      },
    ],
  },
  {
    title: "שלוחה 2 — הכנסות",
    icon: "💰",
    endpoints: [
      {
        action: "add_income", method: "POST", title: "הזנת הכנסה", description: "הוספת הכנסה קבועה או חד פעמית.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח" },
          { name: "amount", type: "number", required: true, description: "סכום ההכנסה" },
          { name: "subcategory", type: "string", required: true, description: "מקור (משכורת, פנסיה, דמי שכירות...)" },
          { name: "category", type: "enum", required: false, description: "fixed_monthly | one_time" },
          { name: "payment_method", type: "enum", required: false, description: "bank_transfer | cash | check" },
          { name: "description", type: "string", required: false, description: "תיאור" },
        ],
        requestBody: `{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 12000,
  "subcategory": "משכורת",
  "category": "fixed_monthly",
  "payment_method": "bank_transfer"
}`,
        responseOk: `{
  "status": "created",
  "message": "הכנסה של 12000 ₪ נרשמה בהצלחה — משכורת",
  "item": { "id": "uuid", "amount": 12000, ... }
}`,
      },
    ],
  },
  {
    title: "שלוחה 3 — סיכום תקציב",
    icon: "📊",
    endpoints: [
      {
        action: "get_summary", method: "GET", title: "סיכום תקציב חודשי", description: "מחזיר הכנסות קבועות, הוצאות קבועות, יתרה, תנועות עתידיות ומספר משימות פתוחות. כולל טקסט TTS לקריאה קולית.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח (query param)" },
        ],
        responseOk: `{
  "summary": {
    "total_fixed_income": 15000,
    "total_fixed_expenses": 8500,
    "total_one_time_expenses": 1200,
    "monthly_balance": 6500,
    "net_balance": 5300
  },
  "fixed_income_details": [
    { "subcategory": "משכורת", "amount": 12000 },
    { "subcategory": "שכר דירה", "amount": 3000 }
  ],
  "fixed_expense_details": [
    { "subcategory": "שכר דירה", "amount": 4500, "payment_method": "bank_transfer" },
    { "subcategory": "חשמל", "amount": 400, "payment_method": "standing_order" }
  ],
  "future_transactions": [
    { "subcategory": "ביטוח", "amount": 300, "due_date": "2026-05-01", "type": "expense" }
  ],
  "pending_tasks": 3,
  "tts_text": "הסיכום החודשי שלך: הכנסות קבועות 15000 שקלים..."
}`,
      },
      {
        action: "get_budget", method: "GET", title: "רשימת פריטי תקציב", description: "מחזיר את כל פריטי התקציב הפעילים (עד 50 אחרונים).",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח (query param)" },
        ],
        responseOk: `{
  "items": [
    {
      "id": "uuid",
      "type": "expense",
      "category": "fixed_monthly",
      "subcategory": "שכר דירה",
      "amount": 4500,
      "payment_method": "bank_transfer",
      "is_active": true,
      "start_date": "2026-01-01",
      "end_date": null,
      "installments": 1,
      "due_date": null
    }
  ]
}`,
      },
    ],
  },
  {
    title: "שלוחה 4 — משימות ותזכורות",
    icon: "📋",
    endpoints: [
      {
        action: "get_tasks", method: "GET", title: "רשימת משימות פתוחות", description: "מחזיר עד 20 משימות פתוחות לפי תאריך יעד. כולל טקסט TTS.",
        params: [{ name: "user_id", type: "uuid", required: true, description: "מזהה לקוח (query param)" }],
        responseOk: `{
  "tasks": [
    {
      "id": "uuid",
      "title": "לבדוק זכאות לביטוח לאומי",
      "description": "...",
      "due_date": "2026-05-01",
      "status": "pending",
      "category": "rights"
    }
  ],
  "tts_text": "יש לך 1 משימות פתוחות. משימה 1: לבדוק זכאות לביטוח לאומי..."
}`,
      },
      {
        action: "add_task", method: "POST", title: "הוספת משימה", description: "יצירת משימה חדשה עם תאריך יעד אופציונלי ותזכורת.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח" },
          { name: "title", type: "string", required: true, description: "כותרת המשימה" },
          { name: "description", type: "string", required: false, description: "תיאור" },
          { name: "due_date", type: "YYYY-MM-DD", required: false, description: "תאריך יעד" },
          { name: "category", type: "string", required: false, description: "קטגוריה (general/rights/financial)" },
          { name: "remind_channel", type: "enum", required: false, description: "email | phone | whatsapp" },
        ],
        requestBody: `{
  "user_id": "uuid",
  "title": "להתקשר לביטוח לאומי",
  "due_date": "2026-05-15",
  "category": "rights",
  "remind_channel": "whatsapp"
}`,
        responseOk: `{
  "status": "created",
  "message": "משימה \\"להתקשר לביטוח לאומי\\" נוצרה בהצלחה",
  "task": { "id": "uuid", ... }
}`,
      },
      {
        action: "complete_task", method: "POST", title: "סיום משימה", description: "סימון משימה כהושלמה עם הערת סיום.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח" },
          { name: "task_id", type: "uuid", required: true, description: "מזהה המשימה" },
          { name: "completion_note", type: "string", required: true, description: "תיעוד מה בוצע" },
        ],
        requestBody: `{
  "user_id": "uuid",
  "task_id": "uuid",
  "completion_note": "התקשרתי וקיבלתי אישור"
}`,
        responseOk: `{ "status": "completed", "message": "המשימה סומנה כהושלמה" }`,
      },
      {
        action: "search_rights", method: "GET", title: "חיפוש זכויות", description: "חיפוש במאגר הזכויות לפי מילת מפתח ונתוני פרופיל הלקוח.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח (query param)" },
          { name: "q", type: "string", required: false, description: "מילת חיפוש (query param)" },
        ],
        responseOk: `{
  "profile_summary": { "family_status": "נשוי", "children_count": 3, ... },
  "search_query": "ביטוח לאומי",
  "tts_text": "חיפוש זכויות עבור ביטוח לאומי..."
}`,
      },
    ],
  },
  {
    title: "שלוחה 5 — עדכון פרופיל",
    icon: "👤",
    endpoints: [
      {
        action: "get_profile", method: "GET", title: "קבלת פרטי פרופיל", description: "מחזיר את נתוני הפרופיל הנוכחיים ורשימת שדות הניתנים לעדכון.",
        params: [{ name: "user_id", type: "uuid", required: true, description: "מזהה לקוח (query param)" }],
        responseOk: `{
  "profile": {
    "name": "ישראל ישראלי",
    "family_status": "נשוי",
    "children_count": 3,
    "city": "ירושלים",
    "sector": "כללי",
    "health_fund": "מכבי",
    "residential_status": "שוכר",
    "rent_amount": 4500,
    "mortgage_monthly": 0,
    "living_standard": "בינוני"
  },
  "updatable_fields": {
    "1": "שם", "2": "מצב משפחתי", "3": "מספר ילדים",
    "4": "עיר", "5": "מגזר", "6": "קופת חולים",
    "7": "סטטוס מגורים", "8": "שכר דירה", "9": "משכנתא"
  }
}`,
      },
      {
        action: "update_profile", method: "POST", title: "עדכון שדה בפרופיל", description: "עדכון שדה בודד בפרופיל הלקוח. שדות מותרים: name, family_status, children_count, city, sector, health_fund, residential_status, rent_amount, mortgage_monthly, special_health_needs, living_standard.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח" },
          { name: "field", type: "string", required: true, description: "שם השדה לעדכון" },
          { name: "value", type: "string|number|boolean", required: true, description: "הערך החדש" },
        ],
        requestBody: `{
  "user_id": "uuid",
  "field": "children_count",
  "value": 4
}`,
        responseOk: `{ "status": "updated", "message": "השדה children_count עודכן בהצלחה" }`,
        responseError: `{ "error": "שדה email לא ניתן לעדכון דרך המערכת הקולית" }   // 400`,
      },
    ],
  },
  {
    title: "שלוחה 9 — עדכון חכם (Batch)",
    icon: "⚡",
    endpoints: [
      {
        action: "smart_update", method: "POST", title: "עדכון מרובה בקריאה אחת", description: "שליחת מערך של הוצאות, הכנסות ומשימות בקריאה אחת. כל פריט שנכשל נרשם בתגובה.",
        params: [
          { name: "user_id", type: "uuid", required: true, description: "מזהה לקוח" },
          { name: "expenses", type: "array", required: false, description: "מערך הוצאות (כל פריט כמו add_expense)" },
          { name: "incomes", type: "array", required: false, description: "מערך הכנסות" },
          { name: "tasks", type: "array", required: false, description: "מערך משימות" },
        ],
        requestBody: `{
  "user_id": "uuid",
  "expenses": [
    { "amount": 200, "subcategory": "דלק", "payment_method": "credit_card" },
    { "amount": 85, "subcategory": "חשמל", "category": "fixed_monthly" }
  ],
  "incomes": [
    { "amount": 12000, "subcategory": "משכורת", "category": "fixed_monthly" }
  ],
  "tasks": [
    { "title": "לחדש ביטוח רכב", "due_date": "2026-06-01" }
  ]
}`,
        responseOk: `{
  "status": "ok",
  "created": 4,
  "errors": [],
  "tts_text": "עדכון הושלם: 4 פריטים נוספו בהצלחה."
}`,
        responseError: `{
  "status": "partial",
  "created": 2,
  "errors": ["expenses[1]: amount must be positive"],
  "tts_text": "עדכון חלקי: 2 הצליחו, 1 נכשל."
}`,
      },
    ],
  },
];

/* ─── Error Codes ─── */
const errorCodes = [
  { code: "200", desc: "הצלחה", color: "text-green-400" },
  { code: "400", desc: "פרמטר חסר/שגוי — בדוק את שדות הבקשה", color: "text-yellow-400" },
  { code: "401", desc: "אימות נכשל — מפתח API או פרטי כניסה שגויים", color: "text-orange-400" },
  { code: "404", desc: "לא נמצא — user_id או task_id לא קיים", color: "text-red-400" },
  { code: "500", desc: "שגיאת שרת — נסה שוב מאוחר יותר", color: "text-red-500" },
];

/* ─── Field Mapping Table ─── */
const fieldMappings: [string, string, string, string][] = [
  ["סכום", "amount", "number", "budget_items"],
  ["קטגוריה", "subcategory", "string", "budget_items"],
  ["סוג (הכנסה/הוצאה)", "type", "expense | income", "budget_items"],
  ["תדירות", "category", "fixed_monthly | one_time", "budget_items"],
  ["אמצעי תשלום", "payment_method", "credit_card | cash | bank_transfer | check | standing_order", "budget_items"],
  ["תשלומים", "installments", "number (1-60)", "budget_items"],
  ["תיאור", "description", "string", "budget_items"],
  ["תאריך התחלה", "start_date", "YYYY-MM-DD", "budget_items"],
  ["תאריך סיום", "end_date", "YYYY-MM-DD", "budget_items"],
  ["תאריך ספציפי", "due_date", "YYYY-MM-DD", "budget_items"],
  ["עסקי/פרטי", "is_business", "boolean", "budget_items"],
  ["כותרת משימה", "title", "string", "tasks"],
  ["תאריך יעד", "due_date", "YYYY-MM-DD", "tasks"],
  ["תיאור משימה", "description", "string", "tasks"],
  ["קטגוריית משימה", "category", "general | rights | financial", "tasks"],
  ["ערוץ תזכורת", "remind_channel", "email | phone | whatsapp", "tasks"],
  ["שם", "name", "string", "profiles"],
  ["עיר", "city", "string", "profiles"],
  ["מצב משפחתי", "family_status", "string", "profiles"],
  ["מספר ילדים", "children_count", "number", "profiles"],
  ["קופת חולים", "health_fund", "string", "profiles"],
  ["סטטוס מגורים", "residential_status", "renter | owner | other", "profiles"],
  ["שכר דירה", "rent_amount", "number", "profiles"],
  ["משכנתא חודשית", "mortgage_monthly", "number", "profiles"],
  ["תעודת זהות", "id_number", "string", "profiles"],
  ["PIN קולי", "ivr_pin", "string (6 digits)", "profiles"],
];

export default function AdminIvrSettings() {
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ivr-api`;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const [search, setSearch] = useState("");

  const totalEndpoints = groups.reduce((s, g) => s + g.endpoints.length, 0);

  const filteredGroups = search
    ? groups.map(g => ({
        ...g,
        endpoints: g.endpoints.filter(e =>
          e.action.includes(search) || e.title.includes(search) || e.description.includes(search)
        ),
      })).filter(g => g.endpoints.length > 0)
    : groups;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center">
              <Phone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">IVR API</h1>
              <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">v1</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">תיעוד API מלא לסנכרון עם <strong>ימות המשיח</strong> — מערכת קולית</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש endpoint..." className="pe-3 ps-3 pr-10 h-9 text-xs" />
        </div>
      </motion.div>

      {/* Stats Bar */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "📦 פורמט", value: "JSON בלבד" },
          { label: "📡 מתודות", value: "GET | POST" },
          { label: "⚡ סטטוסים", value: "OK | ERROR" },
          { label: "🔢 סה״כ", value: `${totalEndpoints} endpoints` },
        ].map(s => (
          <div key={s.label} className="bento-card py-3 px-4 text-center">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-xs font-bold text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Base URL + Auth */}
      <motion.div variants={item} className="bento-card space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">כתובת בסיס (Base URL)</h3>
        </div>
        <CopyBlock text={baseUrl} />
        <div className="flex items-center gap-2 mt-3">
          <Key className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">אימות (Authentication)</h3>
        </div>
        <p className="text-xs text-muted-foreground">כל קריאה חייבת לכלול את המפתח בהדר <code className="bg-secondary px-1.5 py-0.5 rounded text-accent font-mono">apikey</code>.</p>
        <CopyBlock text={`curl -H "apikey: ${apiKey}" \\
  "${baseUrl}?action=get_summary&user_id=UUID"`} lang="bash" />
      </motion.div>

      {/* Error Codes */}
      <motion.div variants={item} className="bento-card space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">מבנה שגיאות</h3>
        </div>
        <CopyBlock text={`{
  "error": "Description of the error"
}
// HTTP status code indicates the error type`} lang="json" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {errorCodes.map(e => (
            <div key={e.code} className="rounded-lg bg-secondary/50 border border-border/20 p-3 text-center">
              <p className={`text-lg font-bold font-mono ${e.color}`}>{e.code}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{e.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Endpoint Groups */}
      {filteredGroups.map((group) => (
        <motion.div key={group.title} variants={item} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">{group.icon}</span>
            <h2 className="text-base font-bold text-foreground">{group.title}</h2>
            <span className="text-[10px] font-bold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">{group.endpoints.length}</span>
          </div>
          <div className="space-y-2">
            {group.endpoints.map(ep => <EndpointCard key={ep.action} {...ep} />)}
          </div>
        </motion.div>
      ))}

      {/* Field Mapping */}
      <motion.div variants={item} className="bento-card space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">מיפוי שדות (Field Mapping)</h3>
        </div>
        <p className="text-xs text-muted-foreground">כל שדה API מקביל לעמודה בטבלת הנתונים. השתמש בערכים המדויקים בקריאות ה-API.</p>
        <div className="overflow-x-auto rounded-lg border border-border/20">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/50 border-b border-border/30">
                <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">שם בעברית</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">API Key</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">סוג / ערכים</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold">טבלה</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {fieldMappings.map(([label, key, type, table]) => (
                <tr key={`${key}-${table}`} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                  <td className="py-2 px-3">{label}</td>
                  <td className="py-2 px-3 font-mono text-accent text-[11px]">{key}</td>
                  <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{type}</td>
                  <td className="py-2 px-3"><span className="text-[10px] bg-secondary/60 px-2 py-0.5 rounded-full text-muted-foreground">{table}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Start */}
      <motion.div variants={item} className="bento-card space-y-4 border border-accent/20">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">התחלה מהירה — דוגמה מלאה</h3>
        </div>
        <p className="text-xs text-muted-foreground">שלב 1: כניסה → שלב 2: הוספת הוצאה → שלב 3: שמיעת סיכום</p>
        <CopyBlock text={`// שלב 1: כניסה
POST ${baseUrl}?action=login
apikey: ${apiKey.slice(0, 20)}...
{ "id_number": "012345678", "pin": "123456" }
→ { "user_id": "UUID", "greeting": "שלום ישראל" }

// שלב 2: הוספת הוצאה
POST ${baseUrl}?action=add_expense
apikey: ${apiKey.slice(0, 20)}...
{ "user_id": "UUID", "amount": 500, "subcategory": "מזון", "payment_method": "credit_card" }
→ { "status": "created", "message": "הוצאה של 500 ₪ נרשמה בהצלחה" }

// שלב 3: שמיעת סיכום
GET ${baseUrl}?action=get_summary&user_id=UUID
apikey: ${apiKey.slice(0, 20)}...
→ { "summary": { "monthly_balance": 6500 }, "tts_text": "..." }`} lang="http" />
      </motion.div>

      {/* ===== EXT.INI FILES FOR YEMOT HAMASHIACH ===== */}
      <motion.div variants={item} className="bento-card space-y-5 border-2 border-accent/30 bg-accent/5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-accent" />
          <h3 className="text-base font-extrabold text-foreground">📂 קבצי ext.ini להעתקה לימות המשיח</h3>
        </div>
        <p className="text-xs text-muted-foreground">העתק כל קובץ לתיקייה המתאימה בתוך שלוחה 1 במערכת ימות המשיח.</p>

        {/* Extension 1 - Main Menu */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">📁 שלוחה 1 — תפריט ראשי</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/ext.ini</code></p>
          <CopyBlock text={`type=menu
; אם המשתמש עוד לא עבר בשלוחה 0 (הזדהות), המערכת תשלח אותו לשם אוטומטית
enter_goto=0

announcement=say,להזנת הוצאה הקישו 1. להזנת הכנסה הקישו 2. לשמיעת סיכום תקציבי 3. לניהול משימות 4. לעדכון פרופיל 5. לעדכון חכם 9.
1=1
2=2
3=3
4=4
5=5
9=9`} lang="ini" />
        </div>

        {/* Extension 1/1 - Expenses */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">💸 שלוחה 1/1 — הזנת הוצאה</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/1/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=add_expense
api_method=POST
api_content_type=application/json
api_add_header=apikey: ${apiKey}
api_json_body={ "user_id": "%user_id%", "amount": %amount%, "subcategory": "%subcategory%", "category": "%category%", "payment_method": "%payment_method%", "installments": %installments% }

api_text_0=say,להוצאה חד פעמית הקישו 1. להוצאה קבועה הקישו 2.
api_add_0=category,replace,1=one_time,2=fixed_monthly

api_text_1=say,נא להקיש את סכום ההוצאה ובסיומו סולמית
api_add_1=amount,digits,1,7,#

api_text_2=say,בחרו קטגוריה. למזון 1. לתחבורה 2. לבילויים 3. לביגוד 4. שכר דירה 5. משכנתא 6. אחר 7.
api_add_2=subcategory,replace,1=מזון,2=תחבורה,3=בילויים,4=ביגוד,5=שכר דירה,6=משכנתא,7=אחר

api_text_3=say,בחרו אמצעי תשלום. לאשראי 1. למזומן 2. להעברה 3. לצ'ק 4.
api_add_3=payment_method,replace,1=credit_card,2=cash,3=bank_transfer,4=check

api_text_4=say,למספר תשלומים הקישו את הכמות. לתשלום אחד הקישו 1.
api_add_4=installments,digits,1,2,#

confirm_send=yes
confirm_send_text=say,לאישור ההוצאה הקישו 1. לביטול הקישו 2.
say_api_answer=yes
end_goto=/1`} lang="ini" />
        </div>

        {/* Extension 1/2 - Income */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">💰 שלוחה 1/2 — הזנת הכנסה</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/2/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=add_income
api_method=POST
api_content_type=application/json
api_add_header=apikey: ${apiKey}
api_json_body={ "user_id": "%user_id%", "amount": %amount%, "subcategory": "%subcategory%", "category": "%category%", "payment_method": "bank_transfer" }

api_text_0=say,להכנסה חד פעמית הקישו 1. להכנסה קבועה הקישו 2.
api_add_0=category,replace,1=one_time,2=fixed_monthly

api_text_1=say,נא להקיש את סכום ההכנסה ובסיומו סולמית
api_add_1=amount,digits,1,7,#

api_text_2=say,בחרו קטגוריה. למשכורת 1. לבונוס 2. למתנה 3. לקצבה 4. אחר 5.
api_add_2=subcategory,replace,1=משכורת,2=בונוס,3=מתנה,4=קצבה,5=אחר

confirm_send=yes
say_api_answer=yes
end_goto=/1`} lang="ini" />
        </div>

        {/* Extension 1/3 - Budget Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">📊 שלוחה 1/3 — שמיעת סיכום תקציבי</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/3/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=get_summary
api_method=GET
api_add_header=apikey: ${apiKey}
api_add_0=user_id,val,%user_id%

say_api_answer=yes
end_goto=/1`} lang="ini" />
        </div>

        {/* Extension 1/4 - Tasks */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">📋 שלוחה 1/4 — משימות ותזכורות</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/4/ext.ini</code> — תפריט משנה למשימות</p>
          <CopyBlock text={`type=menu
announcement=say,לשמיעת משימות פתוחות הקישו 1. להוספת משימה חדשה הקישו 2. לסיום משימה הקישו 3. לחיפוש זכויות הקישו 4.
1=1
2=2
3=3
4=4`} lang="ini" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">📋 שלוחה 1/4/1 — שמיעת משימות פתוחות</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/4/1/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=get_tasks
api_method=GET
api_add_header=apikey: ${apiKey}
api_add_0=user_id,val,%user_id%

say_api_answer=yes
end_goto=/1/4`} lang="ini" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">📋 שלוחה 1/4/2 — הוספת משימה</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/4/2/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=add_task
api_method=POST
api_content_type=application/json
api_add_header=apikey: ${apiKey}
api_json_body={ "user_id": "%user_id%", "title": "%title%", "due_date": "%due_date%", "category": "%category%" }

api_text_0=say,נא להקליט את שם המשימה לאחר הצליל ולסיים בסולמית
api_add_0=title,record,*,*,#

api_text_1=say,הקישו תאריך יעד בפורמט יום חודש שנה. לדוגמא 15042026
api_add_1=due_date,digits,8,8,#

api_text_2=say,בחרו קטגוריה. לכללי 1. לזכויות 2. לפיננסי 3.
api_add_2=category,replace,1=general,2=rights,3=financial

confirm_send=yes
confirm_send_text=say,לאישור המשימה הקישו 1. לביטול הקישו 2.
say_api_answer=yes
end_goto=/1/4`} lang="ini" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">📋 שלוחה 1/4/3 — סיום משימה</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/4/3/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=complete_task
api_method=POST
api_content_type=application/json
api_add_header=apikey: ${apiKey}
api_json_body={ "user_id": "%user_id%", "task_id": "%task_id%", "completion_note": "%completion_note%" }

api_text_0=say,הקישו את מספר המשימה שברצונכם לסיים
api_add_0=task_id,digits,1,36,#

api_text_1=say,נא להקליט הערת סיום לאחר הצליל
api_add_1=completion_note,record,*,*,#

confirm_send=yes
say_api_answer=yes
end_goto=/1/4`} lang="ini" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">🔍 שלוחה 1/4/4 — חיפוש זכויות</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/4/4/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=search_rights
api_method=GET
api_add_header=apikey: ${apiKey}
api_add_0=user_id,val,%user_id%

api_text_1=say,הקליטו את מילת החיפוש לאחר הצליל
api_add_1=q,record,*,*,#

say_api_answer=yes
end_goto=/1/4`} lang="ini" />
        </div>

        {/* Extension 1/5 - Profile Update */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">👤 שלוחה 1/5 — עדכון פרופיל</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/5/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=update_profile
api_method=POST
api_content_type=application/json
api_add_header=apikey: ${apiKey}
api_json_body={ "user_id": "%user_id%", "field": "%field%", "value": "%value%" }

api_text_0=say,בחרו שדה לעדכון. לשם 1. למצב משפחתי 2. למספר ילדים 3. לעיר 4. למגזר 5. לקופת חולים 6. לסטטוס מגורים 7. לשכר דירה 8. למשכנתא 9.
api_add_0=field,replace,1=name,2=family_status,3=children_count,4=city,5=sector,6=health_fund,7=residential_status,8=rent_amount,9=mortgage_monthly

api_text_1=say,הקישו או הקליטו את הערך החדש ובסיום סולמית
api_add_1=value,digits,1,20,#

confirm_send=yes
confirm_send_text=say,לאישור העדכון הקישו 1. לביטול הקישו 2.
say_api_answer=yes
end_goto=/1`} lang="ini" />
        </div>

        {/* Extension 1/9 - Smart Update */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">⚡ שלוחה 1/9 — עדכון חכם</h4>
          <p className="text-[10px] text-muted-foreground">נתיב: <code className="bg-secondary px-1 rounded">/1/9/ext.ini</code></p>
          <CopyBlock text={`type=api
api_link=${baseUrl}?action=smart_update
api_method=POST
api_content_type=application/json
api_add_header=apikey: ${apiKey}
api_json_body={ "user_id": "%user_id%", "updates": "%updates%" }

api_text_0=say,נא להקליט את פרטי העדכון החכם לאחר הצליל ולסיים בלחיצה על סולמית.
api_add_0=updates,record,*,*,#

confirm_send=yes
say_api_answer=yes
end_goto=/1`} lang="ini" />
        </div>

        {/* Important Notes */}
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 space-y-2">
          <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> דגשים חשובים</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>כל קובץ ext.ini נכנס לתיקייה המתאימה (למשל הוצאות → תיקייה 1/1)</li>
            <li>הטוקן (Bearer) חייב להיות מועתק בשלמותו בכל השלוחות</li>
            <li>המערכת משתמשת ב-TTS מובנה — אין צורך להקליט הודעות</li>
            <li>שדה <code className="bg-secondary px-1 rounded">say_api_answer=yes</code> גורם למערכת להשמיע את תגובת השרת</li>
            <li>שדה <code className="bg-secondary px-1 rounded">confirm_send=yes</code> מבקש אישור לפני שליחה</li>
          </ul>
        </div>
      </motion.div>

      {/* ===== FULL TEXT FOR GEMINI COPY ===== */}
      <motion.div variants={item} className="bento-card space-y-4 border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-primary" />
          <h3 className="text-base font-extrabold text-foreground">📋 העתקה מלאה לשליחה לג׳ימיני</h3>
        </div>
        <p className="text-xs text-muted-foreground">לחץ על כפתור ההעתקה כדי להעתיק את כל התיעוד הטכני — ואז שלח ישירות לג׳ימיני עם הבקשה לבנות תסריט IVR.</p>
        <CopyBlock text={getFullDocText(baseUrl, apiKey)} lang="markdown" />
      </motion.div>
    </motion.div>
  );
}

/* ─── Full documentation text for Gemini ─── */
function getFullDocText(baseUrl: string, apiKey: string): string {
  return `# תיעוד טכני מלא — אינטגרציית IVR עם ימות המשיח
# FinanceHub API ↔ Yemot HaMashiach

## כתובת בסיס (Base URL)
${baseUrl}

## אימות
כל קריאה חייבת לכלול Header:
apikey: ${apiKey}

---

## 1. אימות — כניסה למערכת (שלוחה ראשית)
הלקוח מקיש תעודת זהות + סיסמה בת 6 ספרות.

POST ${baseUrl}?action=login
Content-Type: application/json

{
  "id_number": "123456789",
  "pin": "123456"
}

תגובה מוצלחת (200):
{
  "status": "authenticated",
  "user_id": "uuid-של-המשתמש",
  "greeting": "שלום ישראל",
  "menu": {
    "1": "הזנת הוצאה",
    "2": "הזנת הכנסה",
    "3": "שמיעת תקציב",
    "4": "משימות ותזכורות",
    "5": "עדכון פרופיל",
    "9": "עדכון חכם"
  }
}

שגיאה (401):
{ "error": "פרטי ההזדהות שגויים" }

---

## 2. שלוחה 1 — הזנת הוצאה

תת-שלוחות:
1.1 — הוצאה חד פעמית
1.2 — הוצאה קבועה (חודשית)
1.3 — הוצאה בתאריך מסוים

POST ${baseUrl}?action=add_expense
Content-Type: application/json

{
  "user_id": "uuid-של-המשתמש",
  "amount": 500,
  "subcategory": "מסעדה",
  "category": "one_time",
  "description": "ארוחת ערב",
  "payment_method": "credit_card",
  "installments": 1,
  "due_date": null,
  "start_date": "2026-04-05",
  "end_date": null,
  "is_business": false
}

ערכים אפשריים:
- category: "one_time" / "fixed_monthly"
- payment_method: "credit_card" / "cash" / "bank_transfer" / "check" / "standing_order"
- installments: 1–60 (מספר תשלומים)
- due_date: "YYYY-MM-DD" או null
- start_date: "YYYY-MM-DD"
- end_date: "YYYY-MM-DD" או null
- is_business: true / false

זרימת IVR מומלצת לשלוחה 1:
שלוחה 1 → "הזנת הוצאה"
  ├── הקש 1 → הוצאה חד פעמית
  │     ├── הקש סכום (למשל 500)
  │     ├── בחר קטגוריה: 1=מזון 2=תחבורה 3=בילוי 4=קניות 5=אחר
  │     ├── בחר אמצעי תשלום: 1=אשראי 2=מזומן 3=העברה 4=צ'ק 5=הו"ק
  │     ├── תשלומים? הקש מספר או 0 לדילוג
  │     └── שמירה → "הוצאה של 500 ₪ נרשמה בהצלחה"
  ├── הקש 2 → הוצאה קבועה
  │     ├── הקש סכום
  │     ├── בחר קטגוריה: 1=שכ"ד 2=חשמל 3=מים 4=גז 5=ביטוח 6=אחר
  │     ├── בחר אמצעי תשלום
  │     └── שמירה (category = "fixed_monthly")
  └── הקש 3 → הוצאה בתאריך מסוים
        ├── הקש סכום
        ├── הקש תאריך (DDMMYYYY)
        ├── בחר קטגוריה
        ├── בחר אמצעי תשלום
        └── שמירה (עם due_date)

תגובה מוצלחת (200):
{
  "status": "created",
  "message": "הוצאה של 500 ₪ נרשמה בהצלחה — מסעדה",
  "item": { "id": "...", "amount": 500 }
}

---

## 3. שלוחה 2 — הזנת הכנסה

תת-שלוחות:
2.1 — הכנסה חד פעמית
2.2 — הכנסה קבועה

POST ${baseUrl}?action=add_income
Content-Type: application/json

{
  "user_id": "uuid-של-המשתמש",
  "amount": 8000,
  "subcategory": "משכורת",
  "category": "fixed_monthly",
  "description": "משכורת חודשית",
  "payment_method": "bank_transfer"
}

זרימת IVR:
שלוחה 2 → "הזנת הכנסה"
  ├── הקש 1 → הכנסה חד פעמית
  │     ├── הקש סכום
  │     ├── בחר קטגוריה: 1=בונוס 2=מתנה 3=החזר 4=אחר
  │     └── שמירה
  └── הקש 2 → הכנסה קבועה
        ├── הקש סכום
        ├── בחר קטגוריה: 1=משכורת 2=קצבה 3=שכ"ד 4=עסק 5=אחר
        ├── איך נכנס? 1=העברה 2=מזומן 3=צ'ק 4=אשראי
        └── שמירה (category = "fixed_monthly")

---

## 4. שלוחה 3 — שמיעת תקציב

GET ${baseUrl}?action=get_summary&user_id=UUID

תגובה (200):
{
  "summary": {
    "total_fixed_income": 12000,
    "total_fixed_expenses": 8500,
    "total_one_time_expenses": 1200,
    "monthly_balance": 3500,
    "net_balance": 2300
  },
  "fixed_income_details": [
    { "subcategory": "משכורת", "amount": 10000 },
    { "subcategory": "קצבת ילדים", "amount": 2000 }
  ],
  "fixed_expense_details": [
    { "subcategory": "שכ\"ד", "amount": 4000, "payment_method": "bank_transfer" },
    { "subcategory": "חשמל", "amount": 500, "payment_method": "standing_order" }
  ],
  "future_transactions": [
    { "subcategory": "ביטוח רכב", "amount": 800, "due_date": "2026-05-01", "type": "expense" }
  ],
  "pending_tasks": 3,
  "tts_text": "הסיכום החודשי שלך: הכנסות קבועות 12000 שקלים, הוצאות קבועות 8500 שקלים, יתרה חודשית 3500 שקלים. יש לך 3 משימות פתוחות."
}

השדה tts_text הוא הטקסט שימות המשיח צריכים להשמיע ללקוח.

זרימת IVR:
שלוחה 3 → "שמיעת תקציב"
  └── המערכת מושכת נתונים ומשמיעה את tts_text
  └── אפשרויות:
      ├── הקש 1 → פירוט הכנסות
      ├── הקש 2 → פירוט הוצאות
      ├── הקש 3 → תנועות עתידיות
      └── * → חזרה לתפריט

---

## 5. שלוחה 4 — משימות ותזכורות

### שמיעת משימות פתוחות:
GET ${baseUrl}?action=get_tasks&user_id=UUID

תגובה:
{
  "tasks": [
    { "id": "uuid", "title": "לחדש ביטוח רכב", "due_date": "2026-04-15", "status": "pending" }
  ],
  "tts_text": "יש לך 1 משימות פתוחות. משימה 1: לחדש ביטוח רכב, תאריך יעד: 15 באפריל 2026"
}

### הוספת משימה:
POST ${baseUrl}?action=add_task
{
  "user_id": "uuid",
  "title": "לשלם ביטוח לאומי",
  "description": "תשלום רבעוני",
  "due_date": "2026-04-30",
  "category": "payments",
  "remind_channel": "phone"
}

### סיום משימה:
POST ${baseUrl}?action=complete_task
{
  "user_id": "uuid",
  "task_id": "uuid-של-המשימה",
  "completion_note": "שולם בהעברה בנקאית"
}

### חיפוש זכויות:
GET ${baseUrl}?action=search_rights&user_id=UUID&q=ביטוח+לאומי

---

## 6. שלוחה 5 — עדכון פרופיל

### קבלת פרופיל נוכחי:
GET ${baseUrl}?action=get_profile&user_id=UUID

תגובה:
{
  "profile": {
    "name": "ישראל ישראלי",
    "family_status": "נשוי",
    "children_count": 3,
    "city": "ירושלים",
    "sector": "חרדי",
    "health_fund": "כללית",
    "residential_status": "renter",
    "rent_amount": 4000,
    "mortgage_monthly": 0
  },
  "updatable_fields": {
    "1": "שם", "2": "מצב משפחתי", "3": "מספר ילדים",
    "4": "עיר", "5": "מגזר", "6": "קופת חולים",
    "7": "סטטוס מגורים", "8": "שכר דירה", "9": "משכנתא"
  }
}

### עדכון שדה:
POST ${baseUrl}?action=update_profile
{
  "user_id": "uuid",
  "field": "children_count",
  "value": 4
}

שדות מותרים לעדכון:
מקש 1 = name (שם)
מקש 2 = family_status (מצב משפחתי: רווק/נשוי/גרוש/אלמן)
מקש 3 = children_count (מספר ילדים)
מקש 4 = city (עיר)
מקש 5 = sector (מגזר)
מקש 6 = health_fund (קופת חולים: כללית/מכבי/מאוחדת/לאומית)
מקש 7 = residential_status (סטטוס מגורים: renter/owner/other)
מקש 8 = rent_amount (שכר דירה)
מקש 9 = mortgage_monthly (משכנתא חודשית)

---

## 7. שלוחה 9 — עדכון חכם (Batch)

POST ${baseUrl}?action=smart_update
{
  "user_id": "uuid",
  "expenses": [
    { "amount": 200, "subcategory": "סופר", "payment_method": "cash" },
    { "amount": 85, "subcategory": "חשמל", "category": "fixed_monthly" }
  ],
  "incomes": [
    { "amount": 500, "subcategory": "בונוס", "category": "one_time" }
  ],
  "tasks": [
    { "title": "לחדש ביטוח רכב", "due_date": "2026-06-01" }
  ]
}

תגובה (200):
{
  "status": "ok",
  "created": 4,
  "errors": [],
  "tts_text": "עדכון הושלם: 4 פריטים נוספו בהצלחה."
}

---

## קודי שגיאה

200 = הצלחה
400 = חסרים שדות / ערך לא תקין
401 = אימות נכשל
404 = משתמש/משימה לא נמצא
500 = שגיאת שרת

---

## מיפוי שדות מלא

| שם בעברית | מפתח API | סוג | טבלה |
|-----------|----------|-----|------|
| סכום | amount | number | budget_items |
| קטגוריה | subcategory | string | budget_items |
| סוג | type | expense/income | budget_items |
| תדירות | category | fixed_monthly/one_time | budget_items |
| אמצעי תשלום | payment_method | credit_card/cash/bank_transfer/check/standing_order | budget_items |
| תשלומים | installments | number (1-60) | budget_items |
| תיאור | description | string | budget_items |
| תאריך התחלה | start_date | YYYY-MM-DD | budget_items |
| תאריך סיום | end_date | YYYY-MM-DD | budget_items |
| תאריך ספציפי | due_date | YYYY-MM-DD | budget_items |
| עסקי/פרטי | is_business | boolean | budget_items |
| כותרת משימה | title | string | tasks |
| תאריך יעד | due_date | YYYY-MM-DD | tasks |
| קטגוריית משימה | category | general/rights/financial | tasks |
| ערוץ תזכורת | remind_channel | email/phone/whatsapp | tasks |
| שם | name | string | profiles |
| עיר | city | string | profiles |
| מצב משפחתי | family_status | string | profiles |
| מספר ילדים | children_count | number | profiles |
| קופת חולים | health_fund | string | profiles |
| סטטוס מגורים | residential_status | renter/owner/other | profiles |
| שכר דירה | rent_amount | number | profiles |
| משכנתא | mortgage_monthly | number | profiles |
| תעודת זהות | id_number | string | profiles |
| PIN קולי | ivr_pin | string (6 ספרות) | profiles |

---

## מה לבקש מג'ימיני:
"אני צריך שתבנה לי קובץ תסריט IVR למערכת ימות המשיח. הנה ה-API שלי עם כל ה-endpoints. צריך תפריט ראשי עם 6 שלוחות (1-הוצאה, 2-הכנסה, 3-תקציב, 4-משימות, 5-פרופיל, 9-עדכון חכם). כל שלוחה שולחת POST/GET לכתובת הזו עם הפרמטרים שמפורטים. השדה tts_text מוחזר מהשרת ואותו צריך להשמיע ללקוח."`;
}
