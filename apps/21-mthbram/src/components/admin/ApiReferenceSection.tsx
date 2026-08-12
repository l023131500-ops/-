import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, CheckCheck, Code, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  adminOnly?: boolean;
  params?: { name: string; type: string; required?: boolean; desc: string }[];
  body?: { name: string; type: string; required?: boolean; desc: string }[];
  example?: string;
}

const ENDPOINTS: { category: string; color: string; endpoints: Endpoint[] }[] = [
  {
    category: "שיעורים",
    color: "teal",
    endpoints: [
      {
        method: "GET",
        path: "/lessons",
        description: "רשימת כל השיעורים המאושרים עם אפשרויות סינון",
        params: [
          { name: "limit", type: "number", desc: "מספר תוצאות (ברירת מחדל: 100)" },
          { name: "offset", type: "number", desc: "דילוג (pagination)" },
          { name: "city", type: "string", desc: "סינון לפי עיר" },
          { name: "subject", type: "string", desc: "סינון לפי נושא" },
          { name: "language", type: "string", desc: "סינון לפי שפה" },
          { name: "audience", type: "string", desc: "סינון לפי קהל יעד" },
          { name: "rabbi", type: "string", desc: "חיפוש לפי שם הרב" },
        ],
        example: `fetch("${BASE_URL}/lessons?city=ירושלים&subject=גמרא")`,
      },
      {
        method: "GET",
        path: "/lesson/:id",
        description: "פרטי שיעור בודד לפי מזהה",
        example: `fetch("${BASE_URL}/lesson/UUID_HERE")`,
      },
      {
        method: "POST",
        path: "/lessons",
        description: "עדכון/הגשת שיעור חדש למאגר (ממתין לאישור)",
        body: [
          { name: "rabbi_name", type: "string", required: true, desc: "שם הרב" },
          { name: "subject", type: "string", required: true, desc: "נושא השיעור" },
          { name: "city", type: "string", required: true, desc: "עיר" },
          { name: "neighborhood", type: "string", desc: "שכונה" },
          { name: "street", type: "string", desc: "רחוב" },
          { name: "synagogue_name", type: "string", desc: "שם בית הכנסת" },
          { name: "language", type: "string", desc: "שפה (ברירת מחדל: עברית)" },
          { name: "target_audience", type: "string[]", desc: "קהל יעד" },
          { name: "lesson_style", type: "string", desc: "סגנון השיעור" },
          { name: "rabbi_phone", type: "string", desc: "טלפון הרב" },
          { name: "schedule_days", type: "array", desc: 'ימים ושעות [{day:"ראשון",time:"20:00"}]' },
          { name: "is_recurring", type: "boolean", desc: "שיעור קבוע?" },
          { name: "is_recorded", type: "boolean", desc: "מוקלט?" },
          { name: "is_live_stream", type: "boolean", desc: "שידור חי?" },
          { name: "contact_name", type: "string", desc: "איש קשר" },
          { name: "contact_phone", type: "string", desc: "טלפון ליצירת קשר" },
          { name: "logo_url", type: "string", desc: "קישור ללוגו" },
          { name: "donation_link", type: "string", desc: "קישור לתרומה" },
        ],
        example: `fetch("${BASE_URL}/lessons", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    rabbi_name: "הרב ישראלי",
    subject: "גמרא",
    city: "ירושלים",
    schedule_days: [{ day: "שני", time: "20:00" }],
    is_recurring: true
  })
})`,
      },
    ],
  },
  {
    category: "מגידי שיעור",
    color: "gold",
    endpoints: [
      {
        method: "GET",
        path: "/teachers",
        description: "רשימת כל מגידי השיעור שנרשמו — כולל טלפון ומייל, ולכן לניהול בלבד",
        adminOnly: true,
        example: `// דורש טוקן של משתמש מחובר בעל תפקיד admin
const { data: { session } } = await supabase.auth.getSession();
fetch("${BASE_URL}/teachers", {
  headers: { Authorization: \`Bearer \${session.access_token}\` }
})`,
      },
      {
        method: "POST",
        path: "/teachers",
        description: "הצטרפות מגיד שיעור חדש",
        body: [
          { name: "full_name", type: "string", required: true, desc: "שם מלא" },
          { name: "phone", type: "string", desc: "טלפון" },
          { name: "email", type: "string", desc: "מייל" },
          { name: "city", type: "string", desc: "עיר מגורים" },
          { name: "subjects", type: "string[]", desc: "נושאי לימוד" },
          { name: "experience", type: "string", desc: "ניסיון" },
          { name: "notes", type: "string", desc: "הערות" },
        ],
        example: `fetch("${BASE_URL}/teachers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    full_name: "הרב כהן",
    phone: "050-1234567",
    subjects: ["גמרא", "הלכה"],
    city: "בני ברק"
  })
})`,
      },
    ],
  },
  {
    category: "מחפשי שיעור",
    color: "magenta",
    endpoints: [
      {
        method: "GET",
        path: "/seekers",
        description: "רשימת כל הבקשות לשיעורים — כולל טלפון ומייל, ולכן לניהול בלבד",
        adminOnly: true,
        example: `// דורש טוקן של משתמש מחובר בעל תפקיד admin
const { data: { session } } = await supabase.auth.getSession();
fetch("${BASE_URL}/seekers", {
  headers: { Authorization: \`Bearer \${session.access_token}\` }
})`,
      },
      {
        method: "POST",
        path: "/seekers",
        description: "הגשת בקשה לשיעור / הקמת שיעור",
        body: [
          { name: "contact_name", type: "string", required: true, desc: "שם מלא" },
          { name: "phone", type: "string", desc: "טלפון" },
          { name: "email", type: "string", desc: "מייל" },
          { name: "city", type: "string", desc: "עיר" },
          { name: "subject", type: "string", desc: "נושא מבוקש" },
          { name: "lesson_type", type: "string", desc: "סוג השיעור (קבוע/מזדמן)" },
          { name: "audience_type", type: "string", desc: "קהל יעד" },
          { name: "preferred_time", type: "string", desc: "זמן מועדף" },
          { name: "notes", type: "string", desc: "פרטים נוספים" },
        ],
        example: `fetch("${BASE_URL}/seekers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contact_name: "ישראל ישראלי",
    phone: "052-9876543",
    city: "ירושלים",
    subject: "הלכה",
    lesson_type: "קבוע"
  })
})`,
      },
    ],
  },
  {
    category: "פניות ויצירת קשר",
    color: "brand",
    endpoints: [
      {
        method: "GET",
        path: "/contacts",
        description: "רשימת כל הודעות יצירת הקשר — כולל טלפון ומייל, ולכן לניהול בלבד",
        adminOnly: true,
        example: `// דורש טוקן של משתמש מחובר בעל תפקיד admin
const { data: { session } } = await supabase.auth.getSession();
fetch("${BASE_URL}/contacts", {
  headers: { Authorization: \`Bearer \${session.access_token}\` }
})`,
      },
      {
        method: "POST",
        path: "/contacts",
        description: "שליחת הודעת יצירת קשר",
        body: [
          { name: "name", type: "string", required: true, desc: "שם" },
          { name: "phone", type: "string", desc: "טלפון" },
          { name: "email", type: "string", desc: "מייל" },
          { name: "role", type: "string", desc: "תפקיד" },
          { name: "subject", type: "string", desc: "נושא" },
          { name: "message", type: "string", desc: "הודעה" },
        ],
        example: `fetch("${BASE_URL}/contacts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "ישראל",
    phone: "050-0000000",
    message: "אשמח לפרטים נוספים"
  })
})`,
      },
    ],
  },
  {
    category: "נתונים נוספים",
    color: "teal",
    endpoints: [
      {
        method: "GET",
        path: "/stats",
        description: "סטטיסטיקות כלליות — שיעורים, פניות, הודעות",
        example: `fetch("${BASE_URL}/stats")`,
      },
      {
        method: "GET",
        path: "/cities",
        description: "רשימת כל הערים עם שיעורים מאושרים",
        example: `fetch("${BASE_URL}/cities")`,
      },
      {
        method: "GET",
        path: "/subjects",
        description: "רשימת כל נושאי הלימוד עם שיעורים מאושרים",
        example: `fetch("${BASE_URL}/subjects")`,
      },
    ],
  },
];

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("הועתק!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
      {copied ? <CheckCheck className="w-4 h-4 text-teal" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
};

const ApiReferenceSection = () => {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const gradientMap: Record<string, string> = {
    teal: "bg-gradient-teal",
    gold: "bg-gradient-gold",
    magenta: "bg-gradient-magenta",
    brand: "bg-gradient-brand",
  };

  const borderMap: Record<string, string> = {
    teal: "border-teal/20",
    gold: "border-gold/20",
    magenta: "border-magenta/20",
    brand: "border-primary/20",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <Code className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display text-xl font-black text-card-foreground">API לאוטומציה</h3>
            <p className="font-body text-sm text-muted-foreground">חברו את המאגר למערכות חיצוניות — Make, Zapier, ועוד</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3 border border-border">
          <span className="font-body text-xs text-muted-foreground flex-shrink-0">Base URL:</span>
          <code className="font-mono text-sm text-primary flex-1 truncate" dir="ltr">{BASE_URL}</code>
          <CopyButton text={BASE_URL} />
        </div>
      </div>

      {/* Endpoint Categories */}
      {ENDPOINTS.map((cat) => (
        <motion.div
          key={cat.category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gradientMap[cat.color]}`} />
            <h4 className="font-display text-lg font-bold text-card-foreground">{cat.category}</h4>
          </div>

          {cat.endpoints.map((ep) => {
            const key = `${ep.method}-${ep.path}`;
            const isExpanded = expandedEndpoint === key;

            return (
              <div key={key} className={`bg-card rounded-2xl border ${borderMap[cat.color]} overflow-hidden transition-all`}>
                <button
                  onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                  className="w-full p-4 flex items-center gap-3 text-right hover:bg-muted/20 transition-colors"
                >
                  <Badge className={`font-mono text-xs font-bold ${
                    ep.method === "GET" ? "bg-teal/15 text-teal border-teal/30" : "bg-gold/15 text-gold border-gold/30"
                  }`}>
                    {ep.method}
                  </Badge>
                  <code className="font-mono text-sm text-foreground flex-1 text-right" dir="ltr">{ep.path}</code>
                  {ep.adminOnly && (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 font-body text-[10px] px-1.5 flex-shrink-0">
                      ניהול בלבד
                    </Badge>
                  )}
                  <span className="font-body text-xs text-muted-foreground hidden md:block">{ep.description}</span>
                  <CopyButton text={`${BASE_URL}${ep.path}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="p-5 space-y-4">
                        <p className="font-body text-sm text-muted-foreground">{ep.description}</p>

                        {/* URL */}
                        <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                          <code className="font-mono text-xs text-primary flex-1 break-all" dir="ltr">
                            {BASE_URL}{ep.path}
                          </code>
                          <CopyButton text={`${BASE_URL}${ep.path}`} />
                        </div>

                        {/* Query Params */}
                        {ep.params && ep.params.length > 0 && (
                          <div>
                            <h5 className="font-body text-sm font-bold text-card-foreground mb-2">פרמטרים (Query)</h5>
                            <div className="space-y-1">
                              {ep.params.map((p) => (
                                <div key={p.name} className="flex items-center gap-2 text-xs font-body py-1 px-2 rounded-lg bg-muted/20">
                                  <code className="font-mono text-primary font-bold">{p.name}</code>
                                  <span className="text-muted-foreground">({p.type})</span>
                                  {p.required && <Badge className="bg-destructive/15 text-destructive text-[10px] px-1.5">חובה</Badge>}
                                  <span className="text-muted-foreground flex-1 text-right">{p.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Body Params */}
                        {ep.body && ep.body.length > 0 && (
                          <div>
                            <h5 className="font-body text-sm font-bold text-card-foreground mb-2">גוף הבקשה (JSON Body)</h5>
                            <div className="space-y-1">
                              {ep.body.map((p) => (
                                <div key={p.name} className="flex items-center gap-2 text-xs font-body py-1 px-2 rounded-lg bg-muted/20">
                                  <code className="font-mono text-primary font-bold">{p.name}</code>
                                  <span className="text-muted-foreground">({p.type})</span>
                                  {p.required && <Badge className="bg-destructive/15 text-destructive text-[10px] px-1.5">חובה</Badge>}
                                  <span className="text-muted-foreground flex-1 text-right">{p.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Code Example */}
                        {ep.example && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-body text-sm font-bold text-card-foreground flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-gold" /> דוגמת קוד
                              </h5>
                              <CopyButton text={ep.example} />
                            </div>
                            <pre className="bg-navy/90 text-primary-foreground/80 rounded-xl p-4 overflow-x-auto text-xs font-mono leading-relaxed" dir="ltr">
                              {ep.example}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      ))}

      {/* Automation tips */}
      <div className="bg-gradient-to-l from-gold/5 to-gold/10 border border-gold/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5 text-gold" />
          <h4 className="font-display text-base font-bold text-card-foreground">טיפים לאוטומציה</h4>
        </div>
        <ul className="font-body text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>השתמשו ב-POST endpoints לשליחת טפסים מ-Make / Zapier / n8n</li>
          <li>חברו את GET /stats לדשבורד חיצוני למעקב אחר נתונים</li>
          <li>השתמשו ב-GET /lessons עם פרמטרים לבניית ווידג'ט שיעורים באתר חיצוני</li>
          <li>כל שיעור שנשלח דרך POST /lessons ייכנס כ"ממתין לאישור" בלוח הניהול</li>
          <li>ניתן לסנן שיעורים לפי עיר, נושא, שפה, קהל יעד ושם הרב</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiReferenceSection;
