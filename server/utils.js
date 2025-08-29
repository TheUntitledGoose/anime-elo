import crypto from 'crypto';
import { ObjectId } from './db.js';

const HMAC_SECRET = process.env.HMAC_SECRET || 'dev-hmac-secret';

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function normalizeList(text) {
  if (!text) return [];
  return String(text)
    .split(/[\n,]/g)
    .map(s => s.trim())
    .filter(Boolean);
}

export function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

// canonical payload for HMAC: ensures ids are sorted deterministically
export function canonicalBootstrapPayload(uuid, ids, nonce, expiresAt) {
  const idsSorted = Array.isArray(ids) ? [...ids].map(String).sort() : [];
  return { uuid: String(uuid), ids: idsSorted, nonce: String(nonce), expiresAt: Number(expiresAt) };
}

export function hmacSignBootstrap(uuid, ids, nonce, expiresAt) {
  const canonical = canonicalBootstrapPayload(uuid, ids, nonce, expiresAt);
  const payload = JSON.stringify(canonical);
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

export function hmacVerifyBootstrap(uuid, ids, nonce, expiresAt, sig) {
  const expected = hmacSignBootstrap(uuid, ids, nonce, expiresAt);
  return expected === String(sig);
}

export function toObjectId(id) {
  if (id instanceof ObjectId) return id;
  return new ObjectId(String(id));
}
