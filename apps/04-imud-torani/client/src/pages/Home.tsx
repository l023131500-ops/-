import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Book } from "@shared/schema";
import { getTemplate } from "@shared/templates";
import { BookOpen, FilePlus2, Layers, MousePointerClick, FileDown, Trash2, Wand2 } from "lucide-react";

const STEPS = [
  { icon: Layers, title: "בחר תבנית", desc: "צורת הדף, מקראות גדולות, הערות שוליים ועוד" },
  { icon: MousePointerClick, title: "הזן תוכן", desc: "הדבק טקסט לשכבות — ללא ידע גרפי" },
  { icon: BookOpen, title: "תצוגה חיה", desc: "רואים את הספר מתעמד בזמן אמת" },
  { icon: FileDown, title: "ייצא PDF", desc: "קובץ מוכן לדפוס עם מספור עברי" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: books, isLoading } = useQuery<Book[]>({ queryKey: ["/api/books"] });

  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/books/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "הספר נמחק" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center">
          <div className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/5 px-4 py-1 text-xs font-semibold text-primary">
            מנוע עימוד לספרי קודש
          </div>
          <h1 className="mx-auto max-w-3xl font-serif text-xl font-black leading-tight text-foreground sm:text-[2.1rem]">
            עימוד תורני מקצועי — בלי גרפיקאי, בלי InDesign
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            בחר תבנית קלאסית, הזן את התוכן שלך בשכבות, וראה את הספר מתעמד לפניך בזמן אמת.
            בסוף — ייצוא PDF מוכן לדפוס עם מספור עברי, כותרות רצות והערות שוליים.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" data-testid="button-start-wizard">
              <Link href="/wizard">
                <Wand2 className="ms-2 h-4 w-4" />
                שאלון חכם — המלצה אוטומטית
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" data-testid="button-start">
              <Link href="/templates">
                <FilePlus2 className="ms-2 h-4 w-4" />
                בחר תבנית ידנית
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-xl border border-card-border bg-card p-5"
              data-testid={`card-step-${i}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="font-serif text-2xl font-bold leading-none text-muted-foreground/25">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* My books */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-foreground">הספרים שלי</h2>
          <Button asChild variant="outline" size="sm" data-testid="button-new-book">
            <Link href="/templates">ספר חדש</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : books && books.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <div
                key={b.id}
                className="group flex flex-col rounded-xl border border-card-border bg-card p-5 hover-elevate"
                data-testid={`card-book-${b.id}`}
              >
                <button
                  className="flex-1 text-right"
                  onClick={() => navigate(`/editor/${b.id}`)}
                  data-testid={`button-open-book-${b.id}`}
                >
                  <div className="mb-2 text-xs font-semibold text-primary">
                    {getTemplate(b.templateKey).name}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-foreground">{b.title}</h3>
                  {b.author && (
                    <p className="mt-1 text-sm text-muted-foreground">{b.author}</p>
                  )}
                </button>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <Button asChild variant="ghost" size="sm" data-testid={`button-edit-${b.id}`}>
                    <Link href={`/editor/${b.id}`}>עריכה</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`למחוק את "${b.title}"?`)) del.mutate(b.id);
                    }}
                    data-testid={`button-delete-${b.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">עדיין אין ספרים. התחל ספר חדש כדי לעמד את הראשון שלך.</p>
            <Button asChild className="mt-4" data-testid="button-empty-new">
              <Link href="/templates">ספר חדש</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
