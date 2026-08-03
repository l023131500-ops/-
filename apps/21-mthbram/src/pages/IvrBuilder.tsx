import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Save, Copy, CheckCheck, RefreshCw, Inbox,
  PhoneCall, MessageCircle, Search as SearchIcon, Code
} from "lucide-react";

const IvrBuilder = () => {
  const [ivrSubmissions, setIvrSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

  const endpoints = [
    {
      name: "ivr-menu",
      label: "תפריט קולי",
      desc: "מחזיר את עץ התפריט הקולי המלא",
      method: "GET",
      url: `${baseUrl}/ivr-menu`,
      example: `curl "${baseUrl}/ivr-menu"`,
    },
    {
      name: "ivr-search",
      label: "חיפוש שיעורים",
      desc: "חיפוש שיעורים לפי פרמטרים — מחזיר טקסט להקראה",
      method: "GET/POST",
      url: `${baseUrl}/ivr-search`,
      example: `curl "${baseUrl}/ivr-search?subject=גמרא&city=ירושלים&language=עברית"`,
    },
    {
      name: "ivr-submit",
      label: "שליחת בקשה/הודעה",
      desc: "קליטת בקשות מהמערכת הקולית (הודעה, בקשת שיעור, הרשמת מרצה)",
      method: "POST",
      url: `${baseUrl}/ivr-submit`,
      example: `curl -X POST "${baseUrl}/ivr-submit" -H "Content-Type: application/json" -d '{"caller_phone":"0501234567","request_type":"request_lesson","message":"מחפש שיעור גמרא בירושלים"}'`,
    },
    {
      name: "ivr-agent",
      label: "סוכן חכם",
      desc: "חיפוש חכם בטקסט חופשי — מחזיר תוצאות בפורמט להקראה",
      method: "POST",
      url: `${baseUrl}/ivr-agent`,
      example: `curl -X POST "${baseUrl}/ivr-agent" -H "Content-Type: application/json" -d '{"text":"אני מחפש שיעור הלכה בבני ברק","caller_phone":"0501234567"}'`,
    },
  ];

  useEffect(() => { fetchIvrSubmissions(); }, []);

  const fetchIvrSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ivr_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setIvrSubmissions(data);
    setLoading(false);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success("הועתק!");
    setTimeout(() => setCopied(null), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> חזרה לניהול
            </Button>
          </div>

          {/* Header */}
          <div className="relative mb-8 p-8 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy" />
            <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-teal/15 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-magenta/10 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <h1 className="font-display text-3xl font-black text-primary-foreground mb-2">
                מערכת <span className="text-gradient-teal">ימות המשיח</span>
              </h1>
              <p className="font-body text-primary-foreground/60">ניהול מערכת קולית, תיעוד API, וצפייה בפניות</p>
            </div>
          </div>

          <Tabs defaultValue="api" className="space-y-6">
            <TabsList className="bg-navy/5 border border-border p-1 rounded-xl">
              <TabsTrigger value="api" className="font-body font-bold data-[state=active]:bg-gradient-teal data-[state=active]:text-primary-foreground rounded-lg gap-1">
                <Code className="w-4 h-4" /> תיעוד API
              </TabsTrigger>
              <TabsTrigger value="submissions" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-primary-foreground rounded-lg gap-1">
                <Inbox className="w-4 h-4" /> פניות ({ivrSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="menu" className="font-body font-bold data-[state=active]:bg-gradient-magenta data-[state=active]:text-primary-foreground rounded-lg gap-1">
                <Phone className="w-4 h-4" /> תפריט קולי
              </TabsTrigger>
            </TabsList>

            {/* API Documentation */}
            <TabsContent value="api">
              <div className="space-y-4">
                {endpoints.map(ep => (
                  <div key={ep.name} className="bg-card rounded-2xl border border-border p-6 hover:border-teal/30 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-gradient-teal text-primary-foreground font-mono">{ep.method}</Badge>
                      <h3 className="font-display font-bold text-card-foreground">{ep.label}</h3>
                    </div>
                    <p className="font-body text-sm text-muted-foreground mb-3">{ep.desc}</p>
                    
                    <div className="bg-muted/30 rounded-xl p-4 mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs text-muted-foreground">URL:</span>
                        <button onClick={() => copyText(ep.url, ep.name + "-url")} className="text-xs text-primary hover:text-primary/80">
                          {copied === ep.name + "-url" ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <code className="font-mono text-xs text-gold break-all">{ep.url}</code>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs text-muted-foreground">דוגמא:</span>
                        <button onClick={() => copyText(ep.example, ep.name + "-ex")} className="text-xs text-primary hover:text-primary/80">
                          {copied === ep.name + "-ex" ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <code className="font-mono text-xs text-teal-light break-all whitespace-pre-wrap">{ep.example}</code>
                    </div>
                  </div>
                ))}

                {/* Make/n8n Guide */}
                <div className="bg-card rounded-2xl border-2 border-gold/20 p-6">
                  <h3 className="font-display text-lg font-bold text-card-foreground mb-3">🔗 חיבור ב-Make / n8n / Zapier</h3>
                  <div className="space-y-3 font-body text-sm text-muted-foreground">
                    <p><strong className="text-foreground">שלב 1:</strong> הגדירו Webhook בימות המשיח לשלוח POST לכתובת <code className="text-gold">ivr-submit</code></p>
                    <p><strong className="text-foreground">שלב 2:</strong> הגדירו HTTP Request ב-Make/n8n לקרוא ל-<code className="text-gold">ivr-search</code> עם הפרמטרים</p>
                    <p><strong className="text-foreground">שלב 3:</strong> השתמשו בתגובה (<code className="text-gold">text_for_speech</code>) להקראה במערכת הקולית</p>
                    <p><strong className="text-foreground">שלב 4:</strong> לחיפוש חכם בטקסט חופשי, השתמשו ב-<code className="text-gold">ivr-agent</code></p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Submissions */}
            <TabsContent value="submissions">
              <div className="flex gap-3 mb-4">
                <Button variant="outline" onClick={fetchIvrSubmissions} className="gap-1">
                  <RefreshCw className="w-4 h-4" /> רענון
                </Button>
              </div>
              <div className="space-y-3">
                {ivrSubmissions.map(sub => (
                  <div key={sub.id} className="bg-card rounded-2xl border border-border p-5 hover:border-teal/30 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`font-body ${
                        sub.request_type === "search" ? "bg-gradient-teal text-primary-foreground" :
                        sub.request_type === "agent" ? "bg-gradient-magenta text-primary-foreground" :
                        "bg-gradient-gold text-primary-foreground"
                      }`}>
                        {sub.request_type === "search" ? "🔍 חיפוש" :
                         sub.request_type === "agent" ? "🤖 סוכן" :
                         sub.request_type === "message" ? "💬 הודעה" :
                         sub.request_type}
                      </Badge>
                      {sub.caller_phone && <span className="font-body text-sm text-muted-foreground flex items-center gap-1"><PhoneCall className="w-3 h-3" /> {sub.caller_phone}</span>}
                    </div>
                    {sub.input_text && <p className="font-body text-sm text-card-foreground mb-1">📥 {sub.input_text}</p>}
                    {sub.response_text && <p className="font-body text-xs text-muted-foreground">📤 {sub.response_text.slice(0, 200)}...</p>}
                    <p className="font-body text-xs text-muted-foreground/50 mt-2">
                      {new Date(sub.created_at).toLocaleString("he-IL")}
                    </p>
                  </div>
                ))}
                {ivrSubmissions.length === 0 && (
                  <p className="text-center font-body text-muted-foreground py-16">
                    {loading ? "טוען..." : "אין פניות עדיין"}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Menu Builder */}
            <TabsContent value="menu">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-display text-lg font-bold text-card-foreground mb-4">🌳 עץ תפריט קולי</h3>
                <p className="font-body text-sm text-muted-foreground mb-4">
                  התפריט הקולי מוגדר אוטומטית. ניתן לצפות בו ולקבל את ה-JSON המלא דרך ה-API.
                </p>

                <div className="space-y-3">
                  {[
                    { key: "1", label: "חיפוש שיעור", sub: "שפה → נושא → עיר → תוצאות" },
                    { key: "2", label: "עדכון שיעור קיים", sub: "הקלטת הודעה עם פרטים" },
                    { key: "3", label: "הקמת שיעור חדש", sub: "הקלטת בקשה" },
                    { key: "4", label: "הצטרפות כמגיד שיעור", sub: "הקלטת פרטים" },
                    { key: "0", label: "שיחה עם נציג", sub: "העברה ל-023-133-0600" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                      <div className="w-10 h-10 rounded-lg bg-gradient-teal flex items-center justify-center font-display font-bold text-primary-foreground">
                        {item.key}
                      </div>
                      <div>
                        <p className="font-body font-bold text-card-foreground">{item.label}</p>
                        <p className="font-body text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 bg-muted/30 rounded-xl p-4">
                  <p className="font-body text-xs text-muted-foreground mb-2">לקבלת ה-JSON המלא:</p>
                  <code className="font-mono text-xs text-gold break-all">GET {baseUrl}/ivr-menu</code>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default IvrBuilder;
