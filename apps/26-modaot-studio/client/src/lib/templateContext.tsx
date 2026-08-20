// קונטקסט משותף להעברת התבנית שנבחרה מ-Home ל-Editor — בלי localStorage (חסום ב-iframe).
import { createContext, useContext, useState, type ReactNode } from "react";
import type { TemplateDoc } from "@shared/layers";
import type { NarrationAlignment } from "@shared/tts-hebrew";

export interface SelectedTemplate {
  doc: TemplateDoc;
  category: string;
  style: string;
  format: string;
  name: string;
  templateId?: number;
  /** מזהה פרויקט שמור שנפתח מ-/projects — קיים ⇒ "שמור" מעדכן אותו ולא יוצר עותק. */
  projectId?: number;
  /** הערות לקוח על הטיוטה הנוכחית (צ'קליסט #14, שלב השמירה) — נשמר בתוך layersJson, לקריאה בלבד עד סבב עתידי שיבנה תיקון אוטומטי לפיו. */
  clientNotes?: string;
  /** קריינות עברית (צ'קליסט #16, שלב 5 — וידאו קידום) — נשמר בתוך layersJson, אותו דפוס כמו clientNotes. */
  narrationScript?: string;
  narrationAudioUrl?: string;
  /** תזמון-תווים אמיתי מ-ElevenLabs לאותה קריינות (server/narration.ts,
   *  with-timestamps) — נשמר לצד narrationAudioUrl כדי שוידאו-קידום שמיוצא
   *  מפרויקט שמור ישתמש בסנכרון כתוביות מדויק, לא רק בזמן היצירה החי. */
  narrationAlignment?: NarrationAlignment | null;
}

interface TemplateContextValue {
  selected: SelectedTemplate | null;
  setSelected: (t: SelectedTemplate | null) => void;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedTemplate | null>(null);
  return (
    <TemplateContext.Provider value={{ selected, setSelected }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplateContext() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplateContext must be used within TemplateProvider");
  return ctx;
}
