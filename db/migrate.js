import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scrypt as _scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scryptAsync = promisify(_scrypt);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── DB 接続 ───────────────────────────────────────────────

const dbPath = process.env.DB_PATH ?? './db/stickers.db';

// DB ファイルのディレクトリが存在しない場合は作成
mkdirSync(dirname(resolve(dbPath)), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ── schema_migrations テーブルを確保 ─────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── 適用済みチェックヘルパー ─────────────────────────────

function isApplied(id) {
  return !!db.prepare('SELECT 1 FROM schema_migrations WHERE id = ?').get(id);
}

function markApplied(id) {
  db.prepare('INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)').run(id);
}

// ── 001_schema ────────────────────────────────────────────

const MIGRATION_001 = '001_schema';
if (isApplied(MIGRATION_001)) {
  console.log(`⏭  ${MIGRATION_001} スキップ（適用済み）`);
} else {
  const sql = readFileSync(resolve(__dirname, 'schema.sql'), 'utf-8');
  db.exec(sql);
  markApplied(MIGRATION_001);
  console.log(`✅ ${MIGRATION_001} 適用完了`);
}

// ── 002_seed ──────────────────────────────────────────────

const MIGRATION_002 = '002_seed';
if (isApplied(MIGRATION_002)) {
  console.log(`⏭  ${MIGRATION_002} スキップ（適用済み）`);
} else {
  const sql = readFileSync(resolve(__dirname, 'seed.sql'), 'utf-8');
  db.exec(sql);
  markApplied(MIGRATION_002);
  console.log(`✅ ${MIGRATION_002} 適用完了`);
}

// ── 003_init_admin ────────────────────────────────────────

const MIGRATION_003 = '003_init_admin';
if (isApplied(MIGRATION_003)) {
  console.log(`⏭  ${MIGRATION_003} スキップ（適用済み）`);
} else {
  const username = process.env.INITIAL_ADMIN_USERNAME ?? 'admin';
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? 'changeme';

  // scrypt でパスワードをハッシュ化: {salt}:{hash}
  const salt = randomBytes(16).toString('hex');
  const hashBuf = await scryptAsync(password, salt, 64);
  const passwordHash = `${salt}:${hashBuf.toString('hex')}`;

  db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password_hash, role, display_name)
    VALUES (?, ?, ?, 'admin', ?)
  `).run(randomUUID(), username, passwordHash, username);

  markApplied(MIGRATION_003);
  console.log(`✅ ${MIGRATION_003} 適用完了（admin ユーザー: ${username}）`);
}

console.log('\n🎉 マイグレーション完了');
