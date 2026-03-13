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

## 資料庫 Schema

```sql
CREATE TABLE emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT,
    text_content TEXT,
    html_content TEXT,
    headers TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 環境變數

| 變數名稱 | 說明 |
|---------|------|
| `JWT_token-password` | 訪問 `/ciallo` 端點的密碼 |

## 指令

```bash
# 本地開發
npm run dev

# 部署到 Cloudflare
npm run deploy

# 執行測試
npm run test

# 生成類型定義
npm run cf-typegen
```

## API 使用方式

### 健康檢查
```bash
curl https://your-worker.your-name.workers.dev/
# 返回: ciallo~
```

### 獲取最新郵件
```bash
curl https://your-worker.your-name.workers.dev/your-password/ciallo
# 返回: 最新郵件的 HTML 內容
```

## 設定 Cloudflare Email Routing

1. 在 Cloudflare Dashboard 中啟用 Email Routing
2. 設定 Catch-all 地址指向此 Worker
3. Worker 的 `email` handler會自動處理接收的郵件