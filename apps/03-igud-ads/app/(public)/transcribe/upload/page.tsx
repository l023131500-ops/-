"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";

type Style = "litvish" | "chassidish" | "yiddish";

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ id: string; remaining: number } | null>(null);
  const [style, setStyle] = useState<Style>("litvish");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const validateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/modaot/api/transcribe/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "קוד לא תקין");
      } else {
        setCouponInfo({ id: data.coupon.id, remaining: data.coupon.remaining });
        setStep(2);
      }
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("יש לבחור קובץ אודיו");
      return;
    }
    setError(null);
    setLoading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("code", code.trim());
      formData.append("style", style);
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          router.push(`/success?id=${data.upload_id}`);
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setError(data.error || "שגיאה בהעלאה");
          } catch {
            setError("שגיאה בהעלאה");
          }
          setLoading(false);
        }
      };
      xhr.onerror = () => {
        setError("שגיאת רשת בהעלאה");
        setLoading(false);
      };
      xhr.open("POST", "/modaot/api/transcribe/uploads");
      xhr.send(formData);
    } catch {
      setError("שגיאה בהעלאה");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="container-rtl py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-serif font-bold text-brand-blue mb-2">העלאת שיעור לתמלול</h1>
          <p className="text-slate-600 mb-8">
            {step === 1
              ? "הזן את קוד הקופון שקיבלת מהמערכת"
              : "בחר את סגנון העריכה והעלה את קובץ ההקלטה"}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={validateCoupon} className="card space-y-6">
              <div>
                <label className="label">קוד קופון</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input text-lg tracking-widest text-center font-mono"
                  placeholder="XXXX-XXXX"
                  required
                  autoFocus
                />
                <p className="text-sm text-slate-500 mt-2">
                  לקבלת קוד פנה למשרדי איגוד השיעורים
                </p>
              </div>
              <button type="submit" disabled={loading || !code.trim()} className="btn-primary w-full">
                {loading ? "בודק..." : "המשך"}
              </button>
            </form>
          )}

          {step === 2 && couponInfo && (
            <form onSubmit={submitUpload} className="card space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-sm">
                ✓ קוד תקף — נותרו {couponInfo.remaining} העלאות
              </div>

              <div>
                <label className="label">סגנון עריכה</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "litvish", label: "ליטאי", desc: "לשון תורנית מדויקת" },
                    { value: "chassidish", label: "חסידי", desc: "מתובל חסידות" },
                    { value: "yiddish", label: "אידיש", desc: "שילובי אידיש" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStyle(opt.value as Style)}
                      className={`p-4 rounded-lg border-2 text-right transition ${
                        style === opt.value
                          ? "border-brand-gold bg-brand-gold/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-bold text-brand-blue">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">קובץ אודיו</label>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="input"
                  required
                />
                {file && (
                  <p className="text-sm text-slate-600 mt-2">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  פורמטים נתמכים: MP3, MP4, M4A, WAV, OGG. גודל מקסימלי: 200MB.
                </p>
              </div>

              {loading && progress > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>מעלה...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-brand-goldsurface h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-outline flex-1"
                  disabled={loading}
                >
                  חזור
                </button>
                <button type="submit" disabled={loading || !file} className="btn-primary flex-1">
                  {loading ? "מעלה..." : "העלה והתחל תמלול"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
