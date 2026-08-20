import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BookSettings } from "@shared/schema";
import CoverEditor from "@/components/CoverEditor";

/**
 * מחלקת עימוד — כל הגדרות הטיפוגרפיה, הפריסה, המספור, המעברים והמיקרו-טיפוגרפיה.
 * מחולק לקבוצות מתקפלות ברורות.
 */
export function DesignDept({
  settings, fonts, onChange,
}: {
  settings: BookSettings;
  fonts: { key: string; label: string; stack: string }[];
  onChange: (patch: Partial<BookSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* ── פריסת עמוד ── */}
      <Group title="פריסת עמוד">
        <Field label="גודל עמוד" id="dd-pagesize">
          <Select value={settings.pageSize} onValueChange={(v) => onChange({ pageSize: v as any })}>
            <SelectTrigger id="dd-pagesize" data-testid="select-pagesize"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a5">A5 (14.8×21 ס״מ)</SelectItem>
              <SelectItem value="a4">A4 (21×29.7 ס״מ)</SelectItem>
              <SelectItem value="b5">B5 (17.6×25 ס״מ)</SelectItem>
              <SelectItem value="letter">Letter</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="מספר טורים" id="dd-columns">
          <Select value={String(settings.columns)} onValueChange={(v) => onChange({ columns: Number(v) as 1 | 2 })}>
            <SelectTrigger id="dd-columns" data-testid="select-columns"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">טור אחד</SelectItem>
              <SelectItem value="2">שני טורים</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {settings.columns === 2 && (
          <SliderField label="מרווח בין טורים" value={settings.columnGap} min={4} max={24} step={1} suffix="מ״מ"
            onChange={(v: number) => onChange({ columnGap: v })} testid="slider-colgap" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="שוליים פנימיים" value={settings.marginInner} min={8} max={45} step={1} suffix="מ״מ"
            onChange={(v: number) => onChange({ marginInner: v })} testid="slider-inner" />
          <SliderField label="שוליים חיצוניים" value={settings.marginOuter} min={8} max={45} step={1} suffix="מ״מ"
            onChange={(v: number) => onChange({ marginOuter: v })} testid="slider-outer" />
          <SliderField label="שוליים עליונים" value={settings.marginTop} min={8} max={40} step={1} suffix="מ״מ"
            onChange={(v: number) => onChange({ marginTop: v })} testid="slider-top" />
          <SliderField label="שוליים תחתונים" value={settings.marginBottom} min={8} max={40} step={1} suffix="מ״מ"
            onChange={(v: number) => onChange({ marginBottom: v })} testid="slider-bottom" />
        </div>
      </Group>

      {/* ── טיפוגרפיה ── */}
      <Group title="טיפוגרפיה">
        <Field label="גופן הטקסט" id="dd-font">
          <Select value={settings.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
            <SelectTrigger id="dd-font" data-testid="select-font"><SelectValue /></SelectTrigger>
            <SelectContent>
              {fonts.map((f) => (
                <SelectItem key={f.key} value={f.stack} style={{ fontFamily: f.stack }}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <SliderField label="גודל גופן" value={settings.fontSize} min={11} max={28} step={1} suffix="px"
          onChange={(v: number) => onChange({ fontSize: v })} testid="slider-fontsize" />
        <SliderField label="גובה שורה" value={settings.lineHeight} min={1.2} max={2.4} step={0.05}
          onChange={(v: number) => onChange({ lineHeight: v })} testid="slider-lineheight" />
        <SliderField label="כניסת פסקה" value={settings.paragraphIndent} min={0} max={3} step={0.1} suffix="em"
          onChange={(v: number) => onChange({ paragraphIndent: v })} testid="slider-indent" />
        <ToggleField label="תוכן מנוקד" checked={settings.nikud}
          onChange={(v: boolean) => onChange({ nikud: v })} testid="switch-nikud" />
      </Group>

      {/* ── מיקרו-טיפוגרפיה ── */}
      <Group title="מיקרו-טיפוגרפיה">
        <Field label="מילת פתיחה (אות/מילה ראשונה בולטת)" id="dd-openingword">
          <Select value={settings.openingWord} onValueChange={(v) => onChange({ openingWord: v as any })}>
            <SelectTrigger id="dd-openingword" data-testid="select-openingword"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">ללא</SelectItem>
              <SelectItem value="bold-word">מילה ראשונה מודגשת</SelectItem>
              <SelectItem value="dropcap">אות ראשונה מעוטרת (Drop-cap)</SelectItem>
              <SelectItem value="small-caps">אותיות רבתי</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="יישור שורה אחרונה בכל מקטע" id="dd-lastline">
          <Select value={settings.lastLineAlign} onValueChange={(v) => onChange({ lastLineAlign: v as any })}>
            <SelectTrigger id="dd-lastline" data-testid="select-lastline"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="justify">מיושר לשני הצדדים</SelectItem>
              <SelectItem value="center">ממורכזת</SelectItem>
              <SelectItem value="right">לימין</SelectItem>
              <SelectItem value="start">לתחילת השורה</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ToggleField label="סוגריים קטנות מהטקסט" checked={settings.smallParens}
          onChange={(v: boolean) => onChange({ smallParens: v })} testid="switch-smallparens" />
        <ToggleField label='מנע "חלון" (יתומים/אלמנות — שורה בודדת)' checked={settings.preventWidows}
          onChange={(v: boolean) => onChange({ preventWidows: v })} testid="switch-widows" />
      </Group>

      {/* ── כותרות ── */}
      <Group title="כותרות">
        <Field label="גופן כותרות" id="dd-headingfont">
          <Select value={settings.headingFont} onValueChange={(v) => onChange({ headingFont: v })}>
            <SelectTrigger id="dd-headingfont" data-testid="select-headingfont"><SelectValue /></SelectTrigger>
            <SelectContent>
              {fonts.map((f) => (
                <SelectItem key={f.key} value={f.stack} style={{ fontFamily: f.stack }}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <SliderField label="גודל כותרת ראשית" value={settings.headingSizeH1} min={1.1} max={2.6} step={0.05} suffix="em"
            onChange={(v: number) => onChange({ headingSizeH1: v })} testid="slider-h1" />
          <SliderField label="גודל כותרת משנה" value={settings.headingSizeH2} min={1} max={2} step={0.05} suffix="em"
            onChange={(v: number) => onChange({ headingSizeH2: v })} testid="slider-h2" />
        </div>
        <Field label="יישור כותרות" id="dd-headingalign">
          <Select value={settings.headingAlign} onValueChange={(v) => onChange({ headingAlign: v as any })}>
            <SelectTrigger id="dd-headingalign" data-testid="select-headingalign"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="center">ממורכז</SelectItem>
              <SelectItem value="right">לימין</SelectItem>
              <SelectItem value="left">לשמאל</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Group>

      {/* ── מספור וכותרות רצות ── */}
      <Group title="מספור וכותרות רצות">
        <Field label="סגנון מספור עמודים" id="dd-numbering">
          <Select value={settings.pageNumbering} onValueChange={(v) => onChange({ pageNumbering: v as any })}>
            <SelectTrigger id="dd-numbering" data-testid="select-numbering"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gematria">גימטריה (א׳, ב׳, י״ד…)</SelectItem>
              <SelectItem value="letters">אותיות עבריות</SelectItem>
              <SelectItem value="decimal">ספרות (1, 2, 3…)</SelectItem>
              <SelectItem value="none">ללא מספור</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {settings.pageNumbering !== "none" && (
          <Field label="מיקום מספר העמוד" id="dd-numside">
            <Select value={settings.pageNumberSide} onValueChange={(v) => onChange({ pageNumberSide: v as any })}>
              <SelectTrigger id="dd-numside" data-testid="select-numside"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outer">חיצוני</SelectItem>
                <SelectItem value="inner">פנימי</SelectItem>
                <SelectItem value="right">ימין</SelectItem>
                <SelectItem value="left">שמאל</SelectItem>
                <SelectItem value="center">מרכז</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <ToggleField label="כותרת רצה עליונה" checked={settings.runningHead}
          onChange={(v: boolean) => onChange({ runningHead: v })} testid="switch-runninghead" />
        {settings.runningHead && (
          <>
            <Field label="טקסט כותרת רצה (ריק = שם הספר)" id="dd-runninghead-text">
              <Input id="dd-runninghead-text" value={settings.runningHeadText} onChange={(e) => onChange({ runningHeadText: e.target.value })}
                placeholder="שם הספר" data-testid="input-runninghead" />
            </Field>
            <ToggleField label="הצג שם פרק נוכחי בכותרת" checked={settings.runningHeadShowChapter}
              onChange={(v: boolean) => onChange({ runningHeadShowChapter: v })} testid="switch-runchapter" />
          </>
        )}
        <ToggleField label="תוכן עניינים אוטומטי" checked={settings.tableOfContents}
          onChange={(v: boolean) => onChange({ tableOfContents: v })} testid="switch-toc" />
        <Field label="הערות שוליים — טורים" id="dd-fncols">
          <Select value={String(settings.footnoteColumns)} onValueChange={(v) => onChange({ footnoteColumns: Number(v) as 1 | 2 })}>
            <SelectTrigger id="dd-fncols" data-testid="select-fncols"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">טור אחד</SelectItem>
              <SelectItem value="2">שני טורים</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Group>
    </div>
  );
}

/**
 * מחלקת כריכה ושערים — עמוד שער, כותרת משנה בשער, צבע כריכה.
 */
export function CoverDept({
  settings, author, onAuthor, onChange,
}: {
  settings: BookSettings;
  author: string;
  onAuthor: (v: string) => void;
  onChange: (patch: Partial<BookSettings>) => void;
}) {
  return (
    <div className="space-y-6">
      <Group title="עמוד השער">
        <ToggleField label="הפק עמוד שער" checked={settings.titlePage}
          onChange={(v: boolean) => onChange({ titlePage: v })} testid="switch-titlepage" />
        <Field label="מחבר" id="cd-author">
          <Input id="cd-author" value={author} onChange={(e) => onAuthor(e.target.value)} placeholder="שם המחבר" data-testid="input-author" />
        </Field>
        <Field label="תת-כותרת בשער" id="cd-subtitle">
          <Input id="cd-subtitle" value={settings.titlePageSubtitle} onChange={(e) => onChange({ titlePageSubtitle: e.target.value })}
            placeholder="למשל: חידושים וביאורים על…" data-testid="input-subtitle" />
        </Field>
      </Group>

      <Group title="כריכה">
        <Field label="צבע כריכה" id="cd-covercolor">
          <div className="flex items-center gap-2">
            <input
              id="cd-covercolor"
              type="color"
              value={settings.coverColor}
              onChange={(e) => onChange({ coverColor: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded border border-border"
              data-testid="input-covercolor"
            />
            <Input value={settings.coverColor} onChange={(e) => onChange({ coverColor: e.target.value })}
              dir="ltr" className="font-mono text-sm" aria-label="צבע כריכה (קוד הקסדצימלי)" data-testid="input-covercolor-hex" />
          </div>
        </Field>
        {/* תצוגת כריכה מוקטנת */}
        <div
          className="mx-auto mt-2 flex aspect-[3/4] w-40 flex-col items-center justify-center rounded-md border shadow-md"
          style={{ background: settings.coverColor }}
          data-testid="cover-preview"
        >
          <div className="px-3 text-center font-serif text-lg font-bold text-white/95">{settings.titlePageSubtitle || "כותרת הספר"}</div>
          {author && <div className="mt-3 font-serif text-sm text-white/85">{author}</div>}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">תצוגה מקדימה של הכריכה</p>
      </Group>

      <Group title="עורך שער גרפי (גרפו-לייק) — ניסיוני">
        <p className="text-xs text-muted-foreground">
          עורך שכבות: הוסיפו שכבות טקסט מעל השער, גררו, ערכו ומחקו — וייצאו ל-PDF.
        </p>
        <CoverEditor
          title={settings.titlePageSubtitle || "כותרת הספר"}
          author={author}
          coverColor={settings.coverColor || "#1a2744"}
        />
      </Group>
    </div>
  );
}

/* ── עזרי UI ── */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-1.5 text-sm font-bold text-primary">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
function SliderField({ label, value, min, max, step, suffix, onChange, testid }: any) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground">{value}{suffix ? ` ${suffix}` : ""}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} data-testid={testid} />
    </div>
  );
}
function ToggleField({ label, checked, onChange, testid }: any) {
  const id = `dd-toggle-${testid}`;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
      <Label htmlFor={id} className="text-sm text-foreground">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} data-testid={testid} />
    </div>
  );
}
