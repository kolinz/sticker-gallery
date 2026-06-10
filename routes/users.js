import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../lib/database.js';
import { hashPassword } from '../lib/auth.js';
import { authenticate, requireAdmin } from '../lib/auth.js';
import { requireFields, isEnum, isStringRange } from '../lib/validate.js';

const router = Router();

// 全エンドポイントに authenticate + requireAdmin を適用
router.use(authenticate, requireAdmin);

// ── snake_case → camelCase 変換 ───────────────────────────

function formatUser(row) {
  return {
    id:           row.id,
    username:     row.username,
    displayName:  row.display_name  ?? null,
    role:         row.role,
    stickerCount: row.sticker_count ?? 0,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

// ── GET /api/users（👑）──────────────────────────────────

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT u.*,
             COUNT(s.id) AS sticker_count
      FROM   users u
      LEFT JOIN stickers s ON s.created_by = u.id
      GROUP BY u.id
      ORDER BY u.created_at ASC
    `).all();

    res.json(rows.map(formatUser));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/users（👑）─────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { username, password, role, displayName } = req.body ?? {};

    const req1 = requireFields(req.body ?? {}, ['username', 'password', 'role']);
    if (!req1.ok) return res.status(400).json({ error: req1.error });

    if (!isStringRange(username, 3, 50)) {
      return res.status(400).json({ error: 'username は 3〜50 文字にしてください' });
    }
    if (!isEnum(role, ['admin', 'user'])) {
      return res.status(400).json({ error: 'role は admin または user にしてください' });
    }

    const id           = randomUUID();
    const passwordHash = await hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username, passwordHash, role, displayName ?? null);

    const created = db.prepare(`
      SELECT u.*, 0 AS sticker_count FROM users u WHERE u.id = ?
    `).get(id);

    res.status(201).json(formatUser(created));
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: '同じ username がすでに存在します' });
    }
    next(err);
  }
});

// ── PUT /api/users/:id（👑）──────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'ユーザーが見つかりません' });

    const { displayName, role, password } = req.body ?? {};

    // 自分自身の role 変更は禁止
    if (role !== undefined && id === req.user.sub && role !== existing.role) {
      return res.status(400).json({ error: '自分自身のロールは変更できません' });
    }

    let passwordHash = existing.password_hash;
    if (password && password.trim() !== '') {
      passwordHash = await hashPassword(password);
    }

    db.prepare(`
      UPDATE users SET
        display_name  = ?,
        role          = COALESCE(?, role),
        password_hash = ?,
        updated_at    = datetime('now')
      WHERE id = ?
    `).run(
      displayName !== undefined ? (displayName ?? null) : existing.display_name,
      role ?? null,
      passwordHash,
      id,
    );

    const updated = db.prepare(`
      SELECT u.*, COUNT(s.id) AS sticker_count
      FROM   users u
      LEFT JOIN stickers s ON s.created_by = u.id
      WHERE  u.id = ?
      GROUP BY u.id
    `).get(id);

    res.json(formatUser(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/users/:id（👑）───────────────────────────

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.sub) {
      return res.status(400).json({ error: '自分自身は削除できません' });
    }

    const existing = db.prepare('SELECT 1 FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'ユーザーが見つかりません' });

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
