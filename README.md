# AIO Insight — AI検索最適化サービス + 営業自動化

> LLMO/AIO対策で AI検索（ChatGPT, Perplexity, Gemini）からの集客を実現。
> 企業発見から営業、契約までを完全自動化。

**by BeginAI / Fulfill Corporation**

---

## 🏗️ プロジェクト構成

```
aio/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # トップ（ハブページ）
│   ├── lp/
│   │   └── page.tsx            # サービスLP（Stripe決済）
│   ├── dashboard/
│   │   └── page.tsx            # AIOダッシュボード
│   ├── pipeline/
│   │   └── page.tsx            # FormPilot 営業自動化
│   └── api/
│       ├── contact/route.ts     # 問い合わせフォーム
│       ├── stripe-webhook/route.ts  # Stripe Webhook
│       ├── llmo-scan/route.ts   # LLMO未対策企業スキャン
│       ├── scan-forms/route.ts  # フォームURL自動探索
│       └── auto-send/route.ts   # 自動営業メール送信
├── components/
│   ├── FormPilotAutoV2.jsx      # 営業自動化ダッシュボード
│   ├── AIODashboard.jsx         # AI トラフィック分析
│   └── AIOServiceLP.jsx         # サービスLP
├── lib/                         # ユーティリティ（今後追加）
├── public/                      # 静的ファイル
├── .env.example                 # 環境変数テンプレート
├── vercel.json                  # Vercel設定（cron含む）
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 セットアップ

### 1. クローン & インストール

```bash
git clone https://github.com/fulfill-tokuyama/aio.git
cd aio
npm install
```

### 2. 環境変数

```bash
cp .env.example .env.local
# 各キーを設定
```

### 3. 開発サーバー

```bash
npm run dev
# → http://localhost:3000
```

### 4. Vercelデプロイ

```bash
npx vercel --prod
```

---

## 📄 3つのフロントエンド

### `/lp` — サービスLP
- AIO Insightの紹介ページ
- Stripe Payment Link による月額¥10,000決済
- 問い合わせフォーム（簡易AI可視性レポート自動返信）
- エビデンスセクション（データソース・信頼性の注意・市場背景）

### `/dashboard` — AIOダッシュボード
- 4タブ構成: Overview / AI Traffic / Brand Radar / Competitors
- Ahrefs WA API (stats/chart) + Brand Radar API 連携
- AI プラットフォーム別トラフィック分析
- 競合AI Share of Voice比較

### `/pipeline` — FormPilot AUTONOMOUS v2
- **LLMO未対策企業の自動発見** → 定期スキャンで蓄積
- **AIリードスコアリング** → 成約確度の高い企業を優先
- **フォームURL自動探索** → HP URLから問い合わせフォームを発見
- **A/B/Cテストエンジン** → 3テンプレートの自動振り分け＋成果比較
- **自動フォローアップ** → 未返信リードへ3段階追客
- **無料診断レポート自動添付** → LLMO分析PDFをリードマグネットに
- **ウォームリードアラート** → 高スコアリード即通知
- **Win/Loss分析** → 業種・規模・テンプレート別成約率可視化
- **Stripe連携** → MRR/ARR/顧客ステータス管理

---

## 🔄 自動化フロー

```
[Cron: 6h間隔]
     │
     ▼
LLMO未対策企業スキャン ──→ リード蓄積
     │                          │
     ▼                          ▼
フォームURL自動探索        AIスコアで優先度決定
     │                          │
     ▼                          ▼
 N件蓄積 ──→ A/B/Cテンプレートで自動送信
                    │
                    ▼
        ┌─── 返信あり ───→ アラート → 商談
        │
        └─── 返信なし ───→ 自動フォローアップ (3段階)
                              │
                              ▼
                          返信あり → 商談
                              │
                              ▼
                     Stripe決済 → 顧客化
```

---

## 🔧 API エンドポイント

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact` | POST | 問い合わせフォーム受信 → レポートメール送信 |
| `/api/stripe-webhook` | POST | Stripe Webhook（顧客ステータス自動更新） |
| `/api/llmo-scan` | POST | LLMO未対策企業の自動スキャン |
| `/api/scan-forms` | POST | HP URLからフォームURL探索 |
| `/api/auto-send` | POST | 問い合わせフォームへ自動送信 |

---

## ⏰ Cron Jobs (vercel.json)

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| `0 */6 * * *` | `/api/llmo-scan` | 6時間ごとにLLMOスキャン |
| `0 10 * * 2,3,4` | `/api/auto-send` | 火水木 10:00に自動送信 |

---

## 📦 本番化TODO

### Phase 1: MVP
- [ ] Stripe Payment Link作成 → `.env` に設定
- [ ] SendGrid/Resend でメール送信実装
- [ ] Supabase でリード・顧客データ永続化
- [ ] 問い合わせフォームのバックエンド実装

### Phase 2: スキャン機能
- [ ] Google Custom Search API で企業発見
- [ ] Puppeteer/Playwright でLLMO分析
- [ ] Ahrefs API 認証・データ取得
- [ ] LLMOスコア算出ロジック実装

### Phase 3: 営業自動化
- [ ] Puppeteer でフォーム自動入力・送信
- [ ] PDF診断レポート生成 (puppeteer or react-pdf)
- [ ] フォローアップスケジューラー
- [ ] Rate limiter (30min/domain, 100/day)

### Phase 4: 分析・最適化
- [ ] A/Bテスト結果のDB永続化
- [ ] Win/Loss分析の自動レポート
- [ ] Slack/Discord 通知連携
- [ ] GA4 連携（コンバージョン追跡）

---

## 🛡️ コンプライアンス

- robots.txt を尊重（フォーム送信前に確認）
- 1ドメインあたり最低30分間隔で送信
- 特定電子メール法に準拠した文面
- Ahrefs API利用規約の遵守
- 個人情報保護法に基づくデータ取り扱い

---

## 📄 ライセンス

Private — Fulfill Corporation / BeginAI
