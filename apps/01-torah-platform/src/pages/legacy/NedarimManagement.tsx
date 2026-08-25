import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Check, Eye, ArrowLeft, RefreshCw, Inbox, Copy, CheckCheck, Wallet, Undo2, Ban } from "lucide-react";

const TX_STATUS_LABEL: Record<string, string> = {
  pending: "⏳ ממתין",
  completed: "✓ הושלם",
  success: "✓ הושלם",
  failed: "✗ נכשל",
  refunded: "↩ זוכה",
  cancelled: "✗ בוטל",
};

const NedarimManagement = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [busyTxId, setBusyTxId] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nedarim-webhook`;

  useEffect(() => { fetchSubmissions(); fetchTransactions(); }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("nedarim_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSubmissions(data);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    const { data, error } = await supabase
      .from("nedarim_transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("שגיאה בטעינת עסקאות: " + error.message);
    if (data) setTransactions(data);
    setTxLoading(false);
  };

  // Real money movement against the live Nedarim Plus processor — requires an
  // explicit admin confirmation per call, cannot be triggered accidentally.
  const runNedarimAction = async (
    tx: any,
    action: "RefundTransaction" | "CancelInvoice",
    confirmMessage: string,
  ) => {
    if (busyTxId || !tx.transaction_id) return;
    if (!confirm(confirmMessage)) return;
    setBusyTxId(tx.id);
    const { data, error } = await supabase.functions.invoke("nedarim-admin", {
      body: {
        action,
        tenant_id: tx.tenant_id,
        transaction_id: tx.transaction_id,
        ...(action === "RefundTransaction" ? { amount: tx.amount_ils } : {}),
      },
    });
    setBusyTxId(null);
    if (error) {
      toast.error("שגיאה בפעולה מול נדרים פלוס: " + error.message);
      return;
    }
    if (!data?.ok) {
      toast.error("נדרים פלוס דחה את הבקשה: " + (data?.result?.Message || data?.error || data?.status));
      return;
    }
    toast.success(action === "RefundTransaction" ? "העסקה זוכתה בהצלחה" : "החשבונית בוטלה בהצלחה");
    fetchTransactions();
  };

  const refundTransaction = (tx: any) =>
    runNedarimAction(
      tx,
      "RefundTransaction",
      `לזכות את העסקה ${tx.transaction_id} בסך ${tx.amount_ils} ₪? הפעולה שולחת בקשת זיכוי אמיתית לנדרים פלוס ואינה הפיכה.`,
    );

  const cancelTransaction = (tx: any) =>
    runNedarimAction(
      tx,
      "CancelInvoice",
      `לבטל את החשבונית של עסקה ${tx.transaction_id}? הפעולה שולחת בקשת ביטול אמיתית לנדרים פלוס ואינה הפיכה.`,
    );

  const publishToLessons = async (sub: any) => {
    const lessonData = {
      rabbi_name: sub.name || "ממתין לעדכון",
      subject: sub.subject || "ממתין לעדכון",
      city: sub.city || "ממתין לעדכון",
      language: "עברית",
      status: "pending",
      is_approved: false,
      submitter_notes: `מקור: נדרים פלוס. טלפון: ${sub.phone}`,
    };

    const { error } = await supabase.from("lessons").insert(lessonData);
    if (!error) {
      await supabase.from("nedarim_submissions").update({ status: "published" }).eq("id", sub.id);
      toast.success("הועבר לפרסום בהצלחה!");
      fetchSubmissions();
    } else {
      toast.error("שגיאה: " + error.message);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("כתובת Webhook הועתקה!");
    setTimeout(() => setCopied(false), 3000);
  };

  const filtered = submissions.filter(s => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.subject?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> חזרה לניהול
            </Button>
          </div>

          <div className="relative mb-8 p-8 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy" />
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gold/15 rounded-full blur-[100px]" />
            <div className="relative z-10">
              <h1 className="font-display text-3xl font-black text-primary-foreground mb-2">
                ניהול <span className="text-gradient-gold">נדרים פלוס</span>
              </h1>
              <p className="font-body text-primary-foreground/60 mb-4">נתונים שהתקבלו דרך Webhook מנדרים פלוס</p>

              {/* Webhook URL */}
              <div className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-body text-xs text-primary-foreground/40 mb-1">כתובת Webhook לחיבור:</p>
                  <code className="font-mono text-sm text-gold break-all">{webhookUrl}</code>
                </div>
                <Button size="sm" variant="outline" onClick={copyWebhook} className="border-gold/30 text-gold gap-1">
                  {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "הועתק" : "העתק"}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "סה״כ", value: submissions.length, color: "bg-gradient-gold" },
              { label: "חדשים", value: submissions.filter(s => s.status === "new").length, color: "bg-gradient-teal" },
              { label: "פורסמו", value: submissions.filter(s => s.status === "published").length, color: "bg-gradient-magenta" },
            ].map(stat => (
              <div key={stat.label} className="bg-card rounded-2xl border border-border p-5">
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                  <Inbox className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="font-display text-2xl font-black text-card-foreground">{stat.value}</p>
                <p className="font-body text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Payment transactions */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-bold text-card-foreground flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gold" /> עסקאות תשלום ({transactions.length})
              </h2>
              <Button variant="outline" size="sm" onClick={fetchTransactions} className="gap-1">
                <RefreshCw className="w-4 h-4" /> רענון
              </Button>
            </div>
            <div className="space-y-3">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-card rounded-2xl border border-border p-5 hover:border-gold/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-display font-bold text-card-foreground">{tx.amount_ils ? `₪${tx.amount_ils}` : "—"}</h3>
                        <Badge className={`font-body ${
                          tx.status === "completed" || tx.status === "success" ? "bg-gradient-teal text-primary-foreground" :
                          tx.status === "failed" ? "bg-destructive/15 text-destructive" :
                          tx.status === "refunded" || tx.status === "cancelled" ? "bg-muted text-muted-foreground" :
                          "bg-gradient-gold text-primary-foreground"
                        }`}>
                          {TX_STATUS_LABEL[tx.status] || tx.status || "—"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                        {tx.transaction_id ? <span>מזהה: {tx.transaction_id}</span> : <span className="text-destructive/70">אין מזהה עסקה (עדיין לא אושרה)</span>}
                        {tx.confirmation_code && <span>אישור: {tx.confirmation_code}</span>}
                      </div>
                      {tx.error_message && <p className="font-body text-xs text-destructive mt-1">⚠ {tx.error_message}</p>}
                      <p className="font-body text-xs text-muted-foreground/60 mt-1">
                        {new Date(tx.created_at).toLocaleString("he-IL")}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!tx.transaction_id || busyTxId === tx.id}
                        onClick={() => refundTransaction(tx)}
                        className="gap-1 font-body border-gold/30 text-gold hover:bg-gold/10"
                        title="זיכוי מלא (Refund)"
                      >
                        <Undo2 className="w-3 h-3" /> זיכוי
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!tx.transaction_id || busyTxId === tx.id}
                        onClick={() => cancelTransaction(tx)}
                        className="gap-1 font-body border-destructive/30 text-destructive hover:bg-destructive/10"
                        title="ביטול חשבונית (Cancel Invoice)"
                      >
                        <Ban className="w-3 h-3" /> ביטול
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center font-body text-muted-foreground py-10">
                  {txLoading ? "טוען..." : "אין עסקאות תשלום עדיין."}
                </p>
              )}
            </div>
          </div>

          {/* Search & Refresh */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="סינון לפי שם, נושא, עיר..." className="pr-12" />
            </div>
            <Button variant="outline" onClick={fetchSubmissions} className="gap-1">
              <RefreshCw className="w-4 h-4" /> רענון
            </Button>
          </div>

          {/* Submissions list */}
          <div className="space-y-3">
            {filtered.map(sub => (
              <div key={sub.id} className="bg-card rounded-2xl border border-border p-5 hover:border-gold/30 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-display font-bold text-card-foreground">{sub.name || "ללא שם"}</h3>
                      <Badge className={`font-body ${
                        sub.status === "new" ? "bg-gradient-gold text-primary-foreground" :
                        sub.status === "published" ? "bg-gradient-teal text-primary-foreground" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {sub.status === "new" ? "✨ חדש" : sub.status === "published" ? "✓ פורסם" : sub.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                      {sub.phone && <span>📞 {sub.phone}</span>}
                      {sub.subject && <span>📖 {sub.subject}</span>}
                      {sub.city && <span>📍 {sub.city}</span>}
                      {sub.submission_type && <span>סוג: {sub.submission_type}</span>}
                    </div>
                    <p className="font-body text-xs text-muted-foreground/60 mt-1">
                      {new Date(sub.created_at).toLocaleString("he-IL")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {sub.status === "new" && (
                      <Button size="sm" onClick={() => publishToLessons(sub)} className="bg-gradient-teal text-primary-foreground font-body font-bold gap-1">
                        <Check className="w-3 h-3" /> העבר לפרסום
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center font-body text-muted-foreground py-16">
                {loading ? "טוען..." : "אין נתונים עדיין. חברו את ה-Webhook לנדרים פלוס כדי להתחיל."}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NedarimManagement;
