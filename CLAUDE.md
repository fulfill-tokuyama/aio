# AIO Insight（FormPilot）— CLAUDE.md

## プロジェクト概要

AIO Insight は、LLMO（Large Language Model Optimization）未対策の中小企業を自動発見し、AI検索最適化サービスを提案・販売する B2B SaaS プラットフォームである。管理画面の内部名称は「FormPilot」。

- **サービスURL**: https://aio-rouge.vercel.app
- **主要ページ**: /pipeline（パイプライン管理）, /lp（ランディングページ）, /leads（リード一覧）
- **事業者**: フルフィル株式会社（Fulfill Corporation）
- **ターゲット**: 日本の中小企業経営者（ITリテラシー中程度）

## 技術スタック

- **フロントエンド**: Next.js 14（App Router）/ TypeScript / Tailwind CSS
- **バックエンド**: Next.js API Routes / Supabase（PostgreSQL / Auth / RLS）
- **デプロイ**: Vercel
- **外部API**: Gemini API（スキャン・スコアリング）/ SendGrid or Resend（メール）/ Stripe（決済）/ Ahrefs API（トラフィック・Brand Radar）/ Phantombuster（LinkedIn連携）
- **テスト**: Playwright（E2E）

## ディレクトリ構成の方針

```
project-root/
├── app/                    # Next.js App Router ページ
│   ├── pipeline/           # パイプライン管理画面
│   ├── leads/              # リード一覧
│   ├── lp/                 # ランディングページ
│   ├── settings/           # 自動化設定
│   └── api/                # API Routes
├── components/             # 共有UIコンポーネント
│   ├── ui/                 # 基礎UIパーツ（Button, Card, Badge等）
│   ├── dashboard/          # ダッシュボード系コンポーネント
│   └── lp/                 # LP専用コンポーネント
├── lib/                    # ユーティリティ・サービス層
│   ├── supabase.ts         # Supabase クライアント初期化
│   ├── supabaseAdmin.ts    # Supabase Admin（service_role）クライアント
│   ├── stripe.ts           # Stripe連携
│   ├── gemini.ts           # Gemini API連携
│   └── email.ts            # メール送信
├── hooks/                  # カスタム React Hooks
├── types/                  # TypeScript型定義
│   └── database.ts         # Supabase テーブルの型定義
├── docs/                   # ドキュメント
├── specs/                  # 仕様書（エージェント参照用）
│   ├── user-stories.md     # ユーザーストーリー
│   └── flow.md             # 画面遷移図
├── .claude/                # エージェント設定
│   └── skills/             # スキルファイル格納
└── CLAUDE.md               # このファイル
```

## コーディング規約

### TypeScript
- strict mode 必須（tsconfig.json で strict: true）
- API レスポンスは必ず types/api.ts に型定義を書いてから実装する
- any 型の使用禁止。不明な型は unknown を使い、型ガードで絞り込む
- コンポーネントは1ファイル200行以内。超える場合はサブコンポーネントに分割する

### React / Next.js
- App Router を使用する（Pages Router は使わない）
- Server Components をデフォルトとし、インタラクションが必要な場合のみ "use client" を付与する
- データフェッチは Server Components 内で行い、Client Components には props で渡す
- フォーム処理には React Hook Form + Zod バリデーションを使用する

### Tailwind CSS
- カスタムCSSファイルは作成しない。スタイリングは全て Tailwind のユーティリティクラスで行う
- デザイントークン（色・余白・角丸等）は .claude/skills/design-tokens.md に定義されたルールに従う
- レスポンシブ対応必須（モバイルファースト: sm → md → lg の順）

### ファイル命名
- コンポーネント: PascalCase（例: LeadCard.tsx, PipelineView.tsx）
- ユーティリティ: camelCase（例: formatCurrency.ts, calcScore.ts）
- API Routes: kebab-case（例: scan-leads/route.ts）

## デザイン方針

### 基本原則
このサービスのターゲットは日本の中小企業経営者である。以下の2つの感覚を最優先で設計する。

1. **安心感（あんしんかん）**: 信頼できる、任せられると感じさせる
   - 実績数値・利用企業数を常に表示する
   - 操作結果のフィードバックを即座に返す（ローディング・成功・エラー）
   - 専門用語には必ず（ ）で日本語の補足説明をつける

2. **わかりやすさ**: 迷わない、すぐ次にやることが分かる
   - 1画面で完結する操作フロー（ページ遷移を最小化）
   - 主要アクションは常に1つだけ強調する（CTA の優先順位を明確に）
   - ステータスは色+アイコン+テキストの3要素で伝える

### カラーパレット・トークン
.claude/skills/design-tokens.md を参照すること。概要は以下の通り。
- 背景: ダークテーマ基調（#0a0a0f）
- CTA: #e94560（赤系。緊急性・行動喚起）
- 情報: #53a8b6（青緑系。データ・ステータス）
- 成功: #10b981（緑。完了・達成）
- 警告: #f59e0b（琥珀。注意喚起）
- テキスト主: #f0f0f5 / テキスト副: #888888

## チーム運用ルール

### 関心事の分離
- 1つのエージェントに3画面以上のUIを同時に作らせない
- フロントエンドとバックエンドの作業は別のサブエージェントに分担する
- 関心事が複数に渡る場合は、チームを組成してサブエージェントに分担させる

### スペック駆動
- 新機能の実装前に、必ず specs/ にユーザーストーリーまたは仕様を書く
- 画面の新規追加時は specs/flow.md に遷移先・遷移元を追記する
- 完了定義（Definition of Done）を先に設定し、実装後にそこだけを確認する

### レビュー（コンテキストフレッシュ）
- UIのレビューは、同一レビュアーで繰り返さない
- 改善のたびにレビュアーを kill → spawn し、まっさらなコンテキストで評価する
- UX評価は .claude/skills/ux-checklist.md のチェックリストに基づいて0-5点で採点し、90点以上を合格とする

### 検証とヒューマンインザループ
- UIの実装後は必ずスクリーンショットを撮る（Playwright CLI を使用）
- スクリーンショットを該当チケットに添付し、人間のレビュー負担を軽減する
- フォーマット・リントエラーは Hooks で自動修正する

## やってはいけないこと

- Supabase の RLS ポリシーを本番で緩めない（FOR ALL USING (true) は service_role 限定。anon/authenticated に設定しない）
- Stripe のテストキーを本番にデプロイしない（環境変数を必ず分離する）
- Gemini API のスキャン頻度を 1分間に10回以上にしない（レート制限に引っかかる）
- 顧客のメールアドレス・企業情報をコンソールログに出力しない
- LP と管理画面（FormPilot）の認証を混同しない（LP は未認証でアクセス可能）
- node_modules や .env ファイルを Git にコミットしない
- 日本語UIで英語のエラーメッセージをそのまま表示しない（必ず日本語に変換する）

## メモリー（プロジェクト固有の学習事項）

- Gemini API の gemini-2.0-flash モデルを使用している。スキャン精度はプロンプト設計に大きく依存する
- SendGrid の無料枠は 100通/日。月間のリード数が増えた場合は Resend への移行を検討する
- Vercel のサーバーレス関数のタイムアウトは Hobby プランで 10秒。重い処理はバックグラウンドジョブに分離する
- Supabase は leads（LP診断用）と pipeline_leads（営業CRM用）の2つのリードテーブルを持つ。混同しないこと
- Ahrefs API 連携済み。トラフィックデータと Brand Radar データを日次でキャッシュしている
- LP の「危機感セクション」は効果検証済み。ChatGPT の月間5億ユーザー、Perplexity の成長データを引用している
- 日本の中小企業経営者は「月額1万円」が心理的閾値。それ以上は決裁ハードルが上がる
