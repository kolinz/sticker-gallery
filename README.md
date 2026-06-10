# スキルスタンプ・ギャラリー

専門職大学向けの **物理スタンプ型マイクロクレデンシャルシステム** の Web ギャラリーおよび管理ツール。

---

## 前提条件

| 項目 | 要件 |
|------|------|
| OS | Ubuntu 22.04 LTS / 24.04 LTS |
| Node.js | **24 LTS 以上**（`node:sqlite` 組み込みモジュールが必要） |
| npm | 10 以上（Node.js 24 に同梱） |
| Nginx | production 環境のみ必要 |

```bash
# Node.js 24 のインストール（Ubuntu）
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v24.x.x であることを確認
```

---

## セットアップ手順

```bash
# 1. リポジトリをクローン
git clone <repository-url> sticker-gallery
cd sticker-gallery

# 2. 環境変数ファイルを作成
cp .env.example .env

# 3. .env を編集（最低限 JWT_SECRET と管理者パスワードを変更する）
vi .env
# JWT_SECRET=<32文字以上のランダム文字列>
# INITIAL_ADMIN_PASSWORD=<強いパスワード>

# 4. 依存パッケージをインストール
npm install

# 5. フロントエンドをビルド（production / staging）
npm run build

# 6. データベースの初期化とシードデータ投入
node db/migrate.js
# ✅ 001_schema 適用完了
# ✅ 002_seed 適用完了
# ✅ 003_init_admin 適用完了（admin ユーザー: admin）
```

---

## 起動方法

### 開発環境

```bash
npm run dev
# バックエンド（nodemon）: http://localhost:3000
# フロントエンド（Vite）:  http://localhost:5173
```

### 本番環境（直接起動）

```bash
npm start
# http://localhost:3000 で起動（Nginx と組み合わせて使用）
```

### 本番環境（systemd）

```bash
# サービスファイルの配置
sudo cp sticker-gallery.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sticker-gallery
sudo systemctl start sticker-gallery

# 状態確認
sudo systemctl status sticker-gallery

# ログのリアルタイム確認
sudo journalctl -u sticker-gallery -f

# .env 変更後の再起動
sudo systemctl restart sticker-gallery
```

---

## バックアップ手順

### SQLite データベース（ホットバックアップ）

稼働中のデータベースをダウンタイムなしでバックアップできます。

```bash
# 手動バックアップ
sqlite3 ./db/stickers.db ".backup ./backup/stickers_$(date +%Y%m%d).db"

# または node:sqlite を使う方法
node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.env.DB_PATH ?? './db/stickers.db');
db.exec('.backup ./backup/stickers_\$(date +%Y%m%d).db');
"
```

### 画像ファイル

```bash
tar czf ./backup/uploads_$(date +%Y%m%d).tar.gz ./uploads/
```

### cron による自動バックアップ（毎日 02:00）

```bash
# crontab -e で以下を追加
0 2 * * * cd /opt/sticker-gallery && sqlite3 ./db/stickers.db ".backup /backup/stickers_$(date +\%Y\%m\%d).db"
0 2 * * * tar czf /backup/uploads_$(date +\%Y\%m\%d).tar.gz /opt/sticker-gallery/uploads/
```

### バックアップからの復元

```bash
# DB 復元（サービスを停止してから実施）
sudo systemctl stop sticker-gallery
cp /backup/stickers_20250101.db ./db/stickers.db

# 画像復元
tar xzf /backup/uploads_20250101.tar.gz -C /opt/sticker-gallery/
sudo systemctl start sticker-gallery
```

---

## セキュリティチェックリスト

production 公開前に以下をすべて確認してください。

| 項目 | 確認内容 |
|------|---------|
| `JWT_SECRET` | 32 文字以上のランダム文字列に変更済みか |
| `INITIAL_ADMIN_PASSWORD` | `changeme` のままになっていないか（初回ログイン後に管理画面で変更） |
| `APP_ENV` | `production` に設定されているか（エラー詳細がクライアントに露出しない） |
| `.env` のパーミッション | `chmod 600 .env` が適用されているか |
| SSL/TLS | Let's Encrypt で証明書が発行済みか |
| ポート 3000 のファイアウォール | 外部から直接アクセスできないようにブロックされているか |
| `.env` の git コミット | `.gitignore` に `.env` が含まれているか（絶対にコミットしない） |
| systemd の実行ユーザー | `www-data` 等の専用ユーザーで動作しているか |

```bash
# .env パーミッション設定
chmod 600 .env

# Nginx + ポートのファイアウォール設定
sudo ufw allow 'Nginx Full'
sudo ufw deny 3000
sudo ufw enable

# JWT_SECRET の生成例
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

---

## 初回ログインと管理者パスワードの変更

### 初回ログイン

1. ブラウザで `http://localhost:3000`（または設定済みドメイン）を開く
2. 右上「⚙️ 管理画面」をクリック
3. `.env` で設定した `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` でログイン
   - デフォルト: `admin` / `changeme`

### パスワードの変更（初回ログイン後すぐに実施）

1. 管理画面 → 「👥 ユーザー管理」タブを開く
2. 左ペインで自分のアカウントを選択
3. 「パスワード」フィールドに新しいパスワードを入力して「保存」
4. ログアウトして新しいパスワードでログインし直し、動作を確認する

> **重要**：`INITIAL_ADMIN_PASSWORD` は `db/migrate.js` の初回実行時のみ使用されます。`.env` の値を変更してもログイン済みのパスワードハッシュは変わりません。パスワードの変更は必ず管理画面の UserEditor から行ってください。

---

## Nginx 設定（production）

```bash
# 設定ファイルの配置と有効化
sudo cp nginx.conf /etc/nginx/sites-available/sticker-gallery
sudo ln -s /etc/nginx/sites-available/sticker-gallery /etc/nginx/sites-enabled/

# nginx.conf の server_name を実際のドメインに変更してから:
sudo nginx -t
sudo systemctl reload nginx

# SSL 証明書の取得（Let's Encrypt）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d gallery.example.com

# 自動更新の確認
sudo certbot renew --dry-run
```

---

## ディレクトリ構成

```
sticker-gallery/
├── server.js              # Express サーバー本体
├── lib/                   # バックエンド共通ライブラリ
│   ├── database.js        # SQLite シングルトン
│   ├── imageStore.js      # 画像保存・削除・URL 生成
│   ├── auth.js            # JWT / scrypt / ミドルウェア
│   └── validate.js        # 入力バリデーションヘルパー
├── routes/                # API ルーター
├── db/                    # DB 関連
│   ├── schema.sql
│   ├── seed.sql
│   └── migrate.js
├── uploads/               # アップロード画像（.gitignore 対象）
└── client/                # フロントエンド（React + Vite）
    └── src/
```

---

## 技術スタック

| 層 | 技術 |
|----|------|
| ランタイム | Node.js 24 LTS |
| Web サーバー | Express 4.x |
| DB | SQLite（`node:sqlite` 組み込み） |
| 画像ストレージ | ローカルファイルシステム |
| フロントエンド | React + TypeScript + Vite |
| CSS | Tailwind CSS 3.4 + shadcn/ui |
| 認証 | JWT HS256（`node:crypto` 実装） |
