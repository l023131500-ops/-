import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Crown, X, UserPlus, Mail, User, Phone, Lock, Eye, EyeOff, KeyRound, ListTodo, Send, Building2, Smartphone } from "lucide-react";
import { useAdminClients, type ClientRecord } from "@/hooks/useAdminData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function IvrAdminSection({ clientId, refetch }: { clientId: string; refetch: () => void }) {
  const [idNumber, setIdNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("profiles").select("id_number, ivr_pin").eq("id", clientId).maybeSingle();
      if (data) {
        setIdNumber((data as any).id_number || "");
        setPin((data as any).ivr_pin || "");
      }
      setLoaded(true);
    })();
  }, [clientId]);

  const handleSave = async () => {
    if (pin && pin.length !== 6) { toast.error("PIN חייב להיות 6 ספרות"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ id_number: idNumber, ivr_pin: pin } as any).eq("id", clientId);
      if (error) throw error;
      toast.success("פרטי IVR עודכנו!");
      refetch();
    } catch { toast.error("שגיאה בשמירה"); }
    finally { setSaving(false); }
  };

  if (!loaded) return <div className="text-xs text-muted-foreground p-2">טוען...</div>;

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-accent" /> הגדרות מערכת קולית (IVR)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">תעודת זהות</label>
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ת.ז." className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">PIN (6 ספרות)</label>
          <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} className="h-8 text-xs font-mono text-center tracking-widest" />
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
        <Smartphone className="w-3 h-3" /> {saving ? "שומר..." : "שמור הגדרות IVR"}
      </Button>
    </div>
  );
}

export default function AdminClients() {
  const { clients, updateClientTier, toggleBusinessAccess, refetch } = useAdminClients();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", password: "", tier: "standard" });
  const [adding, setAdding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [updatingPasswordFor, setUpdatingPasswordFor] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [sendingTask, setSendingTask] = useState(false);

  const filtered = clients.filter((c) =>
    (c.name || "").includes(search) || (c.email || "").includes(search)
  );

  const pendingUpgrades = clients.filter(c => c.tier === "standard");

  const handleAddClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim() || !newClient.password.trim()) {
      toast.error("שם, אימייל וסיסמה הם שדות חובה");
      return;
    }
    if (newClient.password.length < 6) {
      toast.error("סיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    setAdding(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("פג תוקף ההתחברות של המנהל. התחבר מחדש ונסה שוב.");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: newClient.email.trim().toLowerCase(),
          password: newClient.password,
          name: newClient.name.trim(),
          tier: newClient.tier,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "שגיאה ביצירת לקוח");

      toast.success(`הלקוח ${newClient.name} נוצר בהצלחה! יכול להתחבר עם אימייל וסיסמה.`);
      setNewClient({ name: "", email: "", phone: "", password: "", tier: "standard" });
      setShowAddForm(false);
      setTimeout(() => refetch(), 1000);
    } catch (err: any) {
      const message = String(err?.message || "");
      if (message.toLowerCase().includes("already") || message.includes("כבר")) {
        toast.error("האימייל הזה כבר קיים במערכת — בחר אימייל אחר.");
      } else {
        toast.error(message || "שגיאה ביצירת לקוח");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleUpgrade = (id: string) => {
    updateClientTier(id, clients.find(c => c.id === id)?.tier === "premium" ? "standard" : "premium");
    toast.success("תוכנית הלקוח עודכנה!");
  };

  const handleResetPassword = async (_clientId: string, clientEmail: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clientEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`קישור איפוס סיסמה נשלח ל-${clientEmail}`);
    } catch (err: any) {
      toast.error(err.message || "שגיאה בשליחת איפוס סיסמה");
    }
  };

  const handleSetPassword = async (clientId: string, clientEmail: string) => {
    const nextPassword = passwordDrafts[clientId]?.trim() || "";
    if (nextPassword.length < 6) {
      toast.error("יש להזין סיסמה חדשה עם לפחות 6 תווים");
      return;
    }

    setUpdatingPasswordFor(clientId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("פג תוקף ההתחברות של המנהל. התחבר מחדש ונסה שוב.");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: clientId, password: nextPassword }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "שגיאה בעדכון הסיסמה");

      setPasswordDrafts((prev) => ({ ...prev, [clientId]: "" }));
      toast.success(`הסיסמה עודכנה עבור ${clientEmail}`);
    } catch (err: any) {
      toast.error(err.message || "שגיאה בעדכון הסיסמה");
    } finally {
      setUpdatingPasswordFor(null);
    }
  };

  const handleAssignTask = async (clientId: string) => {
    if (!taskTitle.trim()) { toast.error("יש להזין כותרת משימה"); return; }
    setSendingTask(true);
    try {
      const dueDate = taskDueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
      const { error } = await supabase.from("tasks").insert({
        user_id: clientId,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        due_date: dueDate,
        status: "pending",
        category: "rights",
        auto_generated: false,
      });
      if (error) throw error;
      setTaskTitle(""); setTaskDesc(""); setTaskDueDate("");
      toast.success("המשימה נוספה בהצלחה ללקוח!");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהוספת משימה");
    } finally {
      setSendingTask(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול לקוחות</h1>
          <p className="text-sm text-muted-foreground">{clients.length} לקוחות רשומים</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> הוסף לקוח
        </Button>
      </div>

      {pendingUpgrades.length > 0 && (
        <div className="glass-card-gold rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-accent" />
            לקוחות ממתינים לשדרוג ({pendingUpgrades.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {pendingUpgrades.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-foreground">{c.name || c.email}</span>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                  onClick={() => handleUpgrade(c.id)}>
                  <Crown className="w-3 h-3 me-1" /> אשר פרימיום
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="חיפוש לפי שם, אימייל..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <motion.div key={client.id} layout
            className="glass-card-gold rounded-xl p-5 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setSelectedClient(client)}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                  {(client.name || "?").charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{client.name || "ללא שם"}</p>
                  <p className="text-[10px] text-muted-foreground">{client.email || ""}</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                client.tier === "premium" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
              }`}>
                {client.tier === "premium" ? "⭐ פרימיום" : "סטנדרט"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">סטטוס</p>
                <p className="font-medium text-foreground">{client.onboarding_complete ? "✓ פעיל" : "🆕 חדש"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">הכנסה</p>
                <p className="font-medium text-foreground">₪{(client.monthly_income || 0).toLocaleString()}</p>
              </div>
            </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="text-[10px] h-7 flex-1"
                  onClick={(e) => { e.stopPropagation(); handleUpgrade(client.id); }}>
                  <Crown className="w-3 h-3 me-1" />
                  {client.tier === "premium" ? "הורד לסטנדרט" : "שדרג לפרימיום"}
                </Button>
                <Button size="sm" variant={client.business_enabled ? "default" : "outline"} className="text-[10px] h-7"
                  onClick={(e) => { e.stopPropagation(); toggleBusinessAccess(client.id); }}>
                  <Building2 className="w-3 h-3 me-1" />
                  {client.business_enabled ? "עסקי פעיל ✓" : "הפעל עסקי"}
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7"
                  onClick={(e) => { e.stopPropagation(); handleResetPassword(client.id, client.email); }}>
                  <KeyRound className="w-3 h-3 me-1" /> איפוס סיסמה
                </Button>
              </div>
          </motion.div>
        ))}
      </div>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-gold rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-accent" /> יצירת לקוח חדש
                </h2>
                <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">שם מלא *</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={newClient.name} onChange={e => setNewClient(d => ({ ...d, name: e.target.value }))}
                      placeholder="שם הלקוח" className="pr-10" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">אימייל *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={newClient.email} onChange={e => setNewClient(d => ({ ...d, email: e.target.value }))}
                      placeholder="email@example.com" className="pr-10" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">סיסמה *</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newClient.password}
                      onChange={e => setNewClient(d => ({ ...d, password: e.target.value }))}
                      placeholder="לפחות 6 תווים"
                      className="pr-10 pl-10"
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">סוג חשבון</label>
                  <select value={newClient.tier} onChange={e => setNewClient(d => ({ ...d, tier: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="standard">סטנדרט</option>
                    <option value="premium">⭐ פרימיום</option>
                  </select>
                </div>

                <Button onClick={handleAddClient} disabled={adding || !newClient.name.trim() || !newClient.email.trim() || !newClient.password.trim()}
                  className="w-full gap-2">
                  {adding ? "יוצר לקוח..." : "צור לקוח עם סיסמה"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  הלקוח יוכל להתחבר מיד עם האימייל והסיסמה שהגדרת
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedClient(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card-gold rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-lg font-bold text-accent">
                    {(selectedClient.name || "?").charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedClient.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "סטטוס", value: selectedClient.onboarding_complete ? "✓ פעיל" : "🆕 חדש" },
                    { label: "תוכנית", value: selectedClient.tier === "premium" ? "⭐ פרימיום" : "סטנדרט" },
                    { label: "פרופיל מלא", value: selectedClient.profile_complete ? "✓" : "✗" },
                    { label: "מצב משפחתי", value: selectedClient.family_status || "—" },
                    { label: "הכנסה חודשית", value: `₪${(selectedClient.monthly_income || 0).toLocaleString()}` },
                    { label: "חוב אשראי", value: `₪${(selectedClient.credit_card_debt || 0).toLocaleString()}` },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedClient.tier !== "premium" && (
                    <Button className="flex-1 gap-2" onClick={() => {
                      handleUpgrade(selectedClient.id);
                      setSelectedClient({ ...selectedClient, tier: "premium" });
                    }}>
                      <Crown className="w-4 h-4" /> שדרג לפרימיום
                    </Button>
                  )}
                  <Button variant={selectedClient.business_enabled ? "default" : "outline"} className="gap-2"
                    onClick={() => {
                      toggleBusinessAccess(selectedClient.id);
                      setSelectedClient({ ...selectedClient, business_enabled: !selectedClient.business_enabled });
                    }}>
                    <Building2 className="w-4 h-4" />
                    {selectedClient.business_enabled ? "עסקי פעיל ✓" : "הפעל עסקי"}
                  </Button>
                  <Button variant="outline" className="gap-2"
                    onClick={() => handleResetPassword(selectedClient.id, selectedClient.email)}>
                    <KeyRound className="w-4 h-4" /> איפוס סיסמה
                  </Button>
                </div>

                <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">שינוי סיסמה מתוך הניהול</p>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      type="text"
                      dir="ltr"
                      placeholder="סיסמה חדשה"
                      value={passwordDrafts[selectedClient.id] ?? ""}
                      onChange={(e) => setPasswordDrafts((prev) => ({ ...prev, [selectedClient.id]: e.target.value }))}
                      className="border-border bg-background"
                    />
                    <Button
                      onClick={() => handleSetPassword(selectedClient.id, selectedClient.email)}
                      disabled={updatingPasswordFor === selectedClient.id}
                      className="gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      {updatingPasswordFor === selectedClient.id ? "מעדכן..." : "שמור סיסמה חדשה"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">הפעולה משנה מיד את הסיסמה של המשתמש בלי לשלוח אותו לאימות מייל.</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-accent" /> הוסף משימה ללקוח
                  </p>
                  <Input
                    placeholder="כותרת המשימה *"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="תיאור — מה הלקוח צריך לבצע כדי לקבל את הזכות/ההטבה"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={3}
                  />
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button onClick={() => handleAssignTask(selectedClient.id)} disabled={sendingTask} className="gap-2">
                    <Send className="w-4 h-4" />
                    {sendingTask ? "שולח..." : "שלח משימה"}
                  </Button>
                </div>

                {/* IVR Management */}
                <IvrAdminSection clientId={selectedClient.id} refetch={refetch} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
