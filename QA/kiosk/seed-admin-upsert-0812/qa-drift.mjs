import { db } from '../../../apps/35-kioskfleet/server/src/db.js';
import { hashPassword } from '../../../apps/35-kioskfleet/server/src/auth.js';
// Exactly what POST /api/auth/change-password writes, plus a demote+deactivate.
db.prepare('UPDATE users SET password_hash = ?, role = ?, active = 0 WHERE username = ?')
  .run(hashPassword('somethingTheOwnerChose'), 'user', 'admin');
const u = db.prepare('SELECT username, role, active FROM users WHERE username = ?').get('admin');
console.log('drifted ->', JSON.stringify(u));
