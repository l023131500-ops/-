import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { PublicRightRow } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { ArrowRight, Bell, CalendarDays, CheckCircle2, Clock, HeartHandshake, Search, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Choice = "yes" | "not_yet" | "not_eligible";

interface SubmitArgs {
  choice: Choice;
  contactName?: string;
  contactPhone?: string;
  nextReminderDate?: string;
  wantsService?: boolean;
  note?: string;
}

async function submitReminder(topicId: number, topicTitle: string, args: SubmitArgs) {
  return apiRequest("POST", "/api/public/reminder-response", {
    topicId,
    topicTitle,
    response: args.choice,
    contactName: args.contactName,
    contactPhone: args.contactPhone,
    nextReminderDate: args.nextReminderDate,
    wantsService: args.wantsService,
    note: args.note,
  });
}

/** Simple bottom-up sparkle animation built in pure CSS — no extra deps. */
function StarBurst() {
  return (
    <div className="relative h-44 w-full overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes bkalut-rise {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-180px) scale(1.1); opacity: 0; }
        }
        .bkalut-spark {
          position: absolute;
          bottom: 0;
          font-size: 24px;
          animation: bkalut-rise 2.6s ease-in infinite;
          will-change: transform, opacity;
        }
      `}</style>
      {Array.from({ length: 16 }).map((_, i) => {
        const left = (i * 6.25) + Math.random() * 4;
        const delay = (i % 8) * 0.15;
        const size = 18 + (i % 4) * 6;
        const ch = i % 3 === 0 ? "✨" : i % 3 === 1 ? "⭐" : "💫";
        return (
          <span
            key={i}
            className="bkalut-spark"
            style={{ left: `${left}%`, animationDelay: `${delay}s`, fontSize: `${size}px` }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
}

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PublicReminder() {
  const [, params] = useRoute("/r/:id");
  const id = Number(params?.id);
  const { data: row, isLoading } = useQuery<PublicRightRow>({
    queryKey: [`/api/public/rights/${id}`],
    enabled: !!id,
  });
  const { toast } = useToast();

  const [stage, setStage] = useState<
    | { kind: "choose" }
    | { kind: "yes-confirm" }
    | { kind: "yes-done" }
    | { kind: "not-yet-form" }
    | { kind: "not-yet-done" }
    | { kind: "not-eligible-form" }
    | { kind: "not-eligible-done" }
  >({ kind: "choose" });

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [nextDate, setNextDate] = useState(todayPlusDays(14));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const title = row?.topic ?? "";

  const serviceHref = useMemo(() => (row ? `/service/${row.id}` : "/"), [row]);

  async function send(args: SubmitArgs) {
    if (!row) return;
    setBusy(true);
    try {
      await submitReminder(row.id, row.topic, args);
    } catch (err) {
      toast({
        title: "התשובה לא נשמרה",
        description: err instanceof Error ? err.message : "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
      setBusy(false);
      throw err;
    }
    setBusy(false);
  }

  function pick(choice: Choice) {
    if (choice === "yes") {
      setStage({ kind: "yes-confirm" });
    } else if (choice === "not_yet") {
      setStage({ kind: "not-yet-form" });
    } else {
      setStage({ kind: "not-eligible-form" });
    }
  }

  async function confirmYes() {
    try {
      await send({ choice: "yes", contactName, contactPhone });
      setStage({ kind: "yes-done" });
    } catch {
      /* toast already shown */
    }
  }

  async function confirmNotYet(wantsService: boolean) {
    try {
      await send({
        choice: "not_yet",
        contactName,
        contactPhone,
        nextReminderDate: nextDate,
        wantsService,
        note,
      });
      if (wantsService) {
        // route to service form with known topic id
        window.location.hash = `#${serviceHref}`;
        return;
      }
      setStage({ kind: "not-yet-done" });
    } catch {
      /* toast already shown */
    }
  }

  async function confirmNotEligible() {
    try {
      await send({ choice: "not_eligible", contactName, contactPhone, note });
      setStage({ kind: "not-eligible-done" });
    } catch {
      /* toast already shown */
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-home-reminder" className="flex items-center -mr-2 px-2 py-1">
            <Logo size={28} showWordmark={false} />
            <span className="font-bold text-base mr-2">בקלות</span>
          </Link>
          <Link
            href={`/p/topic/${id}`}
            data-testid="link-back-to-topic"
            className="inline-flex items-center gap-1 text-[13px] hover-elevate rounded-md px-2 py-1"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לנושא
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              תזכורת של בקלות לביצוע פעולות חשובות
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-2/3 mx-auto" />
            ) : !row ? (
              <p className="text-muted-foreground">הנושא לא נמצא.</p>
            ) : (
              <h1 className="text-2xl md:text-3xl font-bold leading-tight" data-testid="text-reminder-topic">
                {title}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              אנחנו מזכירים לך לבצע את הפעולה כדי לא לפספס את הזכות. נשמח שתעדכן/י אותנו מה מצב.
            </p>
          </div>

          {!row ? (
            <Card className="p-8 text-center text-muted-foreground">לא נמצא נושא לתזכורת.</Card>
          ) : stage.kind === "choose" ? (
            <Card className="p-5 space-y-3" data-testid="card-reminder-choose">
              <h2 className="text-base font-semibold">האם ביצעת כבר את הפעולה?</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <Button
                  type="button"
                  size="lg"
                  className="min-h-[5rem] h-auto py-3 px-3 text-sm md:text-base font-bold whitespace-normal text-center leading-snug"
                  onClick={() => pick("yes")}
                  data-testid="button-reminder-yes"
                >
                  <CheckCircle2 className="w-5 h-5 ml-2 shrink-0" />
                  <span className="block">כן</span>
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className="min-h-[5rem] h-auto py-3 px-3 text-sm md:text-base font-bold whitespace-normal text-center leading-snug"
                  onClick={() => pick("not_yet")}
                  data-testid="button-reminder-not-yet"
                >
                  <Clock className="w-5 h-5 ml-2 shrink-0" />
                  <span className="block">עדיין לא — אשמח שתזכירו לי</span>
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="min-h-[5rem] h-auto py-3 px-3 text-sm md:text-base font-bold whitespace-normal text-center leading-snug"
                  onClick={() => pick("not_eligible")}
                  data-testid="button-reminder-not-eligible"
                >
                  <HeartHandshake className="w-5 h-5 ml-2 shrink-0" />
                  <span className="block">כנראה אני לא זכאי</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                המידע נשמר לטובת המעקב של ארגון בקלות בלבד. אם רוצים, אפשר להשאיר שם וטלפון כדי שנוכל לחזור אליך.
              </p>
            </Card>
          ) : stage.kind === "yes-confirm" ? (
            <Card className="p-5 space-y-4" data-testid="card-yes-confirm">
              <h2 className="text-base font-semibold">איזה כיף! נשמח לאשר את הביצוע.</h2>
              <p className="text-sm text-muted-foreground">
                ניתן לרשום שם וטלפון כדי שנעדכן את התיק שלך אצלנו (לא חובה).
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>שם מלא</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-yes-name" />
                </div>
                <div className="space-y-1">
                  <Label>טלפון</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} data-testid="input-yes-phone" />
                </div>
              </div>
              <Button type="button" disabled={busy} onClick={confirmYes} data-testid="button-yes-submit">
                <CheckCircle2 className="w-4 h-4 ml-2" />
                סיים — ביצעתי
              </Button>
            </Card>
          ) : stage.kind === "yes-done" ? (
            <Card className="p-6 text-center space-y-3" data-testid="card-yes-done">
              <h2 className="text-3xl font-extrabold text-primary">כל הכבוד! המשך כך! 🎉</h2>
              <p className="text-sm text-foreground/80">
                שמחנו לעדכן את המעקב. נמשיך להזכיר לך זכויות נוספות שיכולות להתאים.
              </p>
              <StarBurst />
              <div className="flex justify-center gap-2 pt-2">
                <Link href="/">
                  <Button variant="outline">חזרה לקטלוג הציבורי</Button>
                </Link>
                <Link href={`/p/topic/${row.id}`}>
                  <Button variant="ghost">חזרה לדף הנושא</Button>
                </Link>
              </div>
            </Card>
          ) : stage.kind === "not-yet-form" ? (
            <Card className="p-5 space-y-4" data-testid="card-not-yet-form">
              <h2 className="text-base font-semibold">אל תדחו דברים — תעשו את זה עכשיו — אנחנו כאן מחכים לכם.</h2>
              <p className="text-sm text-muted-foreground">
                אפשר לבחור מתי שנזכיר שוב, או לבקש שאנחנו נטפל עבורך בפעולה.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>שם מלא (לא חובה)</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-notyet-name" />
                </div>
                <div className="space-y-1">
                  <Label>טלפון (לא חובה)</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} data-testid="input-notyet-phone" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="inline-flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" /> תאריך לתזכורת הבאה
                  </Label>
                  <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} data-testid="input-notyet-date" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>הערה (לא חובה)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="למשל: חסר לי מסמך, אבדוק בסוף החודש..."
                    data-testid="textarea-notyet-note"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => confirmNotYet(false)}
                  className="whitespace-normal text-center leading-snug h-auto min-h-11 py-2"
                  data-testid="button-notyet-submit"
                >
                  <Clock className="w-4 h-4 ml-2 shrink-0" />
                  <span>שמרו את התזכורת</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => confirmNotYet(true)}
                  className="whitespace-normal text-center leading-snug h-auto min-h-11 py-2"
                  data-testid="button-notyet-service"
                >
                  <Sparkles className="w-4 h-4 ml-2 shrink-0" />
                  <span>אני מפחד לשכוח! אשמח שתבצעו עבורי את הפעולה</span>
                </Button>
              </div>
            </Card>
          ) : stage.kind === "not-yet-done" ? (
            <Card className="p-6 text-center space-y-3" data-testid="card-not-yet-done">
              <h2 className="text-2xl font-bold">תודה! נחזור אליך לקראת התאריך שבחרת.</h2>
              <p className="text-sm text-muted-foreground">
                אל תדחו דברים — תעשו את זה עכשיו — אנחנו כאן מחכים לכם.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Link href="/">
                  <Button variant="outline">חזרה לקטלוג הציבורי</Button>
                </Link>
                <Link href={`/p/topic/${row.id}`}>
                  <Button variant="ghost">חזרה לדף הנושא</Button>
                </Link>
              </div>
            </Card>
          ) : stage.kind === "not-eligible-form" ? (
            <Card className="p-5 space-y-4" data-testid="card-not-eligible-form">
              <h2 className="text-base font-semibold">תודה שעדכנת אותנו.</h2>
              <p className="text-sm text-muted-foreground">
                אם בא לך, ספר לנו למה אתה חושב שלא זכאי — לפעמים זה דווקא כן, ונוכל לעזור לבדוק.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>שם (לא חובה)</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-ne-name" />
                </div>
                <div className="space-y-1">
                  <Label>טלפון (לא חובה)</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} data-testid="input-ne-phone" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>הערה</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} data-testid="textarea-ne-note" />
                </div>
              </div>
              <Button type="button" disabled={busy} onClick={confirmNotEligible} data-testid="button-ne-submit">
                <HeartHandshake className="w-4 h-4 ml-2" />
                שמרו את התשובה
              </Button>
            </Card>
          ) : (
            <Card className="p-6 text-center space-y-4" data-testid="card-not-eligible-done">
              <h2 className="text-2xl font-bold">תודה רבה!</h2>
              <p className="text-base text-foreground/85 leading-relaxed">
                לא נורא, כנראה יש נושאים אחרים שאתה יכול להיות זכאי להם. מעוניין לבדוק?
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
                <Link href="/eligibility" data-testid="link-check-more-eligibility">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto whitespace-normal text-center leading-snug h-auto min-h-12 py-3"
                  >
                    <Search className="w-4 h-4 ml-2 shrink-0" />
                    <span>כן, לבדוק זכאות נוספת</span>
                  </Button>
                </Link>
                <Link href="/eligibility">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    חזרה לקטלוג הציבורי
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 text-xs text-muted-foreground text-center">
          תזכורת של בקלות · בקלות לא תחליף ייעוץ מקצועי פרטני · 02-3131500
        </div>
      </footer>
    </div>
  );
}
