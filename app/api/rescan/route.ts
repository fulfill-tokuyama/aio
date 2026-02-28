// app/api/rescan/route.ts
// 週次再スキャン: 全アクティブ顧客のURLを再診断し、スコア推移を記録する
// Vercel Cron: 毎週月曜 3:00 AM (vercel.json で設定)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis } from "@/lib/diagnosis";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron認証: CRON_SECRETが設定されている場合はAuthorizationヘッダーを検証
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 1. アクティブ顧客を全取得
  const { data: customers, error: custError } = await supabaseAdmin
    .from("customers")
    .select("id, email")
    .eq("status", "active");

  if (custError || !customers) {
    console.error("Rescan: Failed to fetch customers", custError);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }

  const results: { email: string; score: number | null; error?: string }[] = [];

  for (const customer of customers) {
    try {
      // 2. 顧客のemailで最新のleadからURLを取得
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("id, url")
        .eq("email", customer.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!lead) {
        results.push({ email: customer.email, score: null, error: "No lead found" });
        continue;
      }

      // 3. 診断実行
      const diagnosis = await runDiagnosis(lead.url);

      // 4. diagnosis_reportsに保存
      await supabaseAdmin.from("diagnosis_reports").insert({
        lead_id: lead.id,
        score: diagnosis.score,
        pagespeed_data: diagnosis.pagespeedData,
        html_analysis: diagnosis.htmlAnalysis,
        weaknesses: diagnosis.weaknesses,
        suggestions: diagnosis.suggestions,
      });

      results.push({ email: customer.email, score: diagnosis.score });
    } catch (err) {
      console.error(`Rescan failed for ${customer.email}:`, err);
      results.push({
        email: customer.email,
        score: null,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    scanned: results.length,
    results,
  });
}
