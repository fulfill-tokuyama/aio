// app/api/rescan/route.ts
// 週次再スキャン: 全アクティブ顧客のURLを再診断し、スコア推移を記録する
// Vercel Cron: 毎週月曜 3:00 AM (vercel.json で設定)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis } from "@/lib/diagnosis";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Vercel Cron認証: CRON_SECRET必須
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // 2並列でバッチ処理（タイムアウト対策）
  const BATCH_SIZE = 2;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (customer) => {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("id, url")
          .eq("email", customer.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lead) {
          return { email: customer.email, score: null as number | null, error: "No lead found" };
        }

        const diagnosis = await runDiagnosis(lead.url);

        await supabaseAdmin.from("diagnosis_reports").insert({
          lead_id: lead.id,
          score: diagnosis.score,
          pagespeed_data: diagnosis.pagespeedData,
          html_analysis: diagnosis.htmlAnalysis,
          weaknesses: diagnosis.weaknesses,
          suggestions: diagnosis.suggestions,
        });

        return { email: customer.email, score: diagnosis.score };
      })
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error(`Rescan failed for ${batch[j].email}:`, result.reason);
        results.push({
          email: batch[j].email,
          score: null,
          error: result.reason instanceof Error ? result.reason.message : "Unknown error",
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    scanned: results.length,
    results,
  });
}
