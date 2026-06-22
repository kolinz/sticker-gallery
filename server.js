import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import authRoutes      from './routes/authRoutes.js';
import categoriesRoutes from './routes/categories.js';
import stickersRoutes  from './routes/stickers.js';
import usersRoutes     from './routes/users.js';
import uploadRoutes    from './routes/upload.js';

const app     = express();
const PORT    = parseInt(process.env.PORT ?? '3000', 10);
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');

// ── 1. helmet（最初に適用）────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],                                       // inline script 禁止
      styleSrc:   ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:'],                              // /uploads/ は same-origin
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,   // 画像配信との兼ね合い
}));

// ── 2. ボディパーサー ─────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 3. CORS（development のみ localhost:5173 を許可）──────

const ALLOWED_ORIGINS = {
  development: ['http://localhost:5173'],
  staging:     [],
  production:  [],
};

const corsOrigins = ALLOWED_ORIGINS[process.env.APP_ENV ?? 'development'] ?? [];

if (corsOrigins.length > 0) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin',  origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}

// ── 4. レート制限（ログイン API のみ）────────────────────

const loginLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,  // 15 分
  max:            10,               // 15 分間に最大 10 回
  standardHeaders: true,
  legacyHeaders:  false,
  message: { error: 'ログイン試行回数が上限を超えました。15分後に再試行してください。' },
});

// ── 5. ルーターのマウント ─────────────────────────────────

app.use('/api/auth',       loginLimiter, authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/stickers',   stickersRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api',            uploadRoutes);   // POST /api/upload / DELETE /api/image/*

// ── 6. 静的ファイル配信（アップロード画像）───────────────

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(resolve('./client/dist')));

// ── 7. SPA フォールバック（production / staging のみ）────

if (process.env.APP_ENV !== 'development') {
  const { createReadStream, existsSync } = await import('node:fs');
  const indexPath = resolve('./client/dist/index.html');

  app.get('*', (_req, res) => {
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not Found');
    }
  });
}

// ── 8. グローバルエラーハンドラー ────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const isDev = process.env.APP_ENV === 'development';
  res.status(err.status ?? 500).json({
    error: isDev ? err.message : 'サーバーエラーが発生しました',
  });
});

// ── 起動 ──────────────────────────────────────────────────

mkdirSync(UPLOAD_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`🚀 server running on http://localhost:${PORT}  [${process.env.APP_ENV ?? 'development'}]`);
});

export default app;
