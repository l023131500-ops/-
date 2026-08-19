// QA stub: bcryptjs's two sync calls, backed by node:crypto scrypt. Salted per
// call like the real thing, which is what makes the "no rewrite when it already
// matches" path a real measurement rather than a string compare.
import crypto from 'node:crypto';

export function hashSync(plain, _rounds) {
  const salt = crypto.randomBytes(8).toString('hex');
  return `stub:${salt}:${crypto.scryptSync(String(plain), salt, 16).toString('hex')}`;
}

export function compareSync(plain, hash) {
  const [tag, salt, digest] = String(hash).split(':');
  if (tag !== 'stub' || !salt) return false;
  return crypto.timingSafeEqual(
    Buffer.from(crypto.scryptSync(String(plain), salt, 16).toString('hex')),
    Buffer.from(digest),
  );
}

export default { hashSync, compareSync };
