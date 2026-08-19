import { sourceOf } from '@/lib/sources';
import { heDate } from '@/lib/format';
import type { FieldStatus } from '@/lib/types';

// תג מקור: שם המקור + תאריך עדכון + סימון בתשלום.
export function SourceBadge({
  sourceKey,
  lastUpdated,
  isPaid,
  costIls,
}: {
  sourceKey: string;
  lastUpdated?: string;
  isPaid?: boolean;
  costIls?: number;
}) {
  const s = sourceOf(sourceKey);
  const paid = isPaid ?? s?.isPaid;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
      <span className="rounded-full bg-[#eef2fa] px-2 py-0.5 text-indigo">
        {s?.displayName ?? sourceKey}
      </span>
      {lastUpdated && <span>· עודכן {heDate(lastUpdated)}</span>}
      {paid && (
        <span className="rounded-full bg-[#fbf1dc] px-2 py-0.5 font-bold text-[#d99a1a]">
          בתשלום{costIls ? ` · ~${costIls}₪` : s?.costIls ? ` · ${s.costIls}` : ''}
        </span>
      )}
    </div>
  );
}

export function StatusDot({ status }: { status: FieldStatus }) {
  const map: Record<FieldStatus, { c: string; t: string }> = {
    ok: { c: 'bg-[#1a9e6a]', t: 'זמין' },
    pending: { c: 'bg-[#d99a1a]', t: 'ממתין לחיבור מקור' },
    unavailable: { c: 'bg-[#9aa4b5]', t: 'לא זמין כרגע' },
    paid_locked: { c: 'bg-[#c8a24a]', t: 'נעול — בתשלום' },
  };
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <span className={`inline-block h-2 w-2 rounded-full ${m.c}`} />
      {m.t}
    </span>
  );
}

export function ConfidencePill({ level }: { level?: 'high' | 'medium' | 'low' }) {
  if (!level) return null;
  const map = {
    high: { c: 'bg-[#e6f6ee] text-[#1a9e6a]', t: 'ביטחון גבוה' },
    medium: { c: 'bg-[#fbf1dc] text-[#d99a1a]', t: 'ביטחון בינוני' },
    low: { c: 'bg-[#f0f2f6] text-muted', t: 'ביטחון נמוך' },
  } as const;
  const m = map[level];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${m.c}`}>{m.t}</span>;
}
