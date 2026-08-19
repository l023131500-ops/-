"use client";

import { useEffect, useState } from "react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "l023131500@gmail.com";

export default function SettingsPage() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/tamlul/api/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null);
    // user shown from middleware-protected page
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-brand-blue">הגדרות</h1>

      <div className="card space-y-4">
        <h2 className="font-bold text-brand-blue text-lg">פרטי מערכת</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">שם המערכת</dt>
            <dd className="font-medium mt-1">איגוד השיעורים — תמלול</dd>
          </div>
          <div>
            <dt className="text-slate-500">מנהל ראשי</dt>
            <dd className="font-medium mt-1 font-mono">{ADMIN_EMAIL}</dd>
          </div>
          <div>
            <dt className="text-slate-500">מודל תמלול</dt>
            <dd className="font-medium mt-1">OpenAI Whisper-1</dd>
          </div>
          <div>
            <dt className="text-slate-500">מודל עריכה</dt>
            <dd className="font-medium mt-1">GPT-4o</dd>
          </div>
          <div>
            <dt className="text-slate-500">סגנונות תמיכה</dt>
            <dd className="font-medium mt-1">ליטאי · חסידי · אידיש</dd>
          </div>
          <div>
            <dt className="text-slate-500">פורמט פלט</dt>
            <dd className="font-medium mt-1">3 קבצי DOCX (גולמי, ערוך, מקורות)</dd>
          </div>
        </dl>
      </div>

      <div className="card space-y-4">
        <h2 className="font-bold text-brand-blue text-lg">תהליך עיבוד</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
          <li>הקלטה מועלית ל-Supabase Storage (bucket: audio)</li>
          <li>Whisper מבצע זיהוי דיבור (verbose_json + timestamps)</li>
          <li>GPT-4o מבצע עריכה ספרותית לפי הסגנון הנבחר ומילון המונחים</li>
          <li>נוצרים 3 קבצי DOCX עם RTL ופונט "David", נשמרים ב-bucket: docs</li>
          <li>המשתמש מקבל גישה להורדה דרך פאנל האדמין</li>
        </ol>
      </div>

      <div className="card space-y-4">
        <h2 className="font-bold text-brand-blue text-lg">קישורים</h2>
        <div className="space-y-2 text-sm">
          <a href="https://github.com/l023131500-ops/igud-transcribe" target="_blank" rel="noopener" className="block text-brand-blue hover:underline">
            ← מאגר GitHub
          </a>
          <a href="https://supabase.com/dashboard/project/bieebmnmkffwbqlsfozh" target="_blank" rel="noopener" className="block text-brand-blue hover:underline">
            ← פאנל Supabase
          </a>
        </div>
      </div>
    </div>
  );
}
