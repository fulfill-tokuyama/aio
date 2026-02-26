// app/api/contact/route.ts
// 問い合わせフォーム → 簡易AI可視性レポート添付メール送信

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { company, name, email, website, message } = data;

    // Validation
    if (!company || !name || !email || !website) {
      return NextResponse.json(
        { error: "必須項目が未入力です" },
        { status: 400 }
      );
    }

    // TODO: 本番実装
    // 1. Ahrefs WA API でサイト簡易分析
    // 2. Brand Radar API でAI言及チェック
    // 3. PDFレポート生成
    // 4. SendGrid/Resend でレポート添付メール送信
    // 5. Supabase にリード情報保存
    // 6. Slack/Discord に通知

    return NextResponse.json({
      success: true,
      message: "お問い合わせありがとうございます。簡易AI可視性レポートを添付して返信いたします。",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "送信に失敗しました" },
      { status: 500 }
    );
  }
}
