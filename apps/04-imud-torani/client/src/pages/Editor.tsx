import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Logo } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Book, BookSettings, ContentBlock } from "@shared/schema";
import type { ProofIssue } from "@shared/proofread";
import { applyFix } from "@shared/proofread";
import { getTemplate } from "@shared/templates";
import { buildFullHtml, mergedSettings, parseContent } from "@/lib/pagedRender";
import { EditDept } from "./departments/EditDept";
import { ProofreadDept } from "./departments/ProofreadDept";
import { DesignDept, CoverDept } from "./departments/DesignDept";
import {
  Save, FileDown, FileType, ChevronLeft,
  PencilLine, ScanSearch, LayoutTemplate, BookMarked,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 9);

type Dept = "edit" | "proof" | "design" | "cover";

const DEPTS: { key: Dept; label: string; icon: any }[] = [
  { key: "edit", label: "מחלקת עריכה", icon: PencilLine },
  { key: "proof", label: "מחלקת הגהה", icon: ScanSearch },
  { key: "design", label: "מחלקת עימוד", icon: LayoutTemplate },
  { key: "cover", label: "כריכה ושערים", icon: BookMarked },
];

export default function Editor() {
  const [, params] = useRoute("/editor/:id");
  const id = Number(params?.id);
  const { toast } = useToast();

  const { data: book, isLoading, isError } = useQuery<Book>({
    queryKey: ["/api/books", id],
    enabled: Number.isFinite(id),
  });

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [settings, setSettings] = useState<BookSettings | null>(null);
  const [fonts, setFonts] = useState<{ key: string; label: string; stack: string }[]>([]);
  const [dept, setDept] = useState<Dept>("edit");
  const [dirty, setDirty] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useQuery({
    queryKey: ["/api/meta"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/meta");
      const j = await r.json();
      setFonts(j.fonts);
      return j;
    },
  });

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author);
      setBlocks(parseContent(book));
      setSettings(mergedSettings(book));
    }
  }, [book?.id]);

  const tpl = book ? getTemplate(book.templateKey) : null;

  const save = useMutation({
    mutationFn: async () =>
      apiRequest("PATCH", `/api/books/${id}`, {
        title, author,
        content: JSON.stringify(blocks),
        settings: JSON.stringify(settings ?? {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setDirty(false);
      toast({ title: "נשמר" });
    },
    onError: () => toast({ title: "שגיאה בשמירה", variant: "destructive" }),
  });

  const previewBook = useMemo<Book | null>(() => {
    if (!book || !settings) return null;
    return { ...book, title, author, content: JSON.stringify(blocks), settings: JSON.stringify(settings) };
  }, [book, title, author, blocks, settings]);

  useEffect(() => {
    if (!previewBook || !iframeRef.current) return;
    const t = setTimeout(() => {
      const html = buildFullHtml(previewBook, false);
      const doc = iframeRef.current!.contentDocument;
      if (doc) { doc.open(); doc.write(html); doc.close(); }
    }, 350);
    return () => clearTimeout(t);
  }, [previewBook]);

  function mutateBlocks(fn: (b: ContentBlock[]) => ContentBlock[]) {
    setBlocks((prev) => fn(prev));
    setDirty(true);
  }

  /* ── מטפלי הגהה (פועלים לפי מזהה בלוק) ── */
  function handleApplyFix(blockId: string, issue: ProofIssue) {
    mutateBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      if (b.meta?.locked) { toast({ title: "בלוק נעול", description: "בטל נעילה לפני תיקון.", variant: "destructive" }); return b; }
      return { ...b, text: applyFix(b.text, issue) };
    }));
  }
  function handleDeleteRange(blockId: string, start: number, end: number) {
    mutateBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      if (b.meta?.locked) { toast({ title: "בלוק נעול", description: "בטל נעילה לפני מחיקה.", variant: "destructive" }); return b; }
      return { ...b, text: b.text.slice(0, start) + b.text.slice(end) };
    }));
  }
  function handleFocusBlock(blockId: string) {
    setDept("edit");
    setFocusBlockId(blockId);
    setTimeout(() => {
      document.getElementById(`edit-block-${blockId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setFocusBlockId(null), 2500);
  }

  async function exportWord() {
    if (exporting) return;
    setExporting(true);
    try {
      try {
        if (dirty) await save.mutateAsync();
      } catch {
        toast({ title: "שגיאה בשמירה לפני הייצוא", variant: "destructive" });
        return;
      }
      toast({ title: "מייצא Word…", description: "ההורדה תתחיל בעוד רגע." });
      // הורדה ניווטית רגילה (a.click) לא נושאת כותרות מותאמות, ולכן החיפוש
      // בשרת היה נופל תמיד ל-"anon" — עם בידוד לפי מבקר זה כבר לא מוצא את
      // הספר. מביאים את הקובץ דרך apiRequest (עם X-Visitor-Id) ומורידים Blob.
      try {
        const res = await apiRequest("GET", `/api/books/${id}/docx`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title || "ספר"}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        toast({ title: "שגיאה בייצוא Word", variant: "destructive" });
      }
    } finally {
      setExporting(false);
    }
  }

  function exportPdf() {
    if (!previewBook) return;
    const html = buildFullHtml(previewBook, true);
    const w = window.open("", "_blank");
    if (w && w.document) { w.document.open(); w.document.write(html); w.document.close(); return; }
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow?.document;
    if (!idoc) { document.body.removeChild(iframe); toast({ title: "ייצוא נכשל", variant: "destructive" }); return; }
    idoc.open(); idoc.write(html); idoc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  }

  if (!Number.isFinite(id) || isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <p>הספר לא נמצא.</p>
        <Link href="/" className="text-primary underline">
          חזרה לרשימת הספרים
        </Link>
      </div>
    );
  }

  if (isLoading || !book || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        טוען את הספר…
      </div>
    );
  }

  const usableLayers = tpl!.layers;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-primary hover-elevate rounded-md p-1" data-testid="link-back">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Logo size={26} />
          <div className="leading-tight">
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              className="w-56 rounded-sm bg-transparent font-serif text-lg font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="input-book-title"
              aria-label="שם הספר"
            />
            <div className="text-[11px] text-muted-foreground">{tpl!.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">שינויים לא נשמרו</span>}
          <Button variant="outline" size="sm" onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save">
            <Save className="ms-1.5 h-4 w-4" />
            {save.isPending ? "שומר…" : "שמור"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportWord} disabled={save.isPending || exporting} data-testid="button-export-word">
            <FileType className="ms-1.5 h-4 w-4" /> {exporting ? "מייצא…" : "ייצא Word"}
          </Button>
          <Button size="sm" onClick={exportPdf} data-testid="button-export">
            <FileDown className="ms-1.5 h-4 w-4" /> ייצא PDF
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel: departments */}
        <aside className="flex w-[440px] shrink-0 flex-col border-l border-border bg-sidebar">
          {/* Department tabs */}
          <div className="grid grid-cols-4 gap-1 p-2">
            {DEPTS.map((d) => {
              const Icon = d.icon;
              const active = dept === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => setDept(d.key)}
                  className={`flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-foreground hover-elevate"}`}
                  data-testid={`dept-${d.key}`}
                >
                  <Icon className="h-4 w-4" />
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
            {dept === "edit" && (
              <EditDept blocks={blocks} layers={usableLayers} onChange={mutateBlocks} uid={uid} focusBlockId={focusBlockId} />
            )}
            {dept === "proof" && (
              <ProofreadDept
                blocks={blocks}
                onApplyFix={handleApplyFix}
                onDeleteRange={handleDeleteRange}
                onFocusBlock={handleFocusBlock}
              />
            )}
            {dept === "design" && (
              <DesignDept
                settings={settings}
                fonts={fonts}
                onChange={(patch) => { setSettings({ ...settings, ...patch }); setDirty(true); }}
              />
            )}
            {dept === "cover" && (
              <CoverDept
                settings={settings}
                author={author}
                onAuthor={(v) => { setAuthor(v); setDirty(true); }}
                onChange={(patch) => { setSettings({ ...settings, ...patch }); setDirty(true); }}
              />
            )}
          </div>
        </aside>

        {/* Preview */}
        <main className="min-w-0 flex-1 overflow-auto bg-[#e8e2d5] p-6">
          <iframe
            ref={iframeRef}
            title="preview"
            className="mx-auto block w-full max-w-3xl rounded-lg border border-[#cbb89e] bg-white shadow-lg"
            style={{ height: "calc(100vh - 8rem)" }}
            data-testid="iframe-preview"
          />
        </main>
      </div>
    </div>
  );
}
