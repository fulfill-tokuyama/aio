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

### 推奨構成

```
┌──────────────────────────────────────────────────────────┐
│  AIO Insight ダッシュボード                                │
├──────────────┬───────────────────────────────────────────┤
│ AIトラフィック │  Ahrefs Web Analytics API（無料・変更なし）  │
│   タブ        │  既存コードそのまま利用                      │
├──────────────┼───────────────────────────────────────────┤
│ Brand Radar  │  heeb.ai LLM Mentions API                │
│   タブ        │  lib/ahrefs.ts のBR部分を差し替え           │
├──────────────┼───────────────────────────────────────────┤
│ Overview     │  自前診断エンジン（変更なし）                 │
│   タブ        │  lib/diagnosis.ts                         │
├──────────────┼───────────────────────────────────────────┤
│ 競合分析タブ  │  Supabase CRUD（変更なし）                  │
│              │  api/ahrefs/competitors/route.ts           │
└──────────────┴───────────────────────────────────────────┘
```

### 費用比較

| 構成 | 月額コスト | コード変更量 |
|------|-----------|-------------|
| ❌ Ahrefs有料プラン | $149/月〜（約¥22,000） | なし |
| ✅ Ahrefs WA(無料) + heeb.ai | 要確認（heeb.ai分のみ） | Brand Radar API差替えのみ |
| ✅ Ahrefs WA(無料) + 自前構築 | $5〜$20/月（API使用料） | Brand Radar全体の自前実装 |

---

## heeb.ai（最有力候補）の詳細

### 概要

heeb.aiはAI検索可視性データに特化した**API-firstのサービス**。開発者・SEOプロフェッショナル向けに設計されており、当サービスのダッシュボード統合に最適。

### 提供データ（当サービスのBrand Radarタブとの対応）

| heeb.ai のデータ | 当サービスの対応フィールド | 対応状況 |
|------------------|-------------------------|---------|
| mentions（言及） | `mentions` | ✅ 直接対応 |
| sentiment（感情） | ―（未使用） | 拡張可能 |
| citations（引用） | `citations` | ✅ 直接対応 |
| sources（引用元URL） | ―（未使用） | 拡張可能 |
| visibility score | `sov`（Share of Voice） | ✅ マッピング可能 |
| competitor mentions | 競合分析タブ | ✅ 拡張可能 |

### 対応LLM

ChatGPT (OpenAI GPTs) / Perplexity Sonar / Gemini / Claude / Grok / Google AI Mode

### API仕様

```
POST /query → job_id を取得（モデル、エンティティ、プロンプトを指定）
GET  /result/{job_id} → 構造化JSON（mentions, sentiment, citations, sources）
```

### 統合時の変更箇所

```
lib/ahrefs.ts
  ├── fetchBrandRadarMentions()  → heeb.ai POST /query + GET /result に差替え
  └── fetchBrandRadarOverview()  → 同上

app/api/ahrefs/brand-radar/route.ts
  └── heeb.ai レスポンスを既存フォーマットにマッピング

Supabaseテーブル
  └── ahrefs_brand_radar_snapshots → スキーマは概ね互換（raw_dataのみ変更）
```

---

## 代替案：自前構築（最安オプション）

ChatGPT API + Perplexity Sonar API を使い、Brand Radar機能を自前実装する方法。

### 実装概要

```
1. Vercel Cron（既存の6時間間隔を流用）でバッチ実行
2. 顧客のブランド名 + 業界キーワードでプロンプト生成
3. ChatGPT API / Perplexity Sonar API にリクエスト送信
4. レスポンスをパースしてブランド言及・引用・感情を抽出
5. 結果を ahrefs_brand_radar_snapshots テーブルに保存
6. ダッシュボードは既存コードがそのままデータを表示
```

### 必要なAPI

| API | 費用 | 備考 |
|-----|------|------|
| OpenAI API (GPT-4o-mini) | ~$0.15/1Mトークン | ブランドチェック用途なら月$2-5程度 |
| Perplexity Sonar API | ~$1/1000リクエスト | 引用URL付きレスポンスが特徴 |

### メリット・デメリット

| | メリット | デメリット |
|---|---------|-----------|
| **メリット** | 最安（$5-20/月）、完全にカスタマイズ可能、サードパーティ依存なし | 実装工数が大きい、データ品質の担保が必要 |
| **デメリット** | — | プロンプト設計・レスポンスパース・精度検証が必要 |

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

## 次のアクション

1. **heeb.ai の料金・API仕様を確認**（無料トライアルがあれば試用）
2. **Ahrefs WA の無料利用可否を確認**（有料プランなしでAPIキーが取得できるか）
3. 確認後、`lib/ahrefs.ts` のBrand Radar部分をheeb.ai（または自前実装）に差替え
4. LP・ダッシュボードの文言を更新
5. Supabaseテーブルの `raw_data` カラムを新APIレスポンスに対応
