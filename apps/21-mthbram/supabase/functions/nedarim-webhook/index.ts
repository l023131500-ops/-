import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    
    console.log("=== NEDARIM V4 ===");
    console.log(JSON.stringify(body));

    // Parse FieldN / FieldN_Name format from Nedarim Plus
    const labelToValue: Record<string, string> = {};
    const allKeys = Object.keys(body);
    
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i];
      if (key.startsWith("Field") && !key.endsWith("_Name") && !key.includes("Max")) {
        const fieldNum = key.substring(5);
        const labelKey = "Field" + fieldNum + "_Name";
        const label = body[labelKey] ? String(body[labelKey]) : key;
        labelToValue[label] = String(body[key] || "");
      }
    }

    const g = (...labels: string[]): string => {
      for (const l of labels) {
        if (labelToValue[l] && labelToValue[l].trim()) return labelToValue[l].trim();
      }
      return "";
    };

    const contactName = g("איש קשר", "שם", "שם מלא", "שם פרטי", "שם הרב");
    const phone = g("טלפון", "נייד", "פלאפון");
    const email = g("מייל", "אימייל", "אי-מייל", "Email");
    const city = g("עיר");
    const street = g("רחוב");
    const streetNumber = g("מספר", "מס׳", "מספר בית");
    const neighborhood = g("השכונה", "שכונה", "הכונה");
    const addressLocation = g("כתובת - מיקום", "כתובת", "מיקום מדויק", "כתובת מלאה");
    const exactLocation = g("מיקום מדויק", "כתובת - מיקום", "כתובת");
    const language = g("באיזה שפה נמסר השיעור", "באיזה שפה אתם מעוניינים", "שפה");
    const forWhom = g("קהל יעד של השיעור", "למי מיועד השיעור", "עבור מי אתם מעוניינים לקבוע שיעור?", "קהל יעד");
    const subjectField = g("נושא השיעור", "נושאים ללימוד", "נושא");
    const style = g("סגנון השיעור", "סגנון", "סגנון לימוד");
    const gender = g("למי מיועד השיעור", "מגדר");
    const synagogueName = g("שם המקום (שם בית הכנסת / אולם וכו')", "שם המקום", "שם בית הכנסת", "בית כנסת");
    const orgName = g("שם הארגון שהקים את השיעור", "שם הארגון", "ארגון");
    const rabbiRole = g("תפקיד הרב", "תפקיד");
    const dayList = g("זמנים לשינוי (ניתן לסמן כמה)", "זמנים לשינוי", "ימים", "יום");
    const specificDate = g("שיעור בתאריך מסוים", "תאריך", "תאריך מסוים");
    const dateOrDay = specificDate || dayList || g("תאריך / יום");
    const lessonTime = g("שעה");
    const lessonNotes = g("הערות", "מידע על שינוי בזמן השיעור");

    const submissionType = String(body.type || "unknown").toLowerCase();

    // Always save raw to nedarim_submissions
    const { error: rawError } = await supabase.from("nedarim_submissions").insert({
      raw_data: body,
      name: contactName,
      phone: phone,
      subject: subjectField,
      city: city,
      submission_type: submissionType,
      status: "new",
      notes: [forWhom, addressLocation || exactLocation, neighborhood].filter(Boolean).join(" | "),
    });

    // ─── Helpers for slim responses ───
    // 13 שדות בסדר העמודות החדש של נדרים פלוס (אפריל 2026)
    const buildLessonAddress = (l: any): string => {
      const streetLine = [l.street, l.street_number].filter(Boolean).join(" ");
      return [streetLine, l.neighborhood].filter(Boolean).join(" / ");
    };
    const buildLessonAudience = (l: any): string => {
      return Array.isArray(l.target_audience) ? l.target_audience.join(", ") : "";
    };
    const buildLessonGender = (l: any): string => {
      return Array.isArray(l.audience_type) ? l.audience_type.join(", ") : "";
    };
    const buildScheduleDate = (l: any): string => {
      if (l.specific_date) return l.specific_date;
      const days = Array.isArray(l.schedule_days) ? l.schedule_days : [];
      if (days.length > 0) return "בכל יום " + days.map((d: any) => d.day).filter(Boolean).join(", ");
      return "";
    };
    const buildScheduleTime = (l: any): string => {
      const days = Array.isArray(l.schedule_days) ? l.schedule_days : [];
      if (days.length > 0) return days.map((d: any) => d.time).filter(Boolean).join(", ");
      return l.schedule_notes || "";
    };
    const slimLesson = (l: any) => ({
      "שם הרב": [l.rabbi_name, l.rabbi_role].filter(Boolean).join(" - "),
      "נושא השיעור": l.subject || "",
      "קהל יעד": buildLessonAudience(l),
      "עיר": l.city || "",
      "תאריך / יום": buildScheduleDate(l),
      "שעה": buildScheduleTime(l),
      "כתובת - מיקום": buildLessonAddress(l),
      "שם בית הכנסת": l.synagogue_name || "",
      "שפה": l.language || "",
      "סגנון": l.lesson_style || "",
      "מגדר": buildLessonGender(l),
      "הערות": l.submitter_notes || "",
      "שם הארגון": l.org_name || "",
    });
    const slimSynagogue = (s: any) => ({
      "שם בית הכנסת": s.name || "",
      "עיר": s.city || "",
      "שכונה": s.neighborhood || "",
      "כתובת": s.address || "",
      "טלפון": s.phone || "",
      "הערות": s.notes || "",
    });
    const slimEvent = (e: any) => ({
      "שם בית הכנסת": e.synagogue_name || "",
      "עיר": e.city || "",
      "כתובת": [e.street, e.street_number].filter(Boolean).join(" "),
      "תאריך": e.event_date || (Array.isArray(e.schedule_days) ? e.schedule_days.join(", ") : ""),
      "קהל יעד": Array.isArray(e.target_audience) ? e.target_audience.join(", ") : "",
      "פרטי קשר": [e.contact_name, e.contact_phone].filter(Boolean).join(" - "),
    });
    const slimPortal = (p: any, kind: "rabbi" | "org") => ({
      "שם": kind === "rabbi" ? p.rabbi_name : p.org_name,
      "סוג": kind === "rabbi" ? "רב" : "ארגון",
      "טלפון": p.contact_phone || "",
      "מייל": p.contact_email || "",
      "כתובת": p.contact_address || "",
      "קישור ציבורי": p.public_token
        ? `https://mthbram.lovable.app/view/${kind}/${p.public_token}`
        : "",
    });

    const ok = (payload: any) => new Response(JSON.stringify(payload), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const errRes = (message: string) => new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // ─── 1. seeker_request ───
    if (submissionType.includes("seeker") || submissionType === "seeker_request") {
      const { error: leadError } = await supabase.from("seeker_leads").insert({
        contact_name: contactName || "ממתין",
        phone, email, city,
        subject: subjectField,
        audience_type: forWhom,
        lesson_type: g("אופי השיעורים"),
        notes: [
          g("סגנון הלומדים") && "סגנון: " + g("סגנון הלומדים"),
          g("רקע מגיד שיעור") && "רקע: " + g("רקע מגיד שיעור"),
          exactLocation && "מיקום: " + exactLocation,
          neighborhood && "שכונה: " + neighborhood,
          language && "שפה: " + language,
        ].filter(Boolean).join(" | "),
        status: "new",
      });
      if (rawError || leadError) return errRes((rawError || leadError)!.message);
      return ok({ success: true, type: "seeker" });
    }

    // ─── 2. lesson_update / lesson submit ───
    if ((submissionType.includes("lesson") && !submissionType.includes("share")) || submissionType === "lesson_update") {
      // רחוב + מספר: מהשדות הישירים, ואם לא קיימים — נסה לפרק מ-"כתובת-מיקום"
      const addrSrc = addressLocation || exactLocation;
      let parsedStreet = street;
      let parsedNumber = streetNumber;
      let parsedNeighborhood = neighborhood;
      if (addrSrc && !street) {
        const lines = addrSrc.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        if (lines[0]) {
          const m = lines[0].match(/^(.*?)\s+(\d+\w*)$/);
          if (m) { parsedStreet = m[1]; parsedNumber = m[2]; }
          else parsedStreet = lines[0];
        }
        if (lines[1] && !parsedNeighborhood) parsedNeighborhood = lines[1];
      }

      // לוח זמנים — תמיכה בריבוי ימים מופרדים בפסיק/שורה חדשה
      let scheduleDays: { day: string; time: string }[] = [];
      if (dayList) {
        const days = dayList.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        scheduleDays = days.map(d => ({ day: d, time: lessonTime || "" }));
      } else if (dateOrDay && lessonTime) {
        scheduleDays = [{ day: dateOrDay, time: lessonTime }];
      }

      // אם זה תאריך ספציפי (חד-פעמי) — שמור ב-specific_date
      const isSpecificDate = !!specificDate && /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}/.test(specificDate);

      const { error: lessonError } = await supabase.from("lessons").insert({
        rabbi_name: g("שם הרב", "איש קשר") || "ממתין",
        rabbi_role: rabbiRole || "",
        subject: subjectField || "ממתין",
        city: city || "ממתין",
        neighborhood: parsedNeighborhood,
        street: parsedStreet,
        street_number: parsedNumber,
        synagogue_name: synagogueName || "",
        language: language || "עברית",
        target_audience: forWhom ? forWhom.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : [],
        audience_type: gender ? gender.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : [],
        lesson_style: style || g("אופי השיעורים"),
        rabbi_phone: phone,
        contact_name: contactName,
        contact_phone: phone,
        contact_email: email,
        org_name: orgName || "",
        is_recurring: scheduleDays.length > 0 && !isSpecificDate,
        specific_date: isSpecificDate ? specificDate : null,
        schedule_days: scheduleDays,
        schedule_notes: lessonTime || "",
        submitter_notes: ["מקור: נדרים פלוס", lessonNotes].filter(Boolean).join(" | "),
        status: "pending",
        is_approved: false,
      });
      if (rawError || lessonError) return errRes((rawError || lessonError)!.message);
      return ok({ success: true, type: "lesson" });
    }

    // ─── 3. teacher_request ───
    if (submissionType.includes("teacher") || submissionType === "teacher_request") {
      const { error: teacherError } = await supabase.from("teacher_leads").insert({
        full_name: contactName || "ממתין",
        phone, email, city,
        notes: "מקור: נדרים פלוס",
        status: "new",
      });
      if (rawError || teacherError) return errRes((rawError || teacherError)!.message);
      return ok({ success: true, type: "teacher" });
    }

    // ─── 4. lesson_share: search lessons ───
    if (submissionType === "lesson_share" || submissionType.includes("lesson_search")) {
      const searchName = g("שם הרב", "שם", "איש קשר");
      const searchPhone = g("טלפון", "נייד");
      const searchEmail = g("מייל", "אימייל");

      let query = supabase.from("lessons").select("*").eq("is_approved", true);
      if (searchName) query = query.ilike("rabbi_name", `%${searchName}%`);
      if (searchPhone) query = query.or(`rabbi_phone.eq.${searchPhone},contact_phone.eq.${searchPhone}`);
      if (searchEmail) query = query.eq("contact_email", searchEmail);
      if (city) query = query.ilike("city", `%${city}%`);
      if (subjectField) query = query.ilike("subject", `%${subjectField}%`);

      const { data: lessons } = await query.limit(10);
      const results = (lessons || []).map(slimLesson);
      return ok({ success: true, type: "lesson_share", count: results.length, results });
    }

    // ─── 5. synagogue_share: search synagogues ───
    if (submissionType === "synagogue_share" || submissionType.includes("synagogue_search")) {
      const synName = g("שם בית הכנסת", "שם", "בית כנסת");
      let query = supabase.from("synagogues").select("*");
      if (synName) query = query.ilike("name", `%${synName}%`);
      if (city) query = query.ilike("city", `%${city}%`);
      if (neighborhood) query = query.ilike("neighborhood", `%${neighborhood}%`);
      const { data } = await query.limit(10);
      const results = (data || []).map(slimSynagogue);
      return ok({ success: true, type: "synagogue_share", count: results.length, results });
    }

    // ─── 6. event_share / study_day: search study days ───
    if (submissionType === "event_share" || submissionType.includes("study_day_search") || submissionType.includes("event_search")) {
      const synName = g("שם בית הכנסת", "שם", "בית כנסת");
      let query = supabase.from("study_day_events").select("*").eq("is_approved", true);
      if (synName) query = query.ilike("synagogue_name", `%${synName}%`);
      if (city) query = query.ilike("city", `%${city}%`);
      const { data } = await query.limit(10);
      const results = (data || []).map(slimEvent);
      return ok({ success: true, type: "event_share", count: results.length, results });
    }

    // ─── 7. portal_share: search rabbi/org portals ───
    if (submissionType === "portal_share" || submissionType.includes("portal_search")) {
      const portalName = g("שם הרב", "שם הארגון", "שם");
      const [rabbiRes, orgRes] = await Promise.all([
        portalName
          ? supabase.from("rabbi_portals").select("*").ilike("rabbi_name", `%${portalName}%`).limit(5)
          : supabase.from("rabbi_portals").select("*").limit(5),
        portalName
          ? supabase.from("org_portals").select("*").ilike("org_name", `%${portalName}%`).limit(5)
          : supabase.from("org_portals").select("*").limit(5),
      ]);
      const results = [
        ...(rabbiRes.data || []).map((p) => slimPortal(p, "rabbi")),
        ...(orgRes.data || []).map((p) => slimPortal(p, "org")),
      ];
      return ok({ success: true, type: "portal_share", count: results.length, results });
    }

    if (rawError) return errRes(rawError.message);
    return ok({ success: true, type: "saved_raw" });
  } catch (err) {
    console.log("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
