# スキルスタンプ・ギャラリー システムプロンプト

## プロジェクト概要

専門職大学向けの **物理スタンプ型マイクロクレデンシャルシステム** の Web 版ギャラリーおよび管理ツールを開発している。

システムの目的は「学生のスキル可視化・言語化の支援」。物理スタンプと 1:1 で対応する Web ギャラリーとして機能し、以下の 3 つの文脈で使われる。

- **学生**：履修授業の選択・就職活動のエントリーシート準備・卒業後の自己 PR 参照
- **企業（採用担当者）**：学内就職説明会のブースで学生のスキルを把握する
- **教員・管理者**：カテゴリー・スタンプ・授業情報の登録・更新

---

## 技術スタック（確定）

| 層 | 技術 |
|----|------|
| ランタイム | Node.js 24（ESM: `"type": "module"`） |
| Web サーバー | Express 4.x |
| DB | SQLite — `node:sqlite`（Node.js 24 組み込み、npm 不要） |
| 画像ストレージ | ローカルファイルシステム（`uploads/` ディレクトリ）、multer でファイル受信 |
| 言語（フロント） | TypeScript 5.x |
| フロントエンド | React（TSX）+ Vite 5.x |
| CSS フレームワーク | Tailwind CSS 3.4.x |
| UI コンポーネント | shadcn/ui（Radix UI ベース。`components/ui/` にコピーして使用） |
| フォント | Noto Sans JP（Google Fonts） |
| 認証 | JWT（HS256）— `node:crypto` 実装（外部ライブラリ不要） |
| パスワードハッシュ | scrypt — `node:crypto` 実装（bcrypt 不要） |
| セキュリティヘッダー | helmet 8.x |
| レート制限 | express-rate-limit 7.x |

---

## データモデル

### テーブル構成（5 テーブル）

```
users
categories  ← M:N（sticker_categories）→  stickers  ← 1:N →  courses
```

### categories（カテゴリーステッカー）

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | 例: `cat-webdev` |
| name / name_en | TEXT | カテゴリー名（日・英） |
| area_code | TEXT NOT NULL | スタンプ ID の AREA 部分（例: `WEB`） |
| emoji | TEXT | 画像未登録時のフォールバック |
| color | TEXT | テーマカラー（HEX） |
| image_key | TEXT | ファイルパスキー（NULL 可） |
| description | TEXT | カテゴリー説明文 |
| target_roles | TEXT | JSON 配列（`'[]'` デフォルト） |
| recruit_message | TEXT | 就職説明会向けメッセージ |
| sort_order | INTEGER | 表示順 |

### stickers（スキルスタンプ）

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | 例: `NSS-WEB-K001v01` |
| primary_category_id | TEXT FK | → categories.id（表示色・ID AREA の基準） |
| created_by | TEXT FK | → users.id（NULL 可） |
| name / name_en | TEXT | スタンプ名（日・英） |
| type | TEXT | `'practical'` or `'lecture'` |
| color | TEXT | テーマカラー（HEX） |
| emoji | TEXT | フォールバック |
| image_key | TEXT | ファイルパスキー |
| description | TEXT | Can-Do 記述 |
| skills | TEXT | JSON 配列 |
| level | TEXT | `'実践'` or `'知識'` |
| version | TEXT | 例: `'v01'` |

### sticker_categories（中間テーブル）

| 列 | 型 | 説明 |
|----|----|------|
| sticker_id | TEXT FK | → stickers.id（ON DELETE CASCADE） |
| category_id | TEXT FK | → categories.id（ON DELETE CASCADE） |
| sort_order | INTEGER | このカテゴリー内でのスタンプ表示順 |
| PRIMARY KEY | | (sticker_id, category_id) |

### courses（授業）

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | |
| sticker_id | TEXT FK | → stickers.id（ON DELETE CASCADE） |
| name | TEXT | 授業名 |
| code | TEXT | 科目コード 例: `WEB301` |
| type | TEXT | `'practical'` or `'lecture'`（NULL 可、親スタンプを継承） |
| hours | INTEGER | 時間数 |
| curriculum_year | INTEGER | カリキュラム年度（必須）|
| content_note | TEXT | その年度の授業内容メモ |

### users

| 列 | 型 | 説明 |
|----|----|------|
| id | TEXT PK | randomUUID() |
| username | TEXT UNIQUE | ログイン ID |
| password_hash | TEXT | scrypt 形式: `{salt}:{hash}` |
| role | TEXT | `'admin'` or `'user'` |
| display_name | TEXT | 表示名（NULL 可） |

> **重要設計注意点**：
> - `stickers.category_id` は廃止済み（v7.5〜）。`primary_category_id` を使う
> - スタンプは複数カテゴリーに所属できる（多対多）。`sticker_categories` 中間テーブルで管理
> - `primary_category_id` は必ず `sticker_categories` にも登録されていなければならない
> - 同一 `code` で `curriculum_year` が異なる courses の複数レコードは正常状態
> - `area_code` は一度登録したら変更禁止（既発行スタンプ ID が参照しているため）

---

## 命名規則・変換ルール

### スタンプ ID

```
NSS - {AREA} - {TYPE}{SEQ}{VER}

AREA : primary_category の area_code（WEB / AI / UX / PM 等）
TYPE : K = 実践（Kōi）/ L = 知識（Lecture）
SEQ  : 3 桁連番（001〜）
VER  : v01〜

例: NSS-WEB-K001v01
```

### ファイルパスキー（image_key）

```
{prefix}/{randomUUID()}.{ext}

prefix: categories | stickers
ext:    .jpg | .png | .webp | .gif（MIME タイプから決定）
例: stickers/550e8400-e29b-41d4-a716-446655440000.png
```

### camelCase ↔ snake_case 変換

DB は snake_case、API レスポンス・リクエストボディは camelCase に統一する。

| DB（snake_case） | API（camelCase） |
|-----------------|-----------------|
| primary_category_id | primaryCategoryId |
| image_key | imageKey |
| name_en | nameEn |
| area_code | areaCode |
| sort_order | sortOrder |
| target_roles | targetRoles |
| recruit_message | recruitMessage |
| curriculum_year | curriculumYear |
| content_note | contentNote |
| created_by | createdBy |
| sticker_count | stickerCount |

### JSON 列の扱い

`target_roles`・`skills` は SQLite に TEXT として格納し、アプリ層で `JSON.parse / JSON.stringify` する。

---

## API エンドポイント一覧

**認証レベル**：公開（認証不要）/ 🔑（JWT 必須）/ 👑（admin のみ）/ 🔑✋（所有者 or admin）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/auth/login` | 公開 | JWT 発行 |
| GET | `/api/categories` | 公開 | カテゴリー一覧（`sticker_count` 付き） |
| POST | `/api/categories` | 👑 | カテゴリー新規作成 |
| PUT | `/api/categories/:id` | 👑 | カテゴリー更新（area_code 変更不可） |
| DELETE | `/api/categories/:id` | 👑 | 削除（primary_category_id 参照スタンプ存在時は 409） |
| GET | `/api/stickers` | 公開 | スタンプ一覧（`categories[]`・`courses[]`・`createdBy` 含む） |
| POST | `/api/stickers` | 🔑 | スタンプ新規作成（created_by に req.user.sub を自動設定） |
| PUT | `/api/stickers/:id` | 🔑✋ | スタンプ更新（sticker_categories + courses を洗い替え） |
| DELETE | `/api/stickers/:id` | 🔑✋ | 削除（courses・sticker_categories は CASCADE） |
| GET | `/api/users` | 👑 | ユーザー一覧 |
| POST | `/api/users` | 👑 | ユーザー新規作成 |
| PUT | `/api/users/:id` | 👑 | ユーザー更新 |
| DELETE | `/api/users/:id` | 👑 | 削除（自分自身は 400） |
| POST | `/api/upload` | 🔑 | 画像アップロード（multipart/form-data） |
| DELETE | `/api/image/:key(*)` | 🔑✋ | 画像ファイル削除 |

---

## フロントエンド構成

```
App.jsx                     ルート。データフェッチ・状態管理
├── Navbar.jsx
├── [gallery view]
│   ├── CategoryCard.jsx    カテゴリーヘッダー＋スタンプチップ群
│   │   └── SkillChip.jsx   主カテゴリー: 通常 / それ以外: opacity 0.55
│   ├── CategoryModal.jsx   採用担当者向けメッセージを Alert warning で表示
│   └── StickerModal.jsx    courses を curriculum_year でグループ化・年度降順
└── [admin view]
    ├── LoginScreen.jsx     JWT ログインフォーム
    └── AdminPanel.jsx      左ペイン一覧 + 右ペインエディタ（API 呼び出しを集約）
        ├── CategoryEditor.jsx
        ├── StickerEditor.jsx   カテゴリー選択はチェックボックス群 + 主カテゴリー指定
        │   └── CourseRow.jsx
        └── UserEditor.jsx
```

---

## セキュリティ実装要件

以下はすべて実装必須。

| 対策 | 実装箇所 |
|------|---------|
| HTTP セキュリティヘッダー | `helmet()` を server.js の最初に適用（CSP で inline script 禁止） |
| XSS | React JSX はデフォルトエスケープ済み。`dangerouslySetInnerHTML` 使用禁止 |
| SQL インジェクション | `db.prepare(sql).run(...params)` のみ使用。文字列結合クエリ禁止 |
| パストラバーサル | `deleteImage` 内で `path.resolve` による UPLOAD_DIR 外アクセスを禁止 |
| ファイルアップロード | multer で MIME ホワイトリスト（jpeg/png/webp/gif）と 5MB 制限を強制 |
| レート制限 | ログイン API のみ: 15 分間に 10 回まで |
| 入力バリデーション | 全 POST/PUT で必須フィールド・型・列挙値を検証 |
| CORS | development のみ localhost:5173 を許可。staging/production は同一オリジン |
| エラー情報漏洩防止 | `APP_ENV !== 'development'` では err.message をクライアントに返さない |

---

## 環境変数

```bash
APP_ENV=development
PORT=3000
DB_PATH=./db/stickers.db
UPLOAD_DIR=./uploads
JWT_SECRET=change-me-in-production   # production では 32 文字以上のランダム文字列
JWT_EXPIRES_IN=28800                  # 8時間（秒）
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=changeme       # production では必ず変更
LATEST_CURRICULUM_YEAR=2025
```

---

## ディレクトリ構成

```
sticker-gallery/
├── server.js
├── lib/
│   ├── database.js       # node:sqlite ラッパー（シングルトン）
│   ├── imageStore.js     # saveImage / deleteImage / imageUrl
│   ├── auth.js           # JWT・scrypt・ミドルウェア
│   └── validate.js       # バリデーションヘルパー
├── routes/
│   ├── authRoutes.js     # POST /api/auth/login
│   ├── categories.js
│   ├── stickers.js
│   ├── users.js
│   └── upload.js
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrate.js
├── uploads/              # .gitignore 対象
└── client/src/
    ├── App.tsx
    ├── types.ts
    ├── globals.css         # Tailwind directives + CSS 変数
    ├── lib/utils.ts        # cn() ユーティリティ
    └── components/
        ├── ui/             # shadcn/ui 生成（直接編集しない）
        ├── Navbar.tsx
        ├── common/       StickerIcon.tsx / YearBadge.tsx
        ├── gallery/      CategoryCard / SkillChip / CategoryModal / StickerModal
        └── admin/        LoginScreen / AdminPanel / CategoryEditor /
                          StickerEditor / CourseRow / UserEditor
```

---

## 参照ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `SDD_sticker-gallery_v8.md` | ソフトウェア設計仕様書（v7.5）。全仕様の正本 |
| `prompts_sticker-gallery.md` | 実装ステップ集（Step 1-1 〜 Step 5-2） |

---

## アシスタントへの指示

このプロジェクトの開発を支援する。以下の方針で回答する。

- **技術スタックは変更しない**。上記の確定スタックに従ったコードを生成する
- **SDD が正本**。仕様について迷った場合は SDD の記述を優先する
- **ESM 形式を徹底**する（`import` / `export`、`"type": "module"`）
- **camelCase ↔ snake_case 変換**を正確に行う（上記変換表を参照）
- **多対多の設計を正確に実装する**：`category_id`（廃止）ではなく `primary_category_id` + `sticker_categories` を使う
- Tailwind CSS ユーティリティクラスを積極的に使い、動的テーマカラー（管理者が設定する HEX 値）のみ inline style を使う
- `node:sqlite` は**同期 API**（`DatabaseSync`）。`await` は不要
- courses・sticker_categories の更新は常に **DELETE → INSERT の洗い替え**
- `image_key` は S3 オブジェクトキーではなく**ファイルパスキー**（例: `stickers/uuid.png`）
- セキュリティ要件（上記一覧）はすべて実装必須。省略不可
- 不明な仕様は「SDD §X.X に定義があります」と参照先を示す
