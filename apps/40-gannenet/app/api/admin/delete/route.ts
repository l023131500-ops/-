import { NextRequest, NextResponse } from "next/server";
import { deleteUpload, deleteReady, supabaseReady } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key") || "";
  const pass = process.env.ADMIN_PASSWORD || "";
  return Boolean(pass) && key === pass;
}

// Only an id `uploadItem()` itself minted (`up_<base36 ms>_<base36 rand>`) can
// reach `deleteUpload()` — deliberately narrower than `/api/admin/override`'s
// `ID_RE`, which also matches Drive ids and seed names. Nothing this route
// authorizes can name a Drive or seed asset.
const ID_RE = /^up_[a-z0-9]+_[a-z0-9]+$/;

const REASON_MSG: Record<string, string> = {
  unconfigured: "מחיקה אינה זמינה — חסר SUPABASE_SERVICE_ROLE_KEY בסביבת השרת.",
  missing: "החומר הזה כבר אינו קיים.",
  blob: "מחיקת הקובץ מהאחסון נכשלה.",
  entry: "הקובץ נמחק אך מחיקת הרשומה נכשלה — נסו שוב.",
};

export async function POST(req: NextRequest) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });
  if (!supabaseReady) {
    return NextResponse.json({ error: REASON_MSG.unconfigured }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("bad body", { status: 400 });
  }
  const fileId = String(body?.fileId || "");
  if (!ID_RE.test(fileId)) return new NextResponse("bad id", { status: 400 });

  if (!deleteReady) {
    return NextResponse.json({ error: REASON_MSG.unconfigured }, { status: 503 });
  }

  const result = await deleteUpload(fileId);
  if (!result.ok) {
    const status = result.reason === "missing" ? 404 : result.reason === "unconfigured" ? 503 : 500;
    return NextResponse.json({ error: REASON_MSG[result.reason] || "מחיקה נכשלה." }, { status });
  }
  return NextResponse.json({ ok: true, removed: result.removed });
}
