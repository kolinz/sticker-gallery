PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── 1. マイグレーション管理 ────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_migrations (
  id         TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- ── 2. users ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- scrypt 形式: "{salt}:{hash}"
  role          TEXT NOT NULL CHECK(role IN ('admin','user')),
  display_name  TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- ── 3. categories ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  name_en         TEXT,
  area_code       TEXT NOT NULL,                 -- スタンプ ID の AREA 部分（例: 'WEB','AI'）
  emoji           TEXT NOT NULL DEFAULT '📌',
  color           TEXT NOT NULL DEFAULT '#2563EB',
  image_key       TEXT,
  description     TEXT,
  target_roles    TEXT DEFAULT '[]',             -- JSON 配列。アプリ層で parse/stringify
  recruit_message TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ── 4. stickers ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stickers (
  id                  TEXT PRIMARY KEY,
  primary_category_id TEXT NOT NULL,             -- 表示色・ID AREA の基準カテゴリー
  created_by          TEXT,                      -- users.id（NULL 可：シードデータ対応）
  name                TEXT NOT NULL,
  name_en             TEXT,
  type                TEXT NOT NULL CHECK(type IN ('practical','lecture')),
  color               TEXT NOT NULL DEFAULT '#2563EB',
  emoji               TEXT NOT NULL DEFAULT '⭐',
  image_key           TEXT,
  description         TEXT,                      -- Can-Do 記述
  skills              TEXT DEFAULT '[]',         -- JSON 配列
  level               TEXT CHECK(level IN ('実践','知識')),
  version             TEXT NOT NULL DEFAULT 'v01',
  sort_order          INTEGER DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (primary_category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by)          REFERENCES users(id) ON DELETE SET NULL
);

-- ── 5. sticker_categories（多対多 中間テーブル）─────────────

CREATE TABLE IF NOT EXISTS sticker_categories (
  sticker_id  TEXT NOT NULL,
  category_id TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,              -- このカテゴリー内でのスタンプ表示順
  PRIMARY KEY (sticker_id, category_id),
  FOREIGN KEY (sticker_id)  REFERENCES stickers(id)   ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ── 6. courses ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id              TEXT PRIMARY KEY,
  sticker_id      TEXT NOT NULL,
  name            TEXT NOT NULL,
  code            TEXT,
  type            TEXT CHECK(type IN ('practical','lecture')),  -- NULL 可：親 sticker.type を継承
  hours           INTEGER,
  curriculum_year INTEGER NOT NULL,
  content_note    TEXT,
  sort_order      INTEGER DEFAULT 0,
  FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
);

-- ── インデックス（6件）────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stickers_primary_cat ON stickers(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_stickers_created_by  ON stickers(created_by);
CREATE INDEX IF NOT EXISTS idx_sticker_cats_sticker ON sticker_categories(sticker_id);
CREATE INDEX IF NOT EXISTS idx_sticker_cats_cat     ON sticker_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_sticker      ON courses(sticker_id);
CREATE INDEX IF NOT EXISTS idx_courses_year         ON courses(curriculum_year);
