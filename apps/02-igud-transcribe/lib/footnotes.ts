// עזרי הערות שוליים — חיתוך טקסט סביב מיקום הערה לתצוגה במסמך המקורות

export type Footnote = {
  number: number;
  position?: number;
  note_text: string;
  source_ref?: string;
};

/** מחזיר קטע טקסט סביב המיקום שצוטט, להצגה בקובץ sources.docx */
export function extractContext(text: string, position: number | undefined, radius = 60): string {
  if (position == null || position < 0 || position > text.length) return "";
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/** ממיר edited_text עם סימוני [^N] לטקסט קריא ולמיקומי הערות */
export function parseFootnoteMarkers(editedText: string): { cleanText: string; markers: Array<{ number: number; index: number }> } {
  const markers: Array<{ number: number; index: number }> = [];
  let out = "";
  let i = 0;
  const re = /\[\^(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(editedText)) !== null) {
    out += editedText.slice(i, m.index);
    markers.push({ number: parseInt(m[1], 10), index: out.length });
    i = m.index + m[0].length;
  }
  out += editedText.slice(i);
  return { cleanText: out, markers };
}
