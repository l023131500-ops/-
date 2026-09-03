import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Pin, Lock, Eye, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// public.forum_categories/forum_posts/forum_comments existed live since
// 20260519000002 (RLS hardened repeatedly through 20260831*), but this page
// only ever rendered the category cards: (a) it filtered categories with
// `.eq("tenant_id", tenant.id)` while every seeded category has tenant_id
// NULL (global scope) -- confirmed live, 8/8 rows null -- so the list showed
// zero forums for every real tenant; (b) even a matching category had no
// thread list, no post view, and no way to create a post or comment. The
// entire feature was invisible end-to-end despite a fully built, RLS-hardened
// backend (forum_posts 0 rows / forum_comments 0 rows live, confirmed).

type ForumCategory = {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  sort_order: number | null;
};

type ForumPost = {
  id: string;
  category_id: string;
  tenant_id: string | null;
  user_id: string;
  title: string | null;
  body: string | null;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  views: number | null;
  created_at: string;
};

type ForumComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type CategoryMaterial = {
  id: string;
  title: string;
  file_url: string;
  category: string | null;
};

const emptyPostForm = { title: "", body: "" };

export default function Forums() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [commentDraft, setCommentDraft] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["forum-cats", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, tenant_id, name, description, sort_order")
        .or(`tenant_id.is.null,tenant_id.eq.${tenant!.id}`)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ForumCategory[];
    },
  });

  const activeCategoryId = selectedCategoryId || categories?.[0]?.id || null;

  const namesFor = async (userIds: string[]) => {
    const nameMap = new Map<string, string>();
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, display_name").in("id", ids);
      (profs || []).forEach((p: any) => nameMap.set(p.id, p.display_name || p.full_name || "משתמש"));
    }
    return nameMap;
  };

  const { data: posts } = useQuery({
    queryKey: ["forum-posts", activeCategoryId],
    enabled: !!activeCategoryId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("category_id", activeCategoryId!)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const nameMap = await namesFor((rows || []).map((r: any) => r.user_id));
      return (rows || []).map((r: any) => ({ ...r, authorLabel: nameMap.get(r.user_id) || "משתמש" })) as (ForumPost & {
        authorLabel: string;
      })[];
    },
  });

  // materials.display_forum_category_id (20260519000002, moderator-only since
  // 20260903020000) is set from admin/Content.tsx's approval screen, but no
  // forum page ever read it -- an approved material could never actually
  // appear here despite the field existing since the original migration.
  const { data: categoryMaterials } = useQuery({
    queryKey: ["forum-category-materials", activeCategoryId],
    enabled: !!activeCategoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, file_url, category")
        .eq("display_forum_category_id", activeCategoryId!)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CategoryMaterial[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["forum-comments", selectedPostId],
    enabled: !!selectedPostId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("forum_comments")
        .select("*")
        .eq("post_id", selectedPostId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const nameMap = await namesFor((rows || []).map((r: any) => r.user_id));
      return (rows || []).map((r: any) => ({ ...r, authorLabel: nameMap.get(r.user_id) || "משתמש" })) as (ForumComment & {
        authorLabel: string;
      })[];
    },
  });

  const selectedPost = useMemo(() => (posts || []).find((p) => p.id === selectedPostId) || null, [posts, selectedPostId]);

  const openPost = (post: ForumPost) => {
    setSelectedPostId(post.id);
    supabase
      .from("forum_posts")
      .update({ views: (post.views || 0) + 1 })
      .eq("id", post.id)
      .then(() => qc.invalidateQueries({ queryKey: ["forum-posts", activeCategoryId] }));
  };

  const createPost = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !user?.id || !activeCategoryId) throw new Error("חסר ארגון או משתמש");
      if (!postForm.title.trim()) throw new Error("יש להזין כותרת");
      const { error } = await supabase.from("forum_posts").insert({
        category_id: activeCategoryId,
        tenant_id: tenant.id,
        user_id: user.id,
        title: postForm.title.trim(),
        body: postForm.body.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הפוסט פורסם");
      setPostDialogOpen(false);
      setPostForm(emptyPostForm);
      qc.invalidateQueries({ queryKey: ["forum-posts", activeCategoryId] });
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedPostId) throw new Error("חסר משתמש");
      const body = commentDraft.trim();
      if (!body) return;
      const { error } = await supabase.from("forum_comments").insert({ post_id: selectedPostId, user_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentDraft("");
      qc.invalidateQueries({ queryKey: ["forum-comments", selectedPostId] });
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  return (
    <div>
      <h1 className="font-heading text-3xl mb-6">פורומים</h1>

      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        {/* Category list */}
        <Card className="h-fit">
          <CardContent className="p-2">
            <div className="space-y-1">
              {(categories || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCategoryId(c.id);
                    setSelectedPostId(null);
                  }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    c.id === activeCategoryId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{c.name}</span>
                </button>
              ))}
              {(categories?.length || 0) === 0 && (
                <div className="text-sm text-muted-foreground p-4 text-center">אין פורומים</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Post list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {(categories || []).find((c) => c.id === activeCategoryId)?.description || ""}
            </p>
            <Button size="sm" onClick={() => { setPostForm(emptyPostForm); setPostDialogOpen(true); }} disabled={!activeCategoryId}>
              <Plus className="ml-2 h-4 w-4" />
              פוסט חדש
            </Button>
          </div>

          {(categoryMaterials || []).length > 0 && (
            <Card className="mb-3">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  חומרי עזר לפורום זה
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex flex-wrap gap-2">
                  {(categoryMaterials || []).map((mat) => (
                    <a
                      key={mat.id}
                      href={mat.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      {mat.title}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {(posts || []).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">אין עדיין פוסטים בפורום זה — היו הראשונים לכתוב!</div>
              ) : (
                <div className="divide-y">
                  {(posts || []).map((post) => (
                    <button
                      key={post.id}
                      onClick={() => openPost(post)}
                      className="w-full text-right px-4 py-3 hover:bg-muted/30 flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {post.is_pinned && <Pin className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                          {post.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <span className="font-medium text-sm truncate">{post.title || "(ללא כותרת)"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {post.authorLabel} · {new Date(post.created_at).toLocaleDateString("he-IL")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Eye className="h-3.5 w-3.5" />
                        {post.views || 0}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New post dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>פוסט חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} />
            </div>
            <div>
              <Label>תוכן</Label>
              <Textarea value={postForm.body} onChange={(e) => setPostForm({ ...postForm, body: e.target.value })} rows={5} />
            </div>
            <Button className="w-full" onClick={() => createPost.mutate()} disabled={createPost.isPending || !postForm.title.trim()}>
              {createPost.isPending ? "מפרסם..." : "פרסום"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post detail + comments */}
      <Dialog open={!!selectedPostId} onOpenChange={(o) => !o && setSelectedPostId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedPost.is_pinned && <Pin className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  {selectedPost.title || "(ללא כותרת)"}
                </DialogTitle>
              </DialogHeader>
              <div className="text-xs text-muted-foreground flex gap-2 items-center">
                <span>{selectedPost.authorLabel}</span>
                <span>· {new Date(selectedPost.created_at).toLocaleDateString("he-IL")}</span>
                {selectedPost.is_locked && <Badge variant="secondary" className="text-xs">נעול</Badge>}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedPost.body}</p>

              <div className="border-t pt-3 mt-2 space-y-3">
                <p className="text-sm font-medium">תגובות ({(comments || []).length})</p>
                {(comments || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">אין עדיין תגובות</p>
                )}
                {(comments || []).map((c) => (
                  <div key={c.id} className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <div className="text-xs font-medium mb-0.5 opacity-70">{c.authorLabel}</div>
                    <div className="whitespace-pre-wrap break-words">{c.body}</div>
                    <div className="text-[10px] mt-1 text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("he-IL")}
                    </div>
                  </div>
                ))}
                {!selectedPost.is_locked && (
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder="כתבו תגובה..."
                      rows={2}
                      className="resize-none"
                    />
                    <Button size="sm" onClick={() => addComment.mutate()} disabled={addComment.isPending || !commentDraft.trim()}>
                      שליחה
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
