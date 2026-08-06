'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { LayerKey, PropertyProfile } from '@/lib/types';
import { ils, num, heDate, pricePerSqm } from '@/lib/format';
import { SourceBadge, StatusDot, ConfidencePill } from './ui';

interface DealQuality {
  score: number | null;
  flag: 'GO' | 'CAUTION' | 'NO_GO' | null;
  askVsMarketPct: number | null;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}
interface LegalInfo {
  officialUrl: string;
  options: { type: string; costIls: number }[];
  note: string;
}
type FullProfile = PropertyProfile & { legal?: LegalInfo; dealQuality?: DealQuality };

const ALL_LAYERS: LayerKey[] = ['legal', 'planning', 'value', 'physical', 'environment', 'renewal', 'documents'];

export default function PropertyIdCard({ q }: { q: string }) {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<LayerKey>>(new Set(ALL_LAYERS));
  const [reportType, setReportType] = useState<'property_id' | 'deal_quality'>('property_id');
  const [ask, setAsk] = useState<string>('');
  const [askApplied, setAskApplied] = useState<string>('');
  const [agent, setAgent] = useState<{ narrative: string; usedAi: boolean } | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  async function loadAgent() {
    setAgentLoading(true);
    setAgent(null);
    try {
      const r = await fetch(apiUrl(`/api/agent?q=${encodeURIComponent(q)}`));
      const j = await r.json();
      if (r.ok) setAgent(j.report);
      else setAgent({ narrative: j.error || 'שגיאה', usedAi: false });
    } catch (e: any) {
      setAgent({ narrative: String(e?.message ?? e), usedAi: false });
    } finally {
      setAgentLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const url = `/api/profile?q=${encodeURIComponent(q)}${askApplied ? `&ask=${encodeURIComponent(askApplied)}` : ''}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error || r.status))))
      .then((data: FullProfile) => alive && setProfile(data))
      .catch((e) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [q, askApplied]);

  const chartData = useMemo(() => {
    if (!profile) return [];
    return profile.transactions
      .filter((t) => t.price && t.dealDate)
      .map((t) => ({ date: heDate(t.dealDate), ppsqm: pricePerSqm(t.price, t.areaSqm) }))
      .filter((d) => d.ppsqm)
      .reverse();
  }, [profile]);

  function toggleLayer(k: LayerKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  if (loading) return <LoadingState q={q} />;
  if (error) return <ErrorState q={q} error={error} />;
  if (!profile) return null;

  const k = profile.key;
  const dq = profile.dealQuality;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* ==== כרטיס-על ==== */}
      <div className="hero-gradient rounded-xl2 p-7 text-white shadow-lift">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-black">{k.address || q}</div>
            <div className="mt-1 text-sm text-goldL">
              {k.gush ? `גוש ${k.gush}` : 'גוש —'} · {k.helka ? `חלקה ${k.helka}` : 'חלקה —'}
              {k.itmX ? ` · ITM ${Math.round(k.itmX)} / ${Math.round(k.itmY || 0)}` : ''}
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-center">
            <div className="text-3xl font-black">{profile.opportunityScore ?? '—'}</div>
            <div className="text-[11px] opacity-80">ציון הזדמנות</div>
          </div>
        </div>
      </div>

      {/* ==== אזהרות זמינות מקורות ==== */}
      {profile.warnings.length > 0 && (
        <div className="mt-4 rounded-xl border-r-4 border-[#d99a1a] bg-[#fdf3ec] p-4 text-sm">
          <b className="text-navy">הערות זמינות מקורות (שקיפות מלאה):</b>
          <ul className="mt-1 list-inside list-disc text-muted">
            {profile.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* ==== סרגל ייצוא ==== */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => setReportType('property_id')}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${reportType === 'property_id' ? 'bg-navysurface text-white' : 'bg-[#eef2fa] text-navy'}`}>
              תעודת זהות מלאה
            </button>
            <button onClick={() => setReportType('deal_quality')}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${reportType === 'deal_quality' ? 'bg-navysurface text-white' : 'bg-[#eef2fa] text-navy'}`}>
              דו"ח איכות עסקה
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAgent} disabled={agentLoading}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-bold text-[#3a2c07] hover:opacity-90 disabled:opacity-60">
              {agentLoading ? 'מנסח…' : 'הפק דוח AI מקיף'}
            </button>
            <button onClick={() => window.print()} className="rounded-lg bg-teal px-5 py-2 text-sm font-bold text-white hover:bg-tealD">
              הורד PDF (הדפסה)
            </button>
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 text-xs font-bold text-muted">בחר אילו שכבות ייכללו בהורדה:</div>
          <div className="flex flex-wrap gap-2">
            {profile.layers.map((l) => (
              <label key={l.key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${selected.has(l.key) ? 'border-teal bg-[#eef7f7]' : 'border-line bg-surface'}`}>
                <input type="checkbox" checked={selected.has(l.key)} onChange={() => toggleLayer(l.key)} className="accent-teal" />
                {l.title.split('—')[0].trim()}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ==== דוח AI מקיף ==== */}
      {agent && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-navy">דוח AI מקיף</h3>
            <span className="text-[11px] text-muted">{agent.usedAi ? 'נוצר ע"י מנוע AI' : 'סיכום אוטומטי (ללא מפתח AI)'}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-ink">{agent.narrative}</div>
        </div>
      )}

      {/* ==== דו"ח איכות עסקה ==== */}
      {reportType === 'deal_quality' && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
          <h3 className="text-lg font-extrabold text-navy">דו"ח איכות עסקה</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3 print:hidden">
            <div>
              <label className="block text-xs font-bold text-muted">מחיר מבוקש (₪)</label>
              <input value={ask} onChange={(e) => setAsk(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="לדוגמה 2850000"
                className="mt-1 w-48 rounded-lg border border-line px-3 py-2 outline-none focus:border-teal" />
            </div>
            <button onClick={() => setAskApplied(ask)} className="rounded-lg bg-navysurface px-4 py-2 text-sm font-bold text-white">
              חשב איכות עסקה
            </button>
          </div>

          {dq && dq.score !== null ? (
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <div className={`rounded-2xl px-6 py-4 text-center text-white ${dq.flag === 'GO' ? 'bg-[#1a9e6a]' : dq.flag === 'CAUTION' ? 'bg-[#d99a1a]' : 'bg-[#d6455b]'}`}>
                <div className="text-4xl font-black">{dq.score}</div>
                <div className="text-xs opacity-90">{dq.flag === 'GO' ? 'כדאי (GO)' : dq.flag === 'CAUTION' ? 'בזהירות' : 'לא מומלץ (NO-GO)'}</div>
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  פער מול חציון שוק: <b className={dq.askVsMarketPct! <= 0 ? 'text-[#1a9e6a]' : 'text-[#d6455b]'}>
                    {dq.askVsMarketPct! > 0 ? '+' : ''}{dq.askVsMarketPct}%
                  </b>
                </div>
                <ul className="mt-1 list-inside list-disc text-sm text-muted">
                  {dq.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <div className="mt-1"><ConfidencePill level={dq.confidence} /></div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-[#f6f8fc] p-4 text-sm text-muted">
              הזן מחיר מבוקש ולחץ "חשב איכות עסקה". החישוב מבוסס עסקאות השוואה אמיתיות — אם אין מספיק עסקאות, המערכת תציין זאת במקום להמציא ציון.
            </div>
          )}
        </div>
      )}

      {/* ==== גרף היסטוריית מחיר למ"ר ==== */}
      {selected.has('value') && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-navy">היסטוריית מחיר למ"ר — עסקאות השוואה בסביבה</h3>
            <ConfidencePill level={profile.transactions.length ? 'high' : 'low'} />
          </div>
          {/* שקיפות: המקור מחזיר עסקאות בהיקף רחוב/גוש-עיר, ולכן אסור להציג
              את הגרף כאילו הוא מתאר את הנכס עצמו. */}
          {profile.transactionsScope && (
            <p className="mb-3 text-xs text-muted">
              {profile.transactionsScope} — לא בהכרח בנכס עצמו.
              {profile.parcelTransactions?.length
                ? ` מתוכן ${profile.parcelTransactions.length} בחלקה של הנכס.`
                : ' לא נמצאו עסקאות בחלקה של הנכס.'}
            </p>
          )}
          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} reversed />
                  <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => num(v)} />
                  <Tooltip formatter={(v: any) => [`${num(v)} ₪/מ"ר`, 'מחיר למ"ר']} />
                  <Line type="monotone" dataKey="ppsqm" stroke="#0ea5a4" strokeWidth={2.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg bg-[#f6f8fc] p-6 text-center text-sm text-muted">
              אין נתוני עסקאות זמינים כרגע לכתובת זו.
            </div>
          )}
        </div>
      )}

      {/* ==== 7 השכבות ==== */}
      <div className="mt-6 space-y-3">
        {profile.layers.map((layer) => (
          <details key={layer.key} open={layer.key === 'value'}
            className={`rounded-xl border border-line bg-surface shadow-card ${selected.has(layer.key) ? '' : 'print:hidden'}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="text-base font-extrabold text-navy">{layer.title}</span>
              <ConfidencePill level={layer.confidence} />
            </summary>
            <div className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-2">
              {layer.fields.map((f, i) => (
                <div key={i} className="rounded-lg bg-[#fafcfe] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{f.label}</span>
                    <StatusDot status={f.status} />
                  </div>
                  <div className="mt-1 text-lg font-black text-navy">{formatFieldValue(f.label, f.value, f.status)}</div>
                  {f.note && <div className="mt-0.5 text-[11px] text-[#d99a1a]">{f.note}</div>}
                  <SourceBadge sourceKey={f.sourceKey} lastUpdated={f.lastUpdated} isPaid={f.isPaid} costIls={f.costIls} />
                </div>
              ))}
              {layer.key === 'legal' && profile.legal && (
                <div className="sm:col-span-2 rounded-lg border border-dashed border-[#c8a24a] bg-[#fbf7ee] p-3">
                  <div className="text-sm font-bold text-navy">הזמנת נסח טאבו רשמי (בתשלום, לפי דרישה)</div>
                  <div className="mt-1 text-xs text-muted">{profile.legal.note}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {profile.legal.options.map((o) => (
                      <span key={o.type} className="rounded-full bg-surface px-2 py-1 text-[#d99a1a]">{o.type} · ~{o.costIls}₪</span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={profile.legal.officialUrl} target="_blank" rel="noreferrer"
                      className="inline-block rounded-lg bg-navysurface px-4 py-1.5 text-xs font-bold text-white">
                      להזמנה באתר הרשמי ←
                    </a>
                    <a href={apiUrl(`/request?docType=tabu&address=${encodeURIComponent(k.address || q)}&gush=${k.gush || ''}&helka=${k.helka || ''}`)}
                      className="inline-block rounded-lg border border-navy px-4 py-1.5 text-xs font-bold text-navy">
                      בקש דרך המערכת
                    </a>
                    <a href={apiUrl(`/request?docType=permit&address=${encodeURIComponent(k.address || q)}&gush=${k.gush || ''}&helka=${k.helka || ''}`)}
                      className="inline-block rounded-lg border border-[#d99a1a] px-4 py-1.5 text-xs font-bold text-[#d99a1a]">
                      בקשת מידע היתרים/חריגות
                    </a>
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {/* ==== טבלת עסקאות ==== */}
      {selected.has('value') && profile.transactions.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface p-5 shadow-card">
          <h3 className="mb-3 text-lg font-extrabold text-navy">
            עסקאות אחרונות בסביבת הנכס ({profile.transactions.length})
          </h3>
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2">תאריך</th><th>מחיר</th><th>שטח</th><th>מ"ר</th><th>חדרים</th><th>שנה</th>
              </tr>
            </thead>
            <tbody>
              {profile.transactions.slice(0, 30).map((t, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="py-2">{heDate(t.dealDate)}</td>
                  <td>{ils(t.price)}</td>
                  <td>{num(t.areaSqm)}</td>
                  <td>{num(pricePerSqm(t.price, t.areaSqm))}</td>
                  <td>{num(t.rooms)}</td>
                  <td>{t.buildYear ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted">
        הופק ב-{heDate(profile.generatedAt)} · נדל"ן ברגע · מבית עולם הסטארטאפים · הערכות אינן מהוות ייעוץ
      </div>
    </div>
  );
}

function formatFieldValue(label: string, value: string | number | null, status: string) {
  if (value === null || value === undefined) {
    if (status === 'pending') return <span className="text-sm font-normal text-muted">ממתין לחיבור מקור</span>;
    if (status === 'paid_locked') return <span className="text-sm font-normal text-[#d99a1a]">זמין בתשלום</span>;
    return <span className="text-sm font-normal text-muted">לא זמין</span>;
  }
  if (typeof value === 'number') {
    if (label.includes('מחיר') || label.includes('עסקה')) return ils(value);
    return num(value);
  }
  return String(value);
}

function LoadingState({ q }: { q: string }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="hero-gradient rounded-xl2 p-7 text-white shadow-lift">
        <div className="text-2xl font-black">{q}</div>
        <div className="mt-1 text-sm text-goldL">מפיק תעודת זהות — אוסף נתונים ממקורות רשמיים…</div>
      </div>
      <div className="mt-6 space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
    </div>
  );
}

function ErrorState({ q, error }: { q: string; error: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 text-center">
      <div className="text-xl font-black text-navy">לא הצלחנו להפיק תעודת זהות</div>
      <p className="mt-2 text-muted">כתובת: {q}</p>
      <p className="mt-1 text-sm text-[#d6455b]">{error}</p>
      <p className="mt-4 text-sm text-muted">המערכת אינה ממציאה נתונים — כאשר מקור אינו זמין, מוצגת הודעה זו במקום נתון שגוי.</p>
    </div>
  );
}
