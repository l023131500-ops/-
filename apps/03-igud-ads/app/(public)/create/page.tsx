"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdTemplate = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  required_fields: string[];
  optional_fields: string[];
  style_rules: { colors: string[]; font: string; alignment: string } | null;
  price_nis: number | null;
  allows_logo: boolean;
  allows_custom_colors: boolean;
  aspect_ratio: string;
  dalle_size: string;
};

type Step = "coupon" | "template" | "mode" | "params" | "generating" | "select";

const FIELD_LABELS: Record<string, string> = {
  title: "כותרת / שם שיעור",
  teacher_name: "שם הרב / מרצה",
  rabbi_name: "שם הרב / מרצה",
  lesson_name: "שם השיעור",
  day: "יום",
  time: "שעה",
  location: "מקום",
  contact: "פרטי קשר",
  free_text: "טקסט חופשי",
  subtitle: "כותרת משנה",
  date: "תאריך",
  phone: "טלפון",
  address: "כתובת",
  event_name: "שם האירוע",
  organizer: "מארגן",
  price: "מחיר כניסה",
  name: "שם",
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, " ");
}

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("coupon");
  const [code, setCode] = useState("");
  const [couponId, setCouponId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [mode, setMode] = useState<"new" | "clone">("new");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<{ id: string; variation_num: number; image_url?: string }[]>([]);
  const [pollStatus, setPollStatus] = useState<string>("");

  // Templates
  const [templates, setTemplates] = useState<AdTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  // params state
  const [params, setParams] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [customColors, setCustomColors] = useState<string>("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  // Load templates after coupon step
  useEffect(() => {
    if (step === "template") {
      setLoadingTemplates(true);
      fetch("/modaot/api/templates")
        .then((r) => r.json())
        .then((data) => {
          setTemplates(Array.isArray(data) ? data : []);
          setLoadingTemplates(false);
        })
        .catch(() => setLoadingTemplates(false));
    }
  }, [step]);

  async function verifyCoupon() {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/modaot/api/coupons/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "קוד לא תקין");
      setCouponId(j.coupon.id);
      setRemaining(j.coupon.max_designs - j.coupon.used_designs);
      setStep("template");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  function selectTemplate(t: AdTemplate) {
    setSelectedTemplate(t);
    // Init params with empty strings for all fields
    const allFields = [...(t.required_fields || []), ...(t.optional_fields || [])];
    const init: Record<string, string> = {};
    allFields.forEach((f) => { init[f] = ""; });
    setParams(init);
    setCustomColors((t.style_rules?.colors || []).join(", "));
    setLogoFile(null);
    setShowOptional(false);
    setStep("mode");
  }

  async function submitProject() {
    setError(null);
    setLoading(true);
    try {
      // Upload logo if provided
      let logo_path: string | undefined;
      if (selectedTemplate?.allows_logo && logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const lr = await fetch("/modaot/api/upload/logo", { method: "POST", body: fd });
        if (lr.ok) {
          const lj = await lr.json();
          logo_path = lj.path;
        }
      }

      // Parse custom colors
      const colors = customColors
        ? customColors.split(",").map((s) => s.trim()).filter((s) => /^#?[0-9A-Fa-f]{3,8}$/.test(s)).map((s) => (s.startsWith("#") ? s : "#" + s))
        : undefined;

      // Source image for clone mode
      let source_image_b64: string | undefined;
      if (mode === "clone" && sourceFile) {
        source_image_b64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(sourceFile);
        });
      }

      // Validate required fields
      if (selectedTemplate) {
        const missing = (selectedTemplate.required_fields || []).filter((f) => !params[f]?.trim());
        if (missing.length > 0) {
          throw new Error(`שדות חובה חסרים: ${missing.map(getFieldLabel).join(", ")}`);
        }
      }

      const finalParams: Record<string, unknown> = {
        ...params,
        _template_id: selectedTemplate?.id,
      };
      if (logo_path) finalParams.logo_path = logo_path;
      if (colors?.length) finalParams.colors = colors;

      const r = await fetch("/modaot/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupon_id: couponId,
          coupon_code: code,
          mode,
          template_id: selectedTemplate?.id,
          parameters: finalParams,
          source_image_b64,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "שגיאה ביצירת הפרויקט");
      setProjectId(j.project.id);
      setStep("generating");
      pollProject(j.project.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
      setLoading(false);
    }
  }

  async function pollProject(id: string) {
    let tries = 0;
    const max = 120;
    const tick = async () => {
      tries++;
      try {
        const r = await fetch(`/modaot/api/projects/${id}`);
        const j = await r.json();
        if (j.project?.status === "ready" || j.project?.status === "completed") {
          setGenerations(j.generations || []);
          setStep("select");
          setLoading(false);
          return;
        }
        if (j.project?.status === "error") {
          setError(j.project.error_message || "אירעה שגיאה ביצירה");
          setLoading(false);
          return;
        }
        setPollStatus(j.project?.status || "");
        if (tries < max) setTimeout(tick, 5000);
        else {
          setError("עיבוד אורך יותר מהצפוי, נסו שוב מאוחר יותר");
          setLoading(false);
        }
      } catch {
        if (tries < max) setTimeout(tick, 5000);
      }
    };
    tick();
  }

  async function selectGeneration(gid: string) {
    setLoading(true);
    try {
      const r = await fetch(`/modaot/api/generations/${gid}/select`, { method: "POST" });
      const j = await r.json();
      if (r.ok) router.push(`/result/${projectId}`);
      else setError(j.error || "שגיאה בבחירה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/" className="text-brand-blue text-sm hover:underline">← חזרה לבית</Link>
        <h1 className="font-serif text-3xl font-bold text-brand-dark mt-2 mb-6">יצירת מודעה חדשה</h1>

        {error && (
          <div role="alert" aria-live="assertive" className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-800 p-3 text-sm">{error}</div>
        )}

        {/* Step: coupon */}
        {step === "coupon" && (
          <div className="card">
            <label className="label" htmlFor="create-coupon-code">קוד קופון</label>
            <input id="create-coupon-code" className="input mb-3" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ADS-XXXXXXXX" />
            <button className="btn-primary" disabled={loading || !code} onClick={verifyCoupon}>
              {loading ? "בודק..." : "המשך"}
            </button>
          </div>
        )}

        {/* Step: template selection */}
        {step === "template" && (
          <div className="card">
            <h2 className="font-serif text-xl font-bold mb-4">בחר תבנית מודעה</h2>
            {loadingTemplates && <p className="text-gray-500 text-sm">טוען תבניות...</p>}
            {!loadingTemplates && templates.length === 0 && (
              <p className="text-gray-500 text-sm">אין תבניות זמינות כרגע.</p>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  className="p-4 rounded-xl border-2 border-gray-200 hover:border-brand-blue text-right transition-colors"
                  onClick={() => selectTemplate(t)}
                >
                  {t.thumbnail_url && (
                    <img src={t.thumbnail_url} alt={t.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <div className="font-serif font-bold text-sm">{t.name}</div>
                  {t.description && <div className="text-xs text-gray-500 mt-1">{t.description}</div>}
                  {t.price_nis != null && (
                    <div className="text-xs text-brand-gold font-medium mt-2">₪{t.price_nis}</div>
                  )}
                </button>
              ))}
            </div>
            {/* Fallback: continue without template */}
            <button
              className="btn-outline mt-4 w-full"
              onClick={() => { setSelectedTemplate(null); setStep("mode"); }}
            >
              המשך ללא תבנית
            </button>
          </div>
        )}

        {/* Step: mode */}
        {step === "mode" && (
          <div className="card">
            {selectedTemplate && (
              <div className="mb-4 p-3 bg-brand-blue/5 border border-brand-blue/20 rounded-lg text-sm">
                תבנית נבחרת: <strong>{selectedTemplate.name}</strong>
                <button className="mr-3 text-brand-blue hover:underline text-xs" onClick={() => setStep("template")}>
                  שנה תבנית
                </button>
              </div>
            )}
            <p className="mb-4 text-gray-700">נותרו לך <b>{remaining}</b> מודעות בקופון. בחר מסלול:</p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                className={`p-5 rounded-lg border-2 text-right ${mode === "new" ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"}`}
                onClick={() => setMode("new")}
              >
                <div className="font-serif font-bold mb-1">מודעה חדשה</div>
                <div className="text-sm text-gray-600">בונים מאפס לפי פרמטרים</div>
              </button>
              <button
                className={`p-5 rounded-lg border-2 text-right ${mode === "clone" ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"}`}
                onClick={() => setMode("clone")}
              >
                <div className="font-serif font-bold mb-1">שכפול מודעה קיימת</div>
                <div className="text-sm text-gray-600">העלאת תמונה ושינוי פרטים</div>
              </button>
            </div>
            <button className="btn-primary" onClick={() => setStep("params")}>המשך</button>
          </div>
        )}

        {/* Step: params */}
        {step === "params" && (
          <div className="card space-y-4" dir="rtl">
            {selectedTemplate ? (
              <>
                {/* Required fields */}
                {(selectedTemplate.required_fields || []).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-gray-700">שדות חובה</h3>
                    {(selectedTemplate.required_fields || []).map((field) => (
                      <div key={field}>
                        <label className="label" htmlFor={`create-field-${field}`}>
                          {getFieldLabel(field)} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`create-field-${field}`}
                          className="input"
                          value={params[field] || ""}
                          onChange={(e) => setParams({ ...params, [field]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional fields */}
                {(selectedTemplate.optional_fields || []).length > 0 && (
                  <div>
                    <button
                      type="button"
                      className="text-brand-blue text-sm hover:underline"
                      onClick={() => setShowOptional(!showOptional)}
                    >
                      {showOptional ? "▲" : "▼"} פרטים נוספים (אופציונלי)
                    </button>
                    {showOptional && (
                      <div className="mt-3 space-y-4 border-t pt-4">
                        {(selectedTemplate.optional_fields || []).map((field) => (
                          <div key={field}>
                            <label className="label" htmlFor={`create-optional-${field}`}>{getFieldLabel(field)}</label>
                            <input
                              id={`create-optional-${field}`}
                              className="input"
                              value={params[field] || ""}
                              onChange={(e) => setParams({ ...params, [field]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Logo upload */}
                {selectedTemplate.allows_logo && (
                  <div>
                    <label className="label" htmlFor="create-logo-file">לוגו / תמונה (אופציונלי)</label>
                    <input
                      id="create-logo-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                    {logoFile && <span className="text-xs text-gray-500 mt-1 block">{logoFile.name}</span>}
                  </div>
                )}

                {/* Custom colors */}
                {selectedTemplate.allows_custom_colors && (
                  <div>
                    <label className="label" htmlFor="create-custom-colors">צבעים מותאמים (hex, מופרדים בפסיק)</label>
                    <input
                      id="create-custom-colors"
                      className="input"
                      placeholder={`ברירת מחדל: ${(selectedTemplate.style_rules?.colors || []).join(", ") || "#1A2E5A, #C9A84C"}`}
                      value={customColors}
                      onChange={(e) => setCustomColors(e.target.value)}
                    />
                  </div>
                )}
              </>
            ) : (
              /* Fallback: original form */
              <div className="space-y-4">
                <div>
                  <label className="label" htmlFor="create-fallback-lesson-name">שם השיעור / כותרת</label>
                  <input id="create-fallback-lesson-name" className="input" value={params.lesson_name || ""} onChange={(e) => setParams({ ...params, lesson_name: e.target.value })} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="create-fallback-rabbi-name">שם הרב / מרצה</label>
                    <input id="create-fallback-rabbi-name" className="input" value={params.rabbi_name || ""} onChange={(e) => setParams({ ...params, rabbi_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="create-fallback-day">יום</label>
                    <input id="create-fallback-day" className="input" value={params.day || ""} onChange={(e) => setParams({ ...params, day: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="create-fallback-time">שעה</label>
                    <input id="create-fallback-time" className="input" value={params.time || ""} onChange={(e) => setParams({ ...params, time: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="create-fallback-location">מקום</label>
                    <input id="create-fallback-location" className="input" value={params.location || ""} onChange={(e) => setParams({ ...params, location: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="create-fallback-palette">צבעים (hex, מופרדים בפסיק) — אופציונלי</label>
                    <input id="create-fallback-palette" className="input" placeholder="#1A2E5A, #C9A84C" value={params.palette_str || ""} onChange={(e) => setParams({ ...params, palette_str: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="create-fallback-contact">פרטי קשר</label>
                    <input id="create-fallback-contact" className="input" value={params.contact || ""} onChange={(e) => setParams({ ...params, contact: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label" htmlFor="create-fallback-free-text">טקסט חופשי / הערות</label>
                    <textarea id="create-fallback-free-text" className="input" rows={3} value={params.free_text || ""} onChange={(e) => setParams({ ...params, free_text: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {mode === "clone" && (
              <div>
                <label className="label" htmlFor="create-source-file">העלאת מודעה קיימת (JPG/PNG)</label>
                <input id="create-source-file" type="file" accept="image/*" onChange={(e) => setSourceFile(e.target.files?.[0] || null)} />
              </div>
            )}

            <button className="btn-primary mt-4 w-full" disabled={loading} onClick={submitProject}>
              {loading ? "יוצר..." : "צור 3 ווריאציות"}
            </button>
          </div>
        )}

        {step === "generating" && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-brand-gold border-t-transparent animate-spin"></div>
            <h2 className="font-serif text-xl font-bold mb-2">המערכת מייצרת 3 ווריאציות עיצוב</h2>
            <p className="text-gray-600">תהליך זה אורך כדקה. סטטוס: {pollStatus || "ממתין"}</p>
          </div>
        )}

        {step === "select" && (
          <div>
            <h2 className="font-serif text-2xl font-bold mb-4 text-center">בחרו את הווריאציה המועדפת</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {generations.map((g) => (
                <div key={g.id} className="card text-center">
                  {g.image_url && <img src={g.image_url} alt={`וריאציה ${g.variation_num}`} className="rounded-lg mb-3" />}
                  <button className="btn-primary w-full" disabled={loading} onClick={() => selectGeneration(g.id)}>
                    בחר וריאציה {g.variation_num}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
