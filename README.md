# openai-mail

一個基於 Cloudflare Workers 的郵件處理 Worker，使用 D1 資料庫儲存郵件。

## 功能

- **健康檢查**: `GET /` 返回 `ciallo~`
- **郵件檢視**: `GET /{password}/ciallo` 返回最新郵件的 HTML 內容（需要密碼驗證）
- **郵件接收**: 接收來自 Cloudflare Email Routing 轉發的郵件並儲存到 D1 資料庫

## 技術堆疊

- Cloudflare Workers
- D1 (SQLite) 資料庫
- TypeScript
- Wrangler
- PostalMime (郵件解析)

## 專案結構

```
openai-mail/
├── src/
│   └── index.ts          # 主程式碼
├── schema.sql             # D1 資料庫 Schema
├── wrangler.jsonc        # Wrangler 設定
├── package.json           # 專案依賴
├── tsconfig.json          # TypeScript 設定
└── test/
    └── index.spec.ts      # 測試檔案
```

## 環境變數

| 變數名稱 | 說明 |
|---------|------|
| `JWT_token-password` | 訪問 `/ciallo` 端點的密碼 |

## 部署步驟

### 1. 前置條件

- Node.js 18+
- Cloudflare 帳號
- 已安裝 Wrangler CLI 並登入

```bash
# 安裝 Wrangler（如果還沒安裝）
npm install -g wrangler

# 登入 Cloudflare
wrangler login
```

### 2. 複製專案

```bash
git clone https://github.com/s12ryt/worker-Email-Display.git
cd worker-Email-Display
npm install
```

### 3. 建立 D1 資料庫

```bash
wrangler d1 create openai-mail-db
```

會輸出類似這樣的資訊：
```
┌────────────────┬──────────────────────┬───────┐
│ Name           │ UUID                  │ Notes │
├────────────────┼──────────────────────┼───────┤
│ openai-mail-db │ xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx │       │
└────────────────┴──────────────────────┴───────┘
```

### 4. 更新 wrangler.jsonc

將上一步得到的 `database_id` 填入 `wrangler.jsonc`：

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "openai-mail-db",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

### 5. 建立資料表

```bash
wrangler d1 execute openai-mail-db --local --file=schema.sql
# 或部署到線上
wrangler d1 execute openai-mail-db --remote --file=schema.sql
```

### 6. 設定密碼 Secret

```bash
# 替换成你想用的密碼
wrangler secret put JWT_token-password
# 輸入你的密碼後按 Enter
```

### 7. 部署 Worker

```bash
npm run deploy
```

部署成功後會顯示你的 Worker URL，例如：
```
https://openai-mail.your-account.workers.dev
```

### 8. 設定 Cloudflare Email Routing

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇你的網域
3. 進入 **Email** → **Email Routing**
4. 啟用 Email Routing
5. 建立 **Catch-all** 規則
6. 選擇 **Send to Worker**，並選擇 `openai-mail`

## API 使用方式

### 健康檢查
```bash
curl https://openai-mail.your-account.workers.dev/
# 返回: ciallo~
```

### 獲取最新郵件
```bash
curl https://openai-mail.your-account.workers.dev/你的密碼/ciallo
# 返回: 最新郵件的 HTML 內容
```

## 本地開發

```bash
# 啟動本地開發伺服器
npm run dev
# 訪問 http://localhost:8787

# 執行測試
npm run test

# 生成類型定義
npm run cf-typegen
```

## 資料庫 Schema

```sql
CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT,
    text_content TEXT,
    html_content TEXT,
    headers TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
```

## 授權

MIT