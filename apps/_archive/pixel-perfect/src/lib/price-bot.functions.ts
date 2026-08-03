import { createServerFn } from "@tanstack/react-start";
import process from "node:process";
import { z } from "zod";

// Thin server-side proxy to the existing FastAPI price-comparison backend.
// The browser never calls the backend directly: these run server-side only,
// read secrets from process.env inside the handler, and return plain DTOs.

const FETCH_TIMEOUT_MS = 30_000;

export interface PriceResult {
  product_name: string;
  manufacturer: string | null;
  chain_name: string;
  branch_name: string | null;
  price: number;
}

export interface SearchResponse {
  status: "found" | "not_found" | "error" | "not_configured";
  query: string;
  results: PriceResult[];
  error: string | null;
}

export interface StatusResponse {
  ok: boolean;
  priceRows: number | null;
  error: string | null;
}

export interface TriggerResponse {
  started: boolean;
  error: string | null;
}

function getBaseUrl(): string | null {
  const raw = process.env.PRICE_BOT_API_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const searchPrices = createServerFn({ method: "POST" })
  .inputValidator(z.object({ query: z.string().trim().min(1).max(100) }))
  .handler(async ({ data }): Promise<SearchResponse> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return {
        status: "not_configured",
        query: data.query,
        results: [],
        error: "PRICE_BOT_API_URL is not configured",
      };
    }

    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/web/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: data.query }),
      });

      if (!res.ok) {
        console.error(`web/search failed: ${res.status} ${res.statusText}`);
        return {
          status: "error",
          query: data.query,
          results: [],
          error: `Backend returned ${res.status}`,
        };
      }

      const json = (await res.json()) as {
        status?: string;
        query?: string;
        results?: PriceResult[];
      };

      const results = Array.isArray(json.results)
        ? json.results.map((r) => ({
            product_name: String(r.product_name ?? ""),
            manufacturer: r.manufacturer ?? null,
            chain_name: String(r.chain_name ?? ""),
            branch_name: r.branch_name ?? null,
            price: Number(r.price),
          }))
        : [];

      return {
        status: results.length > 0 ? "found" : "not_found",
        query: json.query ?? data.query,
        results,
        error: null,
      };
    } catch (error) {
      console.error("web/search request error:", error);
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        status: "error",
        query: data.query,
        results: [],
        error: aborted ? "Request timed out" : "Backend is unreachable",
      };
    }
  });

export const getStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<StatusResponse> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return { ok: false, priceRows: null, error: "not_configured" };
    }

    try {
      const res = await fetchWithTimeout(`${baseUrl}/health`, {
        method: "GET",
      });

      if (!res.ok) {
        console.error(`health failed: ${res.status} ${res.statusText}`);
        return { ok: false, priceRows: null, error: `Backend returned ${res.status}` };
      }

      const json = (await res.json()) as { status?: string; price_rows?: number };
      return {
        ok: json.status === "ok",
        priceRows: typeof json.price_rows === "number" ? json.price_rows : null,
        error: null,
      };
    } catch (error) {
      console.error("health request error:", error);
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        priceRows: null,
        error: aborted ? "Request timed out" : "Backend is unreachable",
      };
    }
  },
);

export const triggerFetch = createServerFn({ method: "POST" }).handler(
  async (): Promise<TriggerResponse> => {
    const baseUrl = getBaseUrl();
    const token = process.env.PRICE_BOT_ADMIN_TOKEN;
    if (!baseUrl || !token) {
      return { started: false, error: "not_configured" };
    }

    try {
      const res = await fetchWithTimeout(`${baseUrl}/api/admin/trigger-fetch`, {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });

      if (res.status === 401) {
        return { started: false, error: "unauthorized" };
      }
      if (!res.ok) {
        console.error(`trigger-fetch failed: ${res.status} ${res.statusText}`);
        return { started: false, error: `Backend returned ${res.status}` };
      }

      return { started: true, error: null };
    } catch (error) {
      console.error("trigger-fetch request error:", error);
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        started: false,
        error: aborted ? "Request timed out" : "Backend is unreachable",
      };
    }
  },
);
