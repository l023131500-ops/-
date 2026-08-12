// QA stub: better-sqlite3's surface, backed by node:sqlite. Not installed in
// this checkout; this exists only so `node src/seed.js` can really run.
import { DatabaseSync } from 'node:sqlite';

export default class Database {
  constructor(path) { this._db = new DatabaseSync(path); }
  pragma(s) { try { return this._db.exec(`PRAGMA ${s}`); } catch { return null; } }
  prepare(sql) { return this._db.prepare(sql); }
  exec(sql) { return this._db.exec(sql); }
  close() { return this._db.close(); }
}
