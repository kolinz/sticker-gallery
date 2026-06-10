import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import db from '../lib/database.js';
import { imageUrl } from '../lib/imageStore.js';
import { authenticate, requireOwnerOrAdmin } from '../lib/auth.js';
import { requireFields, isEnum, isStringRange } from '../lib/validate.js';

const router = Router();

// ── ヘルパー ──────────────────────────────────────────────

/** course 行を camelCase に変換 */
function formatCourse(row) {
  return {
    id:             row.id,
    stickerId:      row.sticker_id,
    name:           row.name,
    code:           row.code           ?? null,
    type:           row.type           ?? null,
    hours:          row.hours          ?? null,
    curriculumYear: row.curriculum_year,
    contentNote:    row.content_note   ?? null,
    sortOrder:      row.sort_order,
  };
}

/** sticker 行（+ courses 配列・categories 配列・createdBy）を camelCase に変換 */
function formatSticker(row, categories, courses, createdBy) {
  return {
    id:                row.id,
    primaryCategoryId: row.primary_category_id,
    categories,
    createdBy,
    name:              row.name,
    nameEn:            row.name_en      ?? null,
    type:              row.type,
    color:             row.color,
    emoji:             row.emoji,
    imageKey:          row.image_key    ?? null,
    imageUrl:          imageUrl(row.image_key),
    description:       row.description  ?? null,
    skills:            JSON.parse(row.skills ?? '[]'),
    level:             row.level        ?? null,
    version:           row.version,
    sortOrder:         row.sort_order,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
    courses,
  };
}

/** スタンプ 1 件分のデータをフル構築して返す */
function buildSticker(sticker) {
  // 所属カテゴリー一覧
  const catRows = db.prepare(`
    SELECT c.id, c.name, c.area_code, c.color
    FROM   sticker_categories sc
    JOIN   categories c ON c.id = sc.category_id
    WHERE  sc.sticker_id = ?
    ORDER BY sc.sort_order ASC, c.id ASC
  `).all(sticker.id);

  const categories = catRows.map(r => ({
    id:       r.id,
    name:     r.name,
    areaCode: r.area_code,
    color:    r.color,
  }));

  // 関連授業
  const courseRows = db.prepare(`
    SELECT * FROM courses
    WHERE  sticker_id = ?
    ORDER BY curriculum_year DESC, sort_order ASC
  `).all(sticker.id);

  const courses = courseRows.map(formatCourse);

  // 作成者
  let createdBy = null;
  if (sticker.created_by) {
    const user = db.prepare('SELECT id, display_name FROM users WHERE id = ?')
      .get(sticker.created_by);
    if (user) createdBy = { id: user.id, displayName: user.display_name ?? null };
  }

  return formatSticker(sticker, categories, courses, createdBy);
}

// ── GET /api/stickers（公開）─────────────────────────────

router.get('/', (req, res, next) => {
  try {
    const stickers = db.prepare(`
      SELECT * FROM stickers
      ORDER BY sort_order ASC, created_at ASC
    `).all();

    res.json(stickers.map(buildSticker));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/stickers（🔑 authenticate）─────────────────

router.post('/', authenticate, (req, res, next) => {
  try {
    const {
      id, primaryCategoryId, categoryIds, name, nameEn,
      type, color, emoji, imageKey, description, skills,
      level, version, sortOrder, courses = [],
    } = req.body ?? {};

    // 必須バリデーション
    const req1 = requireFields(req.body ?? {}, ['id', 'primaryCategoryId', 'name', 'type']);
    if (!req1.ok) return res.status(400).json({ error: req1.error });

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ error: 'categoryIds は 1 件以上必要です' });
    }
    if (!categoryIds.includes(primaryCategoryId)) {
      return res.status(400).json({ error: 'categoryIds に primaryCategoryId を含めてください' });
    }
    if (!isEnum(type, ['practical', 'lecture'])) {
      return res.status(400).json({ error: 'type は practical または lecture にしてください' });
    }
    if (level !== undefined && !isEnum(level, ['実践', '知識'])) {
      return res.status(400).json({ error: 'level は 実践 または 知識 にしてください' });
    }

    const insertSticker = db.prepare(`
      INSERT INTO stickers
        (id, primary_category_id, created_by, name, name_en, type,
         color, emoji, image_key, description, skills, level, version, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertStickerCat = db.prepare(`
      INSERT INTO sticker_categories (sticker_id, category_id, sort_order)
      VALUES (?, ?, ?)
    `);
    const insertCourse = db.prepare(`
      INSERT INTO courses
        (id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.prepare('BEGIN').run();
    try {
      insertSticker.run(
        id,
        primaryCategoryId,
        req.user.sub,
        name,
        nameEn      ?? null,
        type,
        color       ?? '#2563EB',
        emoji       ?? '⭐',
        imageKey    ?? null,
        description ?? null,
        JSON.stringify(skills ?? []),
        level       ?? null,
        version     ?? 'v01',
        sortOrder   ?? 0,
      );

      categoryIds.forEach((catId, idx) => {
        insertStickerCat.run(id, catId, idx * 10);
      });

      courses.forEach((c, idx) => {
        insertCourse.run(
          c.id ?? randomUUID(),
          id,
          c.name,
          c.code           ?? null,
          c.type           ?? null,
          c.hours          ?? null,
          c.curriculumYear,
          c.contentNote    ?? null,
          c.sortOrder      ?? idx * 10,
        );
      });

      db.prepare('COMMIT').run();
    } catch (err) {
      db.prepare('ROLLBACK').run();
      throw err;
    }

    const created = db.prepare('SELECT * FROM stickers WHERE id = ?').get(id);
    res.status(201).json(buildSticker(created));
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: '同じ id のスタンプがすでに存在します' });
    }
    next(err);
  }
});

// ── PUT /api/stickers/:id（🔑✋ ownerOrAdmin）────────────

router.put('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM stickers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'スタンプが見つかりません' });

    // 所有者 or admin チェック
    const ownerCheck = requireOwnerOrAdmin(existing.created_by);
    ownerCheck(req, res, () => {
      try {
        const {
          primaryCategoryId, categoryIds, name, nameEn,
          type, color, emoji, imageKey, description, skills,
          level, version, sortOrder, courses = [],
        } = req.body ?? {};

        // バリデーション
        const req2 = requireFields(req.body ?? {}, ['primaryCategoryId', 'name', 'type']);
        if (!req2.ok) return res.status(400).json({ error: req2.error });

        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
          return res.status(400).json({ error: 'categoryIds は 1 件以上必要です' });
        }
        if (!categoryIds.includes(primaryCategoryId)) {
          return res.status(400).json({ error: 'categoryIds に primaryCategoryId を含めてください' });
        }
        if (!isEnum(type, ['practical', 'lecture'])) {
          return res.status(400).json({ error: 'type は practical または lecture にしてください' });
        }
        if (level !== undefined && !isEnum(level, ['実践', '知識'])) {
          return res.status(400).json({ error: 'level は 実践 または 知識 にしてください' });
        }

        const insertStickerCat = db.prepare(`
          INSERT INTO sticker_categories (sticker_id, category_id, sort_order)
          VALUES (?, ?, ?)
        `);
        const insertCourse = db.prepare(`
          INSERT INTO courses
            (id, sticker_id, name, code, type, hours, curriculum_year, content_note, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        db.prepare('BEGIN').run();
        try {
          // 洗い替え
          db.prepare('DELETE FROM sticker_categories WHERE sticker_id = ?').run(id);
          categoryIds.forEach((catId, idx) => {
            insertStickerCat.run(id, catId, idx * 10);
          });

          db.prepare('DELETE FROM courses WHERE sticker_id = ?').run(id);
          courses.forEach((c, idx) => {
            insertCourse.run(
              c.id ?? randomUUID(),
              id,
              c.name,
              c.code           ?? null,
              c.type           ?? null,
              c.hours          ?? null,
              c.curriculumYear,
              c.contentNote    ?? null,
              c.sortOrder      ?? idx * 10,
            );
          });

          db.prepare(`
            UPDATE stickers SET
              primary_category_id = ?,
              name                = ?,
              name_en             = ?,
              type                = ?,
              color               = ?,
              emoji               = ?,
              image_key           = ?,
              description         = ?,
              skills              = ?,
              level               = ?,
              version             = ?,
              sort_order          = ?,
              updated_at          = datetime('now')
            WHERE id = ?
          `).run(
            primaryCategoryId,
            name,
            nameEn      ?? null,
            type,
            color       ?? existing.color,
            emoji       ?? existing.emoji,
            imageKey    !== undefined ? (imageKey ?? null) : existing.image_key,
            description ?? null,
            JSON.stringify(skills ?? []),
            level       ?? null,
            version     ?? existing.version,
            sortOrder   ?? existing.sort_order,
            id,
          );

          db.prepare('COMMIT').run();
        } catch (err) {
          db.prepare('ROLLBACK').run();
          throw err;
        }

        const updated = db.prepare('SELECT * FROM stickers WHERE id = ?').get(id);
        res.json(buildSticker(updated));
      } catch (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/stickers/:id（🔑✋ ownerOrAdmin）─────────

router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM stickers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'スタンプが見つかりません' });

    const ownerCheck = requireOwnerOrAdmin(existing.created_by);
    ownerCheck(req, res, () => {
      try {
        // courses・sticker_categories は CASCADE で自動削除
        db.prepare('DELETE FROM stickers WHERE id = ?').run(id);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
