import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Pin, Lock, MessageCircle, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// forum_posts: id, title, body, category_id, tenant_id, user_id, is_pinned, is_locked, views, created_at
// forum_comments: id, post_id, body, user_id, created_at
// forum_categories: id, name, description, slug, scope, tenant_id, is_active

type ForumPost = {
  id: string;
  tenant_id: string | null;
  title: string | null;
  body: string | null;
  user_id: string;
  category_id: string;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  views: number | null;
  created_at: string;
};

type ForumComment = {
  id: string;
  post_id: string;
  body: string;
  user_id: string;
  created_at: string;
};

type ForumCategory = {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string | null;
  is_active: boolean;
  scope: string;
  created_at: string;
};

export default function AdminForums() {
  const qc = useQueryClient();
  const [previewPost, setPreviewPost] = useState<ForumPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin-forum-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("id, tenant_id, title, body, user_id, category_id, is_pinned, is_locked, views, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ForumPost[];
    },
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["admin-forum-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_comments")
        .select("id, post_id, body, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ForumComment[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-forum-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, name, description, tenant_id, is_active, scope, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ForumCategory[];
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("פוסט נמחק");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-forum-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("תגובה נמחקה");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-forum-comments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase.from("forum_posts").update({ is_pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("עודכן");
      qc.invalidateQueries({ queryKey: ["admin-forum-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLock = useMutation({
    mutationFn: async ({ id, is_locked }: { id: string; is_locked: boolean }) => {
      const { error } = await supabase.from("forum_posts").update({ is_locked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("עודכן");
      qc.invalidateQueries({ queryKey: ["admin-forum-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Stats per tenant
  const tenantStats = Array.from(
    posts.reduce((acc, p) => {
      const key = p.tenant_id?.slice(0, 8) || "גלובלי";
      const cur = acc.get(key) || { posts: 0 };
      cur.posts++;
      acc.set(key, cur);
      return acc;
    }, new Map<string, { posts: number }>())
  ).map(([name, s]) => ({ name, posts: s.posts }));

  const pinnedCount = posts.filter((p) => p.is_pinned).length;
  const lockedCount = posts.filter((p) => p.is_locked).length;

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "post") deletePost.mutate(deleteTarget.id);
    else deleteComment.mutate(deleteTarget.id);
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">ניהול פורומים</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{posts.length}</div>
                <div className="text-sm text-muted-foreground">פוסטים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{comments.length}</div>
                <div className="text-sm text-muted-foreground">תגובות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Pin className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{pinnedCount}</div>
                <div className="text-sm text-muted-foreground">נעוצים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm text-muted-foreground">קטגוריות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            האם אתה בטוח שברצונך למחוק {deleteTarget?.type === "post" ? "פוסט" : "תגובה"} זו?
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirmDelete}
              disabled={deletePost.isPending || deleteComment.isPending}
            >
              מחק
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post preview */}
      <Dialog open={!!previewPost} onOpenChange={(o) => !o && setPreviewPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewPost?.title || "פוסט"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewPost?.body}</p>
          <div className="text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
            {previewPost?.tenant_id && <span>ארגון: {previewPost.tenant_id.slice(0, 8)}</span>}
            {previewPost?.views != null && <span>צפיות: {previewPost.views}</span>}
            {previewPost && <span>{new Date(previewPost.created_at).toLocaleDateString("he-IL")}</span>}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">פוסטים ({posts.length})</TabsTrigger>
          <TabsTrigger value="comments">תגובות ({comments.length})</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות ({categories.length})</TabsTrigger>
          <TabsTrigger value="stats">סטטיסטיקות</TabsTrigger>
        </TabsList>

        {/* Posts tab */}
        <TabsContent value="posts">
          <Card>
            <CardContent className="p-0">
              {loadingPosts ? (
                <div className="p-8 text-center text-muted-foreground">טוען...</div>
              ) : posts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">אין פוסטים</div>
              ) : (
                <div className="divide-y">
                  <div className="grid grid-cols-[1fr_100px_100px_120px_120px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span>כותרת</span>
                    <span>צפיות</span>
                    <span>סטטוס</span>
                    <span>תאריך</span>
                    <span>פעולות</span>
                  </div>
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="grid grid-cols-[1fr_100px_100px_120px_120px] gap-2 px-4 py-3 items-center hover:bg-muted/30"
                    >
                      <span
                        className="font-medium text-sm cursor-pointer hover:text-primary truncate"
                        onClick={() => setPreviewPost(post)}
                      >
                        {post.title || "(ללא כותרת)"}
                      </span>
                      <span className="text-muted-foreground text-sm">{post.views ?? 0}</span>
                      <div className="flex gap-1 flex-wrap">
                        {post.is_pinned && <Badge className="text-xs bg-yellow-500">נעוץ</Badge>}
                        {post.is_locked && <Badge variant="secondary" className="text-xs">נעול</Badge>}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(post.created_at).toLocaleDateString("he-IL")}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={post.is_pinned ? "הסר עיגון" : "עגן פוסט"}
                          onClick={() => togglePin.mutate({ id: post.id, is_pinned: !post.is_pinned })}
                          disabled={togglePin.isPending}
                        >
                          <Pin className={`h-4 w-4 ${post.is_pinned ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={post.is_locked ? "פתח נעילה" : "נעל פוסט"}
                          onClick={() => toggleLock.mutate({ id: post.id, is_locked: !post.is_locked })}
                          disabled={toggleLock.isPending}
                        >
                          <Lock className={`h-4 w-4 ${post.is_locked ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ type: "post", id: post.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments tab */}
        <TabsContent value="comments">
          <Card>
            <CardContent className="p-0">
              {loadingComments ? (
                <div className="p-8 text-center text-muted-foreground">טוען...</div>
              ) : comments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">אין תגובות</div>
              ) : (
                <div className="divide-y">
                  <div className="grid grid-cols-[1fr_200px_120px_80px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span>תוכן</span>
                    <span>פוסט</span>
                    <span>תאריך</span>
                    <span>פעולות</span>
                  </div>
                  {comments.map((c) => {
                    const parentPost = posts.find((p) => p.id === c.post_id);
                    return (
                      <div key={c.id} className="grid grid-cols-[1fr_200px_120px_80px] gap-2 px-4 py-3 items-center hover:bg-muted/30">
                        <p className="text-sm line-clamp-2">{c.body}</p>
                        <span className="text-muted-foreground text-xs truncate">
                          {parentPost?.title?.slice(0, 30) || c.post_id.slice(0, 8)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(c.created_at).toLocaleDateString("he-IL")}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ type: "comment", id: c.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories">
          <Card>
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">אין קטגוריות</div>
              ) : (
                <div className="divide-y">
                  <div className="grid grid-cols-[1fr_120px_100px_120px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span>שם</span>
                    <span>סקופ</span>
                    <span>סטטוס</span>
                    <span>ארגון</span>
                  </div>
                  {categories.map((cat) => (
                    <div key={cat.id} className="grid grid-cols-[1fr_120px_100px_120px] gap-2 px-4 py-3 items-center hover:bg-muted/30">
                      <span className="font-medium text-sm">{cat.name}</span>
                      <Badge variant="outline" className="text-xs w-fit">{cat.scope}</Badge>
                      <Badge variant={cat.is_active ? "default" : "secondary"} className="text-xs w-fit">
                        {cat.is_active ? "פעיל" : "לא פעיל"}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {cat.tenant_id?.slice(0, 8) || "גלובלי"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-lg">סטטיסטיקות לפי ארגון</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tenantStats.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">אין נתונים</div>
              ) : (
                <div className="divide-y">
                  <div className="grid grid-cols-[1fr_100px] gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span>ארגון</span>
                    <span>פוסטים</span>
                  </div>
                  {tenantStats.sort((a, b) => b.posts - a.posts).map((t) => (
                    <div key={t.name} className="grid grid-cols-[1fr_100px] gap-2 px-4 py-3 items-center hover:bg-muted/30">
                      <span className="font-medium text-sm">{t.name}</span>
                      <span>{t.posts}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
