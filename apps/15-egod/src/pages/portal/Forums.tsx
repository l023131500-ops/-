import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ChevronLeft, Send, ArrowRight, Pin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import FeatureLocked from "@/components/portal/FeatureLocked";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Forums = () => {
  const { user } = useAuth();
  const { locked, checked } = useFeatureGate("forums_view");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [access, setAccess] = useState<Record<string, { can_view: boolean; can_post: boolean }>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name").eq("user_id", user!.id).single();
    if (data) {
      setProfileId(data.id);
      setProfileName(data.full_name || "");
      const { data: rows } = await supabase.from("teacher_forum_access").select("category_id, can_view, can_post").eq("teacher_id", data.id);
      const amap: Record<string, { can_view: boolean; can_post: boolean }> = {};
      (rows || []).forEach((r: any) => { amap[r.category_id] = { can_view: r.can_view, can_post: r.can_post }; });
      setAccess(amap);
    }
  };

  // Admin-configured per-teacher grants (public.teacher_forum_access, set via TeacherFeaturesDialog);
  // a category with no row is open by default, matching the seed_teacher_defaults() trigger.
  const canView = (catId: string) => access[catId]?.can_view !== false;
  const canPost = (catId: string) => access[catId]?.can_post !== false;
  const visibleCategories = categories.filter((c) => canView(c.id));

  const fetchCategories = async () => {
    const { data } = await supabase.from("forum_categories").select("*").order("sort_order");
    setCategories(data || []);
  };

  const fetchPosts = async (catId: string) => {
    const { data } = await supabase
      .from("forum_posts")
      .select("*, profiles:author_id(full_name, avatar_url)")
      .eq("category_id", catId)
      .eq("is_blocked", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: true });
    setPosts(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const openCategory = (cat: any) => {
    setSelectedCat(cat);
    fetchPosts(cat.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !profileId || !selectedCat || !canPost(selectedCat.id)) return;
    setSending(true);
    const { error } = await supabase.from("forum_posts").insert({
      category_id: selectedCat.id,
      author_id: profileId,
      content: newMessage.trim(),
    });
    setSending(false);
    if (error) { toast.error("שגיאה בשליחה"); return; }
    setNewMessage("");
    fetchPosts(selectedCat.id);
  };

  // Chat view
  if (selectedCat) {
    return (
      <PortalLayout>
        <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCat(null)}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-foreground">{selectedCat.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedCat.description}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {posts.map(post => {
              const isMe = post.author_id === profileId;
              const authorName = post.profiles?.full_name || "אנונימי";
              return (
                <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-secondary/10 text-foreground" : "bg-card border border-border text-foreground"}`}>
                    {!isMe && <p className="text-xs font-bold text-secondary mb-1">{authorName}</p>}
                    {post.is_pinned && <Pin className="w-3 h-3 text-secondary inline ml-1" />}
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(post.created_at).toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {canPost(selectedCat.id) ? (
            <div className="border-t border-border pt-3 flex gap-2">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="כתוב הודעה..."
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="bg-secondary text-secondary-foreground">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="border-t border-border pt-3 text-center text-xs text-muted-foreground">אין לך הרשאה לפרסם בפורום זה — צפייה בלבד</p>
          )}
        </div>
      </PortalLayout>
    );
  }

  if (checked && locked) {
    return <PortalLayout><FeatureLocked /></PortalLayout>;
  }

  // Category list
  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">פורומים נושאיים</h1>
          <p className="text-muted-foreground">מרחב לשיתוף, שאלות ודיונים בין מגידי השיעורים</p>
        </motion.div>

        <div className="space-y-3">
          {visibleCategories.map((cat) => (
            <motion.div key={cat.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => openCategory(cat)}
              className="bg-card rounded-xl border border-border p-5 flex items-center gap-4 hover:border-secondary/30 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-foreground">{cat.name}</h3>
                {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {cat.is_restricted && <Badge variant="outline" className="text-xs">מוגבל</Badge>}
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
          {visibleCategories.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">אין פורומים</h3>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default Forums;