// app/api/track/route.ts
// メール開封トラッキング（ピクセル）+ クリックトラッキング（リダイレクト）

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTrackingSig } from "@/lib/unsubscribe-token";
import { incrementTemplateStat } from "@/lib/pipeline-utils";

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixelResponse() {
  return new NextResponse(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}

// GET /api/track?type=open&lid=<leadId>&sig=<hmac>
// GET /api/track?type=click&lid=<leadId>&sig=<hmac>&url=<redirectUrl>
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const leadId = searchParams.get("lid");
  const sig = searchParams.get("sig");

  if (!leadId) {
    return pixelResponse();
  }

  // 署名検証: 不正な場合はピクセル返却のみ（DB更新しない）
  if (!sig || !verifyTrackingSig(leadId, sig)) {
    if (type === "click") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
      return NextResponse.redirect(appUrl);
    }
    return pixelResponse();
  }

  try {
    if (type === "open") {
      // 初回開封チェック: 既にopenedならDB更新・統計スキップ
      const { data: lead } = await supabaseAdmin
        .from("pipeline_leads")
        .select("opened_email, template_used")
        .eq("id", leadId)
        .single();

      if (lead && !lead.opened_email) {
        await supabaseAdmin
          .from("pipeline_leads")
          .update({ opened_email: true })
          .eq("id", leadId);

        // template_used からステップ番号を抽出して統計更新
        if (lead.template_used) {
          const stepMatch = lead.template_used.match(/step(\d)/);
          if (stepMatch) {
            const step = parseInt(stepMatch[1], 10);
            await incrementTemplateStat(step, "opened");
          }
        }
      }

      return pixelResponse();
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
  return pixelResponse();
}
