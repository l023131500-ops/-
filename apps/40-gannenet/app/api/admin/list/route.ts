import { NextRequest, NextResponse } from "next/server";
import { driveItems } from "@/lib/drive-catalog";
import { readOverrides } from "@/lib/overrides";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// POST (key in header) → full catalog with current override state, for the admin UI.
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return new NextResponse("unauthorized", { status: 401 });
  const map = await readOverrides();
  const items = driveItems.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    sender: i.sender,
    kind: i.kind,
    sizeKB: i.sizeKB,
    hidden: Boolean(map[i.id]?.hidden),
    hiddenPages: map[i.id]?.hiddenPages || [],
  }));
  return NextResponse.json({ items });
}
