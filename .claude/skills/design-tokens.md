# FormPilot デザイントークン — アイデンティティ型スキル

このスキルは、AIO Insight（FormPilot）のUI全体に統一された視覚的アイデンティティを適用するためのものである。「かっこいいデザインにして」ではなく、具体的な数値と判断基準を定義することで、LLMのデフォルト出力を超える固有のスタイルを実現する。

## インプット
- 実装するUI画面の名前とユーザーストーリー
- 表示するデータの種類（リード一覧、スコア、チャート等）

## アウトプット
- Tailwind CSS クラスのみで構成された React コンポーネント
- 本スキルに定義されたトークンに100%準拠したUI

---

## カラーシステム

### 背景レイヤー（暗い順）
| レイヤー | 用途 | Hex | Tailwind |
|---------|------|-----|----------|
| Base | ページ全体の背景 | #0a0a0f | bg-[#0a0a0f] |
| Surface | カード・パネルの背景 | #111118 | bg-[#111118] |
| Elevated | ホバー・アクティブ状態 | #1a1a24 | bg-[#1a1a24] |
| Overlay | モーダル・ドロップダウン背景 | #0a0a0fCC | bg-[#0a0a0f]/80 |

### アクセントカラー
| 名前 | 用途 | Hex | 使用場面 |
|------|------|-----|---------|
| CTA Red | 主要アクション・緊急 | #e94560 | 送信ボタン、アラート、未対策ステータス |
| Info Teal | データ・情報 | #53a8b6 | リンク、スコア表示、進行中ステータス |
| Success Green | 完了・成功 | #10b981 | 送信完了、商談成立、合格表示 |
| Warning Amber | 注意・保留 | #f59e0b | 要確認、フォーム未発見、スコア中程度 |
| Revenue Gold | 金額・MRR | #f8b500 | 収益表示、契約金額 |

### アクセントカラーの使い方ルール
- アクセントカラーは背景に直接使わない。背景に使う場合は opacity 10-15% にする
  - 例: `bg-[#e94560]/10` でカードの薄い背景色
- ボーダーに使う場合は opacity 30-40% にする
  - 例: `border-[#e94560]/30`
- テキストに使う場合はそのまま100%で使用してよい
- 1つのカード内でアクセントカラーは最大2色まで。3色以上は散漫に見える

### テキストカラー
| レベル | Hex | 用途 |
|--------|-----|------|
| Primary | #f0f0f5 | 見出し、重要な数値 |
| Secondary | #888888 | 本文、説明テキスト |
| Tertiary | #555555 | ラベル、キャプション |
| Disabled | #333333 | 非活性テキスト |

---

## タイポグラフィ

### フォントスタック
```
font-family: 'Helvetica Neue', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
```
Tailwind: `font-sans` をベースに、上記を tailwind.config.ts の fontFamily.sans に設定する。

### フォントサイズの使い分け
| 要素 | サイズ | Weight | Tailwind |
|------|--------|--------|----------|
| ページタイトル | 24px | 800 | text-2xl font-extrabold |
| セクション見出し | 16px | 700 | text-base font-bold |
| カードタイトル | 14px | 700 | text-sm font-bold |
| 本文 | 13px | 400 | text-[13px] font-normal |
| ラベル・キャプション | 11px | 600 | text-[11px] font-semibold |
| バッジ・タグ | 10px | 700 | text-[10px] font-bold |
| KPI大数値 | 28px | 800 | text-[28px] font-extrabold |

### 文字間隔
- 英語のサブタイトル・ラベル: `tracking-[4px]` ~ `tracking-[6px]` + uppercase
- 日本語本文: デフォルト（tracking-normal）
- KPI数値: `tracking-tight`

---

## スペーシング（余白）

### 基本グリッド: 4px単位

| 名前 | 値 | Tailwind | 用途 |
|------|-----|----------|------|
| xs | 4px | p-1, m-1 | アイコンとテキストの間 |
| sm | 8px | p-2, m-2, gap-2 | カード内のコンパクトな余白 |
| md | 12px | p-3, m-3, gap-3 | カード内の標準余白 |
| base | 16px | p-4, m-4, gap-4 | セクション内の余白 |
| lg | 20px | p-5, m-5 | パネル内パディング |
| xl | 24px | p-6, m-6, gap-6 | セクション間の余白 |
| 2xl | 32px | p-8, m-8 | ページ上部・下部の余白 |

### カード内部の余白ルール
- パディング: `p-4`（16px）を標準とする。コンパクトなカードは `p-3`（12px）
- カード内の要素間: `gap-2`（8px）〜 `gap-3`（12px）
- カードのグリッド間: `gap-3`（12px）

### セクション間の余白
- セクション間: `mb-6`（24px）
- ページ全体のパディング: `p-5`（20px）〜 `p-6`（24px）

---

## コンポーネントトークン

### カード
```
背景: bg-[#111118]
ボーダー: border border-[#1a1a24]（デフォルト） / border-[アクセント色]/30（強調時）
角丸: rounded-lg（8px）
ホバー: hover:bg-[#1a1a24] transition-all duration-200
```

### ボタン

| 種類 | 背景 | テキスト | ボーダー | 角丸 |
|------|------|---------|---------|------|
| Primary CTA | bg-[#e94560] hover:bg-[#d13a53] | text-white font-bold | なし | rounded-md (6px) |
| Secondary | bg-transparent | text-[#888] | border border-[#333] | rounded-md |
| Ghost | bg-transparent hover:bg-[#1a1a24] | text-[#888] hover:text-white | なし | rounded-md |

- ボタンのパディング: `px-4 py-2`（標準）, `px-3 py-1.5`（コンパクト）
- ボタン内のアイコンとテキストの間: `gap-2`

### バッジ・ステータス表示
```
背景: bg-[アクセント色]/10
テキスト: text-[アクセント色]
パディング: px-2 py-0.5
角丸: rounded-full
フォント: text-[10px] font-bold
```

ステータスバッジの色マッピング:
| ステータス | カラー |
|-----------|--------|
| 未対策・要対応 | CTA Red (#e94560) |
| スキャン中・処理中 | Info Teal (#53a8b6) |
| 送信済・商談中 | Warning Amber (#f59e0b) |
| 受注・完了 | Success Green (#10b981) |
| 停止・無効 | Tertiary (#555555) |

### テーブル
```
ヘッダー行: bg-[#0a0a0f] text-[11px] font-semibold text-[#555] uppercase tracking-wider
データ行: border-b border-[#1a1a24] hover:bg-[#1a1a24]/50
セルパディング: px-4 py-3
```

### 入力フォーム
```
背景: bg-[#0a0a0f]
ボーダー: border border-[#222] focus:border-[#53a8b6] 
角丸: rounded-md
パディング: px-3 py-2
テキスト: text-[13px] text-[#f0f0f5]
プレースホルダー: placeholder:text-[#444]
トランジション: transition-colors duration-200
```

---

## アニメーション

### 基本ルール
- 全てのインタラクティブ要素に `transition-all duration-200` を付与する
- ページ読み込み時の要素出現は `opacity-0 → opacity-100` を `stagger-delay` で0.05秒ずつずらす
- カードのホバーは `scale` を使わない（データが多い画面ではちらつく）。`bg` の変化のみ
- モーダル出現: `opacity + scale(0.95 → 1.0)` で200ms

### 使ってよいアニメーション
- フェードイン（opacity 変化）
- 背景色の変化（hover 時）
- ボーダー色の変化（focus 時）
- スライドイン（新しい要素の追加時、translateY 10px → 0）

### 使ってはいけないアニメーション
- 3D回転・perspective系（データダッシュボードには不適切）
- バウンス（安心感を損なう）
- 派手なパーティクルエフェクト（ビジネスツールに不適切）
- 0.5秒を超える長いアニメーション

---

## レスポンシブ設計

### ブレークポイント
- モバイル: デフォルト（〜639px）— 1カラム
- タブレット: sm（640px〜）— 2カラム
- デスクトップ: lg（1024px〜）— サイドバー + メインエリア

### ダッシュボード画面のグリッド
- KPIカード: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3`
- パイプラインカード: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
- テーブル: モバイルではカード表示に切り替える

---

## LP専用ルール（/lp ページ）

LP はダッシュボードとは異なり、明るいセクションとダークセクションを交互に使用してよい。

- ヒーローセクション: ダーク背景 + グラデーション
- 危機感セクション: ダーク背景 + CTA Red のグロー効果
- 機能紹介: やや明るい Surface 背景
- 料金: ダーク背景
- CTA（無料診断）: CTA Red の背景をフルで使用可

CTA ボタンは LP 内に最低3箇所配置する（ファーストビュー、中間、最下部）。

---

## チェックリスト: 新しいUIを作る前に

1. [ ] このスキルのカラーパレットを確認したか
2. [ ] 角丸は rounded-lg（8px）または rounded-md（6px）を使っているか
3. [ ] アクセントカラーは1カード内に2色以内か
4. [ ] テキストサイズは上記の表に従っているか
5. [ ] ボタンは Primary / Secondary / Ghost のどれかに該当するか
6. [ ] ステータス表示はバッジの色マッピングに従っているか
7. [ ] モバイル表示を確認したか
8. [ ] アニメーションは使ってよいリストに含まれているか
