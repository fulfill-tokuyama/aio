// app/api/cron/brand-check/route.ts
// 日次ブランドチェック: brand_monitor_config のアクティブエントリに対しAIブランドチェックを実行
// Vercel Cron: 毎日 3:00 AM UTC (vercel.json で設定)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runBrandCheck, mapToPlatformData } from "@/lib/brand-monitor";
import type { PlatformData } from "@/lib/brand-monitor";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // CRON_SECRET 認証
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 1. アクティブな brand_monitor_config を取得
  const { data: configs, error: configError } = await supabaseAdmin
    .from("brand_monitor_config")
    .select("*")
    .eq("is_active", true);

  if (configError || !configs) {
    console.error("Brand check: Failed to fetch configs", configError);
    return NextResponse.json(
      { error: "Failed to fetch brand monitor configs" },
      { status: 500 }
    );
  }

  if (configs.length === 0) {
    return NextResponse.json({ success: true, message: "No active configs", processed: 0 });
  }

  // Perplexity は月曜のみ（コスト対策）
  const dayOfWeek = new Date().getUTCDay(); // 0=Sunday, 1=Monday
  const skipPerplexity = dayOfWeek !== 1;

  const today = new Date().toISOString().split("T")[0];
  const results: { customer_id: string; brand_name: string; platforms: number; error?: string }[] = [];

  // 2. 逐次処理（rate limit 対策）
  for (const config of configs) {
    try {
      const customPrompts = config.custom_prompts as string[] | null;

      // 前回スナップショットを取得（trend 計算用）
      const { data: prevSnapshots } = await supabaseAdmin
        .from("ahrefs_brand_radar_snapshots")
        .select("*")
        .eq("customer_id", config.customer_id)
        .eq("target", config.target_domain)
        .lt("snapshot_date", today)
        .order("snapshot_date", { ascending: false })
        .limit(10);

      const prevByPlatform: Record<string, PlatformData> = {};
      if (prevSnapshots) {
        for (const snap of prevSnapshots) {
          if (!prevByPlatform[snap.platform]) {
            prevByPlatform[snap.platform] = {
              platform: snap.platform,
              mentions: snap.mentions,
              citations: snap.citations,
              sov: parseFloat(snap.sov),
              impressions: snap.impressions,
              trend: parseFloat(snap.trend),
            };
          }
        }
      }

      // ブランドチェック実行
      const result = await runBrandCheck(
        config.brand_name,
        config.target_domain,
        config.industry || "",
        customPrompts || undefined,
        skipPerplexity
      );

      // trend を前回データから再計算
      const platformsWithTrend = result.platforms.map((p) => {
        const prev = prevByPlatform[p.platform];
        if (prev && prev.sov > 0) {
          return { ...p, trend: Math.round((p.sov - prev.sov) * 10) / 10 };
        }
        return p;
      });

      // 3. ahrefs_brand_radar_snapshots に upsert
      const rows = platformsWithTrend.map((p) => ({
        customer_id: config.customer_id,
        target: config.target_domain,
        platform: p.platform,
        mentions: p.mentions,
        citations: p.citations,
        sov: p.sov,
        impressions: p.impressions,
        trend: p.trend,
        snapshot_date: today,
        raw_data: result.raw[p.platform] || [],
      }));

      if (rows.length > 0) {
        const { error: upsertError } = await supabaseAdmin
          .from("ahrefs_brand_radar_snapshots")
          .upsert(rows, {
            onConflict: "customer_id,target,platform,snapshot_date",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Brand check upsert error for ${config.brand_name}:`, upsertError);
        }
      }

      results.push({
        customer_id: config.customer_id,
        brand_name: config.brand_name,
        platforms: platformsWithTrend.length,
      });
    } catch (err) {
      console.error(`Brand check failed for ${config.brand_name}:`, err);
      results.push({
        customer_id: config.customer_id,
        brand_name: config.brand_name,
        platforms: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    skipPerplexity,
    results,
  });
}
