import { NextRequest, NextResponse } from "next/server";
import { driveItems } from "@/lib/drive-catalog";
import { listUploaded } from "@/lib/supabase";
import { readOverrides } from "@/lib/overrides";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// POST (key in header) → full catalog with current override state, for the admin UI.
//
// Parent-uploaded material lives in Supabase storage, not in driveItems — before
// this merge the admin list only ever showed the Drive catalog, so an upload had
// no row here to hide or delete from, even though /api/admin/override and
// /api/admin/delete both already accept its id.
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return new NextResponse("unauthorized", { status: 401 });
  const [map, uploaded] = await Promise.all([readOverrides(), listUploaded()]);
  const toRow = (i: { id: string; title: string; category: string; sender: string; kind: string; sizeKB: number; source?: string }) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    sender: i.sender,
    kind: i.kind,
    sizeKB: i.sizeKB,
    source: i.source,
    hidden: Boolean(map[i.id]?.hidden),
    hiddenPages: map[i.id]?.hiddenPages || [],
  });
  const items = [...driveItems.map(toRow), ...uploaded.map(toRow)];
  return NextResponse.json({ items });
}
