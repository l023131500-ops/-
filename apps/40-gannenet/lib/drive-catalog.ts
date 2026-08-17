// Server-only module. Do NOT import from client components — it bundles the full
// Drive catalog JSON (~1.3MB). The shelf list fetches it via /api/drive-catalog instead.
import driveCatalog from "@/content/drive-catalog.json";
import type { ShelfItem } from "@/lib/catalog";

export const driveItems: ShelfItem[] = (driveCatalog as unknown as ShelfItem[]).map((x) => ({
  ...x,
  source: "drive" as const,
}));

const byId = new Map(driveItems.map((i) => [i.id, i]));

export function getDriveItem(id: string): ShelfItem | undefined {
  return byId.get(id);
}
