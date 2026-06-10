import { Router } from 'express';
import busboy from '@fastify/busboy';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { saveImage, deleteImage } from '../lib/imageStore.js';
import { authenticate } from '../lib/auth.js';

const router = Router();

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXTS  = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const MAX_SIZE = 5 * 1024 * 1024;

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');

// ── POST /api/upload（🔑）────────────────────────────────

router.post('/upload', authenticate, (req, res, next) => {
  const ct = req.headers['content-type'] ?? '';
  if (!ct.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'multipart/form-data で送信してください' });
  }

  const rawPrefix = new URL(req.url, 'http://localhost').searchParams.get('prefix') ?? 'stickers';
  const prefix = ['stickers', 'categories'].includes(rawPrefix) ? rawPrefix : 'stickers';

  const tmpDir = join(UPLOAD_DIR, 'tmp');
  let fileReceived = false;
  let sizeExceeded = false;
  let tmpPath = null;
  let mimetype = null;

  // @fastify/busboy の file イベントは旧式シグネチャ:
  // (fieldname, stream, filename, encoding, mimeType)
  const bb = busboy({ headers: req.headers, limits: { fileSize: MAX_SIZE, files: 1 } });

  bb.on('file', (fieldname, fileStream, filename, encoding, mime) => {
    fileReceived = true;

    // MIME タイプをまず引数から取得、次にファイル名拡張子で補完
    mimetype = mime ?? '';
    if (!ALLOWED_MIMES.has(mimetype)) {
      const ext = (typeof filename === 'string' ? filename : '').split('.').pop()?.toLowerCase() ?? '';
      if (ALLOWED_EXTS[ext]) mimetype = ALLOWED_EXTS[ext];
    }

    if (!ALLOWED_MIMES.has(mimetype)) {
      fileStream.resume();
      bb.emit('error', new Error('許可されていないファイル形式です'));
      return;
    }

    tmpPath = join(tmpDir, randomUUID());
    const chunks = [];

    fileStream.on('data', chunk => chunks.push(chunk));
    fileStream.on('limit', () => { sizeExceeded = true; fileStream.resume(); });
    fileStream.on('end', async () => {
      if (sizeExceeded) return;
      try {
        await mkdir(tmpDir, { recursive: true });
        await writeFile(tmpPath, Buffer.concat(chunks));
      } catch (err) {
        bb.emit('error', err);
      }
    });
  });

  bb.on('finish', async () => {
    if (!fileReceived) return res.status(400).json({ error: 'ファイルが見つかりません' });
    if (sizeExceeded) {
      if (tmpPath) unlink(tmpPath).catch(() => {});
      return res.status(400).json({ error: 'ファイルサイズが 5MB を超えています' });
    }
    if (!tmpPath) return res.status(400).json({ error: 'ファイルの保存に失敗しました' });

    try {
      const { key, url } = await saveImage({ path: tmpPath, mimetype }, prefix);
      res.status(201).json({ key, url });
    } catch (err) {
      unlink(tmpPath).catch(() => {});
      next(err);
    }
  });

  bb.on('error', (err) => {
    if (tmpPath) unlink(tmpPath).catch(() => {});
    if (err.message === '許可されていないファイル形式です') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });

  req.pipe(bb);
});

// ── DELETE /api/image/:key(*)（🔑）───────────────────────

router.delete('/image/*', authenticate, async (req, res, next) => {
  try {
    const key = req.params[0];
    if (!key) return res.status(400).json({ error: 'key が指定されていません' });
    await deleteImage(key);
    res.status(204).end();
  } catch (err) {
    if (err.message?.startsWith('不正なパスです')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
