# LeadGenius AI Search → AIO Insight 統合分析

`C:\Users\tokuc\leadgenius-ai-search\api` のリード発見・LLMO診断機能を AIO Insight に統合・アップデートする際の分析レポート。

**✅ 実装完了**（2025年3月）

---

## 1. リード発見機能の比較

### AIO Insight（現行）

| 項目 | 実装 |
|------|------|
| **ソース** | `app/api/lead-discover/route.ts` |
| **検索方式** | DuckDuckGo HTML スクレイピング |
| **検索クエリ** | 業種・地域・キーワードの固定パターン |
| **出力** | URL + title のみ（企業名・連絡先なし） |
| **CSV** | 対応（url, company, industry, region） |
| **エンリッチ** | なし |

### LeadGenius AI Search

| 項目 | 実装 |
|------|------|
| **ソース** | `api/search-companies.ts` |
| **検索方式** | **Gemini API + Google Search grounding**（リアルタイム検索） |
| **検索セグメント** | 5セグメント（大手・地域密着・新規参入・採用強化・老舗）で多角的検索 |
| **出力** | 企業名、URL、業種、住所、電話、メール、代表者、資本金、従業員数、heat_score 等 |
| **エンリッチ** | **Firecrawl** でトップページ + 会社概要ページをスクレイピング → **Gemini** でフィールド抽出 |
| **SSE** | 検索結果を逐次ストリーミング送信 |

### アップデート可否・メリット

| 改善点 | 可否 | 備考 |
|--------|:----:|------|
| Gemini Google Search による検索 | ○ | 検索品質・安定性が向上。DuckDuckGo は HTML 構造変更に弱い |
| 複数セグメント検索 | ○ | 多角的なリード発見が可能 |
| Firecrawl エンリッチ | ○ | 企業詳細（メール・電話・代表者）を自動取得。`scan-forms` と併用可能 |
| SSE ストリーミング | △ | パイプラインUIの改修が必要。段階的に導入可能 |

**注意**: LeadGenius は **Vercel Edge Runtime** を使用（10秒制限回避）。AIO は Node.js Runtime。環境変数 `GEMINI_API_KEY`、`FIRECRAWL_API_KEY` が必要。

---

## 2. LLMO診断機能の比較

### AIO Insight（現行）

| 項目 | 実装 |
|------|------|
| **ソース** | `lib/diagnosis.ts` |
| **クロール** | 素の `fetch` + cheerio |
| **スコア算出** | 6カテゴリの**静的解析**（EEAT、コンテンツ品質、構造化データ、クローラビリティ、meta、パフォーマンス） |
| **AI実測** | **なし**（LLM の実際の応答・言及率は測定しない） |
| **Schema監査** | あり（Organization, FAQ, HowTo, Breadcrumb, Product 等） |
| **改善提案** | 弱点ベースの提案 |

### LeadGenius AI Search

| 項目 | 実装 |
|------|------|
| **ソース** | `api/llmo-diagnosis.ts` |
| **クロール** | **Firecrawl 優先**、失敗時は fetch フォールバック |
| **スコア算出** | **AI実測**（複数プロンプトを Gemini/ChatGPT/Claude に送り、企業名の言及率・順位を測定） |
| **AI実測** | 6プロンプト × 最大3プロバイダ = 18回の LLM 呼び出し |
| **Schema監査** | あり（Organization, LocalBusiness, FAQPage, Product, BreadcrumbList） |
| **競合分析** | AI で競合2社を特定し、同じプロンプトで言及をチェック |
| **改善提案** | エグゼクティブサマリー、top3Improvements、initiativeCards、improvementSuggestions |

### アップデート可否・メリット

| 改善点 | 可否 | 備考 |
|--------|:----:|------|
| Firecrawl クロール | ○ | JS レンダリングサイトにも対応。fetch は SPA で失敗しやすい |
| AI実測（言及率・順位） | ○ | 「実際に AI が企業を紹介するか」を測定。差別化要因 |
| 多プロバイダ（ChatGPT/Claude） | △ | オプション。API キー追加が必要 |
| 競合分析 | ○ | 同業種比較に有用 |
| initiativeCards | ○ | 施策カード（quick_win, strategic 等）は UX 向上 |

**注意**: AI実測は **LLM 呼び出し回数が増える**（1企業あたり 6〜18 回）。Gemini のレート制限（1分10回）に注意。バッチ処理・遅延の工夫が必要。

---

## 3. 統合方針（推奨）

### Phase 1: リード発見の強化（優先度高）

1. **Gemini Google Search を検索オプションに追加**
   - `lead-discover` に `mode: "gemini_search"` を追加
   - 業種・地域・キーワードで Gemini に検索させ、grounding metadata から URL を抽出
   - 既存の DuckDuckGo / CSV はフォールバックとして維持

2. **Firecrawl エンリッチの導入**
   - `scan-forms` と併用。Firecrawl で会社概要ページを探し、Gemini でメール・電話・代表者を抽出
   - `pipeline_leads` の `contact_email` が空の場合にエンリッチを実行

### Phase 2: LLMO診断の強化（優先度中）

1. **Firecrawl クロールのオプション追加**
   - `lib/diagnosis.ts` の `checkHtml` で、`FIRECRAWL_API_KEY` がある場合は Firecrawl を優先
   - SPA・JS サイトでの診断精度向上

2. **AI実測のオプション追加**
   - 診断結果に「AI実測スコア」を追加（オプション、有料顧客向け等）
   - 1企業あたり 6 プロンプト × Gemini のみで開始（コスト・レート制限考慮）

3. **Schema監査の統一**
   - LeadGenius の `auditSchema` ロジックを参考に、AIO の `scoreStructuredData` を強化

### Phase 3: 将来的な拡張

- 競合分析（同業種2社の言及比較）
- initiativeCards（施策カード）の UI 表示
- 多プロバイダ（ChatGPT/Claude）対応

---

## 4. 必要な環境変数・依存関係

| 変数/パッケージ | LeadGenius | AIO（現行） | 追加が必要 |
|----------------|------------|-------------|-----------|
| `GEMINI_API_KEY` | ○ | ○（Gemini 使用済み） | — |
| `FIRECRAWL_API_KEY` | ○ | — | ○ |
| `GOOGLE_PAGESPEED_API_KEY` | — | ○ | — |
| `@google/generative-ai` | ○ | ○（または REST） | — |

---

## 5. ファイル対応表

| LeadGenius | AIO 統合先 |
|------------|-----------|
| `api/search-companies.ts` | `app/api/lead-discover/route.ts` にロジック統合、または `app/api/gemini-search/route.ts` 新規 |
| `api/llmo-diagnosis.ts` | `lib/diagnosis.ts` に Firecrawl・AI実測を統合、または `lib/diagnosis-ai-test.ts` 新規 |
| `api/_lib/firecrawl.ts` | `lib/firecrawl.ts` 新規作成 |

---

## 6. 結論

**リード発見**と**LLMO診断**の両方について、LeadGenius AI Search の機能を AIO Insight に統合・アップデートすることは**可能**です。

- **リード発見**: Gemini Google Search + Firecrawl エンリッチで、検索品質と企業詳細の自動取得が大幅に向上
- **LLMO診断**: Firecrawl クロール + AI実測で、実際の AI 挙動に基づく診断が可能になる

段階的に Phase 1 → Phase 2 の順で導入することを推奨します。
