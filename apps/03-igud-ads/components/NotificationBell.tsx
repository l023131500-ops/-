"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface NotifItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link_url: string | null;
  created_at: string;
  is_read: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  payment_success: "💳",
  payment_failed: "❌",
  project_ready: "🎨",
  transcribe_ready: "📄",
  coupon_low: "🎟️",
  welcome: "👋",
  custom: "📬",
};

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchCount() {
    try {
      const r = await fetch("/modaot/api/notifications/unread-count");
      if (!r.ok) return;
      const j = await r.json();
      setCount(j.count ?? 0);
      setRecent(j.recent ?? []);
    } catch {}
  }

  async function markRead(id: string) {
    await fetch("/modaot/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCount((c) => Math.max(0, c - 1));
    setRecent((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-stone-100 transition-colors"
        aria-label={`התראות${count > 0 ? ` (${count} חדשות)` : ""}`}
      >
        {/* Bell SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-600"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {count > 0 && (
          <span className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border z-50" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm text-brand-dark">התראות</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-brand-blue hover:underline"
            >
              כל ההתראות
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">אין התראות.</div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-2 p-3 border-b last:border-0 hover:bg-gray-50 ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{TYPE_ICONS[n.type] || "📬"}</span>
                  <div className="flex-1 min-w-0">
                    {n.link_url ? (
                      <Link
                        href={n.link_url}
                        onClick={() => { markRead(n.id); setOpen(false); }}
                        className="font-medium text-sm text-brand-dark hover:text-brand-blue block truncate"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <div className="font-medium text-sm text-brand-dark truncate">{n.title}</div>
                    )}
                    {n.body && (
                      <div className="text-xs text-gray-500 truncate">{n.body}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleString("he-IL")}
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 self-start"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-brand-blue hover:underline"
            >
              לתיבת ההתראות
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
