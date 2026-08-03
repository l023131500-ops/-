'use client';

import { useState } from 'react';
import type { WikiPlace } from '@/lib/wikipedia';

// רקע כתוב על המקום — מה שאדם רוצה לדעת לפני שהוא קונה שם דירה: מאיפה
// המקום הגיע, במה הוא מוכר, מי גר בו ומה יש בו. זה בא בנוסף לאחוזי המגזרים
// ולאופי הבנייה, לא במקומם.
//
// הפרקים הארוכים מקופלים כברירת מחדל: הדוח נועד להיקרא, לא להיערם.

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i} className="mt-2 text-[14px] leading-[1.9] text-ink first:mt-0">
          {p}
        </p>
      ))}
    </>
  );
}

function Article({ place, heading }: { place: WikiPlace; heading: string }) {
  const [open, setOpen] = useState(false);
  const hasSections = place.sections.length > 0;

  return (
    <div className="mt-5 first:mt-0">
      <h3 className="text-[15px] font-black text-navy">{heading}</h3>
      <div className="mt-2">
        <Paragraphs items={place.summary} />
      </div>

      {hasSections && (
        <>
          {open && (
            <div className="mt-4 space-y-4 border-r-2 border-teal/25 pr-4">
              {place.sections.map((s) => (
                <div key={s.title}>
                  <h4 className="text-[13px] font-black text-tealD">{s.title}</h4>
                  <div className="mt-1">
                    <Paragraphs items={s.paragraphs} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-navy hover:bg-slate-50"
            data-testid={`button-story-${place.kind}`}
          >
            {open
              ? 'סגירת הרחבה'
              : `הרחבה: ${place.sections.map((s) => s.title).join(' · ')}`}
          </button>
        </>
      )}
    </div>
  );
}

export function PlaceStory({
  locality,
  neighborhood,
  cityName,
}: {
  locality: WikiPlace | null;
  neighborhood: WikiPlace | null;
  cityName: string | null;
}) {
  if (!locality && !neighborhood) return null;

  return (
    <section
      className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-card"
      data-testid="panel-place-story"
    >
      <h2 className="text-lg font-black text-navy">על המקום</h2>

      {neighborhood && (
        <Article place={neighborhood} heading={`שכונת ${neighborhood.title.replace(/\s*\(.*?\)\s*/g, '').trim()}`} />
      )}
      {locality && <Article place={locality} heading={cityName ?? locality.title} />}
    </section>
  );
}
