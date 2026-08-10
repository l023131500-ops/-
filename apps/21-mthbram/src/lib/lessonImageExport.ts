/**
 * Background color presets for canvas rendering (matching BACKGROUND_PRESETS CSS)
 */
const BG_PRESET_COLORS: Record<string, { from: string; via: string; to: string }> = {
  "navy-gold": { from: "#0f1a2e", via: "#162032", to: "#332e10" },
  "dark-teal": { from: "#0d1a1a", via: "#132826", to: "#0f211e" },
  "warm-brown": { from: "#1e150e", via: "#211c12", to: "#1a150a" },
  "deep-purple": { from: "#1a0e1e", via: "#1e1528", to: "#190d19" },
  "forest-green": { from: "#0d1a0d", via: "#122615", to: "#0f1e12" },
  "midnight-blue": { from: "#0e1021", via: "#12162e", to: "#0f141e" },
  "burgundy": { from: "#1e0e12", via: "#211218", to: "#190d0f" },
  "charcoal": { from: "#1a1a1a", via: "#262626", to: "#141414" },
  "ocean-deep": { from: "#0f1a2e", via: "#122128", to: "#0f141e" },
  "royal-gold": { from: "#1e1a0e", via: "#212018", to: "#1a180d" },
  "olive-sage": { from: "#161e0e", via: "#182412", to: "#141a0d" },
  "plum": { from: "#1e0e1e", via: "#211218", to: "#190d19" },
  "slate-steel": { from: "#1a1e24", via: "#1e2830", to: "#161a1e" },
  "copper": { from: "#241a10", via: "#211814", to: "#1a140d" },
  "emerald-night": { from: "#0d211a", via: "#0f2620", to: "#0b1a14" },
  "indigo-dark": { from: "#14101e", via: "#161528", to: "#120f1a" },
};

export interface LessonImageOptions {
  backgroundPreset?: string;
  portalName?: string;
  logoUrl?: string;
}

/**
 * Generate a styled PNG image of a lesson using Canvas API
 */
export const downloadLessonAsImage = async (lesson: any, options?: LessonImageOptions) => {
  const canvas = document.createElement("canvas");
  const W = 800;
  const H = 1100;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background - use portal preset or default
  const presetColors = options?.backgroundPreset ? BG_PRESET_COLORS[options.backgroundPreset] : null;
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, presetColors?.from || "#0f1729");
  bgGrad.addColorStop(0.5, presetColors?.via || "#162032");
  bgGrad.addColorStop(1, presetColors?.to || "#1a1a10");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle pattern dots
  ctx.fillStyle = "rgba(212, 175, 55, 0.03)";
  for (let x = 0; x < W; x += 30) {
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gold border
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(25, 25, W - 50, H - 50);

  // Inner border
  ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(35, 35, W - 70, H - 70);

  // Corner ornaments
  const drawCorner = (cx: number, cy: number, sx: number, sy: number) => {
    ctx.strokeStyle = "rgba(212, 175, 55, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 20 * sy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 20 * sx, cy);
    ctx.stroke();
  };
  drawCorner(30, 30, 1, 1);
  drawCorner(W - 30, 30, -1, 1);
  drawCorner(30, H - 30, 1, -1);
  drawCorner(W - 30, H - 30, -1, -1);

  // Helper for RTL text
  const drawRTL = (text: string, x: number, y: number, font: string, color: string, maxWidth?: number) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    if (maxWidth) {
      const words = text.split(" ");
      let line = "";
      let lineY = y;
      for (const word of words) {
        const testLine = line ? line + " " + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, lineY);
          line = word;
          lineY += parseInt(font) * 1.5 || 28;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, lineY);
      return lineY;
    } else {
      ctx.fillText(text, x, y);
      return y;
    }
  };

  // Top decorative line
  const topLineGrad = ctx.createLinearGradient(150, 0, W - 150, 0);
  topLineGrad.addColorStop(0, "rgba(212, 175, 55, 0)");
  topLineGrad.addColorStop(0.5, "rgba(212, 175, 55, 0.5)");
  topLineGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.strokeStyle = topLineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(150, 80);
  ctx.lineTo(W - 150, 80);
  ctx.stroke();

  // Header - use portal name if provided
  let curY = 120;
  const headerName = options?.portalName || "איגוד השיעורים";
  drawRTL(headerName, W - 60, curY, "bold 16px Arial", "rgba(212, 175, 55, 0.6)");
  curY += 25;
  if (!options?.portalName) {
    drawRTL("שיעורי תורה, חברותות והרצאות", W - 60, curY, "13px Arial", "rgba(255,255,255,0.35)");
  }

  // Divider
  curY += 30;
  ctx.strokeStyle = "rgba(212, 175, 55, 0.2)";
  ctx.beginPath();
  ctx.moveTo(60, curY);
  ctx.lineTo(W - 60, curY);
  ctx.stroke();

  // Rabbi name (large)
  curY += 50;
  drawRTL(lesson.rabbi_name, W - 60, curY, "bold 36px Arial", "#ffffff");

  if (lesson.rabbi_role) {
    curY += 35;
    drawRTL(lesson.rabbi_role, W - 60, curY, "18px Arial", "rgba(212, 175, 55, 0.8)");
  }

  // Subject
  curY += 50;
  drawRTL("📖  נושא השיעור", W - 60, curY, "bold 14px Arial", "rgba(212, 175, 55, 0.5)");
  curY += 35;
  curY = drawRTL(lesson.subject, W - 60, curY, "bold 28px Arial", "#e8e0d0", W - 140);

  if (lesson.lesson_style) {
    curY += 30;
    drawRTL(`סגנון: ${lesson.lesson_style}`, W - 60, curY, "16px Arial", "rgba(255,255,255,0.5)");
  }

  // Divider
  curY += 40;
  ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
  ctx.beginPath();
  ctx.moveTo(100, curY);
  ctx.lineTo(W - 100, curY);
  ctx.stroke();

  // Location
  curY += 35;
  drawRTL("📍  מיקום", W - 60, curY, "bold 14px Arial", "rgba(212, 175, 55, 0.5)");
  curY += 30;
  const locationParts = [lesson.city, lesson.neighborhood, lesson.street, lesson.street_number].filter(Boolean);
  drawRTL(locationParts.join(", "), W - 60, curY, "20px Arial", "#ffffff");

  if (lesson.synagogue_name) {
    curY += 30;
    drawRTL(`🏛️  ${lesson.synagogue_name}`, W - 60, curY, "18px Arial", "rgba(255,255,255,0.7)");
  }

  // Schedule
  if (lesson.is_recurring && lesson.schedule_days?.length > 0) {
    curY += 40;
    drawRTL("🕐  זמנים", W - 60, curY, "bold 14px Arial", "rgba(212, 175, 55, 0.5)");
    for (const d of lesson.schedule_days as any[]) {
      curY += 28;
      drawRTL(`${d.day} — ${d.time}`, W - 60, curY, "18px Arial", "#ffffff");
    }
  }

  if (lesson.specific_date) {
    curY += 35;
    drawRTL(`📅  תאריך: ${lesson.specific_date}`, W - 60, curY, "18px Arial", "#ffffff");
  }

  if (lesson.schedule_notes) {
    curY += 28;
    drawRTL(`📝  ${lesson.schedule_notes}`, W - 60, curY, "14px Arial", "rgba(255,255,255,0.5)");
  }

  // Language + audience
  curY += 40;
  drawRTL(`🌍  שפה: ${lesson.language}`, W - 60, curY, "16px Arial", "rgba(255,255,255,0.6)");

  if (lesson.target_audience?.length) {
    curY += 25;
    drawRTL(`👥  קהל יעד: ${lesson.target_audience.join(", ")}`, W - 60, curY, "16px Arial", "rgba(255,255,255,0.6)");
  }

  // Flags
  const flags: string[] = [];
  if (lesson.is_recorded) flags.push("🎥 מוקלט");
  if (lesson.is_live_stream) flags.push("📡 שידור חי");
  if (flags.length) {
    curY += 30;
    drawRTL(flags.join("  •  "), W - 60, curY, "bold 16px Arial", "rgba(212, 175, 55, 0.7)");
  }

  // Contact info
  if (lesson.contact_phone || lesson.rabbi_phone || lesson.contact_email) {
    curY += 40;
    ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
    ctx.beginPath();
    ctx.moveTo(100, curY);
    ctx.lineTo(W - 100, curY);
    ctx.stroke();

    curY += 30;
    drawRTL("📞  יצירת קשר", W - 60, curY, "bold 14px Arial", "rgba(212, 175, 55, 0.5)");
    if (lesson.contact_name) {
      curY += 25;
      drawRTL(`👤  ${lesson.contact_name}`, W - 60, curY, "16px Arial", "rgba(255,255,255,0.7)");
    }
    if (lesson.contact_phone) {
      curY += 25;
      drawRTL(`📞  ${lesson.contact_phone}`, W - 60, curY, "16px Arial", "#ffffff");
    }
    if (lesson.rabbi_phone && lesson.rabbi_phone !== lesson.contact_phone) {
      curY += 25;
      drawRTL(`📞  טלפון הרב: ${lesson.rabbi_phone}`, W - 60, curY, "16px Arial", "#ffffff");
    }
    if (lesson.contact_email) {
      curY += 25;
      drawRTL(`📧  ${lesson.contact_email}`, W - 60, curY, "16px Arial", "rgba(255,255,255,0.7)");
    }
  }

  // Bottom decorative line
  const bottomY = H - 80;
  const botLineGrad = ctx.createLinearGradient(150, 0, W - 150, 0);
  botLineGrad.addColorStop(0, "rgba(212, 175, 55, 0)");
  botLineGrad.addColorStop(0.5, "rgba(212, 175, 55, 0.5)");
  botLineGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.strokeStyle = botLineGrad;
  ctx.beginPath();
  ctx.moveTo(150, bottomY);
  ctx.lineTo(W - 150, bottomY);
  ctx.stroke();

  // Footer
  const footerText = options?.portalName
    ? `${options.portalName}  •  באדיבות איגוד השיעורים`
    : "איגוד השיעורים  •  023-133-0600";
  drawRTL(footerText, W / 2 + 140, H - 50, "12px Arial", "rgba(212, 175, 55, 0.4)");

  // Download
  const link = document.createElement("a");
  link.download = `שיעור_${lesson.rabbi_name}_${lesson.subject}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
