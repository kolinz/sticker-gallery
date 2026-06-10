# 実装プロンプト集
## スキルスタンプ・ギャラリーシステム

| 項目 | 内容 |
|------|------|
| 対応 SDD | SDD_sticker-gallery_v8.md（v8.0） |
| 作成日 | 2026-05-20 |

| ステップ数 | 21（Step 1 〜 Step 21） |

### 使い方

1. **Step 順に実施する**。各ステップは前ステップの成果物に依存している。
2. 各ステップ冒頭の「**前提条件**」を確認してから実行する。
3. 「**SDD 参照**」で詳細な仕様を確認できる。
4. 各ステップは 1 ファイル（または密結合の 2〜3 ファイル）を対象とする。

---

## プロジェクト基盤（Step 1〜5）

### Step 1 — プロジェクト設定ファイル群

**対象ファイル**  
`package.json` / `vite.config.ts` / `.env.example` / `.gitignore`

**前提条件**  
Node.js 24 LTS がインストール済み

**SDD 参照**  
§3.1 技術スタック / §10.2 環境変数一覧 / §10.4 package.json 主要依存

---

以下の仕様で4つのファイルを生成してください。

`package.json`:
- `"type": "module"`（ESM 統一）
- `"engines": { "node": ">=24.0.0" }`
- scripts: `dev`（concurrently で nodemon server.js と vite client を同時起動）/ `build`（vite build client）/ `start`（node server.js）/ `migrate`（node db/migrate.js）
- dependencies: `express ^4.x` / `multer ^1.x` / `helmet ^8.x` / `express-rate-limit ^7.x` / `dotenv ^16.x`
- devDependencies: `vite ^5.x` / `@vitejs/plugin-react ^4.x` / `react ^18.x` / `react-dom ^18.x` / `typescript ^5.x` / `@types/react ^18.x` / `@types/react-dom ^18.x` / `@types/node ^20.x` / `tailwindcss ^3.4.x` / `autoprefixer ^10.x` / `postcss ^8.x` / `class-variance-authority ^0.7.x` / `clsx ^2.x` / `tailwind-merge ^2.x` / `lucide-react ^0.x` / `concurrently ^8.x` / `nodemon ^3.x`

`vite.config.ts`:
- `root: 'client'`
- `build.outDir: '../client/dist'`
- `server.port: 5173`
- `resolve.alias: { '@': path.resolve(__dirname, './client/src') }`
- `/api` を `http://localhost:3000` へプロキシ

`.env.example`:
以下の変数をコメント付きで定義する。
```
APP_ENV=development
PORT=3000
DB_PATH=./db/stickers.db
UPLOAD_DIR=./uploads
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=28800
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=changeme
LATEST_CURRICULUM_YEAR=2025
```

`.gitignore`:
`.env` / `node_modules/` / `db/stickers.db` / `uploads/` / `client/dist/` を除外

---

### Step 2 — データベーススキーマ

**対象ファイル**  
`db/schema.sql`

**前提条件**  
Step 1 完了

**SDD 参照**  
§4.1 ER 図 / §4.2〜4.5 各テーブル定義 / §4.6 インデックス

---

以下の仕様で `db/schema.sql` を生成してください。

冒頭で以下の PRAGMA を設定する：
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

**テーブル定義（順序厳守）**

1. `schema_migrations`（マイグレーション管理）
2. `users`（id PK / username UNIQUE / password_hash / role CHECK('admin','user') / display_name / created_at / updated_at）
3. `categories`（id PK / name / name_en / area_code NOT NULL / emoji DEFAULT '📌' / color DEFAULT '#2563EB' / image_key / description / target_roles TEXT DEFAULT '[]' / recruit_message / sort_order / created_at / updated_at）
4. `stickers`（id PK / primary_category_id FK→categories.id / created_by FK→users.id ON DELETE SET NULL / name / name_en / type CHECK('practical','lecture') / color / emoji / image_key / description / skills TEXT DEFAULT '[]' / level CHECK('実践','知識') / version DEFAULT 'v01' / sort_order / created_at / updated_at）
5. `sticker_categories`（sticker_id FK→stickers ON DELETE CASCADE / category_id FK→categories ON DELETE CASCADE / sort_order / PRIMARY KEY(sticker_id, category_id)）
6. `courses`（id PK / sticker_id FK→stickers ON DELETE CASCADE / name / code / type CHECK('practical','lecture') / hours / curriculum_year NOT NULL / content_note / sort_order）

**インデックス（全 6 件）**：
`idx_stickers_primary_cat` / `idx_stickers_created_by` / `idx_sticker_cats_sticker` / `idx_sticker_cats_cat` / `idx_courses_sticker` / `idx_courses_year`

---

### Step 3 — 初期データ

**対象ファイル**  
`db/seed.sql`

**前提条件**  
Step 2 完了

**SDD 参照**  
§4.2〜4.5 テーブル定義 / §4.7 スタンプ ID 命名規則

---

以下の仕様で `db/seed.sql` を生成してください。

すべての INSERT に `INSERT OR IGNORE` を使用し、重複実行に対して冪等にする。

**categories（4件）**

| id | name | area_code | emoji | color |
|----|------|-----------|-------|-------|
| cat-webdev | Webアプリ開発 | WEB | 🌐 | #2563EB |
| cat-ai | AI・データサイエンス | AI | 🤖 | #059669 |
| cat-ux | UX・プロダクトデザイン | UX | 🎨 | #DB2777 |
| cat-pm | プロジェクト・ビジネス | PM | 📋 | #DC2626 |

各カテゴリーに `target_roles`（JSON配列）・`recruit_message`・`description` を設定すること（実際の業務文脈に沿った内容）。

**stickers（各カテゴリー 1 件ずつ、計 4 件）**

| id | primary_category_id | type | emoji |
|----|---------------------|------|-------|
| NSS-WEB-K001v01 | cat-webdev | practical | ⚙️ |
| NSS-AI-K001v01 | cat-ai | practical | 🧠 |
| NSS-UX-K001v01 | cat-ux | practical | ✏️ |
| NSS-PM-K001v01 | cat-pm | practical | 📌 |

各スタンプに `description`（Can-Do 記述）・`skills`（JSON配列、3〜5件）・`level`（実践）を設定すること。

**sticker_categories（各スタンプを primary_category_id のカテゴリーに紐づけ）**

4行: (NSS-WEB-K001v01, cat-webdev) / (NSS-AI-K001v01, cat-ai) / (NSS-UX-K001v01, cat-ux) / (NSS-PM-K001v01, cat-pm)

**courses（各スタンプに curriculum_year=2025 の授業 1 件）**

各授業に `name` / `code` / `type` / `hours` / `content_note` を設定すること。

---

### Step 4 — マイグレーションスクリプト

**対象ファイル**  
`db/migrate.js`

**前提条件**  
Step 2・3 完了

**SDD 参照**  
§6.1 SQLite / §10.2 INITIAL_ADMIN_* 環境変数

---

以下の仕様で `db/migrate.js` を生成してください。

- ESM 形式（`import { DatabaseSync } from 'node:sqlite'` 等）
- `dotenv/config` を import して `.env` を読み込む
- `schema_migrations` テーブルで適用済みチェック → 未適用のみ実行（冪等性保証）
- マイグレーション定義：`001_schema`（db/schema.sql）→ `002_seed`（db/seed.sql）の順に適用
- 初回起動時の admin ユーザー作成：`schema_migrations` に `003_init_admin` がない場合のみ、`users` テーブルにレコードを挿入する
  - `INITIAL_ADMIN_USERNAME`（デフォルト: `admin`）/ `INITIAL_ADMIN_PASSWORD`（デフォルト: `changeme`）を使用
  - パスワードは Node.js 24 の `node:crypto` の `scrypt` でハッシュ化する（`{salt}:{hash}` 形式）
  - id には `node:crypto` の `randomUUID()` を使用
  - role は `'admin'`
- 各ステップの結果をコンソールに出力する（✅ 適用完了 / ⏭ スキップ（適用済み））

---

### Step 5 — ライブラリ層（database.js / imageStore.js）

**対象ファイル**  
`lib/database.js` / `lib/imageStore.js`

**前提条件**  
Step 1 完了

**SDD 参照**  
§6.1 SQLite / §6.2 ファイルシステム / §3.3.4 パストラバーサル対策

---

**`lib/database.js`**  
- `import { DatabaseSync } from 'node:sqlite'`（npm 不要）
- `DB_PATH` は `process.env.DB_PATH ?? './db/stickers.db'`
- `PRAGMA journal_mode = WAL` と `PRAGMA foreign_keys = ON` を設定
- シングルトンとして `export default db`

**`lib/imageStore.js`**  
以下の 3 関数を export する。

`saveImage(file, prefix)` → `{ key, url }`:
- `file` は multer のファイルオブジェクト（`file.path` / `file.mimetype` を使用）
- MIME→拡張子マッピング: `image/jpeg`→`.jpg` / `image/png`→`.png` / `image/webp`→`.webp` / `image/gif`→`.gif`
- ファイル名: `${randomUUID()}${ext}`（ユーザー指定名は一切使わない）
- 保存先: `uploads/{prefix}/{uuid}.{ext}`
- `fs/promises` の `mkdir({ recursive: true })` + `rename` で一時ファイルを移動

`deleteImage(key)` → void:
- **パストラバーサル防止**：`path.resolve(UPLOAD_DIR, key)` が `UPLOAD_DIR + path.sep` で始まることを検証。違反は Error を throw
- `unlink` で削除。ファイルが存在しない場合は無視（try/catch）

`imageUrl(key)` → string | null:
- key が null/undefined なら null を返す
- `/uploads/${key}` を返す（同一オリジンのため絶対 URL 不要）

---

## バックエンド API（Step 6〜10）

### Step 6 — 認証ライブラリと認証ルート

**対象ファイル**  
`lib/auth.js` / `routes/authRoutes.js`

**前提条件**  
Step 4・5 完了（users テーブルと database.js が存在）

**SDD 参照**  
§7.2 POST /api/auth/login / §7.3 認可ミドルウェアの実装 / Appendix E ADR-016

---

**`lib/auth.js`**  
`node:crypto` のみを使用し、外部ライブラリ不要で以下を実装する。

パスワード関連（export）:
- `hashPassword(password: string) → Promise<string>`：scrypt で `{salt}:{hash}` 形式を返す
  - salt: `randomBytes(16).toString('hex')`
  - hash: `scrypt(password, salt, 64)`（promisify して使用）
- `verifyPassword(password: string, stored: string) → Promise<boolean>`：`timingSafeEqual` でタイミング攻撃を防ぐ

JWT 関連（export）:
- `signToken(payload: object) → string`：HS256 署名。`JWT_SECRET` / `JWT_EXPIRES_IN` を使用
  - ペイロード: `{ ...payload, iat, exp }`
  - 形式: `{base64url(header)}.{base64url(payload)}.{base64url(sig)}`
- `verifyToken(token: string) → object`：署名検証 + 有効期限チェック。失敗は Error を throw

ミドルウェア（export）:
- `authenticate(req, res, next)`：`Authorization: Bearer {token}` ヘッダーから JWT を検証し `req.user` をセット
- `requireAdmin(req, res, next)`：`req.user.role !== 'admin'` なら 403
- `requireOwnerOrAdmin(createdBy)(req, res, next)`：`admin` または `req.user.sub === createdBy` でなければ 403。`createdBy` が null の場合は admin のみ許可

**`routes/authRoutes.js`**  
`POST /api/auth/login` を実装する:
- リクエスト: `{ username, password }`。いずれか欠損で 400
- `users` テーブルを username で検索。存在しない場合は 401（timing attack 対策として必ずパスワード検証を試みる）
- `verifyPassword` で照合。失敗なら 401
- `signToken({ sub: user.id, username: user.username, role: user.role })` で JWT を生成
- レスポンス: `{ token, user: { id, username, displayName, role } }`（password_hash は含めない）

---

### Step 7 — カテゴリー API

**対象ファイル**  
`routes/categories.js`

**前提条件**  
Step 5・6 完了

**SDD 参照**  
§7.1 エンドポイント一覧 / §7.5 GET /api/categories レスポンス例 / §4.3 categories テーブル / §4.8 camelCase 変換表

---

以下の仕様で `routes/categories.js` を実装してください。

DB→API の変換（snake_case → camelCase）を routes 層で一括して行う。`imageUrl(row.image_key)` で URL を組み立てる。

**GET /api/categories**（認証不要）:
- `LEFT JOIN stickers ON stickers.primary_category_id = c.id` でスタンプ件数を集計
- `sort_order ASC, created_at ASC` でソート
- レスポンスに `stickerCount` を含める
- `target_roles` は `JSON.parse` してから返す

**POST /api/categories**（`authenticate + requireAdmin`）:
- 必須: `id`（英数字・ハイフンのみ 50 文字以下）、`name`、`areaCode`
- `area_code` は一意制約エラー時に 409 を返す
- `target_roles` は `JSON.stringify` して保存

**PUT /api/categories/:id**（`authenticate + requireAdmin`）:
- 存在確認 → 404
- `area_code` の変更は禁止（現在値を上書きしない）。変更しようとした場合は 400 を返す
- `updated_at = datetime('now')` を更新

**DELETE /api/categories/:id**（`authenticate + requireAdmin`）:
- `stickers.primary_category_id = id` のスタンプが存在する場合は **409**（`error: '配下のスタンプの主カテゴリーを変更してから再試行してください'`）
- 存在確認 → 404

---

### Step 8 — スタンプ API

**対象ファイル**  
`routes/stickers.js`

**前提条件**  
Step 6・7 完了

**SDD 参照**  
§7.6 GET /api/stickers レスポンス例 / §7.7 POST/PUT リクエストボディ / §4.4 stickers テーブル / §4.4b sticker_categories テーブル

---

以下の仕様で `routes/stickers.js` を実装してください。

**GET /api/stickers**（認証不要）:
- `stickers` と `courses` を `sticker_id` で JOIN して取得
- 各スタンプに `categories` 配列（`sticker_categories` + `categories` を JOIN して全所属カテゴリーを取得）を追加
  - 形式: `[{ id, name, areaCode, color }]`
- `createdBy`: `created_by` が NULL → `null`。存在する場合は `users` から `{ id, displayName }` を取得
- `courses` は `curriculum_year DESC, sort_order ASC` でソート
- `skills` / 各カテゴリー情報の JSON.parse を忘れずに行う

**POST /api/stickers**（`authenticate`）:
- 必須バリデーション: `id`（スタンプ ID 形式）/ `primaryCategoryId` / `categoryIds`（1件以上）/ `name` / `type`
- `categoryIds` に `primaryCategoryId` が含まれていなければ 400
- `created_by = req.user.sub` を自動設定
- トランザクション内で:
  1. `stickers` に INSERT
  2. `sticker_categories` に `categoryIds` 分だけ INSERT
  3. `courses` に INSERT（courses 配列が空でも可）

**PUT /api/stickers/:id**（`authenticate`、`requireOwnerOrAdmin(created_by)`）:
- 対象スタンプの `created_by` を取得 → `requireOwnerOrAdmin` に渡す
- バリデーションは POST と同様
- トランザクション内で洗い替え:
  1. `DELETE FROM sticker_categories WHERE sticker_id = ?`
  2. `sticker_categories` を再 INSERT
  3. `DELETE FROM courses WHERE sticker_id = ?`
  4. `courses` を再 INSERT
  5. `UPDATE stickers SET ... WHERE id = ?`

**DELETE /api/stickers/:id**（`authenticate`、`requireOwnerOrAdmin(created_by)`）:
- courses は `ON DELETE CASCADE` で自動削除、sticker_categories も CASCADE
- 存在確認 → 404

---

### Step 9 — ユーザー API とアップロード API

**対象ファイル**  
`routes/users.js` / `routes/upload.js`

**前提条件**  
Step 5・6 完了

**SDD 参照**  
§7.1 エンドポイント一覧 / §7.4 GET /api/users レスポンス例 / §7.5 POST /api/upload / §3.3.5 ファイルアップロード検証

---

**`routes/users.js`**（全エンドポイントに `authenticate + requireAdmin`）

GET /api/users:
- `sticker_count` を LEFT JOIN でカウントして返す
- `password_hash` をレスポンスに含めない

POST /api/users:
- 必須: `username`（3〜50文字）/ `password` / `role`（'admin' | 'user'）
- `username` 重複は 409
- `hashPassword` でハッシュ化して保存

PUT /api/users/:id:
- `password` が空欄またはなければハッシュを変更しない
- 自分自身の `role` 変更は 400

DELETE /api/users/:id:
- 自分自身の削除は 400（`error: '自分自身は削除できません'`）

**`routes/upload.js`**

POST /api/upload（`authenticate`）:
- multer 設定:
  - `limits.fileSize: 5 * 1024 * 1024`（5MB）
  - `fileFilter`: `image/jpeg` / `image/png` / `image/webp` / `image/gif` のみ許可。他は `cb(new Error('許可されていないファイル形式です'), false)`
- `prefix` パラメータ: `'stickers'` または `'categories'` のみ許可（デフォルト: `'stickers'`）
- `saveImage(file, prefix)` を呼び出して `{ key, url }` を返す

DELETE /api/image/:key(\*)（`authenticate`）:
- `req.params[0]` から key を取得
- `deleteImage(key)` を呼び出す（パストラバーサル検証は `imageStore.js` 内で行う）

---

### Step 10 — Express サーバー本体

**対象ファイル**  
`server.js`

**前提条件**  
Step 5・6〜9 完了

**SDD 参照**  
§3.3 セキュリティアーキテクチャ / §3.4 システム構成図 / §10.5 起動手順

---

以下の仕様で `server.js` を実装してください。

**設定順序（重要）**:
1. `dotenv/config` の import
2. `helmet` を最初に適用（CSP 設定を含む）
3. `express.json()` と `express.urlencoded()`
4. CORS 設定（§3.3.8 参照。`APP_ENV === 'development'` の場合のみ `localhost:5173` を許可）
5. レート制限（ログイン API のみ: 15分間に10回まで）
6. ルーターのマウント:
   - `POST /api/auth/login` に `loginLimiter` を適用してから `authRoutes`
   - `/api/categories` → `categories`
   - `/api/stickers` → `stickers`
   - `/api/users` → `users`
   - `/api/upload` と `/api/image` → `upload`
7. `express.static(UPLOAD_DIR)` を `/uploads` にマウント（`UPLOAD_DIR` 起動時に作成）
8. SPA フォールバック: `client/dist/index.html` を返す（開発環境では不要）
9. グローバルエラーハンドラー（§3.3.9 参照。`APP_ENV !== 'development'` では `err.message` をクライアントに返さない）

**起動処理**:
- `UPLOAD_DIR` が存在しなければ `fs.mkdirSync` で作成
- `app.listen(PORT)` でサーバー起動

---

## フロントエンド ギャラリービュー（Step 11〜15）

### Step 11 — TypeScript・Tailwind・shadcn/ui セットアップ

**対象ファイル**  
`tsconfig.json` / `tsconfig.node.json` / `tailwind.config.ts` / `postcss.config.js` / `components.json` / `vite.config.ts` / `client/src/globals.css` / `client/src/lib/utils.ts`

**前提条件**  
Step 1 完了（package.json・npm install 済み）

**SDD 参照**  
§3.1 技術スタック / §8.6 globals.css の構成

---

**`tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": { "@/*": ["./client/src/*"] }
  },
  "include": ["client/src"]
}
```

**`tsconfig.node.json`**:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

**`tailwind.config.ts`**:
- `content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"]`
- `darkMode: ["class"]`
- `theme.extend` に shadcn/ui の CSS 変数ベースカラー（`background`, `foreground`, `primary`, `border`, `radius` 等）を定義

**`postcss.config.js`**:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

**`components.json`**（shadcn/ui 設定）:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": { "components": "@/components", "utils": "@/lib/utils" }
}
```

**`vite.config.ts`**:
- `root: 'client'` / `build.outDir: '../client/dist'`
- `resolve.alias: { '@': path.resolve(__dirname, './client/src') }`
- `/api` を `http://localhost:3000` へプロキシ

**`client/src/globals.css`**（§8.6 の内容を実装）:
- `@tailwind base/components/utilities`
- shadcn/ui の CSS 変数テーマ定義
- `body { font-family: 'Noto Sans JP', sans-serif; }`

**`client/src/lib/utils.ts`**:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

**shadcn/ui コンポーネントの追加**（CLI 実行）:
```bash
npx shadcn@latest add button card dialog badge input label select textarea checkbox alert scroll-area
```
→ `client/src/components/ui/` に各コンポーネントが生成される

---

### Step 12 — エントリーポイントと App.tsx

**対象ファイル**  
`client/index.html` / `client/src/main.tsx` / `client/src/App.tsx`

**前提条件**  
Step 11 完了。バックエンドが起動済みで API が応答すること

**SDD 参照**  
§3.4 コンポーネントツリー / §3.4.3 状態管理の所在

---

**`client/index.html`**:
- `<script type="module" src="/src/main.tsx">`
- Noto Sans JP を Google Fonts から読み込む

**`client/src/main.tsx`**:
```tsx
import './globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

**`client/src/App.tsx`**:  
Appendix B の型定義（`Category`・`Sticker`・`User`）を `types.ts` として切り出し import する。

管理する state（型付き）:
```tsx
const [cats, setCats] = useState<Category[]>([])
const [stks, setStks] = useState<Sticker[]>([])
const [view, setView] = useState<'gallery' | 'admin'>('gallery')
const [search, setSearch] = useState('')
const [catModal, setCatModal] = useState<Category | null>(null)
const [stkModal, setStkModal] = useState<Sticker | null>(null)
const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
```

データフェッチ・`authFetch`・検索フィルタリング・ビュー切り替えは v7.x と同様のロジックで実装する（§3.4.3 参照）。

---

### Step 13 — 共通コンポーネントと Navbar

**対象ファイル**  
`client/src/components/Navbar.tsx` / `client/src/components/common/StickerIcon.tsx` / `client/src/components/common/YearBadge.tsx` / `client/src/types.ts`

**前提条件**  
Step 12 完了

**SDD 参照**  
§8.1 ナビゲーションバー / §8.5 カリキュラム年度バッジ / Appendix B 型定義

---

**`client/src/types.ts`**:  
Appendix B の型定義をそのまま実装する（`Category`・`Sticker`・`Course`・`StickerCategory`・`User`・`CurrentUser`・`UserRole`・`StickerType`・`StickerLevel`）

**`Navbar.tsx`**  
props: `{ view, search, currentUser, onChangeView, onSearch, onLogout }`

shadcn/ui・Tailwind で実装。Bootstrap Navbar は使わない。
- `sticky top-0 z-50 bg-background border-b` のヘッダー
- 左端: ブランド「🏷️ スキルスタンプ」（`font-semibold`）
- ビュー切り替え: `Button variant="ghost"` で active 状態を `cn()` で制御
- ギャラリービューのみ: `Input type="search"` プレースホルダー「スタンプ・授業名…」
- ログイン時: 表示名 + ロール `Badge`（admin: `bg-red-100 text-red-800` / user: `bg-violet-100 text-violet-800`）+ `Button variant="outline" size="sm"` ログアウト

**`StickerIcon.tsx`**  
props: `{ imageUrl?: string | null, emoji: string, color: string, size?: number }`

- `imageUrl` があれば `<img>` を `rounded-full object-cover` で表示
- なければ emoji を `rounded-full` の div に表示（背景: `style={{ background: \`\${color}22\` }}`）
- `style={{ width: size, height: size }}` でサイズ指定

**`YearBadge.tsx`**  
props: `{ year: number, isLatest: boolean }`

§8.5 の仕様通り shadcn/ui `Badge` で実装する:
- 最新: `<Badge className="bg-slate-900 text-slate-50 rounded-full">{year} ★</Badge>`
- 旧: `<Badge variant="outline" className="text-muted-foreground rounded-full">{year}</Badge>`

---

### Step 14 — CategoryCard と SkillChip

**対象ファイル**  
`client/src/components/gallery/CategoryCard.tsx` / `client/src/components/gallery/SkillChip.tsx`

**前提条件**  
Step 13 完了

**SDD 参照**  
§5.1 ギャラリービュー / §8.3 カテゴリーカードの視覚設計 / §8.4 スタンプ種別バッジ

---

**`CategoryCard.tsx`**  
props: `{ cat, stickers, onCatClick, onStickerClick }`

`stickers` には全スタンプが渡される（CategoryCard 内で `cat.id` でフィルタする）。多対多のため、以下の表示ルールを適用する:
- `s.primaryCategoryId === cat.id` のスタンプ → 通常表示
- `s.primaryCategoryId !== cat.id` かつ `s.categories.some(c => c.id === cat.id)` のスタンプ → `opacity: 0.55` で関連表示

**ヘッダー部**:
- 背景: `linear-gradient(135deg, ${color}, ${color}cc)`
- 右上・右下に `.cat-deco-circle` の装飾円
- `StickerIcon`（size=40）/ カテゴリー名・英語名 / description
- `targetRoles` を shadcn/ui `<Badge variant="secondary">` で表示
- 実習 N 件・講義 N 件を `<Badge variant="outline">` で表示

**スタンプチップ部**:
- `flex-wrap` で横並び
- 各スタンプを `SkillChip` に渡す

**`SkillChip.tsx`**  
props: `{ sticker, onClick, faded = false }`

- `faded` が true の場合は `style={{ opacity: 0.55 }}`、ボーダーなし
- `faded` が false の場合はテーマカラーのボーダー
- 内部: `StickerIcon`（size=28）/ スタンプ名 / スタンプ ID（`text-muted small`）/ 種別バッジ（§8.4 のクラス）
- `.skill-chip` クラスを付与してホバー効果を適用

---

### Step 15 — CategoryModal と StickerModal

**対象ファイル**  
`client/src/components/gallery/CategoryModal.tsx` / `client/src/components/gallery/StickerModal.tsx`

**前提条件**  
Step 13・14 完了

**SDD 参照**  
§5.2 カテゴリー詳細モーダル / §5.3 スタンプ詳細モーダル / §8.2 shadcn/ui コンポーネント対応表

---

モーダルは shadcn/ui の `Dialog` コンポーネントを使用する。ポータル・フォーカストラップ・ESC 閉鎖はすべて Radix UI が自動処理する。

**`CategoryModal.tsx`**  
props: `{ cat, stickers, onClose, onStickerClick }`

セクション構成:
1. ヘッダー: テーマカラー背景 / StickerIcon / カテゴリー名・英語名 / targetRoles バッジ
2. 採用担当者向けメッセージ: `<Alert>` + Tailwind `bg-amber-50 border-amber-200 text-amber-900`（`recruitMessage` が null の場合は非表示）
3. スタンプ一覧: `button` + Tailwind `flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent` でクリック可能。クリックで `onStickerClick` を呼び出す

**`StickerModal.tsx`**  
props: `{ sticker, cat, onClose }`

セクション構成:
1. パンくず: `{cat.name} › {sticker.name}`（小文字・グレー）
2. ヘッダー: テーマカラー薄グラデーション背景 / StickerIcon / スタンプ名 / 種別バッジ / ID / level
3. Can-Do 記述: `bg-muted rounded-md p-3` + `style={{ borderLeft: \`3px solid ${color}\` }}`
4. 習得スキル: `<Badge variant="outline">` + `style={{ background: \`${color}15\`, borderColor: \`${color}44\`, color }}`
5. 関連授業（年度別）:
   - `curriculum_year` でグループ化して年度降順に表示
   - 各グループに `<YearBadge>` を表示（`LATEST_CURRICULUM_YEAR` との比較で `isLatest` を決定）
   - 最新年度: 実線ボーダー / 旧年度: Tailwind `border-dashed opacity-85`

---

## フロントエンド 管理画面（Step 16〜19）

### Step 16 — LoginScreen

**対象ファイル**  
`client/src/components/admin/LoginScreen.tsx`

**前提条件**  
Step 11 完了

**SDD 参照**  
§9.1 認証（LoginScreen）

---

props: `{ onLogin(token, user) }`

- フォーム: `Label` + `Input` を縦積みで username / password フィールドを実装
- 送信時に `POST /api/auth/login` を呼び出す
- 成功: `localStorage.setItem('auth_token', token)` と `localStorage.setItem('auth_user', JSON.stringify(user))` の後に `onLogin(token, user)` を呼び出す
- 失敗: エラーメッセージを `<Alert>` + Tailwind `bg-red-50 border-red-200 text-red-800` で表示
- ログイン中は `<Button disabled>` に Tailwind `animate-spin` のスピナーを表示

---

### Step 17 — AdminPanel

**対象ファイル**  
`client/src/components/admin/AdminPanel.tsx`

**前提条件**  
Step 16 完了。CategoryEditor / StickerEditor / UserEditor の型シグネチャを理解した上で実装すること（後続ステップで実装する）

**SDD 参照**  
§9.2 ロール別操作権限マトリクス / §9.3 AdminPanel レイアウト / §9.7 CRUD 操作と API 呼び出し

---

props: `{ cats, stks, currentUser, onUpdateCats, onUpdateStickers }`

**内部 state**: `activeTab`（'stickers' | 'categories' | 'users'）/ `selected`（選択中エンティティ）/ `users`（ユーザー一覧）

**レイアウト**: `flex h-screen` で左ペイン 340px（`w-[340px] shrink-0 border-r`）+ 右ペイン（`flex-1 overflow-auto`）

**タブ**:
- 🗂 カテゴリー: `currentUser.role === 'admin'` の場合のみ表示
- 🏷 スタンプ: 常に表示
- 👥 ユーザー管理: `currentUser.role === 'admin'` の場合のみ表示

**API 呼び出しをここに集約する（§3.4.1 の ADR 設計原則）**:

スタンプ一覧の表示: `createdBy.displayName` を表示。自分のスタンプに「あなた」バッジ。他者のスタンプを選択した場合は `canEdit = false` を Editor に渡す。

CRUD ハンドラ（`authFetch` を使用）:
- `handleSaveSticker(data)`: POST または PUT → 成功後 `onUpdateStickers` を呼び出し
- `handleDeleteSticker(id)`: DELETE → 成功後 `onUpdateStickers` を呼び出し
- `handleSaveCategory(data)`: POST または PUT（admin のみ）
- `handleDeleteCategory(id)`: DELETE（admin のみ）、409 の場合は `Alert` でメッセージ表示
- `handleSaveUser(data)`: POST または PUT（admin のみ）
- `handleDeleteUser(id)`: DELETE（admin のみ）

---

### Step 18 — CategoryEditor と UserEditor

**対象ファイル**  
`client/src/components/admin/CategoryEditor.tsx` / `client/src/components/admin/UserEditor.tsx`

**前提条件**  
Step 17 完了

**SDD 参照**  
§9.4 CategoryEditor フォーム項目 / §9.6 UserEditor フォーム項目

---

**`CategoryEditor.tsx`**  
props: `{ cat, onSave, onDelete, onClose }`（cat が null の場合は新規作成モード）

フォーム項目（§9.4 の仕様通り）:
- 画像アップロード: `<input type="file">` → `POST /api/upload?prefix=categories` → `imageKey` と プレビュー URL を state に保持
- emoji（画像未登録時のフォールバック）
- テーマカラー: `<input type="color">` + プリセット 10 色ボタン
- カテゴリー名（必須）/ 英語名 / area_code（新規のみ編集可、既存は readOnly）
- 説明文（textarea）
- 対象職種（カンマ区切り入力 → 配列変換）
- 採用担当者向けメッセージ（textarea）

**`UserEditor.tsx`**  
props: `{ user, onSave, onDelete, onClose, currentUserId }`（user が null の場合は新規作成モード）

フォーム項目（§9.6 の仕様通り）:
- ユーザー名（新規のみ編集可、既存は readOnly）
- 表示名
- ロール: `Label` + `Select`（admin / user）
- パスワード / パスワード確認（新規時必須。既存は空欄で変更なし）

自分自身（`user.id === currentUserId`）はロール変更・削除ボタンを disabled にし、エラーメッセージを表示する。

---

### Step 19 — StickerEditor と CourseRow

**対象ファイル**  
`client/src/components/admin/StickerEditor.tsx` / `client/src/components/admin/CourseRow.tsx`

**前提条件**  
Step 17・18 完了

**SDD 参照**  
§9.4 StickerEditor フォーム項目 / §9.5 CourseRow フォーム項目 / §5.1.2 複数カテゴリー所属スタンプの表示ルール

---

**`StickerEditor.tsx`**  
props: `{ sticker, categories, onSave, onDelete, onClose, canEdit }`

`canEdit = false` の場合: フォームは表示するが保存・削除 `Button` を `disabled` にして「自分のスタンプのみ編集できます」を `<Alert>` で表示する。

**カテゴリー選択部（多対多対応、最重要）**:

```
[ ] 🌐 Webアプリ開発       Web App Development    [★ 主カテゴリー]
[✓] 🤖 AI・データサイエンス  AI & Data Science       [☆ 主に設定]
[ ] 🎨 UX・プロダクトデザイン UX & Product Design
[ ] 📋 プロジェクト・ビジネス Project & Business
```

- 各カテゴリーを `Checkbox` + `Label` で表示
- チェック済みのカテゴリーのみ「★ 主カテゴリー」or「☆ 主に設定」ボタンを表示
- 主カテゴリーを変更するとテーマカラーが自動で変わる
- バリデーション: 1件以上チェックされていること / 主カテゴリーがチェック済みであること
- スタンプ ID プレビュー（新規時）: 主カテゴリーの `area_code` を使って `NSS-{AREA}-K___v01` 形式でリアルタイム表示

その他のフォーム項目（§9.4 の仕様通り）:
- スタンプ ID（新規のみ編集可）
- バージョン: `Label` + `Select`（v01〜v09）
- 種別・レベル: `Label` + `Select`
- 画像・emoji・テーマカラー（CategoryEditor と同様）
- スタンプ名・英語名
- Can-Do 記述（textarea）
- 習得スキル（カンマ区切り）
- 関連授業リスト（`CourseRow` × N、「授業を追加」ボタン）

送信時は `categoryIds`（チェック済み配列）と `primaryCategoryId` を含める。

**`CourseRow.tsx`**  
props: `{ course, onChange, onDelete }`

フォーム項目（§9.5 の仕様通り）:
- 授業名（必須）/ 科目コード / 種別 / カリキュラム年度（必須）/ 時間数 / 授業内容メモ / 削除ボタン
- 変更時に `onChange(updatedCourse)` を呼び出す

---

## セキュリティ仕上げ・デプロイ設定（Step 20〜21）

### Step 20 — 入力バリデーションの強化

**対象ファイル**  
`routes/categories.js`（更新）/ `routes/stickers.js`（更新）/ `routes/users.js`（更新）

**前提条件**  
Step 6〜9 完了

**SDD 参照**  
§3.3.7 入力バリデーション / §3.3.9 エラーレスポンスの情報漏洩防止

---

各 routes ファイルに共通バリデーションロジックを追加してください。

**バリデーションヘルパー関数**（`lib/validate.js` として切り出し）:
- `requireFields(obj, fields)`: 必須フィールドが存在するか確認。不足があれば `{ ok: false, error }` を返す
- `isAlphaHyphen(str, max)`: 英数字・ハイフンのみ・指定文字数以下かチェック
- `isEnum(val, values)`: 列挙値に含まれるかチェック
- `isStringRange(str, min, max)`: 文字列長が範囲内かチェック

**各エンドポイントに適用するルール（§3.3.7 の表を実装）**:

POST /api/categories:
- `id`: 英数字・ハイフンのみ 50 文字以下
- `areaCode`: 英大文字・数字のみ 8 文字以下

POST /api/stickers:
- `type`: `'practical'` | `'lecture'` のみ
- `level`: `'実践'` | `'知識'` | undefined
- `categoryIds`: 配列であり 1 件以上

POST /api/users:
- `role`: `'admin'` | `'user'` のみ
- `username`: 3〜50 文字

バリデーション違反は `400 { "error": "..." }` を返す。エラーメッセージに DB エラーや内部パス情報を含めないこと。

---

### Step 21 — デプロイ設定ファイル

**対象ファイル**  
`nginx.conf` / `sticker-gallery.service`（systemd unit）/ `README.md`

**前提条件**  
Step 1〜19 完了

**SDD 参照**  
§11.5 staging 構成 / §11.6 production 構成 / §11.7 データ永続化とバックアップ / §11.8 セキュリティチェックリスト

---

**`nginx.conf`**（§11.6 の Nginx 設定をそのまま実装）:
- HTTP → HTTPS リダイレクト
- SSL 設定（証明書パスはプレースホルダー）
- `proxy_pass http://localhost:3000`
- `client_max_body_size 10m`
- `proxy_set_header` の適切な設定

**`sticker-gallery.service`**（§11.4 の systemd unit）:
- `ExecStart=/usr/bin/npm start`
- `WorkingDirectory` / `EnvironmentFile` / `Restart=on-failure` を設定
- `User=www-data`

**`README.md`**:
以下のセクションを含む運用ドキュメント:

1. **前提条件**: Node.js 24 LTS、Ubuntu 22.04/24.04

2. **セットアップ手順**（§11.3 の手順を bash コマンドで記述）:
   ```bash
   git clone ... && cd sticker-gallery
   cp .env.example .env  # JWT_SECRET を必ず変更
   npm install && npm run build && node db/migrate.js
   ```

3. **起動方法**: `npm run dev`（開発）/ `npm start`（本番）/ systemctl コマンド

4. **バックアップ手順**: SQLite のホットバックアップコマンドと uploads の tar コマンド（§11.7 の内容）

5. **セキュリティチェックリスト**: production 公開前に確認すべき項目（§11.8 の内容）

6. **初回ログイン**: `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` での管理画面アクセス手順と、初回ログイン後にパスワードを変更する手順
