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
- 既存auto-sendフローの変更

## Architecture

```
AIO Insight (Next.js)
├── /app/leadgenius/page.tsx         # 専用ページ（検索結果 | 送信キュー | 送信済みタブ）
├── /app/api/leadgenius/
│   ├── search/route.ts              # LeadGenius v1/search-and-diagnose を中継
│   ├── diagnose/route.ts            # v1/batch-diagnose を中継（既存リードの再診断用）
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

### TypeScript型定義（`types/api.ts` に追加）

```typescript
// LeadGenius API レスポンス型
export interface LeadGeniusCompany {
  id: string;
  name: string;
  url: string;
  industry: string;
  region: string;
  address: string;
  phone: string;
  email?: string;
  heat_score: number;
  founded_year?: number;
  employee_count?: string;
  representative?: string;
  contact_name?: string;
  contact_position?: string;
}

export interface LeadGeniusDiagnosisResult {
  companyId: string;
  companyName: string;
  companyUrl: string;
  targetSegment: 'hpcreater' | 'llmo' | 'both' | 'none';
  visibilityScore?: { inclusionRate: number; recommendationPosition: number; total: number };
  executiveSummary?: string;
  top3Improvements?: string[];
  schemaAudit?: { types: string[]; score: number };
}

export interface LeadGeniusSearchDiagnoseResult {
  searchResults: { companies: LeadGeniusCompany[]; totalFound: number };
  diagnosisResults: LeadGeniusDiagnosisResult[];
  actionableLeads: {
    hpcreater: Array<LeadGeniusDiagnosisResult & { company: LeadGeniusCompany }>;
    llmo: Array<LeadGeniusDiagnosisResult & { company: LeadGeniusCompany }>;
  };
  processedAt: string;
}

export interface LeadGeniusDiagnoseResult {
  results: LeadGeniusDiagnosisResult[];
  summary: { total: number; diagnosed: number; failed: number; segments: Record<string, number> };
  processedAt: string;
}

export interface LeadGeniusOutreachLead {
  companyId: string;
  companyName: string;
  email: string;
  targetSegment: 'hpcreater' | 'llmo' | 'both';
  visibilityScore?: number;
  targetReasons?: string[];
  executiveSummary?: string;
  top3Improvements?: string[];
  industry?: string;
  region?: string;
  url?: string;
}

export interface LeadGeniusOutreachResultEntry {
  companyId: string;
  companyName: string;
  to: string;
  subject: string;
  body: string;
  segment: string;
  status: 'sent' | 'scheduled' | 'dry_run' | 'failed' | 'skipped';
  resendId?: string;
  error?: string;
}

export interface LeadGeniusOutreachResult {
  results: LeadGeniusOutreachResultEntry[];
  summary: { total: number; sent: number; failed: number; skipped: number; dryRun: boolean };
}
```

### エラーハンドリング

- AbortController でタイムアウト管理
- HTTP 4xx/5xx はログ出力してnull返却
- 接続確認関数で事前チェック可能

## BFF API Routes

全ルートに `export const maxDuration = 180` を設定（search-and-diagnoseは時間がかかるため）。

### セキュリティ: 入力バリデーション

- outreachルート: リクエストのリードIDが `pipeline_leads` に実在するか確認（任意のIDでの送信を防止）
- outreachルート: メールアドレスは `pipeline_leads` から取得（リクエストボディからは受け取らない）
- 全ルート: `requireAuth(req)` で認証必須

### `POST /api/leadgenius/search`

1. `requireAuth(req)` で認証チェック
2. リクエストボディから検索パラメータ取得
3. `searchAndDiagnose()` 呼び出し
4. 検索結果の企業を `pipeline_leads` にupsert（urlで重複チェック）
   - 新規: phase=`discovered`, campaign=`leadgenius`（targetSegmentがnullの場合）or `leadgenius-{segment}`
   - 既存: llmo_score, weaknesses等を更新（phaseは変えない）
5. 診断結果のマッピング（後述）を適用して保存
6. `calculateAiScore()` を呼んで `ai_score` を算出して保存
7. `pipeline_activity_log` に `leadgenius_search` イベント記録
8. 結果をレスポンス

### `POST /api/leadgenius/outreach`

1. `requireAuth(req)` で認証チェック
2. リクエストボディからリードIDリスト + dryRunフラグ取得
3. `pipeline_leads` から対象リードを取得
4. dryRunの場合: `sendOutreach(leads, sender, { dryRun: true })` → プレビュー返却
5. 本送信の場合:
   - `sendOutreach(leads, sender)` 実行
   - 成功したリードの phase を `sent` に更新
   - `sent_at` をセット
   - `follow_up_count` を 99 にセット（既存auto-sendのフォローアップ対象から除外。auto-sendは follow_up_count < 4 を処理するため）
   - `pipeline_activity_log` に `leadgenius_outreach` イベント記録（送信結果含む）
6. 結果をレスポンス

### `GET/PUT /api/leadgenius/queue`

- GET: `pipeline_leads` から phase=`queued` かつ campaign LIKE `leadgenius%` のリードを取得
- PUT (キュー追加): 選択されたリードの `previous_phase` を現在のphaseとして保存し、phase を `queued` に更新、`scheduled_at` をセット
- PUT (キュー除外): phase を `previous_phase`（なければ `discovered`）に戻す

### フェーズ管理: `queued` フェーズの追加

既存のフェーズステートマシンに `queued` を追加する。DBマイグレーション不要（phaseカラムはTEXT型）。

- `previous_phase` カラムを `pipeline_leads` に追加（TEXT、nullable）— キューから除外時に元のフェーズに戻すため
- `queued` フェーズはLeadGenius送信キュー専用。既存auto-sendフローは `queued` を参照しないため影響なし
- フロー: `discovered` → `queued` → `sent`（送信成功時）or `discovered`（キュー除外時）

```sql
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS previous_phase TEXT;
```

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
| company.heat_score | heat_score | そのまま（0-100） |
| （算出） | ai_score | `calculateAiScore(llmo_score, weaknesses)` で算出 |
| diagnosis.visibilityScore.total | llmo_score | そのまま（0-100） |
| diagnosis.targetSegment | campaign | `leadgenius-{segment}` に変換（nullなら `leadgenius`） |
| diagnosis.executiveSummary | description | そのまま |
| diagnosis.top3Improvements | weaknesses | `[{category: "llmo", severity: "high", description: item}]` に変換 |
| diagnosis.schemaAudit | weaknesses | 既存weaknessesに追加 |
| company.founded_year | founded_year | そのまま |
| company.employee_count | employee_count | そのまま |
| company.representative | representative | そのまま |
| company.contact_name | contact_name | そのまま |
| company.contact_position | contact_position | そのまま |

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
- キューから除外ボタン（phaseを元のフェーズに戻す）

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
