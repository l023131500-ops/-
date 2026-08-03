"use client";
import { useEffect, useState } from "react";

type Notif = {
  id: string;
  user_email: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

export default function AdminNotificationsPage() {
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"send" | "list">("send");

  // Send form
  const [mode, setMode] = useState<"one" | "broadcast">("one");
  const [to, setTo] = useState("");
  const [broadcast, setBroadcast] = useState<"all" | "active" | "with_coupon">("active");
  const [type, setType] = useState("custom");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");

  const load = async () => {
    const r = await fetch("/modaot/api/admin/notifications");
    const j = await r.json();
    setList(j.notifications || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    setSending(true);
    setResult("");
    const payload: Record<string, unknown> = { type, title, body: bodyText, link_url: linkUrl || undefined, also_email: alsoEmail };
    if (mode === "one") payload.to = to;
    else payload.broadcast = broadcast;

    const r = await fetch("/modaot/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    setSending(false);
    if (r.ok) {
      setResult(`נשלחו ${j.sent} הודעות${j.emailed ? `, מתוכן ${j.emailed} במייל` : ""}`);
      setTitle(""); setBodyText(""); setLinkUrl(""); setTo("");
      load();
    } else {
      setResult(`שגיאה: ${j.error}`);
    }
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-serif font-bold text-brand-blue mb-2">הודעות למשתמשים</h1>
      <p className="text-sm text-gray-600 mb-6">שליחת הודעות אישיות או הפצה למשתמשי המערכת</p>

      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setTab("send")} className={`px-4 py-2 ${tab === "send" ? "border-b-2 border-brand-blue font-bold" : "text-gray-500"}`}>
          שליחת הודעה
        </button>
        <button onClick={() => setTab("list")} className={`px-4 py-2 ${tab === "list" ? "border-b-2 border-brand-blue font-bold" : "text-gray-500"}`}>
          היסטוריה ({list.length})
        </button>
      </div>

      {tab === "send" ? (
        <div className="bg-white border rounded-lg p-6 max-w-2xl space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "one"} onChange={() => setMode("one")} />
              <span className="text-sm">משתמש בודד</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "broadcast"} onChange={() => setMode("broadcast")} />
              <span className="text-sm">הפצה</span>
            </label>
          </div>

          {mode === "one" ? (
            <div>
              <label className="block text-sm mb-1">אימייל המשתמש</label>
              <input type="email" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full border rounded px-3 py-2" placeholder="user@example.com" />
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">קהל יעד</label>
              <select value={broadcast} onChange={(e) => setBroadcast(e.target.value as "all" | "active" | "with_coupon")}
                className="w-full border rounded px-3 py-2">
                <option value="active">משתמשים פעילים בלבד</option>
                <option value="all">כל המשתמשים</option>
                <option value="with_coupon">משתמשים עם קופון</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm mb-1">סוג</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="custom">הודעה כללית</option>
              <option value="welcome">ברוך הבא</option>
              <option value="coupon_low">הודעת קופון</option>
              <option value="project_ready">פרויקט מוכן</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">כותרת *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm mb-1">תוכן</label>
            <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={5}
              className="w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm mb-1">קישור (אופציונלי)</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full border rounded px-3 py-2" placeholder="/result/abc123" />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={alsoEmail} onChange={(e) => setAlsoEmail(e.target.checked)} />
            <span className="text-sm">שלח גם במייל</span>
          </label>

          <button onClick={send} disabled={sending || !title}
            className="bg-brand-blue text-white rounded px-6 py-2 disabled:opacity-50">
            {sending ? "שולח..." : "שלח"}
          </button>

          {result && <div className="text-sm text-brand-blue">{result}</div>}
        </div>
      ) : loading ? (
        <div>טוען...</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right p-3">תאריך</th>
                <th className="text-right p-3">נמען</th>
                <th className="text-right p-3">סוג</th>
                <th className="text-right p-3">כותרת</th>
                <th className="text-right p-3">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {list.map((n) => (
                <tr key={n.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-xs">{new Date(n.created_at).toLocaleString("he-IL")}</td>
                  <td className="p-3 text-xs">{n.user_email}</td>
                  <td className="p-3 text-xs">{n.type}</td>
                  <td className="p-3">{n.title}</td>
                  <td className="p-3 text-xs">{n.is_read ? "✓ נקרא" : "טרם נקרא"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
