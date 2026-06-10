import { Router } from 'express';
import db from '../lib/database.js';
import { imageUrl } from '../lib/imageStore.js';
import { authenticate, requireAdmin } from '../lib/auth.js';
import { requireFields, isAlphaHyphen, isUpperAlphaNum } from '../lib/validate.js';

const router = Router();

// ── snake_case → camelCase 変換 ───────────────────────────

function formatCategory(row) {
  return {
    id:             row.id,
    name:           row.name,
    nameEn:         row.name_en        ?? null,
    areaCode:       row.area_code,
    emoji:          row.emoji,
    color:          row.color,
    imageKey:       row.image_key      ?? null,
    imageUrl:       imageUrl(row.image_key),
    description:    row.description    ?? null,
    targetRoles:    JSON.parse(row.target_roles ?? '[]'),
    recruitMessage: row.recruit_message ?? null,
    sortOrder:      row.sort_order,
    stickerCount:   row.sticker_count  ?? 0,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

// ── GET /api/categories（公開）────────────────────────────

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT c.*,
             COUNT(s.id) AS sticker_count
      FROM   categories c
      LEFT JOIN stickers s ON s.primary_category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.created_at ASC
    `).all();

    res.json(rows.map(formatCategory));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/categories（👑 admin）──────────────────────

router.post('/', authenticate, requireAdmin, (req, res, next) => {
  try {
    const {
      id, name, areaCode,
      nameEn, emoji, color, imageKey,
      description, targetRoles, recruitMessage, sortOrder,
    } = req.body ?? {};

    // 必須フィールド
    const req1 = requireFields(req.body ?? {}, ['id', 'name', 'areaCode']);
    if (!req1.ok) return res.status(400).json({ error: req1.error });

    // id: 英数字・ハイフンのみ 50 文字以下
    if (!isAlphaHyphen(id, 50)) {
      return res.status(400).json({ error: 'id は英数字・ハイフンのみ 50 文字以下にしてください' });
    }
    // areaCode: 英大文字・数字のみ 8 文字以下
    if (!isUpperAlphaNum(areaCode, 8)) {
      return res.status(400).json({ error: 'areaCode は英大文字・数字のみ 8 文字以下にしてください' });
    }

    db.prepare(`
      INSERT INTO categories
        (id, name, name_en, area_code, emoji, color, image_key,
         description, target_roles, recruit_message, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      nameEn        ?? null,
      areaCode,
      emoji         ?? '📌',
      color         ?? '#2563EB',
      imageKey      ?? null,
      description   ?? null,
      JSON.stringify(targetRoles ?? []),
      recruitMessage ?? null,
      sortOrder      ?? 0,
    );

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(formatCategory({ ...created, sticker_count: 0 }));
  } catch (err) {
    // UNIQUE 制約違反（area_code は UNIQUE ではないが id は PK で一意）
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
        err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: '同じ id または area_code がすでに存在します' });
    }
    next(err);
  }
});

// ── PUT /api/categories/:id（👑 admin）───────────────────

router.put('/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'カテゴリーが見つかりません' });

    // area_code の変更は禁止
    const { areaCode } = req.body ?? {};
    if (areaCode !== undefined && areaCode !== existing.area_code) {
      return res.status(400).json({ error: 'area_code は変更できません' });
    }

    const {
      name, nameEn, emoji, color, imageKey,
      description, targetRoles, recruitMessage, sortOrder,
    } = req.body ?? {};

    db.prepare(`
      UPDATE categories SET
        name            = COALESCE(?, name),
        name_en         = ?,
        emoji           = COALESCE(?, emoji),
        color           = COALESCE(?, color),
        image_key       = ?,
        description     = ?,
        target_roles    = COALESCE(?, target_roles),
        recruit_message = ?,
        sort_order      = COALESCE(?, sort_order),
        updated_at      = datetime('now')
      WHERE id = ?
    `).run(
      name           ?? null,
      nameEn         !== undefined ? (nameEn ?? null)          : existing.name_en,
      emoji          ?? null,
      color          ?? null,
      imageKey       !== undefined ? (imageKey ?? null)        : existing.image_key,
      description    !== undefined ? (description ?? null)     : existing.description,
      targetRoles    !== undefined ? JSON.stringify(targetRoles) : null,
      recruitMessage !== undefined ? (recruitMessage ?? null)  : existing.recruit_message,
      sortOrder      ?? null,
      id,
    );

    const updated = db.prepare(`
      SELECT c.*, COUNT(s.id) AS sticker_count
      FROM   categories c
      LEFT JOIN stickers s ON s.primary_category_id = c.id
      WHERE  c.id = ?
      GROUP BY c.id
    `).get(id);

    res.json(formatCategory(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/categories/:id（👑 admin）────────────────

router.delete('/:id', authenticate, requireAdmin, (req, res, next) => {
  try {
    const { id } = req.params;

    // primary_category_id 参照スタンプの存在チェック（409）
    const ref = db.prepare(
      'SELECT 1 FROM stickers WHERE primary_category_id = ? LIMIT 1'
    ).get(id);
    if (ref) {
      return res.status(409).json({
        error: '配下のスタンプの主カテゴリーを変更してから再試行してください',
      });
    }

    const existing = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'カテゴリーが見つかりません' });

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
