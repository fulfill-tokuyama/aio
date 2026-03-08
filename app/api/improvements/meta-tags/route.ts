// app/api/improvements/meta-tags/route.ts
// POST: metaタグ改善案生成 — 有料プランユーザーのみ

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateMetaImprovements } from "@/lib/generate-meta-improvements";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 有料プランチェック
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, status")
      .eq("supabase_user_id", user.id)
      .eq("status", "active")
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "この機能は有料プランユーザーのみご利用いただけます" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { diagnosis_id, industry } = body;

    if (!diagnosis_id || typeof diagnosis_id !== "string") {
      return NextResponse.json({ error: "diagnosis_id は必須です" }, { status: 400 });
    }

    // 診断結果を取得
    const { data: report, error: fetchError } = await supabaseAdmin
      .from("diagnosis_reports")
      .select("*")
      .eq("id", diagnosis_id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: "診断結果が見つかりません" }, { status: 404 });
    }

    // URL を特定
    let url = report.url;
    if (!url && report.lead_id) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("url")
        .eq("id", report.lead_id)
        .single();
      url = lead?.url;
    }

    if (!url) {
      return NextResponse.json({ error: "診断対象のURLが不明です" }, { status: 400 });
    }

    const result = await generateMetaImprovements({
      url,
      htmlAnalysis: report.html_analysis || {},
      industry: industry || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "metaタグ改善案の生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
