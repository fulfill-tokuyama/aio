// app/api/track/route.ts
// メール開封トラッキング（ピクセル）+ クリックトラッキング（リダイレクト）

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// GET /api/track?type=open&lid=<leadId>
// GET /api/track?type=click&lid=<leadId>&url=<redirectUrl>
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const leadId = searchParams.get("lid");

  if (!leadId) {
    // Invalid request, return pixel silently
    return new NextResponse(PIXEL, {
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }

  try {
    if (type === "open") {
      // 開封トラッキング
      await supabaseAdmin
        .from("pipeline_leads")
        .update({ opened_email: true })
        .eq("id", leadId);

      return new NextResponse(PIXEL, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
      });
    }

    if (type === "click") {
      const redirectUrl = searchParams.get("url");

      // クリックトラッキング
      await supabaseAdmin
        .from("pipeline_leads")
        .update({ clicked_link: true })
        .eq("id", leadId);

      if (redirectUrl) {
        // オープンリダイレクト防止: 自ドメインのみ許可
        try {
          const parsed = new URL(redirectUrl);
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
          const appHost = new URL(appUrl).hostname;
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return NextResponse.redirect(appUrl);
          }
          // 自ドメインのみリダイレクト許可
          if (parsed.hostname !== appHost) {
            return NextResponse.redirect(appUrl);
          }
          return NextResponse.redirect(parsed.toString());
        } catch {
          return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app");
        }
      }

      // URLなしの場合はトップページへ
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
      return NextResponse.redirect(appUrl);
    }
  } catch {
    // トラッキング失敗は無視
  }

  // デフォルト: ピクセル返却
  return new NextResponse(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}
