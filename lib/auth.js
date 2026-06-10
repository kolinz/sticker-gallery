import {
  createHmac,
  randomBytes,
  scrypt as _scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(_scrypt);

// ── パスワード ────────────────────────────────────────────

/**
 * @param {string} password
 * @returns {Promise<string>}  "{salt}:{hash}"
 */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * @param {string} password
 * @param {string} stored  "{salt}:{hash}"
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const [salt, hashHex] = stored.split(':');
  const storedBuf = Buffer.from(hashHex, 'hex');
  const inputBuf  = await scryptAsync(password, salt, 64);
  return timingSafeEqual(storedBuf, inputBuf);
}

// ── JWT（HS256）──────────────────────────────────────────

const HEADER_B64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  .toString('base64url');

/**
 * @param {object} payload
 * @returns {string}
 */
export function signToken(payload) {
  const secret     = process.env.JWT_SECRET ?? 'change-me-in-production';
  const expiresIn  = parseInt(process.env.JWT_EXPIRES_IN ?? '28800', 10);
  const iat        = Math.floor(Date.now() / 1000);
  const body       = Buffer.from(JSON.stringify({ ...payload, iat, exp: iat + expiresIn }))
    .toString('base64url');
  const sig = createHmac('sha256', secret)
    .update(`${HEADER_B64}.${body}`)
    .digest('base64url');
  return `${HEADER_B64}.${body}.${sig}`;
}

/**
 * @param {string} token
 * @returns {object} ペイロード
 * @throws {Error} 署名不正・有効期限切れ
 */
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET ?? 'change-me-in-production';
  const parts  = token.split('.');
  if (parts.length !== 3) throw new Error('JWT の形式が不正です');

  const [header, body, sig] = parts;
  const expected = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig,      'base64url');
  const expBuf = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('JWT の署名が無効です');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT の有効期限が切れています');
  }
  return payload;
}

// ── ミドルウェア ──────────────────────────────────────────

/** 🔑 Bearer トークン検証 → req.user をセット */
export function authenticate(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '認証トークンがありません' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: '認証トークンが無効または期限切れです' });
  }
}

/** 👑 admin ロール限定 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'この操作には管理者権限が必要です' });
  }
  next();
}

/**
 * 🔑✋ 所有者または admin のみ許可するミドルウェアを返す。
 * @param {string | null | undefined} createdBy  stickers.created_by の値
 */
export function requireOwnerOrAdmin(createdBy) {
  return function (req, res, next) {
    const user = req.user;
    if (!user) return res.status(401).json({ error: '認証が必要です' });
    if (createdBy == null) {
      // created_by が NULL のリソースは admin のみ操作可
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'この操作には管理者権限が必要です' });
      }
    } else if (user.role !== 'admin' && user.sub !== createdBy) {
      return res.status(403).json({ error: '自分のリソースのみ操作できます' });
    }
    next();
  };
}
