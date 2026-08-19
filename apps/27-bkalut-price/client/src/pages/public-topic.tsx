import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { PublicRightRow } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  FileText as FileTextIcon,
  ImageDown,
  Link as LinkIcon,
  ScrollText,
  Share2,
} from "lucide-react";
import { renderWithLinks } from "@/lib/links";
import { useToast } from "@/hooks/use-toast";
import { downloadTopicPng, downloadTopicLetterhead, buildTopicPublicText } from "@/lib/topic-image";

const CONTACT_PHONE = "02-3131500";
const CONTACT_EMAIL = "l023131500@gmail.com";
const CONTACT_WEBSITE = "bkalut.org.il";

function Section({ title, body, testId }: { title: string; body: string; testId: string }) {
  if (!body || !body.trim()) return null;
  return (
    <section className="space-y-2" data-testid={`section-${testId}`}>
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{title}</h2>
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
        {renderWithLinks(body)}
      </div>
    </section>
  );
}

export default function PublicTopic() {
  const [, params] = useRoute("/p/topic/:id");
  const id = Number(params?.id);
  const { data: row, isLoading } = useQuery<PublicRightRow>({
    queryKey: [`/api/public/rights/${id}`],
    enabled: !!id,
  });
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/#/p/topic/${id}` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      toast({ title: "הקישור הועתק", description: publicUrl });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: "לא הצלחנו להעתיק", description: "נסו שוב או העתיקו ידנית", variant: "destructive" });
    }
  }

  async function copyPublicText() {
    if (!row) return;
    const text = buildTopicPublicText(row, {
      contactPhone: CONTACT_PHONE,
      contactEmail: CONTACT_EMAIL,
      contactWebsite: CONTACT_WEBSITE,
      publicUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      toast({ title: "המידע הציבורי הועתק", description: "ניתן להדביק בוואטסאפ או במייל." });
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast({ title: "לא הצלחנו להעתיק", description: "נסו שוב או העתיקו ידנית", variant: "destructive" });
    }
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        const text = row
          ? buildTopicPublicText(row, {
              contactPhone: CONTACT_PHONE,
              contactEmail: CONTACT_EMAIL,
              contactWebsite: CONTACT_WEBSITE,
              publicUrl,
            }).slice(0, 280)
          : "פרטים ובדיקת זכאות בבקלות";
        await (navigator as any).share({
          title: row?.topic || "נושא בבקלות",
          text,
          url: publicUrl,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copyLink();
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-home-public" className="flex items-center -mr-2 px-2 py-1">
            <Logo size={28} showWordmark={false} />
            <span className="font-bold text-base mr-2">בקלות</span>
          </Link>
          <Link
            href="/eligibility"
            data-testid="link-back-to-catalog"
            className="inline-flex items-center gap-1 text-[13px] hover-elevate rounded-md px-2 py-1"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לקטלוג
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : !row ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">הנושא לא נמצא.</p>
              <Link href="/eligibility" className="text-primary underline mt-3 inline-block">
                חזרה לקטלוג הציבורי
              </Link>
            </Card>
          ) : (
            <>
              {/* Image-poster basics — title + categories + concise audience + 1-line benefit teaser. */}
              <div className="space-y-3 text-center md:text-right">
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground justify-center md:justify-start">
                  {row.category && <span className="rounded-full bg-muted px-2 py-0.5">{row.category}</span>}
                  {row.subCategory && <span className="rounded-full bg-muted px-2 py-0.5">{row.subCategory}</span>}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">{row.topic}</h1>
                {row.audience && row.audience.trim() && (
                  <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
                    <span className="font-semibold">למי זה מיועד: </span>
                    <span>{row.audience.slice(0, 140)}</span>
                  </p>
                )}
                {(() => {
                  const teaser = (row.publicSiteText || row.whatReceived || "").trim();
                  if (!teaser) return null;
                  const SHORT = 120;
                  const short = teaser.length > SHORT ? teaser.slice(0, SHORT).trimEnd() + "…" : teaser;
                  return (
                    <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
                      {short}
                    </p>
                  );
                })()}
                <p className="text-xs md:text-sm text-primary font-medium">
                  ניתן לקבל מידע ותזכורות ללא עלות.
                </p>
              </div>

              <Card className="p-5 bg-primary/5 border border-primary/30 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base">בדיקת זכאות בקליק</h3>
                  <p className="text-sm text-muted-foreground">
                    שאלון קצר, אישי, ובסיומו מקבלים תשובה ברורה ומה לעשות הלאה.
                  </p>
                </div>
                <Link href={`/service/${row.id}`} data-testid="cta-eligibility-check">
                  <Button size="lg" className="w-full md:w-auto">
                    <ClipboardCheck className="w-4 h-4 ml-2" />
                    בדיקת זכאות בקליק
                  </Button>
                </Link>
              </Card>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant={showMore ? "outline" : "default"}
                  size="lg"
                  onClick={() => setShowMore((v) => !v)}
                  data-testid="button-toggle-more"
                  className="gap-2"
                >
                  {showMore ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      הצג פחות
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      מעוניינים במידע מקיף על הנושא? קרא עוד
                    </>
                  )}
                </Button>
              </div>

              {showMore && (
                <div className="space-y-6" data-testid="section-show-more">
                  <Section title="מה ניתן לקבל" body={row.whatReceived} testId="what-received" />
                  <Card className="p-4 border border-dashed border-primary/30 bg-primary/5 text-sm">
                    <p className="text-foreground/80 leading-relaxed">
                      כל המידע המפורט — תנאי זכאות מלאים, מסמכים נדרשים, אופן ההגשה וקישורים רשמיים — נשלח אליכם אישית בסיום
                      <span className="font-semibold"> בדיקת זכאות בקליק</span>. כך מקבלים תשובה מותאמת ולא רק מידע כללי.
                    </p>
                  </Card>
                  <div className="flex justify-center">
                    <Link href={`/service/${row.id}`}>
                      <Button size="lg" className="gap-2">
                        <ClipboardCheck className="w-4 h-4" />
                        בדיקת זכאות בקליק
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <Card className="p-4 border border-card-border">
                <h3 className="font-semibold text-sm mb-2 inline-flex items-center gap-1">
                  <Share2 className="w-4 h-4" />
                  שיתוף הנושא
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      try {
                        downloadTopicPng(row, {
                          contactPhone: CONTACT_PHONE,
                          contactEmail: CONTACT_EMAIL,
                          contactWebsite: CONTACT_WEBSITE,
                        });
                      } catch (e) {
                        toast({
                          title: "לא הצלחנו לייצר את התמונה",
                          description: "נסו דפדפן עדכני יותר או הורידו כמסמך Word.",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid="button-download-image"
                  >
                    <ImageDown className="w-4 h-4 ml-1" />
                    הורדת מידע כתמונה (PNG)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadTopicLetterhead(row, {
                        contactPhone: CONTACT_PHONE,
                        contactEmail: CONTACT_EMAIL,
                        contactWebsite: CONTACT_WEBSITE,
                      })
                    }
                    data-testid="button-download-doc"
                  >
                    <FileTextIcon className="w-4 h-4 ml-1" />
                    הורדה כמסמך Word
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    data-testid="button-copy-link"
                  >
                    {copiedLink ? <ClipboardCheck className="w-4 h-4 ml-1" /> : <Copy className="w-4 h-4 ml-1" />}
                    {copiedLink ? "הועתק" : "העתקת קישור"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyPublicText}
                    data-testid="button-copy-text"
                  >
                    {copiedText ? <ClipboardCheck className="w-4 h-4 ml-1" /> : <Copy className="w-4 h-4 ml-1" />}
                    {copiedText ? "הועתק" : "העתקת המידע הציבורי"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={shareLink}
                    data-testid="button-share"
                  >
                    <Share2 className="w-4 h-4 ml-1" />
                    שיתוף
                  </Button>
                  <a
                    href={publicUrl}
                    className="text-xs text-muted-foreground inline-flex items-center gap-1 self-center"
                    data-testid="text-public-url"
                    dir="ltr"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {publicUrl}
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  התמונה מורדת כקובץ PNG מותג, מתאים לשיתוף בוואטסאפ, מייל ורשתות חברתיות. מסמך Word מתאים להדפסה ושמירה.
                </p>
              </Card>

              <div className="text-center">
                <Link href="/eligibility" data-testid="link-back-to-catalog-bottom">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4 ml-1" />
                    חזרה לקטלוג הציבורי
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="text-center md:text-right">
            מאגר בקלות · {CONTACT_PHONE} · {CONTACT_EMAIL}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/terms"
              className="px-2 py-1 rounded-md hover-elevate inline-flex items-center gap-1"
              data-testid="footer-terms"
            >
              <ScrollText className="w-3.5 h-3.5" />
              תנאים
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
