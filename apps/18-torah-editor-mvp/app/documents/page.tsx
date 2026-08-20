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
  type OrechDocument,
} from '@/lib/hub';

/**
 * "המסמכים שלי" + אזור העלאת ספר/קובץ.
 *
 * זהו הפער שהמשתמש זיהה ושמסומן חובה ב-MORE30_MASTER_BUILD §7: עד עכשיו
 * העורך היה תיבת הדבקה בלבד — אי אפשר היה להעלות ספר, ושום דבר לא נשמר.
 *
 * ⚠️ הכול נשמר מול **ההאב**, עם הסשן של המשתמש ותחת RLS. אין כאן service_role
 * ואין מסלול שרת שכותב בשם המשתמש: מי שאינו מחובר פשוט אינו רואה דבר, ומי
 * שמחובר רואה אך ורק את המסמכים שלו.
 */

type Row = Pick<
  OrechDocument,
  'id' | 'title' | 'status' | 'word_count' | 'updated_at' | 'source_name'
>;

const FILTERS: { key: DocStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'הכול' },
  { key: 'editing', label: 'בעריכה' },
  { key: 'draft', label: 'טיוטות' },
  { key: 'done', label: 'הושלמו' },
];

export default function DocumentsPage() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [docs, setDocs] = useState<Row[]>([]);
  const [filter, setFilter] = useState<DocStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const configured = hubConfigured();

  const load = useCallback(async () => {
    if (!configured) return;
    const sb = getHubClient();
    const { data: auth } = await sb.auth.getUser();
    setEmail(auth.user?.email ?? null);
    if (!auth.user) {
      setDocs([]);
      setReady(true);
      return;
    }
    const { data, error: e } = await sb
      .from('orech_documents')
      .select('id,title,status,word_count,updated_at,source_name')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (e) setError('לא הצלחנו לטעון את המסמכים: ' + e.message);
    else setDocs((data ?? []) as Row[]);
    setReady(true);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  /** יצירת מסמך חדש מטקסט — משותף להעלאה ול"מסמך ריק". */
  async function createDoc(text: string, sourceName?: string, sourceKind?: string) {
    const sb = getHubClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) {
      setError('צריך להתחבר כדי לשמור מסמך.');
      return null;
    }
    const { data, error: e } = await sb
      .from('orech_documents')
      .insert({
        user_id: auth.user.id,
        title: sourceName ? sourceName.replace(/\.[^.]+$/, '') : titleFrom(text, 'מסמך חדש'),
        body: text,
        status: 'draft',
        source_name: sourceName ?? null,
        source_kind: sourceKind ?? null,
        word_count: countWords(text),
      })
      .select('id')
      .single();
    if (e) {
      setError('השמירה נכשלה: ' + e.message);
      return null;
    }
    return data.id as string;
  }

  /** קורא קובץ בודד לטקסט, יוצר עבורו מסמך, ומחזיר את מזההו. זורק אם נכשל. */
  async function ingestFile(file: File): Promise<string> {
    const lower = file.name.toLowerCase();
    let text: string;
    let kind = 'text';

    if (lower.endsWith('.txt') || lower.endsWith('.md') || file.type.startsWith('text/')) {
      // קובץ טקסט נקרא בדפדפן — אין סיבה שהוא ייצא מהמכשיר בשביל להיקרא.
      text = await file.text();
    } else {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/orech/api/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'לא הצלחנו לקרוא את הקובץ.');
      text = data.text;
      kind = data.kind ?? 'docx';
    }

    if (!text.trim()) throw new Error('לא נמצא טקסט בקובץ.');
    const id = await createDoc(text, file.name, kind);
    if (!id) throw new Error('השמירה נכשלה.');
    return id;
  }

  /**
   * מעלה קובץ אחד או כמה בבת אחת (ספר שלם עם כמה פרקים כקבצים נפרדים).
   * קובץ בודד: מתנהג כמו קודם — קופץ ישר לעורך. כמה קבצים: כל אחד הופך
   * למסמך נפרד ברשימה, ברצף (לא במקביל, כדי לא להציף את /orech/api/extract),
   * עם דיווח "קובץ X מתוך Y" ורשימת שגיאות לקבצים שנכשלו בלי לעצור את השאר.
   */
  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);

    if (list.length === 1) {
      setBusy('מעלים את ' + list[0].name);
      try {
        const id = await ingestFile(list[0]);
        window.location.href = `/orech/editor?doc=${id}`;
      } catch (e: any) {
        setError(e.message || 'ההעלאה נכשלה.');
      } finally {
        setBusy(null);
      }
      return;
    }

    const failed: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setBusy(`מעלים קובץ ${i + 1} מתוך ${list.length}: ${file.name}`);
      try {
        await ingestFile(file);
      } catch (e: any) {
        failed.push(`${file.name}: ${e.message || 'נכשל'}`);
      }
    }
    setBusy(null);
    if (failed.length) setError('חלק מהקבצים לא הועלו — ' + failed.join(' · '));
    await load();
  }

  async function newBlank() {
    setBusy('יוצרים מסמך');
    const id = await createDoc('', undefined, undefined);
    setBusy(null);
    if (id) window.location.href = `/orech/editor?doc=${id}`;
  }

  async function remove(id: string, title: string) {
    if (deletingId) return;
    if (!confirm(`למחוק את "${title}"? הפעולה אינה הפיכה.`)) return;
    setDeletingId(id);
    const sb = getHubClient();
    const { error: e } = await sb.from('orech_documents').delete().eq('id', id);
    setDeletingId(null);
    if (e) setError('המחיקה נכשלה: ' + e.message);
    else setDocs((d) => d.filter((x) => x.id !== id));
  }

  if (!configured) {
    return (
      <div className="container">
        <h1>המסמכים שלי</h1>
        <p className="status-deviation">
          אזור המסמכים אינו מחובר: חסרים <code>NEXT_PUBLIC_HUB_SUPABASE_URL</code> ו-
          <code>NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  const shown = filter === 'all' ? docs : docs.filter((d) => d.status === filter);

  return (
    <div className="container">
      <h1>המסמכים שלי</h1>
      <p className="subtitle">
        העלו ספר או קובץ, או פתחו מסמך ריק. כל מסמך נשמר אוטומטית ואפשר לחזור אליו בכל עת.
      </p>

      {/* ===== אזור ההעלאה ===== */}
      <div
        className={'upload-zone' + (dragging ? ' is-dragging' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="upload-title">גררו לכאן ספר או כמה קבצים</div>
        <div className="upload-note">
          נתמכים: ‎.docx‎ · ‎.txt‎ · ‎.md‎ — עד 8MB לקובץ. אפשר לבחור כמה קבצים בבת
          אחת (למשל פרקי ספר) — כל קובץ ייהפך למסמך נפרד. קובץ סרוק או צילום של
          כתב יד עובר דרך <Link href="/htr">מודול המרת כתב היד</Link>.
        </div>
        <div className="upload-actions">
          <button
            type="button"
            className="action"
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
          >
            {busy ? busy + '…' : 'בחירת קבצים'}
          </button>
          <button type="button" className="action" onClick={newBlank} disabled={!!busy}>
            מסמך ריק חדש
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".docx,.txt,.md,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-label="בחירת קבצים להעלאה"
          className="visually-hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="status-deviation">{error}</p>}

      {/* ===== הרשימה ===== */}
      {!ready ? (
        <p>טוען…</p>
      ) : !email ? (
        <div className="result-card">
          <h3>צריך להתחבר</h3>
          <p>
            המסמכים שלכם שמורים לחשבון האישי. אחרי ההתחברות תחזרו לכאן והם ייטענו.
          </p>
          <Link className="action" href="/login?from=/orech/documents">
            כניסה לחשבון
          </Link>
        </div>
      ) : (
        <>
          <div className="doc-toolbar">
            <div className="filters" role="group" aria-label="סינון לפי מצב">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={'chip' + (filter === f.key ? ' is-on' : '')}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className="chip-count">
                    {f.key === 'all' ? docs.length : docs.filter((d) => d.status === f.key).length}
                  </span>
                </button>
              ))}
            </div>
            <span className="muted">מחובר כ־{email}</span>
          </div>

          {shown.length === 0 ? (
            <p className="muted">
              {docs.length === 0
                ? 'עוד אין מסמכים. העלו ספר או פתחו מסמך ריק — הוא יופיע כאן.'
                : 'אין מסמכים במצב הזה.'}
            </p>
          ) : (
            <ul className="doc-list">
              {shown.map((d) => (
                <li key={d.id} className="doc-row">
                  <div className="doc-main">
                    <Link href={`/editor?doc=${d.id}`} className="doc-title">
                      {d.title}
                    </Link>
                    <div className="doc-meta">
                      <span className={'badge status-' + d.status}>{DOC_STATUS_LABEL[d.status]}</span>
                      <span>{d.word_count.toLocaleString('he-IL')} מילים</span>
                      <span>עודכן {new Date(d.updated_at).toLocaleString('he-IL')}</span>
                      {d.source_name && <span>מתוך {d.source_name}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="action danger"
                    onClick={() => remove(d.id, d.title)}
                    disabled={deletingId === d.id}
                  >
                    {deletingId === d.id ? 'מוחקים…' : 'מחיקה'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
