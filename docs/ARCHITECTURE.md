# AIO Insight — 機能・アーキテクチャ資料

**全体設計は [OVERVIEW.md](./OVERVIEW.md) を参照。**

## 概要

**AIO Insight** は AI検索（ChatGPT / Perplexity / Gemini 等）における企業サイトの可視性を診断・改善するSaaSサービス。
営業パイプライン自動化（FormPilot）を内蔵し、リード発見→診断→メール送信→コンバージョンまでを一気通貫で実行する。

| 項目 | 値 |
|------|-----|
| フレームワーク | Next.js 14 (App Router) |
| ホスティング | Vercel (hnd1 / 東京リージョン) |
| DB / Auth | Supabase (PostgreSQL + Auth) |
| メール送信 | SendGrid |
| 決済 | Stripe (Checkout + Webhook) |
| SEOデータ | Ahrefs API (オプション) |
| AI監視 | 自前 Brand Monitor (ChatGPT/Perplexity/Gemini) |

---

## 1. ページ構成

| パス | コンポーネント | 概要 |
|------|-------------|------|
| `/` | page.tsx | ハブページ（LP・ダッシュボード・ログインへの導線） |
| `/lp` | AIOServiceLP.jsx | サービスLP（料金・CTA・Stripe決済リンク） |
| `/diagnosis` | page.tsx | 無料AI可視性診断ツール（URL入力→スコア表示） |
| `/dashboard` | AIODashboard.jsx | 有料顧客用ダッシュボード（スコア推移・Brand Radar・競合分析） |
| `/pipeline` | FormPilotAutoV2.jsx | 営業パイプライン管理画面（リード一覧・自動送信・分析） |
| `/login` | page.tsx | ログインフォーム |
| `/reset-password` | page.tsx | パスワードリセット（メール送信 / 新パスワード設定） |
| `/payment-success` | page.tsx | Stripe決済完了ページ |
| `/unsubscribe` | page.tsx | メール配信停止ページ（HMAC署名検証） |
| `/privacy` | page.tsx | プライバシーポリシー |
| `/terms` | page.tsx | 利用規約 |
| `/tokusho` | page.tsx | 特定商取引法に基づく表記 |
| `/signup` | page.tsx | 新規登録（メールアドレスのみ・Magic Link） |
| `/diagnosis/[id]/detail` | DiagnosisDetailClient | 詳細診断レポート（認証必須） |

---

## 2. API エンドポイント一覧

### 2.1 公開API（認証なし）

| エンドポイント | メソッド | 概要 |
|-------------|--------|------|
| `/api/llmo-scan` | POST | 単一URL の LLMO診断（/diagnosis ページから呼出） |
| `/api/contact` | POST | お問い合わせフォーム送信（→leads保存→診断→メール送信） |
| `/api/track` | GET | メール開封/クリックトラッキング（HMAC署名検証あり） |
| `/api/unsubscribe` | POST | 配信停止処理（HMAC署名検証あり） |
| `/api/stripe-webhook` | POST | Stripe Webhook（Stripe署名検証） |

### 2.2 認証API（requireAuth: Bearer Token / Supabase Session）

| エンドポイント | メソッド | 概要 |
|-------------|--------|------|
| `/api/pipeline-leads` | GET/POST/PUT/DELETE | パイプラインリードCRUD |
| `/api/pipeline-scan` | POST | 複数URL一括診断（最大50件）→ リード保存 |
| `/api/auto-pipeline` | POST | 全自動パイプライン（重複排除→診断→保存→フォーム探索→メール送信） |
| `/api/auto-send` | POST | 手動一括メール送信（最大20件/回） |
| `/api/scan-forms` | POST | URL からフォーム・メール・電話番号探索 |
| `/api/lead-discover` | POST | DuckDuckGo検索 or CSV からURL自動発見 |
| `/api/pipeline-templates` | GET/PUT | テンプレート統計の取得・更新 |
| `/api/pipeline-activity` | GET/POST | パイプライン活動ログの取得・記録 |
| `/api/pipeline-config` | GET/PUT | 自動化設定の取得・更新 |
| `/api/brand-monitor` | GET/POST | Brand Monitor設定の管理 |
| `/api/ahrefs/brand-radar` | GET | Brand Radar プラットフォーム別データ |
| `/api/ahrefs/competitors` | GET/POST | 競合企業設定の管理 |
| `/api/ahrefs/top-pages` | GET | AIトラフィック上位ページ |
| `/api/ahrefs/traffic` | GET | トラフィックチャートデータ |

### 2.3 Cron API（CRON_SECRET認証）

| エンドポイント | スケジュール | 概要 |
|-------------|-----------|------|
| `/api/auto-send` | 平日 01:00 UTC (10:00 JST) | フォローアップメール自動送信 |
| `/api/rescan` | 毎週日曜 18:00 UTC (月曜 03:00 JST) | 有料顧客サイトの再診断 |
| `/api/cron/brand-check` | 毎日 03:00 UTC (12:00 JST) | AIブランドモニタリング実行 |

---

## 3. 営業パイプライン（FormPilot）フロー

```
[URL入力/検索/CSV]
    │
    ▼
┌─────────────────┐
│  リード発見       │  /api/lead-discover (DuckDuckGo / CSV)
│  URL重複排除      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLMO診断        │  /api/pipeline-scan or /api/auto-pipeline
│  スコア算出       │  llmoScore ≤ 40 → リード化
│  aiScore計算     │  重要度加重方式
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DB保存          │  pipeline_leads テーブル
│  phase:discovered │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  フォーム探索     │  /api/scan-forms
│  メール・電話抽出  │  phase → form_found
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  ステップメール送信（4通シーケンス）         │
│                                          │
│  Step 1: 初回アウトリーチ（診断レポート訴求）│  phase: sent
│     ↓ 3日後                               │
│  Step 2: 競合比較データ                    │  phase: step2
│     ↓ 4日後                               │
│  Step 3: 成功事例                         │  phase: step3
│     ↓ 7日後                               │
│  Step 4: 最終案内（限定特典）              │  → phase: dormant
│                                          │
│  各通: トラッキングピクセル + クリック追跡    │
│  各通: 配信停止リンク付き                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Stripe決済      │  → phase: customer
│  Webhook処理     │  アカウント自動作成
│  ウェルカムメール  │
└─────────────────┘
```

### リードのフェーズ遷移

```
discovered → form_found → sent → step2 → step3 → step4 → dormant
                                                              ↑
                            （全ステップ完了 or 配信停止）        │
                                                              │
                          customer ←─── Stripe決済完了 ────────┘
```

### ステップメール統計

| ステップ | テンプレート名 | 統計追跡 |
|---------|-------------|---------|
| Step 1 | Step1: 初回アウトリーチ | sent / opened / converted |
| Step 2 | Step2: 競合比較データ | sent / opened / converted |
| Step 3 | Step3: 成功事例 | sent / opened / converted |
| Step 4 | （最終案内） | 統計なし（dormant遷移のみ） |

---

## 4. データベーステーブル

### 4.1 コアテーブル

| テーブル | 用途 | 主要カラム |
|---------|------|----------|
| `leads` | LP経由の診断申込者 | email, company, url, llmo_score, status |
| `diagnosis_reports` | 診断結果詳細 | lead_id (FK), score, pagespeed_data, html_analysis, weaknesses, suggestions |
| `customers` | 有料顧客 | email (UNIQUE), stripe_customer_id, stripe_subscription_id, supabase_user_id, status |
| `email_logs` | メール送信履歴 | to_email, subject, template, status, error |

### 4.2 パイプラインテーブル

| テーブル | 用途 | 主要カラム |
|---------|------|----------|
| `pipeline_leads` | 営業リード | company, url, llmo_score, ai_score, phase, contact_email, follow_up_count, follow_up_scheduled, template_used, opened_email, clicked_link, stripe_status, mrr |
| `pipeline_template_stats` | テンプレート統計 | template_name, sent, opened, converted |
| `pipeline_activity_log` | 活動ログ | message, event_type, metadata |
| `pipeline_automation_config` | 自動化設定 | config (JSONB) |

### 4.3 ブランド監視テーブル

| テーブル | 用途 | 主要カラム |
|---------|------|----------|
| `brand_monitor_config` | Brand Monitor設定 | customer_id (FK), brand_name, target_domain, industry, is_active |
| `ahrefs_brand_radar_snapshots` | ブランド言及スナップショット | customer_id, target, platform, snapshot_date, mentions, citations, sov, impressions, trend |
| `ahrefs_traffic_snapshots` | トラフィックスナップショット | customer_id, site_url, date, organic, ai, direct, social |
| `ahrefs_competitor_config` | 競合企業設定 | customer_id, name, url |
| `ahrefs_top_pages` | 上位ページ | customer_id, url, ai_traffic, total_traffic |

---

## 5. 共有ライブラリ（lib/）

| ファイル | 用途 |
|---------|------|
| `supabase.ts` | Supabaseクライアント初期化（ブラウザ用 + 管理者用） |
| `api-auth.ts` | API認証（Bearer Token / Supabase Session） |
| `diagnosis.ts` | LLMO診断エンジン（PageSpeed API + HTML解析 + 6カテゴリスコアリング） |
| `email.ts` | SendGridメール送信（診断・ウェルカム・アウトリーチ） |
| `email-templates/outreach.ts` | 4ステップHTMLメールテンプレート生成 |
| `unsubscribe-token.ts` | HMAC署名トークン（配信停止 + トラッキング認証） |
| `pipeline-utils.ts` | パイプライン共有関数（URL正規化・AIスコア計算・テンプレート統計） |
| `scan-forms.ts` | Webサイトからフォーム・メール・電話番号を自動探索 |
| `brand-monitor.ts` | AI検索プラットフォームでのブランド言及チェック |
| `ahrefs.ts` | Ahrefs APIクライアント |

---

## 6. セキュリティ

| 項目 | 実装 |
|------|------|
| API認証 | `requireAuth()` — ADMIN_SECRET Bearer Token / Supabase Session Cookie |
| Cron認証 | CRON_SECRET Bearer Token（Vercel Cron専用） |
| Stripe認証 | Webhook署名検証（stripe-signature ヘッダー） |
| トラッキング | HMAC署名（`track:` プレフィックス + timingSafeEqual） |
| 配信停止 | HMAC署名（`unsub:` プレフィックス + timingSafeEqual、32文字） |
| XSS防止 | HTMLエスケープ（メールテンプレート内） |
| オープンリダイレクト防止 | クリックトラッキングで自ドメインのみ許可 |
| RLS | Supabase Row Level Security（supabaseAdmin はバイパス） |

---

## 7. 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理者キー | Yes |
| `CRON_SECRET` | Cron認証 + トークン署名シークレット | Yes |
| `ADMIN_SECRET` | 管理API認証キー | Yes |
| `SENDGRID_API_KEY` | SendGrid APIキー | Yes |
| `SENDGRID_FROM_EMAIL` | 送信元メールアドレス | Yes |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット | Yes |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | Stripe 決済リンクURL | Yes |
| `NEXT_PUBLIC_APP_URL` | アプリのベースURL | No (default: aio-rouge.vercel.app) |
| `NEXT_PUBLIC_SENDER_NAME` | メール送信者名 | No (default: AIO Insight) |
| `AHREFS_API_KEY` | Ahrefs APIキー | No (オプション) |
| `GOOGLE_PAGESPEED_API_KEY` | PageSpeed Insights APIキー | No |
| `GEMINI_API_KEY` | Gemini API（リード発見・AI実測・エンリッチ） | No (gemini_search / AI実測時は必須) |
| `FIRECRAWL_API_KEY` | Firecrawl API（SPAクロール・エンリッチ） | No (設定時は Firecrawl 優先) |

---

## 8. Cron ジョブ（vercel.json）

| ジョブ | スケジュール (UTC) | JST | 概要 |
|--------|------------------|-----|------|
| `/api/auto-send` | `0 1 * * 1-5` | 平日 10:00 | フォローアップメール自動送信（冪等性保証） |
| `/api/rescan` | `0 18 * * 0` | 月曜 03:00 | 有料顧客のサイト再診断（スコア推移記録） |
| `/api/cron/brand-check` | `0 3 * * *` | 毎日 12:00 | AIブランドモニタリング（Perplexityは月曜のみ） |
