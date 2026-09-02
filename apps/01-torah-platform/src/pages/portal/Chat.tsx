import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, Plus, Lock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// public.chat_rooms + public.chat_messages (architecture.md §3.2 "chat_rooms +
// chat_messages – צ'אטים פנימיים פר-טננט"): tables+RLS existed live since
// 20260519000002 (tenant_write lets any tenant_admin/moderator/member read+write)
// but zero screen anywhere ever queried them — same UI-wiring gap class as
// Synagogues/CommunityServices/Azkarot/Newsletters/Ads before it.

type ChatRoom = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_private: boolean | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  room_id: string;
  tenant_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

const emptyRoomForm = { name: "", description: "", is_private: false };

export default function Chat() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: rooms } = useQuery({
    queryKey: ["chat-rooms", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ChatRoom[];
    },
  });

  useEffect(() => {
    if (!selectedRoomId && rooms && rooms.length > 0) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  const { data: messages } = useQuery({
    queryKey: ["chat-messages", selectedRoomId],
    enabled: !!selectedRoomId,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", selectedRoomId!)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;

      const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)));
      const nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, display_name").in("id", userIds);
        (profs || []).forEach((p: any) => nameMap.set(p.id, p.display_name || p.full_name || "משתמש"));
      }

      return (rows || []).map((r: any) => ({ ...r, senderLabel: nameMap.get(r.user_id) || "משתמש" })) as (ChatMessage & {
        senderLabel: string;
      })[];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createRoom = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (!roomForm.name.trim()) throw new Error("יש להזין שם לחדר");
      const { data, error } = await supabase
        .from("chat_rooms")
        .insert({
          tenant_id: tenant.id,
          name: roomForm.name.trim(),
          description: roomForm.description || null,
          is_private: roomForm.is_private,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ChatRoom;
    },
    onSuccess: (room) => {
      toast.success("חדר הצ'אט נוצר");
      setRoomDialogOpen(false);
      setRoomForm(emptyRoomForm);
      qc.invalidateQueries({ queryKey: ["chat-rooms", tenant?.id] });
      setSelectedRoomId(room.id);
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !selectedRoomId || !user?.id) throw new Error("חסר חדר או משתמש");
      const body = draft.trim();
      if (!body) return;
      const { error } = await supabase
        .from("chat_messages")
        .insert({ room_id: selectedRoomId, tenant_id: tenant.id, user_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat-messages", selectedRoomId] });
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  const selectedRoom = useMemo(() => (rooms || []).find((r) => r.id === selectedRoomId) || null, [rooms, selectedRoomId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">צ'אט פנימי</h1>
          <p className="text-sm text-muted-foreground mt-1">שיחות פנימיות בין חברי הארגון/בית הכנסת</p>
        </div>
        <Button onClick={() => { setRoomForm(emptyRoomForm); setRoomDialogOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />
          חדר חדש
        </Button>
      </div>

      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>חדר צ'אט חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם החדר *</Label>
              <Input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="לדוגמה: ועד בית הכנסת" />
            </div>
            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Textarea value={roomForm.description} onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <Label>חדר פרטי</Label>
              <Switch checked={roomForm.is_private} onCheckedChange={(v) => setRoomForm({ ...roomForm, is_private: v })} />
            </div>
            <Button className="w-full" onClick={() => createRoom.mutate()} disabled={createRoom.isPending || !roomForm.name.trim()}>
              {createRoom.isPending ? "יוצר..." : "צור חדר"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        {/* Room list */}
        <Card className="h-fit">
          <CardContent className="p-2">
            {(rooms || []).length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center">אין עדיין חדרי צ'אט</div>
            )}
            <div className="space-y-1">
              {(rooms || []).map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    room.id === selectedRoomId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <MessagesSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{room.name}</span>
                  {room.is_private && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="flex flex-col h-[65vh]">
          {selectedRoom ? (
            <>
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedRoom.name}</span>
                  {selectedRoom.is_private && <Badge variant="outline" className="text-xs">פרטי</Badge>}
                </div>
                {selectedRoom.description && <div className="text-xs text-muted-foreground mt-0.5">{selectedRoom.description}</div>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(messages || []).length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">אין עדיין הודעות בחדר זה</div>
                )}
                {(messages || []).map((m) => {
                  const mine = m.user_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {!mine && <div className="text-xs font-medium mb-0.5 opacity-70">{m.senderLabel}</div>}
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                          {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage.mutate();
                    }
                  }}
                  placeholder="כתבו הודעה..."
                  rows={1}
                  className="min-h-[40px] resize-none"
                />
                <Button size="icon" onClick={() => sendMessage.mutate()} disabled={sendMessage.isPending || !draft.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              בחרו חדר או צרו חדר חדש כדי להתחיל
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
