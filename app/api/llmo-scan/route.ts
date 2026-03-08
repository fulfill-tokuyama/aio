// app/api/llmo-scan/route.ts
// 単体URL LLMO診断 — /diagnosis ページから呼び出し
// 診断結果を diagnosis_reports テーブルに保存し、report_id を返す

import { NextRequest, NextResponse } from "next/server";
import { runDiagnosis } from "@/lib/diagnosis";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, includeAiTest, industry, region } = body as {
      url: string;
      includeAiTest?: boolean;
      industry?: string;
      region?: string;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url は必須です" }, { status: 400 });
    }

    const result = await runDiagnosis(url, {
      includeAiTest: !!includeAiTest,
      industry,
      region,
    });

    // diagnosis_reports に保存
    const { data: report, error: insertError } = await supabaseAdmin
      .from("diagnosis_reports")
      .insert({
        url: url.trim(),
        score: result.score,
        breakdown: result.breakdown,
        pagespeed_data: result.pagespeedData,
        html_analysis: result.htmlAnalysis,
        weaknesses: result.weaknesses,
        weakness_details: result.weaknessDetails,
        suggestions: result.suggestions,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Diagnosis report insert error:", insertError);
    }

    return NextResponse.json({
      ...result,
      reportId: report?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
