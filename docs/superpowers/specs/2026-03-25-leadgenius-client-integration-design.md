# AIO Insight × LeadGenius API Client Integration

## Overview

AIO InsightにLeadGenius API v1のクライアントを実装し、専用ページから検索・診断・アウトリーチを一気通貫で操作できるようにする。アウトリーチはキュー方式で、承認後に送信する。

## Goals

1. LeadGenius v1 API（search-and-diagnose, batch-diagnose, send-outreach）を呼ぶクライアントモジュールを `/lib/leadgenius.ts` に実装
2. BFF API routes（`/app/api/leadgenius/`）でLeadGenius APIを中継し、結果をSupabase `pipeline_leads` に保存
3. 専用ページ（`/app/leadgenius/`）で検索→診断→キュー→承認→送信のワンストップUIを提供
4. 送信結果を `pipeline_activity_log` に記録し、既存パイプラインと統合追跡

## Non-Goals

- 既存AI検索（`/app/api/ai-search/`）の置き換え
- 既存SendGridメール送信フローの変更
- Cron自動実行（今回は手動操作のみ）
- APIレート制限（優先度3、別タスク）

## Architecture

```
AIO Insight (Next.js)
├── /app/leadgenius/page.tsx         # 専用ページ（検索結果 | 送信キュー | 送信済みタブ）
├── /app/api/leadgenius/
│   ├── search/route.ts              # LeadGenius v1/search-and-diagnose を中継
│   ├── outreach/route.ts            # v1/send-outreach を中継 + Supabase記録
│   └── queue/route.ts               # 送信キューCRUD（phase管理）
├── /lib/leadgenius.ts               # APIクライアント
└── /components/leadgenius/          # UIコンポーネント
    ├── SearchForm.tsx               # 検索フォーム（industry, region, keyword）
    ├── DiagnosisResults.tsx         # 診断結果カード一覧
    ├── OutreachQueue.tsx            # 送信キューリスト + 承認ボタン
    └── OutreachHistory.tsx          # 送信済みリスト
```

## Client Module: `/lib/leadgenius.ts`

既存パターン（ahrefs.ts, firecrawl.ts）に準拠した関数エクスポート方式。

### 環境変数

- `LEADGENIUS_API_KEY` — X-API-Key ヘッダーに使用
- `LEADGENIUS_API_URL` — LeadGenius APIのベースURL（デフォルト: `https://leadgenius-ai-search.vercel.app`）

### エクスポート関数

```typescript
export function isLeadGeniusConnected(): boolean
// LEADGENIUS_API_KEY が設定されているか確認

export async function searchAndDiagnose(params: {
  search: { industry?: string; region?: string; keyword?: string };
  diagnoseTop?: number;
  options?: { skipCrawl?: boolean };
}): Promise<LeadGeniusSearchDiagnoseResult | null>
// v1/search-and-diagnose を呼び出し。タイムアウト120s。エラー時null。

export async function batchDiagnose(companies: {
  id: string; name: string; url: string; industry?: string; region?: string;
}[], options?: { concurrency?: number; skipCrawl?: boolean }): Promise<LeadGeniusDiagnoseResult | null>
// v1/batch-diagnose を呼び出し。タイムアウト120s。エラー時null。

export async function sendOutreach(leads: LeadGeniusOutreachLead[], sender: {
  companyName: string; contactName: string; email: string; phone?: string;
}, options?: { dryRun?: boolean; scheduledAt?: string }): Promise<LeadGeniusOutreachResult | null>
// v1/send-outreach を呼び出し。タイムアウト60s。エラー時null。
```

### エラーハンドリング

- AbortController でタイムアウト管理
- HTTP 4xx/5xx はログ出力してnull返却
- 接続確認関数で事前チェック可能

## BFF API Routes

### `POST /api/leadgenius/search`

1. `requireAuth(req)` で認証チェック
2. リクエストボディから検索パラメータ取得
3. `searchAndDiagnose()` 呼び出し
4. 検索結果の企業を `pipeline_leads` にupsert（urlで重複チェック）
   - 新規: phase=`discovered`, campaign=`leadgenius`
   - 既存: llmo_score, weaknesses等を更新（phaseは変えない）
5. 診断結果のマッピング（後述）を適用して保存
6. `pipeline_activity_log` に `leadgenius_search` イベント記録
7. 結果をレスポンス

### `POST /api/leadgenius/outreach`

1. `requireAuth(req)` で認証チェック
2. リクエストボディからリードIDリスト + dryRunフラグ取得
3. `pipeline_leads` から対象リードを取得
4. dryRunの場合: `sendOutreach(leads, sender, { dryRun: true })` → プレビュー返却
5. 本送信の場合:
   - `sendOutreach(leads, sender)` 実行
   - 成功したリードの phase を `sent` に更新
   - `sent_at` をセット
   - `pipeline_activity_log` に `leadgenius_outreach` イベント記録（送信結果含む）
6. 結果をレスポンス

### `GET/PUT /api/leadgenius/queue`

- GET: `pipeline_leads` から phase=`queued` かつ campaign LIKE `leadgenius%` のリードを取得
- PUT: 選択されたリードの phase を `queued` に更新、`scheduled_at` をセット

## データマッピング: LeadGenius → pipeline_leads

| LeadGenius フィールド | pipeline_leads カラム | 変換ロジック |
|---|---|---|
| company.name | company | そのまま |
| company.url | url | そのまま |
| company.industry | industry | そのまま |
| company.region | region | そのまま |
| company.email | contact_email | そのまま |
| company.phone | contact_phone | そのまま |
| company.address | address | そのまま |
| company.heat_score | ai_score | そのまま（0-100） |
| diagnosis.visibilityScore.total | llmo_score | そのまま（0-100） |
| diagnosis.targetSegment | campaign | `leadgenius-{segment}` に変換 |
| diagnosis.executiveSummary | description | そのまま |
| diagnosis.top3Improvements | weaknesses | `[{category: "llmo", severity: "high", description: item}]` に変換 |
| diagnosis.schemaAudit | weaknesses | 既存weaknessesに追加 |
| company.founded_year | founded_year | そのまま |
| company.employee_count | employee_count | そのまま |
| company.representative | representative | そのまま |

## UI: `/app/leadgenius/page.tsx`

### レイアウト

3タブ構成:

1. **検索結果タブ**: 検索フォーム + 診断結果カード一覧
2. **送信キュータブ**: キュー内リード一覧 + 一括承認/個別承認
3. **送信済みタブ**: 送信履歴一覧

### 検索結果タブ

- 検索フォーム: industry（テキスト）, region（テキスト）, keyword（テキスト）, diagnoseTop（数値、デフォルト5）
- 検索実行 → ローディング表示（batch-diagnoseは時間がかかるため進捗表示）
- 結果: 企業カードにLLMOスコア、targetSegment、executiveSummary表示
- 各カードに「キューに追加」ボタン
- 一括選択 + 「選択をキューに追加」ボタン

### 送信キュータブ

- phase=`queued` のリード一覧
- 各リードにメールプレビューボタン（dryRun実行）
- 一括承認ボタン → 確認ダイアログ → 本送信実行
- 個別承認ボタン
- キューから除外ボタン（phaseを`discovered`に戻す）

### 送信済みタブ

- `pipeline_activity_log` から `leadgenius_outreach` イベントを取得
- 送信日時、送信先、ステータス（sent/failed）、セグメント表示

### デザイン

既存パイプラインUI（`/app/pipeline/`）のスタイルに準拠:
- ダークテーマ
- 赤CTA (#e94560)
- カード型レイアウト
- Tailwind CSS

## 送信者情報

環境変数から取得（LeadGenius側の既存設定と同じ）:
- `OUTREACH_SENDER_COMPANY` = BeginAI株式会社
- `OUTREACH_SENDER_NAME` = 徳山
- `OUTREACH_SENDER_EMAIL` = info@e-learning-ai.jp

## Testing Strategy

- `/lib/leadgenius.ts`: 接続確認、各関数のリクエスト/レスポンス形式
- BFF API routes: 認証、マッピング、Supabase保存の確認
- 送信テスト: dryRun=trueで実際のメール送信なしにプレビュー確認
- E2E: 検索→キュー追加→承認→dryRun送信の一連フロー
