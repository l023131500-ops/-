/**
 * Drives the real boot path — config.js → db.js → auth.js → seed.js →
 * seedadmin.js — against a throwaway SQLite file, once per simulated restart.
 *
 * `ensureSeed()` is imported rather than shelling out to `node src/seed.js`:
 * that file's standalone guard compares import.meta.url to `file://${argv[1]}`,
 * which never matches on Windows (`file://C:\...` vs `file:///C:/...`). It is
 * the shape Railway runs on Linux, so it is left alone; this harness reaches
 * the same function the server's index.js calls at startup.
 *
 * Usage: node qa-boot-seed.mjs <label>
 */
import { ensureSeed } from '../../../apps/35-kioskfleet/server/src/seed.js';
import { db } from '../../../apps/35-kioskfleet/server/src/db.js';
import { verifyPassword } from '../../../apps/35-kioskfleet/server/src/auth.js';

const label = process.argv[2] || 'boot';
const result = ensureSeed();

const user = db.prepare('SELECT * FROM users WHERE username = ?').get(process.env.SEED_ADMIN_USER || 'admin');
// Exactly what routes/auth.js POST /login checks, in its order.
const loginWorks = Boolean(
  user && Number(user.active) === 1 && verifyPassword(process.env.SEED_ADMIN_PASSWORD, user.password_hash),
);

console.log(JSON.stringify({
  label,
  result,
  user: user && { id: user.id, username: user.username, role: user.role, active: user.active, device_limit: user.device_limit },
  hash: user && user.password_hash,
  loginWithSeedPassword: loginWorks,
  totalUsers: db.prepare('SELECT COUNT(*) c FROM users').get().c,
}));
