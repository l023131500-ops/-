// ============================================================
// טיפוסים משותפים למודול HTR — מקור אמת יחיד ל-frontend + backend.
// תואם לסכמת otvedaf.htr_jobs.
// ============================================================

export type HtrStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'raw_ready'
  | 'corrected'
  | 'approved'
  | 'failed';

export type HtrMaterial =
  | 'modern_handwriting'
  | 'rabbinic_18_19'
  | 'medieval_square'
  | 'rashi_ladino'
  | 'print';

export type HtrTier = 'regular' | 'internal';

/** שורה בטקסט עם ציון ביטחון — הבסיס להדגשת מקומות לא-ודאיים. */
export interface HtrLine {
  line: number;
  text: string;
  confidence: number; // 0..1
}

export interface HtrJob {
  id: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  image_bucket: string;
  page_label: string | null;
  material: HtrMaterial;
  tier: HtrTier;
  status: HtrStatus;
  engine: string | null;
  corrector: string | null;
  error_detail: string | null;
  raw_text: string | null;
  corrected_text: string | null;
  final_text: string | null;
  confidence: HtrLine[] | null;
  mean_confidence: number | null;
  approved_at: string | null;
  approved_by: string | null;
  book_id: string | null;
  chapter_ref: string | null;
}

// ---------- תוויות עבריות לתצוגה ----------
export const STATUS_LABELS: Record<HtrStatus, string> = {
  uploaded: 'הועלה',
  queued: 'בתור',
  processing: 'בעיבוד',
  raw_ready: 'טקסט גולמי מוכן',
  corrected: 'תוקן — ממתין לאישור',
  approved: 'אושר',
  failed: 'נכשל'
};

export const MATERIAL_LABELS: Record<HtrMaterial, string> = {
  modern_handwriting: 'כתב יד עכשווי (הערות/טיוטות)',
  rabbinic_18_19: 'כתב יד רבני (מאות 18–19)',
  medieval_square: 'כתב מרובע ימי-ביניימי',
  rashi_ladino: 'רש"י / לדינו',
  print: 'דפוס'
};

export const TIER_LABELS: Record<HtrTier, string> = {
  regular: 'מנוי רגיל (Kraken + DictaLM — חינם, NetFree)',
  internal: 'מנוי פנימי (Transkribus + Claude — דיוק מקסימלי)'
};

/** סף ביטחון שמתחתיו שורה מסומנת לתשומת-לב אנושית. */
export const LOW_CONFIDENCE_THRESHOLD = 0.75;
