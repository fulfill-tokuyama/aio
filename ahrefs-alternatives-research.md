# Ahrefsの代替サービス調査（2026年版）

## 背景・課題

AIO Insight は月額¥10,000のサービスだが、Ahrefs有料プラン（Lite $99/月 + Brand Radar $50/月 = **$149/月〜**）を契約するとデータ元コストだけで売上を超過する。Ahrefsは未契約のまま、代替手段を確定する必要がある。

---

## 当サービスの実際のAhrefs利用状況（コード分析）

### Ahrefs不要で動作する部分

| 機能 | ファイル | 依存先 |
|------|----------|--------|
| AI可視性診断エンジン（score 0-100） | `lib/diagnosis.ts` | Google PageSpeed API + cheerio |
| Overview タブ | `AIODashboard.jsx` L483-641 | 診断結果（diagnosisData props） |
| 競合設定 CRUD | `api/ahrefs/competitors/route.ts` | Supabase のみ |
| トップページ表示 | `api/ahrefs/top-pages/route.ts` | Supabase のみ |
| LP / 問い合わせ | `AIOServiceLP.jsx` | Stripe + `/api/contact` |

### Ahrefs APIが必要な部分（2箇所のみ）

| 機能 | APIエンドポイント | データ |
|------|------------------|--------|
| AIトラフィックタブ | `/web-analytics/chart`, `/stats` | organic, ai, direct, social, total, bounceRate, avgDuration |
| Brand Radarタブ | `/brand-radar/mentions`, `/overview` | platform, mentions, citations, sov, impressions, trend |

### Ahrefsの料金体系

| 項目 | 費用 | 備考 |
|------|------|------|
| Web Analytics API | **$0（無料）** | 有料プラン不要、全ユーザー利用可能 |
| Brand Radar | **$50/月〜** | 有料アドオン |
| Ahrefs Lite（最低プラン） | $99/月 | API利用に必要かは要確認 |

---

## 最終結論：推奨構成

### API連携可否の調査結果

当サービスのダッシュボードはAPIをプログラムから直接呼び出す構造（`lib/ahrefs.ts` → 4つのAPIルート → ダッシュボードfetch）のため、**APIが無いツールは統合不可能**。

| ツール | API提供 | 月額 | 判定 |
|--------|---------|------|------|
| Otterly AI | なし（ダッシュボード + Looker Studio出力のみ） | $29〜 | ✕ 統合不可 |
| Writesonic GEO | なし（ダッシュボードのみ） | $16〜 | ✕ 統合不可 |
| SE Visible | 不明 | $18.72〜 | △ 要確認 |
| Answer Socrates | なし（Webツールのみ） | $0〜$9 | ✕ 統合不可 |
| **heeb.ai** | **あり（API-first設計）** | 要確認 | **◎ 最有力** |
| **自前構築** | ChatGPT API + Perplexity Sonar API | API使用料のみ | **◎ 最安** |

### ★ 推奨構成（最終版）

```
┌──────────────────────────────────────────────────────────┐
│  AIO Insight ダッシュボード                                │
├──────────────┬───────────────────────────────────────────┤
│ AIトラフィック │  Ahrefs Web Analytics API（無料・変更なし）  │
│   タブ        │  既存コードそのまま利用                      │
├──────────────┼───────────────────────────────────────────┤
│ Brand Radar  │  LLM Scout Brand Intelligence API        │
│   タブ        │  lib/ahrefs.ts のBR部分を差し替え           │
│              │  → GET 1本・同期・日本語対応・SoV完全一致    │
├──────────────┼───────────────────────────────────────────┤
│ Overview     │  自前診断エンジン（変更なし）                 │
│   タブ        │  lib/diagnosis.ts                         │
├──────────────┼───────────────────────────────────────────┤
│ 競合分析タブ  │  Supabase CRUD（変更なし）                  │
│              │  api/ahrefs/competitors/route.ts           │
└──────────────┴───────────────────────────────────────────┘
```

**LLM Scout を第一候補とする理由:**
1. `share_of_voice` が当サービスの `sov` フィールドに**完全一致**
2. 同期GET API（ポーリング不要 → 実装が最もシンプル）
3. **日本語対応**（`language=ja`）→ 日本のクライアント向けサービスに最適
4. **$3無料クレジット**で即テスト可能（支払い情報不要）
5. デモキー `llmscout_demo_2024` で即座にAPIの動作確認可能
6. `platform_coverage` でChatGPT/Gemini/Perplexity別のデータ取得可能

**注意点:** Copilot / AI Overviews / AI Mode は未対応。
→ 主要3プラットフォーム（ChatGPT/Gemini/Perplexity）でカバー率は十分。
→ 将来的にheeb.aiを追加導入して補完することも可能。

### 費用比較

| 構成 | 月額コスト | コード変更量 | 即テスト |
|------|-----------|-------------|---------|
| ❌ Ahrefs有料プラン | $149/月〜（約¥22,000） | なし | ✕（未契約） |
| ✅ Ahrefs WA(無料) + **LLM Scout** | 要確認（$3無料枠あり） | **最小** | ✅ デモキーで即可 |
| ✅ Ahrefs WA(無料) + heeb.ai | 要確認 | 中 | △ 要登録 |
| ✅ Ahrefs WA(無料) + 自前構築 | $5〜$20/月 | 大 | ✕ 実装後 |

---

## 候補1: heeb.ai LLM Mentions API

### 概要

heeb.aiはAI検索可視性データに特化した**API-firstのサービス**。ダッシュボードやUI無し、開発者向けのAPIのみ提供。

### API仕様（確認済み）

```
ベースURL: https://api.heeb.ai
認証:     x-api-key ヘッダー
キー取得:  https://heeb.ai/dashboard/keys（アカウント登録後）
```

#### エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `POST` | `/api/query` | クエリ送信 → `job_id` を返却（非同期処理開始） |
| `GET` | `/api/result/{job_id}` | 処理結果を取得（構造化JSON） |

#### リクエストボディ（POST /api/query）

```json
{
  "models": ["openai-gpt-4o", "google-ai-mode", "perplexity-sonar", "xai-grok"],
  "prompt": "東京でおすすめの歯医者を教えてください",
  "entity": {
    "name": "○○歯科クリニック",
    "url": "https://example-dental.com"
  },
  "location": "JP"
}
```

#### レスポンス（GET /api/result/{job_id}）

```json
{
  "mentions": [...],          // ブランド言及の詳細
  "sentiment": "positive",    // 感情分析
  "citations": [...],         // 引用URL一覧
  "sources": [...],           // 引用元コンテンツ断片
  "visibility_score": 72,     // 可視性スコア (0-100)
  "competitor_mentions": [...] // 競合ブランドの言及
}
```

#### 処理方式

**非同期**（POSTでジョブ投入 → ポーリングで結果取得）。1〜2分で結果返却。

### 対応LLM

OpenAI GPTs / Google AI Mode / Perplexity Sonar / xAI Grok / Claude / Gemini

### 提供データ ↔ 当サービスのBrand Radarタブ対応

| heeb.ai のデータ | 当サービスの対応フィールド | 対応状況 |
|------------------|-------------------------|---------|
| mentions | `mentions` | ✅ 直接対応 |
| sentiment | ―（未使用） | 拡張可能 |
| citations | `citations` | ✅ 直接対応 |
| sources | ―（未使用） | 拡張可能 |
| visibility_score | `sov`（Share of Voice） | ✅ マッピング可能 |
| competitor_mentions | 競合分析タブ | ✅ 拡張可能 |

### 料金

**公開されていない**。Webサイトに料金ページなし。アカウント登録後にダッシュボードで確認する必要あり。

### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 最も包括的なデータ（mentions/sentiment/citations/sources） | 料金が不透明 |
| 1 APIコールで複数LLMを横断クエリ | 非同期処理（ポーリング実装が必要） |
| 競合メンション・プロンプトボリューム推定も対応 | 新しいサービスで実績が少ない |
| 開発者向けAPI-first設計 | |

---

## 候補2: LLM Scout Brand Intelligence API（新規発見・有力）

### 概要

LLM Scoutは`llmscout.co`が提供するAIブランドインテリジェンスAPI。MITライセンスのGitHub連携ガイドあり。**$3の無料クレジット付き（支払い不要）**。

### API仕様（確認済み）

```
ベースURL: https://llmscout.co
認証:     api_key クエリパラメータ
デモキー:  llmscout_demo_2024（Stripe/Shopifyでテスト可能）
```

#### エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/brand-intelligence` | ブランドのAI可視性データを取得 |

#### リクエストパラメータ

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `brand` | ✅ | 分析対象のブランド名（例: "○○歯科"） |
| `api_key` | ✅ | APIキー |
| `language` | ❌ | 言語コード（**日本語 `ja` 対応**、全12言語） |

#### リクエスト例

```
GET https://llmscout.co/api/brand-intelligence?brand=○○歯科&api_key=YOUR_KEY&language=ja
```

#### レスポンス

```json
{
  "visibility_score": 65,       // AI検索での可視性 (0-100%)
  "share_of_voice": 23.5,      // 競合内でのシェア (%)
  "competitors": [              // 競合ブランド一覧（可視性メトリクス付き）
    { "name": "△△歯科", "visibility_score": 78 }
  ],
  "related_prompts": [          // ブランドが出現するプロンプト一覧
    {
      "prompt": "東京でおすすめの歯医者",
      "platforms": { "chatgpt": true, "gemini": true, "perplexity": false }
    }
  ],
  "platform_coverage": {        // プラットフォーム別の出現状況
    "chatgpt": { ... },
    "gemini": { ... },
    "perplexity": { ... }
  },
  "citations": [                // LLMが引用するドメイン一覧
    "https://example-dental.com/about"
  ]
}
```

#### 処理方式

**同期**（GETで即座にレスポンス返却）。ポーリング不要。

### 対応LLM

ChatGPT / Gemini / Perplexity（platform_coverageで個別データ）

### 提供データ ↔ 当サービスのBrand Radarタブ対応

| LLM Scout のデータ | 当サービスの対応フィールド | 対応状況 |
|-------------------|-------------------------|---------|
| visibility_score | `impressions` → スコア | ✅ 直接対応 |
| share_of_voice | `sov` | ✅ **完全一致** |
| competitors | 競合分析タブ | ✅ 直接対応 |
| platform_coverage | `platform`別表示 | ✅ 直接対応 |
| citations | `citations` | ✅ 直接対応 |
| related_prompts | ―（未使用） | 拡張可能 |

### 料金

| 項目 | 詳細 |
|------|------|
| 無料クレジット | **$3（支払い不要）** |
| デモキー | `llmscout_demo_2024`（Stripe/Shopifyで即テスト可） |
| 有料プラン | 料金ページ未公開（要確認） |

### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| **同期API**（GETで即返却、ポーリング不要） | 対応LLMが3つ（ChatGPT/Gemini/Perplexity） |
| **$3無料クレジット**で即テスト可能 | Copilot/AI Overviews/AI Mode未対応 |
| **日本語対応**（`language=ja`） | 有料プラン料金が不明 |
| `share_of_voice`がBrand Radarの`sov`に完全一致 | mentionsカウントの個別数値なし |
| MITライセンスの統合ガイド（GitHub） | |
| シンプル（1エンドポイント、同期レスポンス） | |

---

## 候補3: 自前構築（最安オプション）— 詳細設計

ChatGPT API + Perplexity Sonar API + Gemini API を使い、Brand Radar機能を自前実装する方法。

### ダッシュボードが必要とするデータ形式（確認済み）

Brand Radarタブが表示するのは、以下の`platforms[]`配列：

```typescript
// app/api/ahrefs/brand-radar/route.ts が返す形式
{
  connected: true,
  platforms: [
    {
      platform: "ChatGPT",       // プラットフォーム名
      mentions: 12,              // ブランド言及回数
      citations: 5,              // 引用回数
      sov: 45.2,                 // Share of Voice (%)
      impressions: 8500,         // 推定インプレッション数
      trend: 12.1,               // 前期比トレンド (%)
    },
    { platform: "Perplexity", ... },
    { platform: "Gemini", ... },
    // Copilot, AI Overviews, AI Mode は省略可能
  ]
}
```

### アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│ Vercel Cron Job（既存の6時間間隔を流用）               │
│ app/api/cron/brand-check/route.ts（新規作成）         │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ Step 1: Supabaseから顧客リストを取得                    │
│   → customer_id, target (ドメイン), brand_name         │
└──────────┬──────────────────────────────────────────┘
           │
           ▼ 各顧客について並列実行
┌──────────────────────────────────────────────────────┐
│ Step 2: 3つのAPIに同じプロンプトを送信                   │
│                                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐   │
│  │ ChatGPT API │ │ Perplexity   │ │ Gemini API  │   │
│  │ GPT-4o-mini │ │ Sonar API    │ │ 2.5 Flash   │   │
│  └──────┬──────┘ └──────┬───────┘ └──────┬──────┘   │
│         │               │                │           │
│         ▼               ▼                ▼           │
│  Step 3: JSON構造化レスポンス（function calling使用）   │
│  { mentioned: bool, context: string, sources: [] }   │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ Step 4: platforms[] 形式にマッピング                    │
│   → mentions/citations/sov/impressions/trend を算出    │
│   → ahrefs_brand_radar_snapshots に保存                │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ 既存ダッシュボード（変更なし）                           │
│   AIODashboard.jsx → fetch('/api/ahrefs/brand-radar')  │
│   → Supabaseから最新スナップショットを返却                │
└──────────────────────────────────────────────────────┘
```

### 使用するAPI（3つ）

#### 1. OpenAI API（ChatGPT検出用）

```
エンドポイント: https://api.openai.com/v1/chat/completions
認証:          Authorization: Bearer sk-...
モデル:        gpt-4o-mini
```

| 項目 | 値 |
|------|-----|
| Input | $0.15 / 1Mトークン |
| Output | $0.60 / 1Mトークン |
| コンテキスト | 128Kトークン |
| 特徴 | Function Calling で構造化JSON出力が可能 |

```json
// リクエスト例
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "あなたはAI検索アシスタントです。ユーザーの質問に対して、関連する事業者やサービスを紹介してください。"
    },
    {
      "role": "user",
      "content": "東京でおすすめの歯医者を教えてください"
    }
  ],
  "tools": [{
    "type": "function",
    "function": {
      "name": "extract_brand_mentions",
      "parameters": {
        "type": "object",
        "properties": {
          "mentioned_brands": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "url": { "type": "string" },
                "context": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }]
}
```

#### 2. Perplexity Sonar API（Perplexity検出用）

```
エンドポイント: https://api.perplexity.ai/chat/completions
認証:          Authorization: Bearer pplx-...
モデル:        sonar
```

| 項目 | 値 |
|------|-----|
| Input | $1 / 1Mトークン |
| Output | $1 / 1Mトークン |
| リクエスト費用 | $5 / 1,000リクエスト |
| 特徴 | **自動でWeb検索 + 引用URL付き（`citations[]`, `search_results[]`）** |

```json
// リクエスト例（OpenAI SDK互換）
{
  "model": "sonar",
  "messages": [
    {
      "role": "user",
      "content": "東京でおすすめの歯医者を教えてください"
    }
  ]
}

// レスポンス（citations付き）
{
  "choices": [{ "message": { "content": "..." } }],
  "citations": [
    "https://example-dental.com/about",
    "https://other-dental.com"
  ],
  "search_results": [
    { "title": "○○歯科", "url": "https://...", "snippet": "..." }
  ]
}
```

#### 3. Google Gemini API（Gemini検出用）

```
エンドポイント: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent
認証:          x-goog-api-key ヘッダー or ?key= パラメータ
モデル:        gemini-2.5-flash-lite
```

| 項目 | 値 |
|------|-----|
| Input | $0.10 / 1Mトークン |
| Output | $0.40 / 1Mトークン |
| Grounding with Google Search | 無料枠: 500 RPD → 超過後 $35/1,000クエリ |
| 特徴 | **Grounding検索で引用URL付き、最安** |

### プロンプト設計

顧客の業界に応じて5〜10個のプロンプトを生成し、各プラットフォームに送信：

```typescript
function generatePrompts(brandName: string, industry: string): string[] {
  return [
    `${industry}でおすすめのサービスを教えてください`,
    `${industry}の比較をしてください`,
    `${brandName}について教えてください`,
    `${industry}で評判のいい${brandName}はどうですか`,
    `${industry}の選び方のポイントを教えてください`,
  ];
}
```

### データマッピング（APIレスポンス → platforms[]形式）

```typescript
function mapToPlatformData(
  platform: string,
  promptResults: PromptResult[],  // 5-10プロンプトの結果
  previousSnapshot: PlatformData | null
): PlatformData {
  const totalPrompts = promptResults.length;

  // mentions: ブランドが言及されたプロンプト数
  const mentions = promptResults.filter(r => r.mentioned).length;

  // citations: ブランドURLが引用されたプロンプト数
  const citations = promptResults.filter(r =>
    r.sources?.some(url => url.includes(targetDomain))
  ).length;

  // sov: 全レスポンスにおけるブランド言及率 (%)
  const sov = (mentions / totalPrompts) * 100;

  // impressions: 推定値（プロンプト数 × プラットフォーム推定利用者数）
  const platformMultiplier = { ChatGPT: 1000, Perplexity: 300, Gemini: 500 };
  const impressions = mentions * platformMultiplier[platform];

  // trend: 前回スナップショットとの差分 (%)
  const trend = previousSnapshot
    ? ((sov - previousSnapshot.sov) / previousSnapshot.sov) * 100
    : 0;

  return { platform, mentions, citations, sov, impressions, trend };
}
```

### 月額費用の試算

**前提:** 顧客10社 × 5プロンプト × 3プラットフォーム × 4回/日 = 600リクエスト/日 = **18,000リクエスト/月**

| API | 計算 | 月額 |
|-----|------|------|
| OpenAI GPT-4o-mini | 6,000req × ~500トークン/req = 3Mトークン | **~$0.45** |
| Perplexity Sonar | 6,000req × $5/1,000req | **~$30** |
| Gemini 2.5 Flash-Lite | 6,000req × ~500トークン/req = 3Mトークン | **~$0.30** |
| **合計** | | **~$31/月** |

**⚠️ Perplexity Sonarのリクエスト費用が支配的。** 削減方法：

| 最適化 | 費用 | 方法 |
|--------|------|------|
| 頻度を6時間→24時間に | ~$8/月 | Cronを1日1回に変更 |
| Perplexityを週1回に | ~$5/月 | ChatGPT/Geminiは毎日、Perplexityは週1 |
| プロンプト数を3個に | ~$3/月 | 最重要プロンプトに絞る |

### 実装するファイル

| ファイル | 操作 | 説明 |
|----------|------|------|
| `lib/brand-monitor.ts` | **新規** | 3つのAPIを呼び出してブランド言及を検出する関数群 |
| `app/api/cron/brand-check/route.ts` | **新規** | Vercel Cronで定期実行するバッチ処理 |
| `app/api/ahrefs/brand-radar/route.ts` | **変更** | Supabaseから最新スナップショットを返却（Ahrefs呼出しを削除） |
| `lib/ahrefs.ts` | **変更** | `fetchBrandRadarMentions()`, `fetchBrandRadarOverview()` を削除 |
| `vercel.json` | **変更** | Cron設定追加 |
| `.env.local` | **変更** | `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_AI_KEY` 追加 |

### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| **完全な制御** — プロンプト・頻度・計算ロジック全てカスタマイズ可能 | **実装工数**: 新規2ファイル + 変更3ファイル（約2-3日） |
| **サードパーティ依存なし** — heeb.ai/LLM Scoutのサービス停止リスクなし | **Perplexityのリクエスト費用が高い**（$5/1,000req） |
| **最安（最適化後$3-8/月）** | **データ品質の担保**: プロンプト設計・パース精度のチューニングが必要 |
| 既存の`ahrefs_brand_radar_snapshots`テーブルに直接保存 → UI変更なし | SoVは「自社プロンプトでの言及率」であり、市場全体のSoVではない |
| Copilot/AI Overviews等にも将来追加可能（各APIを追加するだけ） | 初期のプロンプト設計・テストに時間がかかる |

---

## 3候補の比較まとめ

| | heeb.ai | LLM Scout | 自前構築 |
|---|---------|-----------|---------|
| **API方式** | POST→GET（非同期） | GET（同期） | 自由設計 |
| **対応LLM数** | 6+ | 3 | 3（ChatGPT/Perplexity/Gemini） |
| **日本語対応** | △（location: JPのみ） | ✅（language: ja） | ✅ |
| **月額費用** | 不明 | 不明（$3無料枠） | **$3〜31**（最適化次第） |
| **SoV直接取得** | visibility_score（要マッピング） | **share_of_voice（完全一致）** | 自前計算（プロンプト言及率） |
| **実装の容易さ** | 中（ポーリング実装要） | **高（GET 1本）** | 低（2-3日、新規2ファイル） |
| **コード変更量** | 中 | **最小** | 大（新規2 + 変更3ファイル） |
| **即テスト** | 要アカウント登録 | **デモキーで即可** | 実装後 |
| **サービス停止リスク** | あり（新興） | あり（新興） | **なし** |
| **カスタマイズ性** | 低 | 低 | **完全自由** |

---

## 変更不要な部分（確認済み）

以下は現状のまま動作し、変更不要：

- `lib/diagnosis.ts` — AI可視性診断エンジン（PageSpeed + cheerioベース）
- `app/api/ahrefs/traffic/route.ts` — Ahrefs WA API（無料）
- `app/api/ahrefs/competitors/route.ts` — Supabase CRUDのみ
- `app/api/ahrefs/top-pages/route.ts` — Supabase読取のみ
- `components/AIODashboard.jsx` Overview タブ — diagnosisDataのみ使用
- `components/FormPilotAutoV2.jsx` — Ahrefs非依存

---

## LP文言の修正箇所

Brand Radar の代替に移行した場合、以下のAhrefs言及を更新する必要がある：

| ファイル | 行 | 現在の文言 | 変更内容 |
|----------|-----|-----------|---------|
| `AIOServiceLP.jsx` | L359 | "Ahrefs Web Analytics API × Brand Radar" | データソース名を変更 |
| `AIOServiceLP.jsx` | L39-117 | EVIDENCE配列のBrand Radar関連エビデンス | 新データソースのエビデンスに差替え |
| `AIODashboard.jsx` | L427 | "× Ahrefs Web Analytics" | 汎用表記に変更 |
| `AIODashboard.jsx` | L652,758 | "Ahrefs ... 未連携" | 新ツール名に変更 |
| `AIODashboard.jsx` | L882 | "Powered by Ahrefs ..." | 変更 |

---

## 統合時の変更箇所（LLM Scout採用の場合）

### コード変更（3ファイルのみ）

```
lib/ahrefs.ts
  ├── fetchBrandRadarMentions()
  │     現在: Ahrefs /brand-radar/mentions を呼出
  │     変更: LLM Scout GET /api/brand-intelligence を呼出
  │           → response.related_prompts + platform_coverage を
  │             既存の mentions/citations フォーマットにマッピング
  │
  └── fetchBrandRadarOverview()
        現在: Ahrefs /brand-radar/overview を呼出
        変更: LLM Scout response の visibility_score, share_of_voice を
              既存の sov, impressions フォーマットにマッピング

app/api/ahrefs/brand-radar/route.ts
  └── LLM Scout レスポンスを既存ダッシュボードの形式に変換
      マッピング例:
        visibility_score → impressions
        share_of_voice → sov
        platform_coverage.chatgpt → platform: "ChatGPT" の行
        citations.length → citations カウント

Supabaseテーブル
  └── ahrefs_brand_radar_snapshots
      スキーマは互換（raw_data カラムのみ新APIレスポンスに変更）
```

### LP・ダッシュボード文言の更新

| ファイル | 行 | 現在の文言 | 変更内容 |
|----------|-----|-----------|---------|
| `AIOServiceLP.jsx` | L359 | "Ahrefs Web Analytics API × Brand Radar" | "Ahrefs WA × LLM Scout" or 汎用表記 |
| `AIOServiceLP.jsx` | L39-117 | EVIDENCE配列のBrand Radar関連 | 新データソースに差替え |
| `AIODashboard.jsx` | L427 | "× Ahrefs Web Analytics" | 汎用表記に変更 |
| `AIODashboard.jsx` | L652,758 | "Ahrefs ... 未連携" | 新ツール名に変更 |
| `AIODashboard.jsx` | L882 | "Powered by Ahrefs ..." | 変更 |

---

## 次のアクション

1. ✅ ~~heeb.ai の料金・API仕様を確認~~ → 料金非公開、API仕様は確認済み
2. 🔲 **LLM Scout デモキーで即テスト**（`llmscout_demo_2024` キーでAPIレスポンス確認）
3. 🔲 **LLM Scout の有料プラン料金を確認**（アカウント登録 or 問い合わせ）
4. 🔲 **Ahrefs WA の無料利用可否を確認**（有料プランなしでAPIキーが取得できるか）
5. 🔲 テスト結果を元に `lib/ahrefs.ts` のBrand Radar部分をLLM Scout APIに差替え
6. 🔲 LP・ダッシュボードの文言を更新
7. 🔲 Supabaseテーブルの `raw_data` カラムを新APIレスポンスに対応

---

## 参考リンク

- [heeb.ai - LLM Mentions API](https://heeb.ai/)
- [heeb.ai ブログ - API紹介](https://heeb.ai/blog/introducing-heeb-ai)
- [heeb.ai ブログ - APIウォークスルー](https://heeb.ai/blog/llm-mentions-api-heeb-ai-quick-walkthrough)
- [LLM Scout - GitHub統合ガイド（MIT）](https://github.com/frankmedia/ai-visibility-api)
- [Otterly AI - ヘルプ: API提供なし](https://help.otterly.ai/do-you-provide-an-api-for-otterlyai)
- [Ahrefs Web Analytics（無料）](https://ahrefs.com/web-analytics)
- [Perplexity Sonar API 料金](https://docs.perplexity.ai/docs/getting-started/pricing)
- [OpenAI API 料金](https://openai.com/api/pricing/)
- [Google Gemini API 料金](https://ai.google.dev/gemini-api/docs/pricing)
- [Perplexity Sonar API ドキュメント](https://docs.perplexity.ai/getting-started/models/models/sonar)
