import type {
  ResearchCache,
  InsertResearchCache,
  Lead,
  InsertLead,
} from "@shared/schema";

// In-memory storage. The research cache is a short-lived (24h) convenience cache
// and leads are mirrored locally only for debugging — the durable copy of every
// lead is written to Supabase (nadlan.research_leads) by the route handler.
// Using an in-memory store (instead of native better-sqlite3) guarantees the
// server boots reliably in the published production sandbox, where native
// modules are fragile.

export interface IStorage {
  getCachedResearch(address: string): Promise<ResearchCache | undefined>;
  upsertResearch(entry: InsertResearchCache): Promise<ResearchCache>;
  createLead(lead: InsertLead): Promise<Lead>;
}

export class MemoryStorage implements IStorage {
  private cache = new Map<string, ResearchCache>();
  private leads: Lead[] = [];
  private cacheSeq = 1;
  private leadSeq = 1;

  async getCachedResearch(address: string): Promise<ResearchCache | undefined> {
    return this.cache.get(address);
  }

  async upsertResearch(entry: InsertResearchCache): Promise<ResearchCache> {
    const existing = this.cache.get(entry.address);
    const row: ResearchCache = {
      id: existing?.id ?? this.cacheSeq++,
      address: entry.address,
      payload: entry.payload,
      fetchedAt: entry.fetchedAt,
    };
    this.cache.set(entry.address, row);
    return row;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const row = {
      id: this.leadSeq++,
      ...lead,
      createdAt: Date.now(),
    } as Lead;
    this.leads.push(row);
    return row;
  }
}

export const storage = new MemoryStorage();
