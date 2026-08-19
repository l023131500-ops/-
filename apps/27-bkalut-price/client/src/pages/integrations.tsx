import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OrgRow, RightRow } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/copy-button";
import {
  Bot,
  Cable,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileJson,
  Mail,
  Mic,
  PlaySquare,
  Send,
  ShieldCheck,
  Smartphone,
  Video,
} from "lucide-react";

interface AutomationSchema {
  automationVersion: string;
  description: string;
  channels: Array<{
    key: string;
    label: string;
    target: string;
    primaryField: string;
    description: string;
  }>;
  itemTypes: Array<{
    key: string;
    label: string;
    endpoint: string;
  }>;
  rightFields: Array<{
    key: string;
    hebrew: string;
    usage: string;
  }>;
}

type ItemType = "rights" | "orgs";

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  client_email: Mail,
  voice_message: Mic,
  yemot_podcast: Smartphone,
  video_generator: Video,
  eligibility_bot: Bot,
  intake_form: ClipboardList,
  documents_checklist: FileJson,
  public_site: PlaySquare,
  ai_agent: Cable,
};

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function truncate(text: string, max = 90) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const YEMOT_EXTENSION_BLOCKS = [
  {
    title: "שלוחה 7 - שער בקלות",
    path: "/7/ext.ini",
    code: `type=menu
digits=1
timeout=3
attempts=2
M1001_say=yes
say_menu_voice=yes
menu_voice=ברוכים הבאים למערכת בקלות. למאגר פודקאסטים והסברים לפי נושאים הקישו 1. לחיפוש זכות לפי מצב אישי הקישו 2. לבדיקת התאמה ראשונית הקישו 3. להשארת פנייה לצוות בקלות הקישו 4. לקבלת הודעה מסודרת על נושא מסוים הקישו 5.
hash_extension=yes
star_extension=yes`,
  },
  {
    title: "שלוחה 7/1 - תפריט פודקאסטים לפי קטגוריות",
    path: "/7/1/ext.ini",
    code: `type=menu
digits=1
timeout=3
attempts=2
M1001_say=yes
say_menu_voice=yes
menu_voice=בחרו נושא לשמיעת הסברים. לביטוח לאומי וקצבאות הקישו 1. לדיור שכירות ומשכנתאות הקישו 2. לילדים חינוך ומעונות הקישו 3. לבריאות וקופות חולים הקישו 4. למס הכנסה והחזרים הקישו 5. לעבודה פנסיה ופיצויים הקישו 6. להנחות בתשלומים הקישו 7. לחובות והוצאה לפועל הקישו 8. לנושאים נוספים הקישו 9.
up=*
root=8`,
  },
  {
    title: "שלוחות 7/1/1 עד 7/1/9 - השמעת קבצי פודקאסט",
    path: "/7/1/1/ext.ini ... /7/1/9/ext.ini",
    code: `type=playfile
start=select
say_files_amount=yes
play_beep=no
playfile_end_goto=/7/1

; להעתיק את אותו קוד לכל אחת מהשלוחות:
; /7/1/1 ביטוח לאומי וקצבאות
; /7/1/2 דיור, שכירות ומשכנתאות
; /7/1/3 ילדים, חינוך ומעונות
; /7/1/4 בריאות וקופות חולים
; /7/1/5 מס הכנסה והחזרים
; /7/1/6 עבודה, פנסיה ופיצויים
; /7/1/7 הנחות בתשלומים
; /7/1/8 חובות והוצאה לפועל
; /7/1/9 נושאים נוספים`,
  },
  {
    title: "שלוחה 7/2 - חיפוש זכות לפי דיבור או הקלדה",
    path: "/7/2/ext.ini",
    code: `type=api
api_link=https://YOUR-DOMAIN.co.il/yemot/bkalut-search
api_url_post=yes
api_dir=/7/2`,
  },
  {
    title: "שלוחה 7/3 - בדיקת התאמה ראשונית",
    path: "/7/3/ext.ini",
    code: `type=api
api_link=https://YOUR-DOMAIN.co.il/yemot/bkalut-eligibility
api_url_post=yes
api_dir=/7/3`,
  },
  {
    title: "שלוחה 7/4 - השארת פנייה לצוות",
    path: "/7/4/ext.ini",
    code: `type=record
say_record_number=no
say_record_menu=no
folder_move=/7/4/1
record_end_goto=/7
record_cancel_goto=/7`,
  },
  {
    title: "שלוחה 7/4/1 - שמירת הקלטות הפניות",
    path: "/7/4/1/ext.ini",
    code: `type=playfile
start=max
play_beep=no`,
  },
  {
    title: "שלוחה 7/5 - שליחת הודעה מסודרת ללקוח לפי נושא",
    path: "/7/5/ext.ini",
    code: `type=api
api_link=https://YOUR-DOMAIN.co.il/yemot/bkalut-send-client
api_url_post=yes
api_dir=/7/5`,
  },
];

export default function IntegrationsPage() {
  const [itemType, setItemType] = useState<ItemType>("rights");
  const [selectedRightId, setSelectedRightId] = useState("1");
  const [selectedOrgId, setSelectedOrgId] = useState("1");
  const [channel, setChannel] = useState("client_email");
  const [clientName, setClientName] = useState("לקוח לדוגמה");

  const { data: schema, isLoading: schemaLoading } = useQuery<AutomationSchema>({
    queryKey: ["/api/automation/schema"],
  });
  const { data: rights = [], isLoading: rightsLoading } = useQuery<RightRow[]>({
    queryKey: ["/api/rights"],
  });
  const { data: orgs = [], isLoading: orgsLoading } = useQuery<OrgRow[]>({
    queryKey: ["/api/orgs"],
  });

  const selectedId = itemType === "rights" ? selectedRightId : selectedOrgId;
  const previewEndpoint = `/api/automation/${itemType}/${selectedId}?channel=${channel}&clientName=${encodeURIComponent(clientName)}`;
  const { data: preview, isLoading: previewLoading } = useQuery<unknown>({
    queryKey: [previewEndpoint],
    enabled: Boolean(selectedId),
  });

  const selectedChannel = schema?.channels.find((c) => c.key === channel);
  const curlExample = `curl "${previewEndpoint}"`;
  const webhookExample = useMemo(
    () =>
      prettyJson({
        event: "bkalut.item_requested",
        source: "bkalut_internal_site",
        itemType,
        itemId: Number(selectedId),
        channel,
        client: {
          name: clientName,
          phone: "{{client_phone}}",
          email: "{{client_email}}",
        },
        callbackUrl: "{{your_automation_webhook_url}}",
      }),
    [channel, clientName, itemType, selectedId],
  );

  return (
    <div className="space-y-6" data-testid="page-integrations">
      <header className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 items-stretch">
        <Card className="p-6 border border-primary/20 bg-primary/5 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-full bg-primary text-primary-foreground p-2">
              <Code2 className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">מרכז API ואוטומציות</p>
              <h1 className="text-xl font-bold" data-testid="text-integrations-title">
                שליחת נתוני המאגר למייל, הודעה קולית, מערכת קולית, סרטון וסוכן AI
              </h1>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80 max-w-4xl">
            הדף הזה מגדיר איך כל נתון במאגר יוצא החוצה בצורה אוטומטית: לפי בקשת לקוח, לפי בחירת נושא, או בלחיצה מתוך המשרד.
            בשלב הזה האתר מייצר payload מדויק ומוכן ל־API. חיבור של שליחה בפועל למייל, מערכת קולית, מחולל וידאו או ספק הודעות יבוצע דרך webhook או דרך שרת שמחובר למפתחות של השירות.
          </p>
        </Card>

        <Card className="p-5 border border-card-border bg-card min-w-0">
          <h2 className="font-semibold text-base mb-3">עקרונות בטיחות לפני שליחה</h2>
          <ul className="space-y-2 text-sm text-foreground/80">
            <li className="flex gap-2">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              כל payload מסומן כמידע להכוונה ולא כהחלטת זכאות סופית.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              פרסום ציבורי חייב לבדוק את שדה “התאמה לפרסום לציבור חרדי”.
            </li>
            <li className="flex gap-2">
              <Send className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              שליחה בפועל ללקוח צריכה לעבור דרך ערוץ מאושר, עם לוג ומעקב משרד.
            </li>
          </ul>
        </Card>
      </header>

      <section className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <Card className="p-5 border border-card-border bg-card space-y-4 min-w-0" data-testid="card-api-builder">
          <div>
            <h2 className="font-semibold text-base">בניית קריאת API לדוגמה</h2>
            <p className="text-xs text-muted-foreground mt-1">
              בחר נושא וערוץ, והמערכת תפיק JSON מוכן לשליחה לאוטומציה.
            </p>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs font-medium text-muted-foreground">סוג נתון</span>
            <select
              className="w-full max-w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
              data-testid="select-api-item-type"
            >
              <option value="rights">זכות / הטבה / חיסכון</option>
              <option value="orgs">עמותה / ארגון סיוע</option>
            </select>
          </label>

          {itemType === "rights" ? (
            <label className="space-y-1 block">
              <span className="text-xs font-medium text-muted-foreground">נושא מהמאגר</span>
              <select
                className="w-full max-w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRightId}
                onChange={(e) => setSelectedRightId(e.target.value)}
                data-testid="select-api-right"
              >
                {rights.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}. {truncate(r.topic, 80)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1 block">
              <span className="text-xs font-medium text-muted-foreground">עמותה / ארגון</span>
              <select
                className="w-full max-w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                data-testid="select-api-org"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id}. {truncate(o.name, 80)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1 block">
            <span className="text-xs font-medium text-muted-foreground">ערוץ שליחה</span>
            <select
              className="w-full max-w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              data-testid="select-api-channel"
            >
              {schema?.channels.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-medium text-muted-foreground">שם לקוח לדוגמה</span>
            <input
              className="w-full max-w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              data-testid="input-api-client-name"
            />
          </label>

          <div className="rounded-md bg-muted/50 border border-border p-3 text-xs break-all overflow-hidden" dir="ltr" data-testid="text-preview-endpoint">
            {previewEndpoint}
          </div>
          <CopyButton text={previewEndpoint} label="העתקת endpoint" testId="button-copy-api-endpoint" />
        </Card>

        <Card className="p-5 border border-card-border bg-card space-y-4 min-w-0" data-testid="card-payload-preview">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base">Payload חי לפי הבחירה</h2>
              <p className="text-xs text-muted-foreground">
                זה המבנה שאפשר לשלוח לאוטומציה חיצונית או להשתמש בו מתוך שרת.
              </p>
            </div>
            <CopyButton text={prettyJson(preview)} label="העתקת JSON" testId="button-copy-payload" />
          </div>
          {previewLoading || rightsLoading || orgsLoading ? (
            <Skeleton className="h-[460px] w-full rounded-md" />
          ) : (
            <pre
              className="text-[12px] leading-relaxed bg-muted/60 rounded-md p-4 overflow-auto max-h-[560px] font-mono border border-border"
              dir="ltr"
              data-testid="json-api-preview"
            >
              {prettyJson(preview)}
            </pre>
          )}
        </Card>
      </section>

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="grid-api-channels">
        {schemaLoading
          ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-lg" />)
          : (schema?.channels ?? []).map((channelItem) => {
          const Icon = channelIcons[channelItem.key] ?? Cable;
          const active = channelItem.key === channel;
          return (
            <button
              key={channelItem.key}
              type="button"
              onClick={() => setChannel(channelItem.key)}
              className={`text-right rounded-lg border p-4 bg-card hover-elevate transition-colors ${
                active ? "border-primary bg-primary/5" : "border-card-border"
              }`}
              data-testid={`button-channel-${channelItem.key}`}
            >
              <div className="flex items-start gap-3">
                <span className="rounded-full p-2 bg-primary/10 text-primary">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{channelItem.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{channelItem.target}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed mt-3 text-foreground/80">{channelItem.description}</p>
              <div className="mt-3 text-[11px] text-muted-foreground">
                שדה מרכזי: <span className="font-mono" dir="ltr">{channelItem.primaryField}</span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 border border-card-border bg-card space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-base">דוגמת קריאה פשוטה</h2>
            <CopyButton text={curlExample} label="העתקת curl" testId="button-copy-curl" />
          </div>
          <pre className="text-[12px] leading-relaxed bg-muted/60 rounded-md p-4 overflow-x-auto max-w-full font-mono border border-border" dir="ltr">
            {curlExample}
          </pre>
          <p className="text-xs text-muted-foreground">
            באוטומציה חיצונית אפשר לקרוא ל־endpoint הזה, לקבל JSON, ולשלוח ממנו את השדה המתאים לשירות המבוקש.
          </p>
        </Card>

        <Card className="p-5 border border-card-border bg-card space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-base">מבנה אירוע לשליחה ל־webhook</h2>
            <CopyButton text={webhookExample} label="העתקת webhook" testId="button-copy-webhook" />
          </div>
          <pre className="text-[12px] leading-relaxed bg-muted/60 rounded-md p-4 overflow-x-auto max-w-full font-mono border border-border" dir="ltr">
            {webhookExample}
          </pre>
        </Card>
      </section>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <Card className="p-5 border border-card-border bg-card min-w-0">
          <h2 className="font-semibold text-base mb-3">זרימת עבודה מומלצת</h2>
          <ol className="space-y-3 text-sm">
            {[
              "לקוח פונה או נבחר נושא מתוך המאגר.",
              "המערכת בוחרת ערוץ שליחה: מייל, הודעה קולית, פודקאסט, סרטון, שאלון או מסמכים.",
              "האתר קורא ל־API ומקבל payload מסודר עם כל השדות הרלוונטיים.",
              "אוטומציה חיצונית שולחת את התוכן לשירות המתאים ושומרת לוג.",
              "לפני טיפול מחייב, עובד במשרד בודק התאמה פרטנית ומסמכים.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 border border-card-border bg-card min-w-0">
          <h2 className="font-semibold text-base mb-3">כללי חיבור לערוצים חיצוניים</h2>
          <div className="space-y-3 text-sm">
            <Rule title="מערכת קולית" text="להשתמש בשדה podcastScript או voiceMessage. אם יש ניקוד במאגר, לא להסיר אותו לפני ההמרה לקול." />
            <Rule title="מחולל סרטון" text="להשתמש ב־videoPrompt יחד עם podcastScript. ההוראות כוללות דמות, לוגו, פתיח, סיום ורקע מתאים לנושא." />
            <Rule title="מייל / הודעה" text="להשתמש בשדה emailMessage. זה הנוסח התכלסי ללקוח, ולא הנוסח הציבורי הארוך." />
            <Rule title="בוט זכאות" text="להשתמש ב־eligibilityQuestions וב־intakeForm. הבוט נותן כיוון בדיקה, לא קביעה סופית." />
            <Rule title="פרסום לציבור" text="להשתמש ב־publicSiteText בלבד, ולבדוק harediPublication לפני חשיפה ציבורית." />
          </div>
        </Card>
      </section>

      <Card className="p-5 border border-card-border bg-card min-w-0" data-testid="card-yemot-extension-7">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">מערכת קולית</p>
            <h2 className="font-semibold text-base">מבנה שלוחה 7 להעתקה למערכת</h2>
            <p className="text-sm text-foreground/75 mt-1">
              כל מערכת בקלות יושבת תחת שלוחה 7: פודקאסטים, חיפוש, בדיקת התאמה, הקלטת פנייה ושליחת הודעה מסודרת ללקוח.
              את YOUR-DOMAIN יש להחליף בדומיין הציבורי של שרת בקלות שמחובר למאגר.
            </p>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {YEMOT_EXTENSION_BLOCKS.map((block) => (
            <div key={block.path} className="rounded-lg border border-border bg-muted/20 p-4 min-w-0" data-testid={`yemot-block-${block.path}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{block.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono" dir="ltr">{block.path}</p>
                </div>
                <CopyButton text={block.code} label="העתק קוד" testId={`copy-yemot-${block.path}`} />
              </div>
              <pre className="text-[12px] leading-relaxed bg-background rounded-md p-3 overflow-auto max-h-64 font-mono border border-border" dir="ltr">
                {block.code}
              </pre>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 border border-card-border bg-card min-w-0" data-testid="card-field-map">
        <h2 className="font-semibold text-base mb-3">מיפוי שדות המאגר לשליחה אוטומטית</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-right py-2 px-2">שדה API</th>
                <th className="text-right py-2 px-2">שם בעברית</th>
                <th className="text-right py-2 px-2">שימוש מדויק באוטומציה</th>
              </tr>
            </thead>
            <tbody>
              {(schema?.rightFields ?? []).map((field) => (
                <tr key={field.key} className="border-b border-border/70">
                  <td className="py-2 px-2 font-mono text-xs" dir="ltr">{field.key}</td>
                  <td className="py-2 px-2 font-medium">{field.hebrew}</td>
                  <td className="py-2 px-2 text-foreground/80">{field.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Rule({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs leading-relaxed text-foreground/75 mt-1">{text}</p>
    </div>
  );
}
