import { randomUUID } from 'node:crypto';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

// MIME タイプ → 拡張子マッピング
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

/**
 * multer の一時ファイルを uploads/{prefix}/ へ移動して保存する。
 * @param {{ path: string, mimetype: string }} file  multer ファイルオブジェクト
 * @param {string} prefix  'categories' | 'stickers'
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function saveImage(file, prefix) {
  const ext = MIME_TO_EXT[file.mimetype];
  if (!ext) throw new Error(`未対応の MIME タイプです: ${file.mimetype}`);

  const filename = `${randomUUID()}${ext}`;
  const key = `${prefix}/${filename}`;
  const destDir = path.join(UPLOAD_DIR, prefix);
  const destPath = path.join(destDir, filename);

  await mkdir(destDir, { recursive: true });
  await rename(file.path, destPath);

  return { key, url: imageUrl(key) };
}

/**
 * 画像ファイルを削除する。
 * パストラバーサル攻撃を防ぐため、解決後パスが UPLOAD_DIR 配下であることを検証する。
 * @param {string} key  image_key（例: 'stickers/uuid.png'）
 * @returns {Promise<void>}
 */
export async function deleteImage(key) {
  const resolved = path.resolve(UPLOAD_DIR, key);
  const boundary = UPLOAD_DIR + path.sep;

  if (!resolved.startsWith(boundary)) {
    throw new Error(`不正なパスです: ${key}`);
  }

  try {
    await unlink(resolved);
  } catch (err) {
    // ファイルが存在しない場合は無視
    if (err.code !== 'ENOENT') throw err;
  }
}

/**
 * image_key から相対 URL を生成する。
 * @param {string | null | undefined} key
 * @returns {string | null}
 */
export function imageUrl(key) {
  if (key == null) return null;
  return `/uploads/${key}`;
}
