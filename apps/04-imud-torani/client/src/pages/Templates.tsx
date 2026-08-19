import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { templatesByCategory, DEFAULT_SETTINGS, getTemplate, type TemplateDef } from "@shared/templates";
import { TemplateThumb } from "@/components/TemplateThumb";
import type { Book } from "@shared/schema";

const SAMPLE: Record<string, any[]> = {
  regular: [
    { id: "h1", layer: "heading", text: "שער הביטחון", meta: { level: 1 } },
    { id: "m1", layer: "main", text: "אמר החכם: כל הבוטח בה' חסד יסובבנו. והנה עיקר הביטחון הוא שידע האדם כי הכל בידי שמים, ואין לו לדאוג ליום המחר." },
  ],
  daf: [
    { id: "m1", layer: "main", text: "מאימתי קורין את שמע בערבין. משעה שהכהנים נכנסים לאכול בתרומתן עד סוף האשמורה הראשונה, דברי רבי אליעזר." },
    { id: "r1", layer: "rashi", text: "מאימתי קורין — הכהנים שנטמאו וטבלו, אין נכנסין לאכול בתרומה עד שיעריב שמשן." },
    { id: "t1", layer: "tosafot", text: "מאימתי — פירש רש\"י דקאי אזמן קריאת שמע של ערבית, ותימה דלא תני מקודם קריאת שמע של שחרית." },
  ],
  mikraot: [
    { id: "m1", layer: "main", text: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃" },
    { id: "r1", layer: "rashi", text: "בראשית — אמר רבי יצחק, לא היה צריך להתחיל את התורה אלא מהחודש הזה לכם." },
    { id: "c1", layer: "commentaryA", text: "אבן עזרא: השמים — הם הרקיע ומה שעליו, והארץ כל אשר תחתיו." },
  ],
  parallel: [
    { id: "a1", layer: "commentaryA", text: "נוסח א׳: יהי רצון מלפניך ה' אלוהינו שתרגילנו בתורתך." },
    { id: "b1", layer: "commentaryB", text: "נוסח ב׳: יהי רצון מלפניך ה' אלוהי אבותינו שתרגילנו בתורתך ובמצוותיך." },
  ],
};

function defaultContent(key: string) {
  return JSON.stringify(
    SAMPLE[key] ?? [
      { id: "h1", layer: "heading", text: "כותרת הפרק", meta: { level: 1 } },
      { id: "m1", layer: "main", text: "כאן יבוא הטקסט המרכזי של הספר. ניתן להדביק פסקאות שלמות; ריווח כפול בין שורות יוצר פסקה חדשה." },
    ],
    null,
    0,
  );
}

export default function Templates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selected, setSelected] = useState<TemplateDef | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const tpl = getTemplate(selected!.key);
      const settings = { ...DEFAULT_SETTINGS, ...(tpl.defaults || {}) };
      const res = await apiRequest("POST", "/api/books", {
        title: title.trim() || "ספר חדש",
        author: author.trim(),
        templateKey: selected!.key,
        settings: JSON.stringify(settings),
        content: defaultContent(selected!.key),
      });
      return (await res.json()) as Book;
    },
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      navigate(`/editor/${book.id}`);
    },
    onError: () => toast({ title: "שגיאה ביצירת הספר", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="font-serif text-xl font-bold text-foreground">בחר תבנית עימוד</h1>
        <p className="mt-1 text-muted-foreground">
          כל תבנית מגדירה את מבנה העמוד, הגופן והשכבות. ניתן לשנות כל הגדרה בהמשך.
        </p>

        {templatesByCategory().map((group) => (
            <section key={group.category} className="mt-10" data-testid={`section-category-${group.category}`}>
              <h2 className="mb-4 flex items-center gap-3 font-serif text-lg font-bold text-foreground">
                <span className="inline-block h-4 w-1 rounded bg-primary" />
                {group.label}
                <span className="text-xs font-normal text-muted-foreground">({group.items.length})</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSelected(t)}
                    className={`overflow-hidden rounded-xl border bg-card text-right transition hover-elevate ${
                      selected?.key === t.key ? "border-primary ring-2 ring-primary/40" : "border-card-border"
                    }`}
                    data-testid={`card-template-${t.key}`}
                  >
                    <div className="border-b border-border bg-[#f3ede0] p-4">
                      <TemplateThumb kind={t.kind} tkey={t.key} />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif text-lg font-bold text-foreground">{t.name}</h3>
                        <span className="text-[11px] text-muted-foreground">{t.nameEn}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
      </div>

      {/* בחירת שם + יצירה */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="title" className="text-xs">שם הספר</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוגמה: קונטרס הביטחון"
                data-testid="input-title"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="author" className="text-xs">מחבר (רשות)</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="שם המחבר"
                data-testid="input-author"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden text-sm text-muted-foreground sm:block">
                תבנית: <span className="font-semibold text-foreground">{selected.name}</span>
              </div>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                data-testid="button-create-book"
              >
                {create.isPending ? "יוצר..." : "צור והמשך לעריכה"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
