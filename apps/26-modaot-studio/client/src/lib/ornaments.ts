// ספריית עיטורים — נתיבי SVG (path data) המרונדרים כ-Konva.Path.
// כל עיטור מוגדר ב-viewBox 100×100 ומקבל scale לפי המידות בשכבה.
// אלה עיטורים גיאומטריים אמיתיים בסגנון יודאיקה — לא AI.

import type { DecorationKind } from "@shared/layers";

export interface OrnamentDef {
  viewBox: number; // ריבועי
  paths: { d: string; fillRule?: "nonzero" | "evenodd"; strokeOnly?: boolean }[];
}

// כתר — יודאיקה קלאסית (5 שיאים + אבנים)
const crown: OrnamentDef = {
  viewBox: 100,
  paths: [
    {
      d: "M10 72 L16 32 L32 52 L50 20 L68 52 L84 32 L90 72 Z",
    },
    { d: "M8 74 L92 74 L92 86 L8 86 Z" },
    { d: "M50 14 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: false },
    { d: "M16 26 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" },
    { d: "M84 26 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" },
  ],
};

// מגן דוד
const starOfDavid: OrnamentDef = {
  viewBox: 100,
  paths: [
    { d: "M50 8 L74 50 L26 50 Z", strokeOnly: true },
    { d: "M50 92 L26 50 L74 50 Z", strokeOnly: true },
  ],
};

// רימון — סמל יודאיקה
const pomegranate: OrnamentDef = {
  viewBox: 100,
  paths: [
    { d: "M50 28 C30 28 22 46 22 62 C22 82 38 92 50 92 C62 92 78 82 78 62 C78 46 70 28 50 28 Z" },
    { d: "M44 12 L50 28 L56 12 L52 20 L58 16 L52 24 L50 28 L48 24 L42 16 L48 20 Z" },
  ],
};

// קישוט מתפתל (flourish) — פס עיטורי אופקי
const flourish: OrnamentDef = {
  viewBox: 100,
  paths: [
    {
      d: "M4 50 C20 30 30 30 40 50 C46 62 54 62 60 50 C70 30 80 30 96 50 C80 70 70 70 60 50 C54 38 46 38 40 50 C30 70 20 70 4 50 Z",
      strokeOnly: true,
    },
    { d: "M50 44 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" },
  ],
};

// מפריד מעוטר — יהלום מרכזי + קווים
const dividerOrnament: OrnamentDef = {
  viewBox: 100,
  paths: [
    { d: "M50 30 L60 50 L50 70 L40 50 Z" },
    { d: "M0 49 L38 49 L38 51 L0 51 Z" },
    { d: "M62 49 L100 49 L100 51 L62 51 Z" },
    { d: "M50 40 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" },
  ],
};

export const ORNAMENTS: Partial<Record<DecorationKind, OrnamentDef>> = {
  crown,
  star_of_david: starOfDavid,
  pomegranate,
  flourish,
  divider_ornament: dividerOrnament,
};

// עיטורי פינה — נתיב שמצייר פינה עליונה-ימנית (ניתן לשקף)
export const CORNER_ORNAMENT_PATH =
  "M2 2 L2 40 C2 22 22 2 40 2 Z M2 2 L2 20 C10 12 12 10 20 2 Z M6 6 C18 8 24 14 26 26";
