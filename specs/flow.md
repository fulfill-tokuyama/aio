# AIO Insight（FormPilot）画面遷移図 — Flow.md

このファイルは、AIO Insight の全画面とその遷移関係を定義する。新しい画面を追加する場合、必ずこのファイルに遷移元・遷移先を追記すること。

**全体像は [docs/OVERVIEW.md](../docs/OVERVIEW.md) を参照。**

---

## 画面一覧

### 公開ページ（認証不要）

| ID | パス | 画面名 | 説明 |
|----|------|--------|------|
| HUB | / | ハブ | LP・ログイン・ダッシュボードへの導線 |
| LP-01 | /lp | ランディングページ | サービス紹介・料金・無料診断CTA |
| LP-02 | /lp#diagnosis-form | 無料診断フォーム | LP下部のURL入力フォーム |
| DIA-01 | /diagnosis | 無料診断 | URL入力→診断実行→スコア表示（詳細は登録で解放） |
| DIA-02 | /diagnosis/[id]/detail | 詳細レポート | 認証済み向け。課題全文・改善提案・有料CTA |
| AUTH-01 | /login | ログイン | メール+パスワード |
| AUTH-02 | /signup | 新規登録 | メールアドレスのみ（Magic Link） |
| AUTH-03 | /auth/callback | 認証コールバック | Magic Link・メール確認後のリダイレクト処理 |
| LEGAL-01 | /privacy | プライバシーポリシー | 法的必須 |
| LEGAL-02 | /terms | 利用規約 | 法的必須 |
| LEGAL-03 | /tokusho | 特定商取引法に基づく表記 | 法的必須 |
| SYS-01 | /unsubscribe | 配信停止 | メール内リンクから遷移 |
| SYS-02 | /payment-success | 決済完了 | Stripe決済後のサンクスページ |
| SYS-03 | /reset-password | パスワードリセット | メール送信・新パスワード設定 |

### 認証必須ページ

| ID | パス | 画面名 | 対象 | 説明 |
|----|------|--------|------|------|
| DASH-01 | /pipeline | パイプライン | 管理者 | リード一覧・ステージ管理・メール送信 |
| DASH-02 | /leads | リード一覧 | 管理者 | 全リードのテーブル表示 |
| DASH-03 | /leads/[id] | リード詳細 | 管理者 | 個別リード・アクション履歴 |
| DASH-04 | /settings | 自動化設定 | 管理者 | スキャン・メール・決済設定 |
| DASH-05 | /dashboard | ダッシュボード | 有料顧客 | スコア推移・構造化データ・meta改善 |

---

## 遷移図（LP経由フロー）

```
[外部: 検索 / SNS / 広告]
        │
        ▼
      LP-01 (/lp)
        │
        ├─ CTA「無料でAI検索可視性を診断する」──▶ DIA-01 (/diagnosis)
        │
        └─ LP-02 URL入力フォーム送信 ──▶ DIA-01 (/diagnosis?url=xxx)
                    │
                    ▼
                DIA-01 (/diagnosis)
        │
        ├─ 「無料登録して詳細を見る」──▶ AUTH-02 (/signup?diagnosis_id=xxx)
        │
        └─ 「別のURLを診断する」──▶ DIA-01 に留まる
                    │
                    ▼
                AUTH-02 (/signup)
        メールアドレス入力 → Magic Link送信 → メール内リンククリック
                    │
                    ▼
                AUTH-03 (/auth/callback?diagnosis_id=xxx)
                    │
                    ├─ diagnosis_id あり ──▶ DIA-02 (/diagnosis/[id]/detail)
                    │
                    └─ diagnosis_id なし ──▶ DIA-01 (/diagnosis)
                    │
                    ▼
                DIA-02 詳細レポート
        │
        └─ 「有料プランに申し込む」──▶ Stripe決済 ──▶ SYS-02 ──▶ 有料顧客化
```

---

## 遷移図（コールドメール経由フロー）

```
[管理者: auto-pipeline 実行]
        │
        ▼
  URLリスト → 診断 → フォーム探索 → 初回メール送信
        メール内容: スコア・主な課題 + リンク
        リンク: /signup?diagnosis_id={事前診断済みレポートID}
        │
        ▼
      AUTH-02 (/signup?diagnosis_id=xxx)
        │
        ▼  Magic Link 認証
        │
        ▼
      DIA-02 (/diagnosis/[id]/detail)
        事前診断済みレポートを即表示（再診断不要）
        │
        └─ 有料プランCTA ──▶ Stripe決済 ──▶ 有料顧客化

  フォローアップ: Step2(3日後) → Step3(7日後) → Step4(14日後)
  Cron: 平日 10:00 JST に自動送信
```

---

## 遷移図（ダッシュボード内）

```
DASH-01 パイプライン (/pipeline)  ◀── 管理者のデフォルト
  │
  ├─ サイドナビ
  │     ├─ パイプライン ──▶ DASH-01
  │     ├─ リード一覧 ──▶ DASH-02
  │     ├─ 自動化設定 ──▶ DASH-04
  │     └─ その他（A/Bテスト・フォローアップ・分析・顧客・アクティビティ）
  │
  ├─ リード行クリック ──▶ DASH-03 リード詳細
  │
  └─ メール送信 ──▶ モーダル内で実行

DASH-02 リード一覧 (/leads)
  │
  └─ リード行クリック ──▶ DASH-03

DASH-05 ダッシュボード (/dashboard)  ◀── 有料顧客向け
  │
  └─ 構造化データ生成・meta改善・月次レポート
```

---

## 遷移図（法的ページ・フッター）

```
LP-01 (/lp) フッター
  │
  ├─ プライバシーポリシー ──▶ LEGAL-01 (/privacy)
  ├─ 利用規約 ──▶ LEGAL-02 (/terms)
  └─ 特定商取引法に基づく表記 ──▶ LEGAL-03 (/tokusho)

メール内リンク
  │
  └─ 配信停止 ──▶ SYS-01 (/unsubscribe)
```

---

## 新画面追加時のルール

1. 上記の画面一覧テーブルに ID・パス・画面名・説明を追記する
2. 遷移図に遷移元（どこからこの画面に来るか）を必ず記載する
3. 遷移図に遷移先（この画面からどこに行けるか）を必ず記載する
4. [docs/OVERVIEW.md](../docs/OVERVIEW.md) の画面一覧も同期して更新する
5. 認証不要のページ（LP系）と認証必要のページ（ダッシュボード系）を混同しない

**遷移元が存在しない画面は作成してはいけない。**
