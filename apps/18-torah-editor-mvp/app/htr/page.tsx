'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { HtrJob, HtrLine } from '@/lib/htr-types';
import {
  STATUS_LABELS, MATERIAL_LABELS, TIER_LABELS, LOW_CONFIDENCE_THRESHOLD
} from '@/lib/htr-types';

type JobSummary = Pick<HtrJob,
  'id' | 'created_at' | 'page_label' | 'material' | 'tier' | 'status' | 'engine' | 'corrector' | 'mean_confidence' | 'approved_at'>;

export default function HtrPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await fetch('/orech/api/htr/jobs');
      const d = await r.json();
      setJobs(d.jobs || []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <main className="container htr-wide">
      <div className="htr-head">
        <div>
          <h1>המרת כתב יד — HTR</h1>
          <p className="subtitle">
            העלאה · זיהוי · תיקון חכם · אישור אנושי. הטקסט קדוש — שום טקסט לא נכנס לספר ללא אישורך.
          </p>
        </div>
        <Link href="/" className="back-link">→ חזרה</Link>
      </div>

      <UploadForm onDone={refresh} />

      <div className="htr-layout">
        <JobList
          jobs={jobs}
          loading={loadingList}
          selected={selected}
          onSelect={setSelected}
          onRefresh={refresh}
        />
        <div className="htr-detail-pane">
          {selected
            ? <JobDetail jobId={selected} onChanged={refresh} />
            : <div className="empty-hint">בחר עבודה מהרשימה כדי לצפות, לתקן ולאשר.</div>}
        </div>
      </div>
    </main>
  );
}

// ============================================================
// טופס העלאה
// ============================================================
/**
 * סיבוב והיפוך של תמונת כתב היד לפני השליחה.
 *
 * ⚠️ ההחלטה המהותית כאן: הטרנספורם נצרב **לקובץ שנשלח**, ולא רק לתצוגה.
 * כפתור שמסובב את התצוגה בלבד גרוע מכפתור שלא קיים — המשתמש רואה עמוד ישר,
 * מנוע הזיהוי מקבל עמוד שוכב, והתוצאה הגרועה נראית כאילו המנוע פשוט לא מדייק.
 * הבקשה במפרט היא "שתיכנס **ישרה** לתוכנה", כלומר על הבייטים.
 *
 * כשאין שינוי (0° בלי היפוך) הקובץ המקורי נשלח כמו שהוא — בלי קידוד מחדש
 * ובלי אובדן איכות. קידוד מחדש מיותר של סריקה הוא נזק שקט.
 */
async function bakeTransform(file: File, rotation: number, flipped: boolean): Promise<File> {
  if (rotation === 0 && !flipped) return file;

  const bitmap = await createImageBitmap(file);
  const swap = rotation === 90 || rotation === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file; // בלי canvas עדיף לשלוח את המקור מאשר להיכשל
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flipped) ctx.scale(-1, 1);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  // PNG ולא JPEG: כתב יד סרוק הוא בדיוק התוכן שארטיפקטים של JPEG פוגעים בו,
  // וזיהוי אותיות הוא המשימה שהכי רגישה לזה.
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.png', { type: 'image/png' });
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [material, setMaterial] = useState('modern_handwriting');
  const [tier, setTier] = useState('regular');
  const [pageLabel, setPageLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // כתובת ה-blob משוחררת בכל החלפת קובץ ובעת פירוק הרכיב. בלי זה כל בחירת
  // תמונה מדליפה את הקודמת, וסריקות הן קבצים גדולים.
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | null) {
    setFile(f);
    setRotation(0);
    setFlipped(false);
    setMsg(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg({ type: 'err', text: 'יש לבחור תמונה' }); return; }
    setBusy(true); setMsg(null);
    try {
      const toSend = await bakeTransform(file, rotation, flipped);
      const fd = new FormData();
      fd.append('file', toSend);
      fd.append('material', material);
      fd.append('tier', tier);
      if (pageLabel) fd.append('page_label', pageLabel);

      const r = await fetch('/orech/api/htr/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'העלאה נכשלה');

      // הפעלת עיבוד מיד
      const jobId = d.job.id;
      setMsg({ type: 'ok', text: 'הועלה. מריץ זיהוי...' });
      const pr = await fetch('/orech/api/htr/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      });
      const pd = await pr.json();
      if (pr.status === 503) {
        setMsg({ type: 'ok', text: 'הועלה. הזיהוי ממתין לחיבור שרת ה-HTR (ראה מסמך המסירה).' });
      } else if (!pr.ok) {
        setMsg({ type: 'err', text: pd.error || 'העיבוד נכשל' });
      } else {
        setMsg({ type: 'ok', text: `הושלם: ${pd.stage === 'corrected' ? 'זוהה ותוקן' : 'זוהה'}` });
      }
      pick(null);
      onDone();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="upload-card" onSubmit={submit}>
      <div className="upload-row">
        <label className="field">
          <span>תמונת כתב יד</span>
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0] || null)} />
        </label>
        <label className="field">
          <span>סוג החומר</span>
          <select value={material} onChange={(e) => setMaterial(e.target.value)}>
            {Object.entries(MATERIAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className="upload-row">
        <label className="field">
          <span>רמת מנוי</span>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field">
          <span>תיאור (אופציונלי)</span>
          <input type="text" value={pageLabel} placeholder='למשל: "כתב יד, עמ׳ 12"' onChange={(e) => setPageLabel(e.target.value)} />
        </label>
      </div>
      {/*
        תצוגה מקדימה — מה שנשלח בפועל, כולל בזמן השליחה.
        עד עכשיו התמונה הופיעה רק **אחרי** שהעבודה נוצרה, כלומר המשתמש לחץ
        "העלה" בלי לראות מה הוא שולח, וגילה שהעמוד הפוך רק מהתוצאה.
        ה-transform כאן זהה למה ש-`bakeTransform` צורב לקובץ, ולכן מה שנראה
        הוא מה שנשלח.
      */}
      {previewUrl && (
        <div className="upload-preview">
          <div className="preview-frame">
            <img
              src={previewUrl}
              alt="תצוגה מקדימה של כתב היד כפי שיישלח לזיהוי"
              style={{
                transform: `rotate(${rotation}deg) scaleX(${flipped ? -1 : 1})`,
                maxWidth: '100%',
                maxHeight: 320,
                transition: 'transform .2s',
              }}
            />
          </div>
          <div className="preview-tools">
            <span className="preview-hint">
              סובבו עד שהשורות ישרות. התמונה נשלחת במצב שרואים כאן.
            </span>
            <button type="button" className="action" disabled={busy}
              onClick={() => setRotation((r) => (r + 270) % 360)}>
              ⟲ סיבוב שמאלה
            </button>
            <button type="button" className="action" disabled={busy}
              onClick={() => setRotation((r) => (r + 90) % 360)}>
              ⟳ סיבוב ימינה
            </button>
            <button type="button" className="action" disabled={busy}
              onClick={() => setFlipped((f) => !f)}>
              ⇋ היפוך אופקי
            </button>
            {(rotation !== 0 || flipped) && (
              <button type="button" className="action" disabled={busy}
                onClick={() => { setRotation(0); setFlipped(false); }}>
                איפוס
              </button>
            )}
          </div>
        </div>
      )}

      <div className="upload-actions">
        <button className="action" type="submit" disabled={busy}>
          {busy ? 'מעבד...' : 'העלה והרץ זיהוי'}
        </button>
        {msg && <span className={msg.type === 'ok' ? 'status-match' : 'status-missing'}>{msg.text}</span>}
      </div>
    </form>
  );
}

// ============================================================
// רשימת עבודות
// ============================================================
function JobList({ jobs, loading, selected, onSelect, onRefresh }: {
  jobs: JobSummary[]; loading: boolean; selected: string | null;
  onSelect: (id: string) => void; onRefresh: () => void;
}) {
  return (
    <div className="job-list">
      <div className="job-list-head">
        <h3>עבודות ({jobs.length})</h3>
        <button className="mini-btn" onClick={onRefresh} disabled={loading}>רענן</button>
      </div>
      {jobs.length === 0 && <div className="empty-hint small">אין עבודות עדיין.</div>}
      {jobs.map((j) => (
        <button
          key={j.id}
          className={`job-item ${selected === j.id ? 'job-item--active' : ''}`}
          onClick={() => onSelect(j.id)}
        >
          <div className="job-item-top">
            <span className="job-label">{j.page_label || 'ללא תיאור'}</span>
            <StatusBadge status={j.status} />
          </div>
          <div className="job-item-meta">
            {MATERIAL_LABELS[j.material]}
            {typeof j.mean_confidence === 'number' && j.mean_confidence > 0 &&
              <> · ביטחון ~{Math.round(j.mean_confidence * 100)}%</>}
          </div>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: HtrJob['status'] }) {
  const cls = status === 'approved' ? 'status-match'
    : status === 'failed' ? 'status-missing'
    : status === 'corrected' ? 'status-deviation' : '';
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status]}</span>;
}

// ============================================================
// פרטי עבודה + עורך תיקון RTL + אישור
// ============================================================
function JobDetail({ jobId, onChanged }: { jobId: string; onChanged: () => void }) {
  const [job, setJob] = useState<HtrJob | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [finalText, setFinalText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/orech/api/htr/jobs/${jobId}`);
    const d = await r.json();
    setJob(d.job);
    setImgUrl(d.imageSignedUrl);
    // ברירת המחשב לעורך: הטקסט הסופי אם קיים, אחרת המתוקן, אחרת הגולמי
    setFinalText(d.job?.final_text || d.job?.corrected_text || d.job?.raw_text || '');
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  if (!job) return <div className="empty-hint">טוען...</div>;

  const lines: HtrLine[] = Array.isArray(job.confidence) ? job.confidence : [];
  const isApproved = job.status === 'approved';

  async function approve() {
    if (!finalText.trim()) { setMsg('לא ניתן לאשר טקסט ריק'); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/orech/api/htr/jobs/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_text: finalText })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg('אושר ונשמר. מוכן לשילוב בספר.');
      await load(); onChanged();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function saveDraft() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/orech/api/htr/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_text: finalText })
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error); }
      setMsg('נשמרה טיוטה.');
      onChanged();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="job-detail">
      <div className="detail-head">
        <h3>{job.page_label || 'עבודה'}</h3>
        <StatusBadge status={job.status} />
      </div>
      <div className="detail-meta">
        {MATERIAL_LABELS[job.material]} · {TIER_LABELS[job.tier]}
        {job.engine && <> · מנוע: {job.engine}</>}
        {job.corrector && job.corrector !== 'none' && <> · תיקון: {job.corrector}</>}
      </div>

      {job.error_detail && (
        <div className="detail-error">
          <strong>הערה:</strong> {job.error_detail}
        </div>
      )}

      <div className="detail-cols">
        {/* תמונה מקורית */}
        <div className="detail-col">
          <h4>המקור</h4>
          {imgUrl
            ? <img src={imgUrl} alt="כתב היד המקורי" className="src-image" />
            : <div className="empty-hint small">אין תצוגת תמונה</div>}
        </div>

        {/* טקסט לפי ביטחון */}
        <div className="detail-col">
          <h4>זיהוי לפי ביטחון</h4>
          {lines.length > 0 ? (
            <div className="conf-text" dir="rtl">
              {lines.map((l) => (
                <span
                  key={l.line}
                  className={l.confidence < LOW_CONFIDENCE_THRESHOLD ? 'conf-low' : 'conf-ok'}
                  title={`ביטחון ${Math.round(l.confidence * 100)}%`}
                >
                  {l.text + '\n'}
                </span>
              ))}
            </div>
          ) : (
            <div className="empty-hint small">
              {job.raw_text ? <pre className="raw-pre">{job.raw_text}</pre> : 'טרם בוצע זיהוי.'}
            </div>
          )}
          <p className="legend">
            <span className="conf-low legend-swatch">מודגש</span> = ביטחון נמוך, דורש בדיקה.
          </p>
        </div>
      </div>

      {/* עורך אנושי — final_text */}
      <div className="editor-block">
        <h4>עריכה ואישור אנושי</h4>
        <p className="editor-note">
          זהו הטקסט שייכנס לספר. תקן כאן חופשית — הטקסט הגולמי והמתוקן נשמרים בנפרד ולא משתנים.
        </p>
        <textarea
          className="editor-input"
          dir="rtl"
          value={finalText}
          onChange={(e) => setFinalText(e.target.value)}
          disabled={isApproved}
        />
        <div className="toolbar">
          {!isApproved && (
            <>
              <button className="action" onClick={saveDraft} disabled={busy}>שמור טיוטה</button>
              <button className="action approve-btn" onClick={approve} disabled={busy}>
                אשר טקסט סופי
              </button>
            </>
          )}
          {isApproved && <span className="status-match">✓ אושר {job.approved_at?.slice(0, 10)}</span>}
          {msg && <span className="editor-msg">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
