// app/api/track/route.ts
// メール開封トラッキング（ピクセル）+ クリックトラッキング（リダイレクト）
// ホットリード検出時に徳山さんへ通知

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTrackingSig } from "@/lib/unsubscribe-token";
import { incrementTemplateStat } from "@/lib/pipeline-utils";
import { notifyAdmin } from "@/lib/email";
import { fireN8nWebhook } from "@/lib/n8n-webhook";

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

// ホットリード通知（リンククリック時 = 高関心シグナル）
async function notifyHotLead(leadId: string): Promise<void> {
  try {
    const { data: lead } = await supabaseAdmin
      .from("pipeline_leads")
      .select("company, contact_name, contact_email, industry, employee_count, campaign, heat_score, follow_up_count")
      .eq("id", leadId)
      .single();

    if (!lead) return;

    // training キャンペーンのクリックのみ通知（AIOは別管理）
    if (lead.campaign !== "training") return;

    // heat_score を上げる
    const newHeatScore = Math.min((lead.heat_score || 0) + 30, 100);
    await supabaseAdmin
      .from("pipeline_leads")
      .update({ heat_score: newHeatScore })
      .eq("id", leadId);

    // n8n Webhook発火
    fireN8nWebhook({
      event: "hot_lead_detected",
      timestamp: new Date().toISOString(),
      data: {
        leadId,
        company: lead.company || "不明",
        contactName: lead.contact_name || null,
        contactEmail: lead.contact_email || null,
        industry: lead.industry || null,
        employeeCount: lead.employee_count || null,
        heatScore: newHeatScore,
        action: "link_click",
        followUpCount: lead.follow_up_count || 0,
      },
    }).catch(() => {});

    await notifyAdmin({
      subject: `🔥 HOT: ${lead.company || "不明"} がメールのリンクをクリック`,
      body: `
        <h2 style="color:#dc2626;font-size:18px;margin:0 0 16px;">ホットリード検出</h2>
        <p style="color:#475569;font-size:14px;margin:0 0 16px;">
          メール内のワークショップ申込リンクがクリックされました。<br>
          <strong style="color:#1e293b;">ワークショップに申し込む可能性が高いリードです。</strong>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;width:120px;">会社名</td>
            <td style="color:#1e293b;font-weight:600;padding:8px 0;border-bottom:1px solid #e2e8f0;">${lead.company || "不明"}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">担当者</td>
            <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">${lead.contact_name || "不明"}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">メール</td>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
              <a href="mailto:${lead.contact_email || ""}" style="color:#2563EB;">${lead.contact_email || "不明"}</a>
            </td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">業種</td>
            <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">${lead.industry || "不明"}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">従業員数</td>
            <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">${lead.employee_count || "不明"}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">温度スコア</td>
            <td style="color:#dc2626;font-weight:800;font-size:16px;padding:8px 0;border-bottom:1px solid #e2e8f0;">${newHeatScore}/100</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;">送信済みメール数</td>
            <td style="color:#1e293b;padding:8px 0;">${lead.follow_up_count || 0}通</td>
          </tr>
        </table>
      `,
    });
  } catch {
    // 通知失敗はトラッキングに影響させない
  }
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
        .select("opened_email, template_used, heat_score")
        .eq("id", leadId)
        .single();

      if (lead && !lead.opened_email) {
        // heat_score を加算（開封 = +10）
        const newHeatScore = Math.min((lead.heat_score || 0) + 10, 100);

        await supabaseAdmin
          .from("pipeline_leads")
          .update({ opened_email: true, heat_score: newHeatScore })
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

      // ホットリード通知（クリック = 高関心）
      // バックグラウンドで通知（リダイレクトを遅延させない）
      notifyHotLead(leadId).catch(() => {});

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
