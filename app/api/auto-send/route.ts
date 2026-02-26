// app/api/auto-send/route.ts
// フォームへの自動営業メール送信

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { leads, templateId, attachDiagnosis } = await req.json();

    // TODO: 本番実装
    // 1. テンプレート取得 + 企業別パーソナライズ
    //    - {{company}}, {{weaknesses}}, {{llmo_score}} 等を置換
    // 2. attachDiagnosis=true の場合、PDF診断レポート生成
    // 3. Puppeteer/Playwright でフォームURLにアクセス
    // 4. フォームフィールド自動検出 + 入力
    //    - 会社名、氏名、メール、件名、本文 等
    // 5. 送信実行
    // 6. 結果をDBに保存 (成功/失敗)
    // 7. 失敗時はリトライキューに追加
    //
    // Rate limiting:
    // - 1ドメインあたり最低30分間隔
    // - 1日あたり最大100件
    // - robots.txt を尊重

    return NextResponse.json({
      success: true,
      message: "Auto-send endpoint ready",
      implementation_notes: [
        "Puppeteer/Playwright for form submission",
        "Template variable replacement engine",
        "PDF generation for diagnosis reports",
        "Rate limiting: 30min/domain, 100/day max",
        "Retry queue for failures",
        "robots.txt compliance",
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
