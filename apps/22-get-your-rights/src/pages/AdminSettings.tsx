import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Key, Webhook, Copy, Trash2, Plus, Settings, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [n8nSaving, setN8nSaving] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      setAuthChecked(true);
      loadSettings();
      loadApiKeys();
    };
    checkAuth();
  }, [navigate]);

  const loadSettings = async () => {
    const { data } = await supabase.from("site_settings").select("*").eq("key", "webhook_url").single();
    if (data) setWebhookUrl(data.value);
    const { data: n8n } = await supabase.from("site_settings").select("*").eq("key", "n8n_webhook_url").single();
    if (n8n) setN8nWebhookUrl(n8n.value);
  };

  const loadApiKeys = async () => {
    const { data } = await supabase.from("api_keys").select("id, name, key_prefix, created_at, last_used_at, is_active").order("created_at", { ascending: false });
    if (data) setApiKeys(data);
  };

  const saveWebhook = async () => {
    setWebhookSaving(true);
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "webhook_url").single();
    const { error } = existing
      ? await supabase.from("site_settings").update({ value: webhookUrl, updated_at: new Date().toISOString() }).eq("key", "webhook_url")
      : await supabase.from("site_settings").insert({ key: "webhook_url", value: webhookUrl });
    setWebhookSaving(false);
    if (error) {
      toast({ title: "שגיאה", description: "שמירת ה-Webhook נכשלה", variant: "destructive" });
      return;
    }
    toast({ title: "נשמר", description: "כתובת ה-Webhook עודכנה בהצלחה" });
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);

    // Generate random key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = "bk_" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
    const prefix = key.substring(0, 10) + "...";

    // Hash the key
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("api_keys").insert({
      name: newKeyName,
      key_hash: hash,
      key_prefix: prefix,
      created_by: session?.user?.id || null,
    } as any);

    if (error) {
      setCreating(false);
      toast({ title: "שגיאה", description: "יצירת מפתח ה-API נכשלה", variant: "destructive" });
      return;
    }

    setGeneratedKey(key);
    setNewKeyName("");
    setCreating(false);
    loadApiKeys();
  };

  const deleteKey = async (id: string) => {
    if (!confirm("האם למחוק את מפתח ה-API? פעולה זו תחסום מיידית כל שימוש קיים במפתח זה.")) return;
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: "מחיקת המפתח נכשלה", variant: "destructive" });
      return;
    }
    loadApiKeys();
    toast({ title: "נמחק", description: "מפתח ה-API נמחק" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "הועתק", description: "הועתק ללוח" });
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">טוען...</div>;
  }

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const apiEndpoint = `https://${projectId}.supabase.co/functions/v1/leads-api`;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">הגדרות</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/leads">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowRight className="w-4 h-4" /> חזרה ללידים
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <Tabs defaultValue="api" className="space-y-6">
          <TabsList className="w-full">
            <TabsTrigger value="api" className="flex-1 gap-2"><Key className="w-4 h-4" /> מפתחות API</TabsTrigger>
            <TabsTrigger value="n8n" className="flex-1 gap-2"><Webhook className="w-4 h-4" /> n8n</TabsTrigger>
            <TabsTrigger value="webhook" className="flex-1 gap-2"><Webhook className="w-4 h-4" /> Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">מפתחות API</CardTitle>
                <CardDescription>
                  השתמשו במפתחות API כדי לגשת ללידים ממערכות חיצוניות (CRM, אוטומציות וכו')
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* API Endpoint */}
                <div className="p-4 rounded-xl bg-muted border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">כתובת ה-API:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded border border-border break-all" dir="ltr">
                      {apiEndpoint}
                    </code>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(apiEndpoint)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    שלחו בקשת GET עם הכותרת <code className="bg-background px-1 rounded">x-api-key</code>
                  </p>
                </div>

                {/* Create new key */}
                <div className="flex gap-2">
                  <Input
                    placeholder="שם למפתח (למשל: CRM שלי)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="text-sm"
                  />
                  <Button onClick={generateApiKey} disabled={creating || !newKeyName.trim()} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> צור מפתח
                  </Button>
                </div>

                {/* Generated key alert */}
                {generatedKey && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
                    <p className="text-sm font-bold text-foreground">🔑 המפתח נוצר! העתיקו אותו עכשיו - הוא לא יוצג שוב:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background p-2 rounded border border-border break-all" dir="ltr">
                        {generatedKey}
                      </code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedKey)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setGeneratedKey(null)} className="text-xs">
                      הבנתי, סגור
                    </Button>
                  </div>
                )}

                {/* Existing keys */}
                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">{k.name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {k.key_prefix} · {k.last_used_at ? `שימוש אחרון: ${new Date(k.last_used_at).toLocaleDateString("he-IL")}` : "טרם נעשה שימוש"}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteKey(k.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {apiKeys.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">אין מפתחות API. צרו אחד חדש.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="n8n">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">n8n Webhook</CardTitle>
                <CardDescription>
                  הגדירו את כתובת ה-Webhook של n8n לשליחת מידע מועשר על לידים וזכויות (וואטסאפ, מייל, פקס, הודעה קולית)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://your-n8n.app.n8n.cloud/webhook/..."
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  className="text-sm"
                  dir="ltr"
                />
                <div className="p-3 rounded-lg bg-muted border border-border space-y-2">
                  <p className="text-xs font-bold text-foreground">📤 המידע שנשלח ל-n8n כולל:</p>
                  <ul className="text-xs text-muted-foreground leading-relaxed list-disc pr-4 space-y-1">
                    <li>פרטי הליד המלאים (שם, טלפון, ת"ז, מצב בריאותי, כלכלי, משפחתי)</li>
                    <li>פרטי בן/בת זוג (אם הוזנו)</li>
                    <li>פרטי הזכות המתאימה (תנאי זכאות, מסמכים, דרכי מימוש, פוטנציאל כספי)</li>
                    <li>סוג הטריגר (אוטומטי בליד חדש / ידני מהניהול)</li>
                  </ul>
                </div>
                <Button onClick={async () => {
                  setN8nSaving(true);
                  const { data: existing } = await supabase.from("site_settings").select("id").eq("key", "n8n_webhook_url").single();
                  const { error } = existing
                    ? await supabase.from("site_settings").update({ value: n8nWebhookUrl, updated_at: new Date().toISOString() }).eq("key", "n8n_webhook_url")
                    : await supabase.from("site_settings").insert({ key: "n8n_webhook_url", value: n8nWebhookUrl });
                  setN8nSaving(false);
                  if (error) {
                    toast({ title: "שגיאה", description: "שמירת ה-Webhook של n8n נכשלה", variant: "destructive" });
                    return;
                  }
                  toast({ title: "נשמר", description: "כתובת ה-Webhook של n8n עודכנה בהצלחה" });
                }} disabled={n8nSaving} className="gap-2">
                  {n8nSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {n8nSaving ? "שומר..." : "שמור"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Webhook</CardTitle>
                <CardDescription>
                  הגדירו כתובת URL שתקבל התראה אוטומטית בכל פעם שנכנס ליד חדש
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="text-sm"
                  dir="ltr"
                />
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ה-Webhook ישלח בקשת POST עם גוף JSON הכולל: <code className="bg-background px-1 rounded">event</code>, <code className="bg-background px-1 rounded">timestamp</code>, <code className="bg-background px-1 rounded">lead</code>
                  </p>
                </div>
                <Button onClick={saveWebhook} disabled={webhookSaving} className="gap-2">
                  {webhookSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {webhookSaving ? "שומר..." : "שמור"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminSettings;
