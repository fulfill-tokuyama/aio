# AIO Insight — 機能一覧

このドキュメントは、AIO Insight の全機能を一覧化したものである。ユーザー種別・画面・API ごとに整理している。

---

## 1. ユーザー種別と機能マトリクス

| 機能 | 未登録 | 無料登録 | 有料顧客 | 管理者 |
|------|:------:|:--------:|:--------:|:------:|
| LP閲覧 | ○ | ○ | ○ | ○ |
| 無料診断（URL入力→スコア） | ○ | ○ | ○ | ○ |
| 詳細レポート閲覧（課題全文・改善提案・AI検索別表示・同業種比較） | — | ○ | ○ | ○ |
| 構造化データ（JSON-LD）自動生成 | — | — | ○ | ○ |
| metaタグ改善案生成 | — | — | ○ | ○ |
| 月次モニタリングレポート（メール） | — | — | ○ | — |
| AI Brand Monitor（6プラットフォーム） | — | — | ○ | — |
| Ahrefs トラフィック・競合分析 | — | — | ○ | — |
| パイプライン管理（リード・メール送信） | — | — | — | ○ |
| 自動化設定・Cron | — | — | — | ○ |

---

## 2. 画面別機能一覧

### /lp（ランディングページ）
- サービス紹介（課題・機能・効果・エビデンス）
- 料金プラン比較（無料 vs 有料）
- メインCTA: 無料でAI検索可視性を診断する → /diagnosis
- URL入力フォーム（送信で /diagnosis?url=xxx へ遷移）
- 有料プランCTA: 有料プランに申し込む → Stripe決済リンク
- フッター: プライバシーポリシー・利用規約・特定商取引法

### /diagnosis（無料診断）
- URL入力（クエリパラメータ ?url=xxx でも可）
- LLMO診断実行（/api/llmo-scan）
- スコア・カテゴリ別評価の表示
- 課題の一部表示（ぼかしあり）
- 詳細閲覧のCTA: 無料登録して詳細を見る → /signup?diagnosis_id=xxx
- 別URLを診断する

### /diagnosis/[id]/detail（詳細レポート）
- 認証必須（未認証時は /signup へリダイレクト）
- スコア・カテゴリ別評価の全文表示
- 検出された課題（全文・改善提案）
- 改善提案リスト
- AI検索エンジン別 表示予測
- 同業種比較データ
- 有料プランCTA（2つ）
  - この課題を解決するコードを取得する
  - 毎月のスコア変動をモニタリングする
- 補助金訴求・期間限定訴求

### /signup（新規登録）
- メールアドレスのみ入力（Magic Link）
- パスワード不要
- 診断ID付き: /signup?diagnosis_id=xxx → 登録後に詳細レポートへ
- ログインモード切替（メール+パスワード）

### /login（ログイン）
- メール+パスワード
- 診断ID付きリダイレクト対応

### /dashboard（有料顧客ダッシュボード）
- スコア推移
- 構造化データ生成ボタン
- metaタグ改善案生成ボタン
- AI Brand Monitor
- Ahrefs トラフィック・競合分析

### /pipeline（パイプライン管理）
- リード一覧（ステージ別）
- メール送信（手動一括）
- 自動パイプライン実行（URL→診断→送信）
- フォーム探索

### /settings（自動化設定）
- スキャン設定
- メール設定
- 決済設定（Stripe）

---

## 3. API 別機能一覧

### 公開API（認証なし）

| API | メソッド | 機能 |
|-----|---------|------|
| /api/llmo-scan | POST | 単一URLのLLMO診断。diagnosis_reports に保存し reportId を返す |
| /api/contact | POST | お問い合わせ（LP旧フォーム用。現状はLPから /diagnosis へ直接遷移） |
| /api/track | GET | メール開封・クリックトラッキング（HMAC署名検証） |
| /api/unsubscribe | POST | 配信停止処理 |
| /api/stripe-webhook | POST | Stripe Webhook（決済完了・解約等） |

### 認証API（管理者）

| API | メソッド | 機能 |
|-----|---------|------|
| /api/auto-pipeline | POST | 全自動パイプライン（診断→保存→フォーム探索→メール送信） |
| /api/auto-send | POST | 手動一括メール送信 |
| /api/pipeline-leads | GET/POST/PUT/DELETE | リードCRUD |
| /api/scan-forms | POST | フォーム・メール・電話番号探索 |
| /api/lead-discover | POST | URL自動発見（DuckDuckGo / Gemini Search / CSV） |
| /api/improvements/structured-data | POST | 構造化データ生成（有料チェック） |
| /api/improvements/meta-tags | POST | meta改善案生成（有料チェック） |

### Cron API

| API | スケジュール | 機能 |
|-----|-------------|------|
| /api/auto-send | 平日 10:00 JST | フォローアップメール自動送信 |
| /api/rescan | 月曜 03:00 JST | 有料顧客サイトの再診断 |
| /api/cron/brand-check | 毎日 12:00 JST | AIブランドモニタリング |
| /api/cron/monthly-report | 月次 | 有料顧客へ月次レポートメール |

---

## 4. メール送信一覧

| メール種別 | トリガー | テンプレート | 配信停止 |
|-----------|---------|-------------|---------|
| 診断結果 | /api/contact 経由（LP旧フォーム） | diagnosis.ts | — |
| アウトリーチ Step1 | auto-pipeline / auto-send | outreach.ts | ○ |
| アウトリーチ Step2-4 | auto-send（Cron） | outreach.ts | ○ |
| ウェルカム | Stripe Webhook 決済完了 | welcome.ts | — |
| 月次レポート | Cron | monthly-report.ts | ○ |

---

## 5. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/OVERVIEW.md](../docs/OVERVIEW.md) | 全体フロー図・画面一覧 |
| [specs/flow.md](./flow.md) | 画面遷移の詳細 |
| [specs/user-stories.md](./user-stories.md) | ユーザーストーリー |
| [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | API・DB・テーブル詳細 |
