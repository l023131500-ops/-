// מנוע קופי — כרגע מבסיס-הידע המובנה. מתוכנן להחלפה קלה ב-AI (Claude) בעתיד.
// suggestCopy(category) מחזיר ניסוחים אותנטיים; fillFields ממלא את שדות התבנית מברירת המחדל.

import { KNOWLEDGE_BASE, getCategory, type KBCategory, type CopyExample } from "@shared/knowledge";
import type { TemplateDoc, TextLayer } from "@shared/layers";

export function getCategoryCopy(categoryKey: string): CopyExample[] {
  const cat = getCategory(categoryKey);
  return cat?.copyExamples ?? [];
}

export function getCategoryFields(categoryKey: string) {
  const cat = getCategory(categoryKey);
  return cat?.fields ?? [];
}

// ממלא את השכבות בתבנית לפי placeholders של הקטגוריה (fieldName → placeholder)
export function applyCategoryDefaults(doc: TemplateDoc, categoryKey: string): TemplateDoc {
  const cat = getCategory(categoryKey);
  if (!cat) return doc;
  const byName = new Map(cat.fields.map((f) => [f.name, f]));
  const layers = doc.layers.map((l) => {
    if (l.type === "text" && (l as TextLayer).fieldName) {
      const f = byName.get((l as TextLayer).fieldName!);
      if (f && f.placeholder) {
        return { ...l, text: f.placeholder };
      }
    }
    return l;
  });
  return { ...doc, layers };
}

// מעדכן שכבת טקסט בודדת לפי fieldName
export function setFieldText(doc: TemplateDoc, fieldName: string, text: string): TemplateDoc {
  return {
    ...doc,
    layers: doc.layers.map((l) =>
      l.type === "text" && (l as TextLayer).fieldName === fieldName ? { ...l, text } : l,
    ),
  };
}

// בעתיד: קריאה ל-Claude. חתימה זהה כדי שהחלפה תהיה שקופה.
export async function suggestCopyAI(_categoryKey: string, _hints: Record<string, string>): Promise<string[]> {
  // placeholder — מוחזר מבסיס-הידע עד לחיבור ה-AI
  return getCategoryCopy(_categoryKey).map((c) => c.text);
}

export { KNOWLEDGE_BASE, getCategory };
export type { KBCategory };
