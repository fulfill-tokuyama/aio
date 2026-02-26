// app/api/llmo-scan/route.ts
// LLMO未対策企業の自動発見

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { industries, regions, limit, llmoScoreMax } = await req.json();

    // TODO: 本番実装
    // 1. Google検索 or 業種DB から対象企業リストを取得
    // 2. 各企業サイトをクロール
    //    - 構造化データ (JSON-LD) の有無チェック
    //    - FAQ/HowTo schema の有無
    //    - メタディスクリプション品質
    //    - E-E-A-T シグナル (著者情報、引用、更新日)
    //    - サイトマップ、robots.txt
    //    - Core Web Vitals (PageSpeed API)
    // 3. Ahrefs Brand Radar API でAI言及チェック
    // 4. LLMOスコアを算出 (0-100)
    // 5. スコアが llmoScoreMax 以下の企業をリストアップ
    // 6. 結果をDBに保存

    return NextResponse.json({
      success: true,
      message: "LLMO scan endpoint ready",
      params: { industries, regions, limit, llmoScoreMax },
      implementation_notes: [
        "Google Custom Search API for company discovery",
        "Puppeteer for structured data analysis",
        "Ahrefs Brand Radar API for AI mention check",
        "PageSpeed Insights API for performance scoring",
        "Composite LLMO score calculation",
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
