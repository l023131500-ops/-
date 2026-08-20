import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone, Clock, CheckCircle, Circle, Trash2, Mail, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PortalMessagesTabProps {
  portalId: string;
  portalType: "rabbi" | "org" | "shul";
}

type MsgStatus = "new" | "handled" | "not_handled";

const STATUS_CONFIG: Record<MsgStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: "חדש", color: "bg-gold/15 text-gold", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  handled: { label: "טופל", color: "bg-primary/15 text-primary", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  not_handled: { label: "לא טופל", color: "bg-destructive/15 text-destructive", icon: <Circle className="w-3.5 h-3.5" /> },
};

const PortalMessagesTab = ({ portalId, portalType }: PortalMessagesTabProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [portalId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("portal_messages")
      // Messages are addressed to a user now, not to a (portal_type, portal_id)
      // pair — those columns no longer exist, so this returned 400 every time.
      .select("*")
      .eq("to_user_id", portalId)
      .order("created_at", { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  const cycleStatus = async (msg: any) => {
    const order: MsgStatus[] = ["new", "handled", "not_handled"];
    const currentIdx = order.indexOf(msg.status as MsgStatus);
    const newStatus = order[(currentIdx + 1) % order.length];
    const { error } = await supabase.from("portal_messages").update({ status: newStatus }).eq("id", msg.id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: newStatus } : m));
    }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("portal_messages").delete().eq("id", id);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      toast.success("הפניה נמחקה");
    } else toast.error("שגיאה במחיקה");
  };

  const totalCount = messages.length;
  const newCount = messages.filter(m => m.status === "new").length;
  const handledCount = messages.filter(m => m.status === "handled").length;
  const notHandledCount = messages.filter(m => m.status === "not_handled").length;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-card-foreground">סה"כ פניות: {totalCount}</span>
          </div>
          {newCount > 0 && (
            <Badge className="bg-gold/15 text-gold font-body">{newCount} חדשות</Badge>
          )}
          {handledCount > 0 && (
            <Badge className="bg-primary/15 text-primary font-body">{handledCount} טופלו</Badge>
          )}
          {notHandledCount > 0 && (
            <Badge className="bg-destructive/15 text-destructive font-body">{notHandledCount} לא טופלו</Badge>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-display text-xl font-black text-muted-foreground">אין פניות עדיין</p>
          <p className="font-body text-sm text-muted-foreground/60">פניות שיישלחו מדף ההפצה יופיעו כאן</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg, i) => {
            const statusConf = STATUS_CONFIG[(msg.status as MsgStatus) || "new"] || STATUS_CONFIG.new;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-card rounded-2xl border-2 p-5 transition-all ${
                  msg.status === "new" ? "border-gold/30 bg-gold/5" :
                  msg.status === "not_handled" ? "border-destructive/20 bg-destructive/5" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-display font-bold text-card-foreground">{msg.sender_name}</h4>
                      <Badge className={`${statusConf.color} font-body text-xs gap-1`}>
                        {statusConf.icon} {statusConf.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 font-body text-sm text-muted-foreground mb-2 flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /><span dir="ltr">{msg.sender_phone}</span></span>
                      {msg.sender_email && (
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /><span dir="ltr">{msg.sender_email}</span></span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(msg.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {msg.message && (
                      <p className="font-body text-sm text-foreground bg-muted/30 rounded-xl p-3 border border-border/50">{msg.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cycleStatus(msg)}
                      className={msg.status === "handled" ? "text-primary" : msg.status === "not_handled" ? "text-destructive" : "text-gold"}
                      title="שנה סטטוס"
                      aria-label={`סטטוס נוכחי: ${statusConf.label}. לחץ לשינוי סטטוס`}
                    >
                      {msg.status === "handled" ? <CheckCircle className="w-4 h-4" /> : msg.status === "not_handled" ? <Circle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMessage(msg.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="מחק פניה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalMessagesTab;
