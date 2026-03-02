// app/api/scan-forms/route.ts
// HP URLからお問い合わせフォーム・メールアドレス・電話番号を自動探索
// ロジックは lib/scan-forms.ts に共有化済み

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { scanUrl } from "@/lib/scan-forms";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { leadId, url } = body;

    // leadId指定時はDBからURLを取得
    let targetUrl = url;
    if (leadId && !targetUrl) {
      const { data } = await supabaseAdmin
        .from("pipeline_leads")
        .select("url")
        .eq("id", leadId)
        .single();
      if (data?.url) {
        targetUrl = data.url;
      }
    }

    if (!targetUrl) {
      return NextResponse.json({ error: "URL is required (provide url or valid leadId)" }, { status: 400 });
    }

    // URLの正規化
    if (!targetUrl.startsWith("http")) {
      targetUrl = `https://${targetUrl}`;
    }

    const result = await scanUrl(targetUrl);

    // leadId指定時はpipeline_leadsを更新
    if (leadId) {
      const updates: Record<string, unknown> = {};

      if (result.contactEmail) updates.contact_email = result.contactEmail;
      if (result.contactPhone) updates.contact_phone = result.contactPhone;
      if (result.formUrl) updates.form_url = result.formUrl;
      if (result.contactPageUrl) updates.contact_page_url = result.contactPageUrl;

      // メールかフォームが見つかればphaseをform_foundに更新
      if (result.contactEmail || result.formUrl) {
        updates.phase = "form_found";
      }

      let dbUpdateError: string | undefined;
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("pipeline_leads")
          .update(updates)
          .eq("id", leadId);
        if (updateError) {
          console.error("scan-forms update error:", updateError.message);
          dbUpdateError = updateError.message;
        }
      }

      return NextResponse.json({
        success: true,
        url: targetUrl,
        ...result,
        ...(dbUpdateError ? { dbUpdateError } : {}),
      });
    }

    return NextResponse.json({
      success: true,
      url: targetUrl,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
