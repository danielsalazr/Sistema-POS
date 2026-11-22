import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 32).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function isHashedPassword(storedPassword) {
  return String(storedPassword || '').startsWith('scrypt:');
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword || !password) return false;
  const [algorithm, salt, storedHash] = String(storedPassword).split(':');
  if (algorithm !== 'scrypt' || !salt || !storedHash) return safeEqual(String(password), String(storedPassword));
  const expected = Buffer.from(storedHash, 'hex');
  const actual = scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_HOURS || 24 * 7) * 3600;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createToken(idUsuario, secret) {
  const payload = base64url(JSON.stringify({
    sub: idUsuario,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));
  return `${payload}.${sign(payload, secret)}`;
}

export function readToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}
