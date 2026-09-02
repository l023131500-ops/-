import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Trash2, Check, X, Inbox } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import FeatureLocked from "@/components/portal/FeatureLocked";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  new: { label: "חדש", variant: "destructive" },
  handled: { label: "טופל", variant: "default" },
  not_handled: { label: "לא טופל", variant: "secondary" },
};

const Messages = () => {
  const { user } = useAuth();
  const { locked, checked } = useFeatureGate("messages_inbox");
  const [messages, setMessages] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
    if (!profile) return;
    setProfileId(profile.id);
    const { data } = await supabase.from("portal_messages").select("*").eq("teacher_id", profile.id).order("created_at", { ascending: false });
    setMessages(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("portal_messages").update({ status }).eq("id", id);
    toast.success("סטטוס עודכן");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("portal_messages").delete().eq("id", id);
    toast.success("הפנייה נמחקה");
    fetchData();
  };

  const newCount = messages.filter(m => m.status === "new").length;
  const handledCount = messages.filter(m => m.status === "handled").length;

  if (checked && locked) {
    return <PortalLayout><FeatureLocked /></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-secondary" />פניות
          </h1>
          <p className="text-muted-foreground text-sm mt-1">פניות שהתקבלו מהדף הציבורי שלך</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-card rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{messages.length}</p>
            <p className="text-xs text-muted-foreground">סה״כ</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-2xl font-bold text-destructive">{newCount}</p>
            <p className="text-xs text-muted-foreground">חדשות</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-500">{handledCount}</p>
            <p className="text-xs text-muted-foreground">טופלו</p>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">אין פניות</h3>
            <p className="text-muted-foreground">פניות חדשות יופיעו כאן כשמישהו ישלח דרך הדף הציבורי שלך</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const st = statusLabels[msg.status] || statusLabels.new;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-foreground">{msg.sender_name}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">📞 {msg.sender_phone} {msg.sender_email && `| ✉️ ${msg.sender_email}`}</p>
                      {msg.message && <p className="text-sm text-foreground mt-2 bg-muted/50 rounded-lg p-3">{msg.message}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(msg.created_at).toLocaleString("he-IL")}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mr-3">
                      {msg.status !== "handled" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(msg.id, "handled")} title="סמן כטופל">
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {msg.status !== "not_handled" && msg.status !== "new" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(msg.id, "not_handled")} title="סמן כלא טופל">
                          <X className="w-4 h-4 text-orange-500" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(msg.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default Messages;