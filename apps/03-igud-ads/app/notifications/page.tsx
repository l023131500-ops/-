"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  payment_success: "תשלום",
  payment_failed: "תשלום נכשל",
  project_ready: "פרויקט מוכן",
  transcribe_ready: "תמלול מוכן",
  coupon_low: "קופון",
  welcome: "ברוך הבא",
  custom: "מערכת",
};

export default function MyNotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await fetch("/modaot/api/notifications");
    const j = await r.json();
    setNotifs(j.notifications || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await fetch("/modaot/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };
  const markAll = async () => {
    await fetch("/modaot/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all: true }) });
    load();
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-serif font-bold text-brand-blue">ההודעות שלי</h1>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm bg-brand-bluesurface text-white rounded px-3 py-1.5">
            סמן הכל כנקרא ({unread})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-500">טוען...</div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">אין הודעות חדשות</div>
      ) : (
        <div className="space-y-3">
          {notifs.map((n) => (
            <div key={n.id} className={`border rounded-lg p-4 ${n.is_read ? "bg-surface" : "bg-blue-50 border-blue-200"}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {TYPE_LABEL[n.type] || n.type}
                    </span>
                    {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                  </div>
                  <h2 className="font-bold text-brand-blue">{n.title}</h2>
                  {n.body && <p className="text-sm text-gray-700 mt-1">{n.body}</p>}
                  <div className="text-xs text-gray-600 mt-2">
                    {new Date(n.created_at).toLocaleString("he-IL")}
                  </div>
                  {n.link_url && (
                    <Link href={n.link_url} className="inline-block mt-2 text-sm text-brand-blue underline">
                      צפה →
                    </Link>
                  )}
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="text-xs text-gray-500 hover:text-brand-blue">
                    סמן כנקרא
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
