import { users, templates, projects, brands } from "@shared/schema";
import type {
  User, InsertUser,
  Template, InsertTemplate,
  Project, InsertProject,
  Brand, InsertBrand,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // תבניות
  listTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(t: InsertTemplate): Promise<Template>;
  clearBuiltinTemplates(): Promise<void>;
  // פרויקטים
  listProjects(limit?: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(p: InsertProject): Promise<Project>;
  updateProject(id: number, patch: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;
  // מותגים (מחלקת מיתוג)
  listBrands(limit?: number): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  createBrand(b: InsertBrand): Promise<Brand>;
  updateBrand(id: number, patch: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) { return db.select().from(users).where(eq(users.id, id)).get(); }
  async getUserByUsername(username: string) { return db.select().from(users).where(eq(users.username, username)).get(); }
  async createUser(insertUser: InsertUser) { return db.insert(users).values(insertUser).returning().get(); }

  async listTemplates() { return db.select().from(templates).orderBy(desc(templates.id)).all(); }
  async getTemplate(id: number) { return db.select().from(templates).where(eq(templates.id, id)).get(); }
  async createTemplate(t: InsertTemplate) { return db.insert(templates).values(t).returning().get(); }
  async clearBuiltinTemplates() { db.delete(templates).where(eq(templates.builtin, 1)).run(); }

  async listProjects(limit = 50) { return db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(limit).all(); }
  async getProject(id: number) { return db.select().from(projects).where(eq(projects.id, id)).get(); }
  async createProject(p: InsertProject) { return db.insert(projects).values(p).returning().get(); }
  async updateProject(id: number, patch: Partial<InsertProject>) {
    return db.update(projects).set({ ...patch, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(projects.id, id)).returning().get();
  }
  async deleteProject(id: number) { db.delete(projects).where(eq(projects.id, id)).run(); }

  async listBrands(limit = 50) { return db.select().from(brands).orderBy(desc(brands.updatedAt)).limit(limit).all(); }
  async getBrand(id: number) { return db.select().from(brands).where(eq(brands.id, id)).get(); }
  async createBrand(b: InsertBrand) { return db.insert(brands).values(b).returning().get(); }
  async updateBrand(id: number, patch: Partial<InsertBrand>) {
    return db.update(brands).set({ ...patch, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(brands.id, id)).returning().get();
  }
  async deleteBrand(id: number) { db.delete(brands).where(eq(brands.id, id)).run(); }
}

export const storage = new DatabaseStorage();
