# Supabase スキーマ定義 — 辞書型スキル

このスキルは、AIO Insight（FormPilot）の Supabase PostgreSQL における全テーブルのスキーマを定義する。データの読み書きを行うエージェントは、このスキルを参照して既存のデータ構造を壊さないように実装すること。

## インプット
- 操作対象のテーブル名
- 追加・変更したいカラムの内容

## アウトプット
- スキーマに準拠した Supabase 操作コード（TypeScript）
- カラム追加時はこのスキル自体の更新案

---

## 重要な設計上の注意

### 2つの「リード」テーブルが存在する
- **leads** — LP経由の無料診断申込者。顧客接点の入口
- **pipeline_leads** — 営業パイプラインで管理するCRMリード。スキャンで自動発見した企業

これらは別テーブルである。混同しないこと。診断申込者が有料化した場合は customers テーブルに移行する。pipeline_leads のリードが診断を受けた場合は leads にもレコードが作られる。

### Supabase のアクセスパターン
- API Routes（サーバーサイド）: `supabaseAdmin`（service_role キー）で全テーブルにフルアクセス
- クライアントサイド: `supabase`（anon キー）で RLS に従ったアクセスのみ
- 認証済みユーザー: 自分のデータのみ閲覧可能（RLS で制御）

---

## テーブル一覧

```
supabase/
├── leads                          … LP診断申込者
├── diagnosis_reports              … 診断結果レポート
├── customers                      … 有料顧客（Stripe連携）
├── email_logs                     … メール送信ログ
├── pipeline_leads                 … 営業パイプラインリード（CRM）
├── pipeline_activity_log          … パイプライン活動ログ
├── pipeline_automation_config     … 自動化設定（key-value）
├── pipeline_template_stats        … メールテンプレート実績
├── brand_monitor_config           … AI Brand Monitor 設定
├── ahrefs_traffic_snapshots       … Webトラフィック日次キャッシュ
├── ahrefs_brand_radar_snapshots   … Brand Radar データ
├── ahrefs_competitor_config       … 競合設定
└── ahrefs_top_pages               … ページ別AI流入
```

---

## leads テーブル（LP診断申込者）

LP の無料診断フォームから送信されたリード情報。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| company | TEXT | NOT NULL | — | 企業名 |
| name | TEXT | NOT NULL | — | 担当者名 |
| email | TEXT | NOT NULL | — | メールアドレス |
| url | TEXT | NOT NULL | — | WebサイトURL |
| message | TEXT | NULL | — | お問い合わせメッセージ |
| status | TEXT | NOT NULL | 'new' | ステータス |
| llmo_score | INTEGER | NULL | — | LLMO診断スコア |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | — | now() | 更新日時（トリガーで自動更新） |

**インデックス**: email, status
**RLS**: service_role はフルアクセス。authenticated ユーザーは自分の email と一致するレコードのみ SELECT 可能。

### status の取りうる値
```typescript
type LeadStatus = "new" | "contacted" | "diagnosed" | "converted" | "lost";
```

---

## diagnosis_reports テーブル（診断結果）

leads に紐づく診断レポート。1リードに対して1レポート。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| lead_id | UUID | NOT NULL | — | FK → leads(id), CASCADE削除 |
| score | INTEGER | NOT NULL | — | 診断スコア |
| pagespeed_data | JSONB | NULL | — | PageSpeed API のレスポンスデータ |
| html_analysis | JSONB | NULL | — | HTML構造分析結果 |
| weaknesses | JSONB | NULL | — | 弱点リスト |
| suggestions | JSONB | NULL | — | 改善提案リスト |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |

**インデックス**: lead_id
**RLS**: service_role はフルアクセス。authenticated ユーザーは自分の email に紐づくリードのレポートのみ SELECT 可能。

### JSONB フィールドの構造例

**weaknesses**:
```json
[
  { "category": "structured_data", "severity": "high", "description": "JSON-LDが未実装" },
  { "category": "eeat", "severity": "medium", "description": "著者情報が不足" }
]
```

**suggestions**:
```json
[
  { "priority": 1, "action": "JSON-LDの追加", "impact": "AIからの可視性が大幅に向上" },
  { "priority": 2, "action": "FAQ構造化データの追加", "impact": "回答エンジンでの表示率向上" }
]
```

---

## customers テーブル（有料顧客）

Stripe で課金中の顧客を管理。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| email | TEXT | NOT NULL | — | メールアドレス（UNIQUE） |
| stripe_customer_id | TEXT | NULL | — | Stripe Customer ID |
| stripe_subscription_id | TEXT | NULL | — | Stripe Subscription ID |
| supabase_user_id | UUID | NULL | — | Supabase Auth のユーザーID |
| status | TEXT | NOT NULL | 'active' | 契約状態 |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | — | now() | 更新日時（トリガーで自動更新） |

**インデックス**: email（UNIQUE）, stripe_customer_id, stripe_subscription_id
**RLS**: service_role はフルアクセス。authenticated ユーザーは supabase_user_id = auth.uid() のレコードのみ SELECT 可能。

### status の取りうる値
```typescript
type CustomerStatus = "active" | "past_due" | "canceled" | "trialing";
```

---

## email_logs テーブル（メール送信ログ）

SendGrid/Resend 経由で送信した全メールの記録。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| to_email | TEXT | NOT NULL | — | 送信先メールアドレス |
| subject | TEXT | NOT NULL | — | 件名 |
| template | TEXT | NOT NULL | — | 使用テンプレート名 |
| status | TEXT | NOT NULL | 'sent' | 送信状態 |
| error | TEXT | NULL | — | エラーメッセージ（失敗時） |
| created_at | TIMESTAMPTZ | — | now() | 送信日時 |

**インデックス**: to_email
**RLS**: service_role のみフルアクセス。

---

## pipeline_leads テーブル（営業パイプライン CRM）

FormPilot のメイン管理対象。スキャンで発見した企業のリード情報。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| company | TEXT | NOT NULL | — | 企業名 |
| url | TEXT | NOT NULL | — | WebサイトURL |
| industry | TEXT | NULL | — | 業種 |
| region | TEXT | NULL | — | 地域 |
| company_size | TEXT | NULL | — | 企業規模 |
| revenue | TEXT | NULL | — | 売上規模 |
| has_ad_spend | BOOLEAN | — | false | 広告出稿あり |
| llmo_score | INTEGER | — | 0 | LLMO対策スコア |
| ai_score | INTEGER | — | 0 | AI営業優先度スコア |
| weaknesses | JSONB | — | '[]' | 弱点リスト |
| phase | TEXT | NOT NULL | 'discovered' | パイプラインフェーズ |
| form_url | TEXT | NULL | — | 問い合わせフォームURL |
| contact_email | TEXT | NULL | — | 連絡先メールアドレス |
| contact_phone | TEXT | NULL | — | 連絡先電話番号 |
| contact_page_url | TEXT | NULL | — | 連絡先ページURL |
| stripe_status | TEXT | NULL | — | Stripe契約ステータス |
| mrr | INTEGER | — | 0 | MRR（円） |
| scheduled_at | TIMESTAMPTZ | NULL | — | メール送信予定日時 |
| sent_at | TIMESTAMPTZ | NULL | — | メール送信日時 |
| replied_at | TIMESTAMPTZ | NULL | — | 返信日時 |
| discovered_at | TIMESTAMPTZ | — | now() | 発見日時 |
| template_used | TEXT | NULL | — | 使用メールテンプレートID |
| follow_up_count | INTEGER | — | 0 | フォローアップ送信回数 |
| follow_up_scheduled | TIMESTAMPTZ | NULL | — | 次回フォローアップ予定日時 |
| diagnosis_sent | BOOLEAN | — | false | 診断結果送信済み |
| opened_email | BOOLEAN | — | false | メール開封済み |
| clicked_link | BOOLEAN | — | false | リンククリック済み |
| notes | TEXT | NULL | — | メモ |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | — | now() | 更新日時（トリガーで自動更新） |

**インデックス**: phase, ai_score DESC, industry, created_at DESC, contact_email, (phase + follow_up_scheduled) の複合インデックス
**RLS**: service_role のみフルアクセス。

### phase の取りうる値
```typescript
type PipelinePhase =
  | "discovered"     // 発見
  | "scanned"        // スキャン済み
  | "form_found"     // フォーム発見
  | "queued"         // メールキュー
  | "sent"           // 送信済み
  | "step2"          // フォローアップ2回目
  | "step3"          // フォローアップ3回目
  | "opened"         // 開封
  | "clicked"        // クリック
  | "replied"        // 返信
  | "deal"           // 商談
  | "won"            // 受注
  | "lost"           // 失注
  | "dormant"        // 休眠
  | "unsubscribed";  // 配信停止
```

### llmo_score vs ai_score の違い
- **llmo_score**: Webサイトの LLMO 対策状況スコア（0-100）。AIO-knowledge.md の診断ロジック準拠
- **ai_score**: 営業優先度スコア（0-100）。業種・規模・対策状況・地域から算出

---

## pipeline_activity_log テーブル（活動ログ）

パイプラインの全アクションのタイムラインログ。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| event_type | TEXT | NOT NULL | 'info' | イベント種別 |
| message | TEXT | NOT NULL | — | イベント説明（日本語） |
| metadata | JSONB | NULL | — | 追加データ |
| created_at | TIMESTAMPTZ | — | now() | 発生日時 |

**インデックス**: created_at DESC
**RLS**: service_role のみフルアクセス。

### event_type の取りうる値
```typescript
type EventType =
  | "info"           // 一般情報
  | "scan"           // スキャン関連
  | "email_sent"     // メール送信
  | "email_opened"   // メール開封
  | "email_clicked"  // リンククリック
  | "reply"          // 返信受信
  | "phase_change"   // フェーズ変更
  | "deal"           // 商談関連
  | "error";         // エラー
```

---

## pipeline_automation_config テーブル（自動化設定）

key-value 形式のアプリケーション設定。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| config_key | TEXT | NOT NULL | — | 設定キー（UNIQUE） |
| config_value | JSONB | NOT NULL | '{}' | 設定値 |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | — | now() | 更新日時（トリガーで自動更新） |

### 使用されるキーの例
```typescript
// スキャン設定
{ config_key: "scan_settings", config_value: { industries: [...], regions: [...], frequency: "weekly" } }

// メール設定
{ config_key: "email_settings", config_value: { sender: "...", dailyLimit: 100, provider: "resend" } }

// 自動化ON/OFF
{ config_key: "automation_enabled", config_value: { enabled: true, lastToggled: "..." } }
```

---

## pipeline_template_stats テーブル（テンプレート実績）

メールテンプレートの送信・開封・返信・コンバージョン実績。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| template_id | TEXT | NOT NULL | — | テンプレートID（UNIQUE） |
| template_name | TEXT | NOT NULL | — | テンプレート名 |
| sent | INTEGER | — | 0 | 送信数 |
| opened | INTEGER | — | 0 | 開封数 |
| replied | INTEGER | — | 0 | 返信数 |
| converted | INTEGER | — | 0 | コンバージョン数 |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | — | now() | 更新日時（トリガーで自動更新） |

---

## brand_monitor_config テーブル（AI Brand Monitor 設定）

顧客ごとのブランド監視設定。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| customer_id | UUID | — | — | FK → customers(id), CASCADE削除 |
| brand_name | TEXT | NOT NULL | — | ブランド名 |
| target_domain | TEXT | NOT NULL | — | 監視対象ドメイン |
| industry | TEXT | NOT NULL | '' | 業種 |
| custom_prompts | JSONB | NULL | — | カスタムプロンプト設定 |
| is_active | BOOLEAN | — | true | 有効/無効 |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | — | now() | 更新日時（トリガーで自動更新） |

**インデックス**: is_active（部分インデックス: WHERE is_active = true）, customer_id

---

## Ahrefs データテーブル群

### ahrefs_traffic_snapshots（Webトラフィック日次キャッシュ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| customer_id | UUID | — | — | FK → customers(id), CASCADE削除 |
| site_url | TEXT | NOT NULL | — | サイトURL |
| date | DATE | NOT NULL | — | データ日付 |
| organic | INTEGER | — | 0 | オーガニック流入 |
| ai | INTEGER | — | 0 | AI検索流入 |
| direct | INTEGER | — | 0 | ダイレクト流入 |
| social | INTEGER | — | 0 | ソーシャル流入 |
| total | INTEGER | — | 0 | 合計トラフィック |
| bounce_rate | NUMERIC(5,2) | NULL | — | 直帰率 |
| avg_duration_seconds | INTEGER | NULL | — | 平均滞在秒数 |
| raw_data | JSONB | NULL | — | API生レスポンス |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |

**UNIQUE制約**: (customer_id, site_url, date) — upsert 用

### ahrefs_brand_radar_snapshots（Brand Radar データ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| customer_id | UUID | — | — | FK → customers(id), CASCADE削除 |
| target | TEXT | NOT NULL | — | 監視対象 |
| platform | TEXT | NOT NULL | — | プラットフォーム名 |
| mentions | INTEGER | — | 0 | 言及数 |
| citations | INTEGER | — | 0 | 引用数 |
| sov | NUMERIC(5,2) | — | 0 | Share of Voice |
| impressions | INTEGER | — | 0 | インプレッション |
| trend | NUMERIC(5,2) | — | 0 | トレンド変化率 |
| snapshot_date | DATE | NOT NULL | — | スナップショット日付 |
| raw_data | JSONB | NULL | — | API生レスポンス |
| created_at | TIMESTAMPTZ | — | now() | 作成日時 |

**UNIQUE制約**: (customer_id, target, platform, snapshot_date) — upsert 用

### ahrefs_competitor_config（競合設定）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| customer_id | UUID | FK → customers(id) |
| competitor_name | TEXT | 競合名 |
| competitor_url | TEXT | 競合URL |
| display_order | INTEGER | 表示順 |
| created_at / updated_at | TIMESTAMPTZ | 日時 |

### ahrefs_top_pages（ページ別AI流入）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| customer_id | UUID | FK → customers(id) |
| page_url | TEXT | ページURL |
| ai_traffic | INTEGER | AI流入数 |
| total_traffic | INTEGER | 合計トラフィック |
| ai_ratio | NUMERIC(5,2) | AI流入比率 |
| trend | NUMERIC(5,2) | トレンド |
| snapshot_date | DATE | スナップショット日付 |
| created_at | TIMESTAMPTZ | 作成日時 |

---

## RLS（Row Level Security）ポリシー方針

全テーブルで RLS 有効。ポリシーは以下の原則に従う。

| テーブル | service_role | authenticated | anon |
|---------|-------------|---------------|------|
| leads | フルアクセス | 自分の email のレコードのみ SELECT | アクセス不可 |
| diagnosis_reports | フルアクセス | 自分のリードに紐づくレポートのみ SELECT | アクセス不可 |
| customers | フルアクセス | supabase_user_id = auth.uid() のみ SELECT | アクセス不可 |
| email_logs | フルアクセス | アクセス不可 | アクセス不可 |
| pipeline_leads | フルアクセス | アクセス不可 | アクセス不可 |
| pipeline_* 系 | フルアクセス | アクセス不可 | アクセス不可 |
| brand_monitor_config | フルアクセス | アクセス不可 | アクセス不可 |
| ahrefs_* 系 | フルアクセス | アクセス不可 | アクセス不可 |

**重要**: pipeline_leads および ahrefs 系テーブルは管理者（TAKASHI）専用。一般ユーザーからのアクセスは全て service_role 経由の API Routes で制御する。

---

## TypeScript 型定義テンプレート

エージェントが新しいクエリを書くときは、以下の型定義パターンに従うこと。

```typescript
// types/database.ts

export interface Lead {
  id: string;
  company: string;
  name: string;
  email: string;
  url: string;
  message: string | null;
  status: "new" | "contacted" | "diagnosed" | "converted" | "lost";
  llmo_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineLead {
  id: string;
  company: string;
  url: string;
  industry: string | null;
  region: string | null;
  company_size: string | null;
  revenue: string | null;
  has_ad_spend: boolean;
  llmo_score: number;
  ai_score: number;
  weaknesses: Array<{ category: string; severity: string; description: string }>;
  phase: PipelinePhase;
  form_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_page_url: string | null;
  stripe_status: string | null;
  mrr: number;
  scheduled_at: string | null;
  sent_at: string | null;
  replied_at: string | null;
  discovered_at: string;
  template_used: string | null;
  follow_up_count: number;
  follow_up_scheduled: string | null;
  diagnosis_sent: boolean;
  opened_email: boolean;
  clicked_link: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  supabase_user_id: string | null;
  status: "active" | "past_due" | "canceled" | "trialing";
  created_at: string;
  updated_at: string;
}
```

---

## スキーマ変更ルール

1. カラム追加は `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` を使う
2. 既存カラムのリネームは避ける。新カラム追加 → データ移行 → 旧カラム削除の手順で
3. migration SQL ファイルを新規作成し、ファイル名は `supabase-migration-[目的].sql` とする
4. 変更後は必ずこのスキルファイルを更新してから実装に着手する
5. UNIQUE 制約の追加は `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` パターンで冪等にする
