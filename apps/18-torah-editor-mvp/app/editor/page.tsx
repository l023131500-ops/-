'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DOC_STATUS_LABEL,
  countWords,
  getHubClient,
  hubConfigured,
  titleFrom,
  type DocStatus,
} from '@/lib/hub';

type Citation = {
  matchedText: string;
  startChar: number;
  endChar: number;
  refs: string[];
  quotedText: string;
};

type Verification = {
  ref: string;
  status: 'match' | 'deviation' | 'missing' | 'no-quote-provided';
  distance?: number;
  sourceText?: string;
  sourceUrl?: string;
};

export default function EditorPage() {
  const [text, setText] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [nikudText, setNikudText] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ===== המסמך שנערך, אם נפתח מ"המסמכים שלי" =====
  const [docId, setDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docStatus, setDocStatus] = useState<DocStatus>('draft');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSaved = useRef<string>('');
  const skipFirst = useRef(true);

  // טעינת המסמך מהכתובת. ⚠️ `useSearchParams` ב-App Router מחייב <Suspense>
  // סביב הרכיב כולו; קריאה ישירה מ-window אחרי ה-mount עושה את אותו דבר בלי
  // לעטוף את כל הדף.
  useEffect(() => {
    if (!hubConfigured()) return;
    const id = new URLSearchParams(window.location.search).get('doc');
    if (!id) return;
    (async () => {
      const sb = getHubClient();
      const { data, error: e } = await sb
        .from('orech_documents')
        .select('id,title,body,status')
        .eq('id', id)
        .maybeSingle();
      if (e || !data) {
        setError('המסמך לא נמצא, או שאינו שייך לחשבון שמחובר.');
        return;
      }
      setDocId(data.id);
      setDocTitle(data.title);
      setDocStatus(data.status as DocStatus);
      setText(data.body ?? '');
      lastSaved.current = data.body ?? '';
    })();
  }, []);

  /** שמירה. `patch` מאפשר לשנות סטטוס או כותרת בלי לחכות למחזור השמירה. */
  const save = useCallback(
    async (patch: Record<string, unknown> = {}) => {
      if (!docId || !hubConfigured()) return;
      setSaved('saving');
      const sb = getHubClient();
      const { error: e } = await sb
        .from('orech_documents')
        .update({ body: text, word_count: countWords(text), ...patch })
        .eq('id', docId);
      if (e) {
        setSaved('error');
        setError('השמירה נכשלה: ' + e.message);
      } else {
        lastSaved.current = text;
        setSaved('saved');
      }
    },
    [docId, text],
  );

  // שמירה אוטומטית של הטיוטה, שנייה וחצי אחרי שהקלדה נעצרה.
  // ⚠️ בלי `skipFirst` הטעינה עצמה הייתה נחשבת שינוי ומייצרת כתיבה מיותרת.
  useEffect(() => {
    if (!docId) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (text === lastSaved.current) return;
    setSaved('idle');
    const t = setTimeout(() => save(), 1500);
    return () => clearTimeout(t);
  }, [text, docId, save]);

  async function detectCitations() {
    setError(null);
    setLoading('citations');
    try {
      const res = await fetch('/orech/api/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שגיאה בזיהוי ציטוטים');
      setCitations(data.citations || []);
    } catch (e: any) {
      setError(e.message || 'שגיאה לא ידועה');
    } finally {
      setLoading(null);
    }
  }

  async function verifyCitation(c: Citation, ref: string) {
    setError(null);
    setLoading('verify:' + ref);
    try {
      const res = await fetch('/orech/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, quote: c.quotedText || c.matchedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שגיאה באימות מקור');
      setVerifications((prev) => ({ ...prev, [ref]: data }));
    } catch (e: any) {
      setError(e.message || 'שגיאה לא ידועה');
    } finally {
      setLoading(null);
    }
  }

  async function runNikud() {
    setError(null);
    setLoading('nikud');
    try {
      const res = await fetch('/orech/api/nikud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, genre: 'rabbinic' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שגיאה בניקוד');
      setNikudText(data.nikudText || '');
    } catch (e: any) {
      setError(e.message || 'שגיאה לא ידועה');
    } finally {
      setLoading(null);
    }
  }

  function approveNikud() {
    if (!nikudText) return;
    setText(nikudText);
    setNikudText('');
  }

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(docTitle || titleFrom(text, 'מסמך')).trim()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Word export via the standard "Word HTML" MIME trick (application/msword
  // Blob with an mso xml preamble) — Word/LibreOffice/Google Docs all open
  // this natively. No new dependency: same Blob-download pattern as
  // downloadTxt() above, just a different content-type/extension.
  function downloadDocx() {
    const title = (docTitle || titleFrom(text, 'מסמך')).trim();
    const paragraphs = text
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${esc(title)}</title>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>
      body { font-family:'David',serif; direction:rtl; }
      h1 { font-size:22pt; margin:0 0 16pt; }
      p { font-size:12.5pt; margin:0 0 10pt; text-align:justify; line-height:1.9; }
    </style></head>
    <body dir="rtl"><h1>${esc(title)}</h1>${paragraphs}</body></html>`;

    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'מסמך'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // PDF export via a styled print window — same pattern already live in
  // 27-mechiron/28-kupot/17-chizukim (window.print(), no extra dependency).
  function downloadPdf() {
    const title = (docTitle || titleFrom(text, 'מסמך')).trim();
    const paragraphs = text
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join('');

    const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
    <title>${esc(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" rel="stylesheet">
    <style>
      @page { margin: 2.2cm; }
      body { font-family:'Frank Ruhl Libre',serif; direction:rtl; color:#1a1a1a; line-height:1.9; }
      h1 { font-size:22pt; margin:0 0 16pt; }
      p { font-size:12.5pt; margin:0 0 10pt; text-align:justify; }
    </style></head><body>
    <h1>${esc(title)}</h1>
    ${paragraphs}
    <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('החלון נחסם. אנא אפשר חלונות קופצים כדי להוריד PDF.');
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return (
    <main className="container" id="main-content">
      <h1>העורך התורני</h1>
      <p>הזן טקסט, זהה ציטוטים, אמת מול המקור בספריא, והוסף ניקוד רבני. כל הפעולות דורשות אישור ידני לפני קבלה.</p>

      {docId ? (
        <div className="doc-bar">
          <input
            className="doc-title-input"
            value={docTitle}
            aria-label="שם המסמך"
            onChange={(e) => setDocTitle(e.target.value)}
            onBlur={() => save({ title: docTitle.trim() || titleFrom(text, 'ללא שם') })}
          />
          <div className="doc-bar-side">
            <label className="visually-hidden" htmlFor="doc-status">
              מצב המסמך
            </label>
            <select
              id="doc-status"
              value={docStatus}
              onChange={(e) => {
                const s = e.target.value as DocStatus;
                setDocStatus(s);
                save({ status: s });
              }}
            >
              {(['draft', 'editing', 'done'] as DocStatus[]).map((s) => (
                <option key={s} value={s}>
                  {DOC_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <span className="save-state" aria-live="polite">
              {saved === 'saving' && 'שומר…'}
              {saved === 'saved' && 'נשמר ✓'}
              {saved === 'error' && 'השמירה נכשלה'}
              {saved === 'idle' && `${countWords(text).toLocaleString('he-IL')} מילים`}
            </span>
            <Link href="/documents" className="action">
              המסמכים שלי
            </Link>
          </div>
        </div>
      ) : (
        <p className="doc-hint">
          עובדים על ספר? <Link href="/documents">אזור המסמכים</Link> שומר את מה שאתם עורכים,
          ומאפשר להעלות קובץ ‎.docx‎ או ‎.txt‎ במקום להדביק ידנית.
        </p>
      )}

      <textarea
        className="editor-input"
        dir="rtl"
        rows={12}
        value={text}
        aria-label="טקסט המסמך לעריכה"
        onChange={(e) => setText(e.target.value)}
        placeholder="הדבק כאן את הטקסט לעריכה..."
      />

      <div className="toolbar">
        <button className="action" onClick={detectCitations} disabled={!text || loading !== null}>
          {loading === 'citations' ? 'מזהה...' : 'זהה ציטוטים'}
        </button>
        <button className="action" onClick={runNikud} disabled={!text || loading !== null}>
          {loading === 'nikud' ? 'מנקד...' : 'הוסף ניקוד רבני'}
        </button>
        <button className="action" onClick={copyText} disabled={!text} type="button">
          {copied ? 'הועתק ✓' : 'העתק ללוח'}
        </button>
        <button className="action" onClick={downloadTxt} disabled={!text} type="button">
          הורד כטקסט (.txt)
        </button>
        <button className="action" onClick={downloadPdf} disabled={!text} type="button">
          הורד כ-PDF
        </button>
        <button className="action" onClick={downloadDocx} disabled={!text} type="button">
          הורד כ-Word
        </button>
      </div>

      {error && <p className="status-deviation" role="alert" aria-live="assertive">{error}</p>}

      {nikudText && (
        <div className="result-card" role="status" aria-live="polite">
          <h2>הצעת ניקוד (יש לאשר לפני קבלה)</h2>
          <p dir="rtl">{nikudText}</p>
          <button className="action" onClick={approveNikud}>אשר והחלף בטקסט</button>
          <button className="action" onClick={() => setNikudText('')}>בטל</button>
        </div>
      )}

      {citations.length > 0 && (
        <div>
          <h2>ציטוטים שזוהו</h2>
          {citations.map((c, i) => (
            <div className="result-card" key={i}>
              <p dir="rtl">"{c.matchedText || '—'}"</p>
              {(c.refs || []).map((ref) => {
                const v = verifications[ref];
                return (
                  <div key={ref}>
                    <span className="badge">{ref}</span>
                    {v ? (
                      <span className={'status-' + v.status} role="status" aria-live="polite">
                        {v.status === 'match' && 'תואם למקור'}
                        {v.status === 'deviation' && 'סטייה מהמקור (מרחק: ' + v.distance + ')'}
                        {v.status === 'missing' && 'המקור לא נמצא'}
                        {v.status === 'no-quote-provided' && 'לא זוהה ציטוט לאימות עבור מקור זה'}
                      </span>
                    ) : (
                      <button
                        className="action"
                        onClick={() => verifyCitation(c, ref)}
                        disabled={loading !== null}
                      >
                        {loading === 'verify:' + ref ? 'מאמת...' : 'אמת מול המקור'}
                      </button>
                    )}
                    {v?.sourceText && <p dir="rtl">{v.sourceText}</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
