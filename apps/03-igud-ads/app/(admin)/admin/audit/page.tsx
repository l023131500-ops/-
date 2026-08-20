"use client";
import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function AuditAdmin() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    const r = await fetch(`/modaot/api/admin/audit?${params}`);
    const j = await r.json();
    const arr = Array.isArray(j) ? j : [];
    setLogs(arr);
    const uniqueActions = [...new Set(arr.map((l: AuditLog) => l.action))] as string[];
    setActions(uniqueActions);
    setLoading(false);
  }

  useEffect(() => { load(); }, [actionFilter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div dir="rtl">
      <h1 className="font-serif text-2xl font-bold text-brand-dark mb-6">יומן פעולות</h1>

      <div className="bg-surface rounded-xl border p-4 mb-4 flex gap-3 items-center">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="סינון לפי פעולה"
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="all">כל הפעולות</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button onClick={load} className="bg-brand-bluesurface text-white px-4 py-1.5 rounded text-sm">
          רענן
        </button>
      </div>

      <div className="bg-surface rounded-xl border overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">טוען...</div>
        ) : (
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-medium">תאריך</th>
                <th className="p-3 font-medium">פעולה</th>
                <th className="p-3 font-medium">סוג ישות</th>
                <th className="p-3 font-medium">מזהה</th>
                <th className="p-3 font-medium">משתמש</th>
                <th className="p-3 font-medium">פרטים</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(log.created_at).toLocaleString("he-IL")}</td>
                  <td className="p-3">
                    <span className="bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded text-xs font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{log.entity_type || "—"}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{log.entity_id?.slice(0, 8) || "—"}</td>
                  <td className="p-3 text-gray-600">{log.actor_email || "—"}</td>
                  <td className="p-3">
                    {log.details ? (
                      <div>
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-xs text-brand-blue hover:underline"
                          aria-expanded={!!expanded[log.id]}
                          aria-controls={`audit-details-${log.id}`}
                        >
                          {expanded[log.id] ? "הסתר" : "הצג"}
                        </button>
                        {expanded[log.id] && (
                          <pre id={`audit-details-${log.id}`} className="mt-2 text-xs bg-gray-50 rounded p-2 max-w-sm overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">אין רשומות.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
