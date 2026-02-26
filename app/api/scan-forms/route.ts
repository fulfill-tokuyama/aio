// app/api/scan-forms/route.ts
// HP URLからお問い合わせフォームを自動探索

import { NextRequest, NextResponse } from "next/server";

const FORM_PATHS = [
  "/contact", "/contact-us", "/inquiry", "/お問い合わせ", "/otoiawase",
  "/toiawase", "/form", "/contact/form", "/support", "/feedback",
  "/contactus", "/inquiries", "/consulting", "/request", "/demo",
  "/trial", "/about/contact", "/company/contact", "/help/contact",
  "/contact.html", "/mail", "/info",
];

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // TODO: 本番実装
    // 1. Puppeteer/Playwright でHPにアクセス
    // 2. FORM_PATHS を順番にチェック (HTTP HEAD → 200なら発見)
    // 3. フォームの入力フィールド構成を解析
    // 4. 結果をDBに保存

    // Placeholder: simulate scan
    const discovered = FORM_PATHS.filter(() => Math.random() > 0.85);

    return NextResponse.json({
      success: true,
      url,
      formsFound: discovered.map((path) => ({
        url: new URL(path, url).toString(),
        path,
        confidence: Math.floor(60 + Math.random() * 40),
      })),
      scannedPaths: FORM_PATHS.length,
    });
  } catch (error) {
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
