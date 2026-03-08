# Vercel デプロイフロー — 手順型スキル

このスキルは、AIO Insight（FormPilot）のコードをVercelに安全にデプロイするための手順を定義する。「git push したら本番が壊れた」事故を防ぐためのガードレールである。

## インプット
- デプロイ対象のブランチ名
- 変更内容の概要（コミットメッセージ）

## アウトプット
- ステージング環境での確認完了
- 本番環境へのデプロイ完了
- デプロイ後の動作確認結果

---

## デプロイフロー全体

```
Step 1: デプロイ前チェックリスト
    │
    ▼
Step 2: feature ブランチで Push → Vercel Preview デプロイ
    │
    ▼
Step 3: ステージング確認（Preview URL）
    │
    ├─ 問題あり ──▶ 修正して Step 2 に戻る
    │
    └─ 問題なし ──▶ Step 4: develop ブランチにマージ
                        │
                        ▼
                    Step 5: develop の Preview で最終確認
                        │
                        ├─ 問題あり ──▶ revert して修正
                        │
                        └─ 問題なし ──▶ Step 6: main にマージ（本番デプロイ）
                                            │
                                            ▼
                                        Step 7: 本番動作確認
```

---

## Step 1: デプロイ前チェックリスト

コードを Push する前に、以下を全て確認する。1つでも NG があればデプロイを中止する。

### コード品質
- [ ] TypeScript の型エラーが 0 件（`npx tsc --noEmit`）
- [ ] ESLint エラーが 0 件（`npx eslint .`）
- [ ] ビルドが成功する（`npm run build`）
- [ ] 既存のテストが全て通る（`npm test` — テストがある場合）

### 環境変数
- [ ] 新しい環境変数を追加した場合、Vercel のプロジェクト設定にも追加済み
- [ ] .env.local に本番の値が混入していない
- [ ] Stripe のテストキーと本番キーが分離されている
- [ ] Supabase のプロジェクトURLとキーが本番用になっている

### データ安全性
- [ ] Supabase の RLS ポリシーを変更した場合、supabase-schema.md のポリシー方針と整合している
- [ ] データ削除やスキーマ変更を含む場合、マイグレーション SQL を用意した
- [ ] 既存リードデータを壊す可能性のある変更ではない

### UI品質
- [ ] review-cycle.md のレビューループで90点以上を獲得済み（UI変更の場合）
- [ ] デスクトップとモバイルの両方で動作確認済み
- [ ] 日本語テキストに英語が残っていない

---

## Step 2: Feature ブランチで Push

```bash
# feature ブランチで作業していることを確認
git branch --show-current
# → feature/xxxx であること

# 変更をコミット
git add .
git commit -m "feat: [変更内容の要約]

- ユーザーストーリー: [US-ID]
- UXスコア: [X]/100（UI変更の場合）
- 影響範囲: [影響する画面やAPI]"

# Push → Vercel が自動で Preview デプロイを作成
git push origin feature/xxxx
```

Push すると、Vercel が自動的に Preview URL を生成する。
URL形式: `https://aio-[ブランチ名]-[ハッシュ].vercel.app`

---

## Step 3: ステージング確認（Preview URL）

Preview URL にアクセスして以下を確認する。

### 必須確認項目

| 確認項目 | 確認方法 | 合格基準 |
|---------|---------|---------|
| ページ表示 | 全画面を1回ずつ開く | 500エラー/白画面がゼロ |
| LP表示 | /lp にアクセス | 未認証でアクセス可能、CTA動作 |
| ログイン | /login で認証 | ログイン成功、ダッシュボードに遷移 |
| パイプライン | /pipeline を確認 | リードデータが正常に表示される |
| API動作 | 変更したAPIを叩く | レスポンスが正常 |
| モバイル表示 | Chrome DevTools でモバイル幅に | レイアウト崩れなし |
| コンソールエラー | F12 → Console タブ | 赤いエラーがゼロ |

### 変更種別ごとの追加確認

**UI変更の場合**:
- design-tokens.md のカラーパレットと照合する
- スクリーンショットを撮って前回と比較する

**API変更の場合**:
- 既存のフロント画面が壊れていないか確認する
- Supabase に書き込みが正常に行われるか確認する

**メール関連の変更の場合**:
- テスト用メールアドレスに送信テストする
- SendGrid/Resend のダッシュボードで送信ログを確認する

**Stripe関連の変更の場合**:
- Stripe のテストモードで決済テストする
- Webhook が正常に受信されるか確認する

---

## Step 4: develop ブランチにマージ

```bash
# develop ブランチに切り替え
git checkout develop
git pull origin develop

# feature ブランチをマージ
git merge feature/xxxx

# コンフリクトがある場合は解決してからコミット
# コンフリクト解決時は、両方の変更を慎重に確認する

# Push → Vercel が develop の Preview をデプロイ
git push origin develop
```

---

## Step 5: develop の Preview で最終確認

develop ブランチの Preview URL で Step 3 と同じ確認を行う。

**ここで追加で確認すること**:
- 他の feature ブランチの変更と競合していないか
- develop に直近でマージされた他の変更が壊れていないか

**問題が見つかった場合**:
```bash
# マージを取り消す
git revert HEAD
git push origin develop

# feature ブランチで修正して Step 2 からやり直す
```

---

## Step 6: main にマージ（本番デプロイ）

**本番デプロイは慎重に行う。** 以下の条件を全て満たしている場合のみ実行する。

- [ ] Step 5 の確認が全て合格
- [ ] 平日の 10:00-17:00 にデプロイする（深夜・休日のデプロイは避ける）
- [ ] 直前にSupabaseのバックアップを確認済み（重要なデータ変更がある場合）

```bash
# main ブランチに切り替え
git checkout main
git pull origin main

# develop をマージ
git merge develop

# Push → Vercel が本番デプロイを実行
git push origin main
```

**Vercel の本番デプロイは即座に反映される。** ロールバックが必要な場合は Vercel ダッシュボードから前のデプロイに戻せる。

---

## Step 7: 本番動作確認

本番URL（https://aio-rouge.vercel.app）で以下を確認する。

| 確認項目 | 確認方法 | 最大許容時間 |
|---------|---------|-------------|
| LP表示 | /lp にアクセス | デプロイ後5分以内 |
| ログイン | 本番アカウントでログイン | デプロイ後5分以内 |
| パイプライン | /pipeline でリードが表示される | デプロイ後10分以内 |
| 本番データ | 既存リードが消えていない | デプロイ後10分以内 |
| API | 変更したAPIが正常動作 | デプロイ後15分以内 |

**問題が見つかった場合の緊急ロールバック**:

1. Vercel ダッシュボード → Deployments → 前回の成功デプロイを選択 → "Promote to Production"
2. main ブランチで revert:
   ```bash
   git revert HEAD
   git push origin main
   ```
3. 原因を調査し、feature ブランチで修正してから再デプロイ

---

## デプロイ頻度のガイドライン

| 変更の重大度 | 例 | 推奨頻度 |
|-------------|-----|---------|
| 軽微（コピー修正、色調整） | ボタンテキスト変更、余白調整 | 即日デプロイ可 |
| 中程度（機能追加） | 新画面追加、API追加 | develop で1-2日テスト後 |
| 重大（DB変更、決済変更） | Supabaseスキーマ変更、Stripe連携変更 | develop で3日以上テスト後 |
| 破壊的（アーキテクチャ変更） | フレームワーク移行、認証方式変更 | 1週間以上のテスト期間 |

---

## 禁止事項

- main ブランチに直接 Push しない（必ず develop 経由）
- 金曜17時以降に本番デプロイしない（週末に障害が発生すると対応が遅れる）
- 環境変数を .env ファイルに本番値を書いたまま Git にコミットしない
- Vercel の「Instant Rollback」を知らずにデプロイしない（緊急時に使えるように場所を確認しておく）
- 複数の大きな変更を1回のデプロイにまとめない（問題の切り分けが困難になる）
