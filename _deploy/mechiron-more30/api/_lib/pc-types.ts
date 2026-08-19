/**
 * Type surface consumed by `pc-supabase-read.ts`.
 *
 * These declarations are lifted verbatim from `server/price-comparison.ts` in
 * apps/27-bkalut-price. That module is the SQLite read path and pulls in
 * better-sqlite3, which cannot be bundled into a serverless function — but
 * `pc-supabase-read.ts` only ever imported it with `import type`, so splitting
 * the types out changes nothing at runtime.
 */

export type PcSourceType = "official_feed" | "supplier_submitted";
export type PcChainKind = "regulatory" | "voluntary";

export interface PcCategory {
  id: number;
  name: string;
  slug: string | null;
  sortOrder: number;
  active: boolean;
}

export interface PcStore {
  id: number;
  name: string;
  branch: string | null;
  city: string | null;
  neighborhood: string | null;
  chainId: string | null;
  storeCode: string | null;
  logoUrl: string | null;
  active: boolean;
  isSample: boolean;
  sourceType: PcSourceType;
}

export interface PcProduct {
  id: number;
  categoryId: number | null;
  name: string;
  brand: string | null;
  unit: string | null;
  barcode: string | null;
  itemCode: string | null;
  imageUrl: string | null;
  active: boolean;
  isSample: boolean;
}

export interface PcPrice {
  id: number;
  productId: number;
  storeId: number;
  price: number;
  unitPrice: number | null;
  unitOfMeasure: string | null;
  currency: string;
  onSale: boolean;
  saleNote: string | null;
  validUntil: string | null;
  sourceType: PcSourceType;
  updatedAt?: string | null;
}

export interface PcPromotion {
  id: number;
  storeId: number | null;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

export interface PcSearchOffer {
  storeId: number;
  storeName: string;
  city: string | null;
  neighborhood: string | null;
  price: number;
  unitPrice: number | null;
  onSale: boolean;
  saleNote: string | null;
  updatedAt: string | null;
  sourceType: PcSourceType;
}

export interface PcSearchRow {
  product: PcProduct;
  categoryName: string | null;
  bestPrice: number | null;
  bestStore: string | null;
  bestUnitPrice: number | null;
  offers: PcSearchOffer[];
}

export interface PcSearchFilters {
  categoryId?: number;
  search?: string;
  barcode?: string;
  brand?: string;
  city?: string;
  neighborhood?: string;
  storeId?: number;
  storeName?: string;
  minPrice?: number;
  maxPrice?: number;
  promoOnly?: boolean;
  updatedSince?: string;
  sort?: "price" | "unitPrice" | "name" | "updated";
  includeSample?: boolean;
  track?: "official" | "supplier" | "all";
}

export interface PcCatalogOffer {
  storeId: number;
  storeName: string;
  chainId: string | null;
  chainKey: string;
  chainKind: PcChainKind;
  city: string | null;
  neighborhood: string | null;
  price: number;
  unitPrice: number | null;
  onSale: boolean;
  saleNote: string | null;
  updatedAt: string | null;
}

export interface PcCatalogRow {
  product: PcProduct;
  categoryName: string | null;
  chainCount: number;
  cheapestPrice: number | null;
  cheapestStore: string | null;
  cheapestChainKind: PcChainKind | null;
  dearestPrice: number | null;
  spreadPct: number | null;
  kinds: PcChainKind[];
  offers: PcCatalogOffer[];
}

export interface PcCatalogFilters extends PcSearchFilters {
  minChains?: number;
  kind?: PcChainKind;
}

export interface PcCompareOffer extends PcCatalogOffer {
  isCheapest: boolean;
}

export interface PcComparison {
  product: PcProduct;
  categoryName: string | null;
  barcode: string;
  chainCount: number;
  cheapestPrice: number | null;
  dearestPrice: number | null;
  spreadPct: number | null;
  offers: PcCompareOffer[];
  regulatory: PcCompareOffer[];
  voluntary: PcCompareOffer[];
  history: any[];
}

export interface PcRecommendation {
  hasData: boolean;
  message: string;
  product?: { id: number; name: string; brand: string | null; unit: string | null };
  bestPrice?: number;
  bestStore?: string;
  worstPrice?: number;
  savings?: number;
  savingsPct?: number;
  offers?: PcSearchOffer[];
  alternatives?: Array<{ name: string; bestPrice: number | null; bestStore: string | null }>;
}
