import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");
    const target = searchParams.get("target");

    if (!customerId || !target) {
      return NextResponse.json({ error: "customer_id and target required" }, { status: 400 });
    }

    // brand_monitor_config の存在チェック (connected 判定)
    let configQuery = supabaseAdmin
      .from("brand_monitor_config")
      .select("id, customer_id, target_domain")
      .eq("is_active", true);

    if (customerId !== "default") {
      configQuery = configQuery.eq("customer_id", customerId);
    }

    const { data: configs } = await configQuery.limit(1);
    const isConnected = configs && configs.length > 0;

    if (!isConnected) {
      return NextResponse.json({ connected: false, platforms: [] });
    }

    // DB から最新スナップショットを取得
    const resolvedCustomerId = customerId !== "default" ? customerId : configs[0].customer_id;
    const resolvedTarget = customerId !== "default" ? target : configs[0].target_domain;

    const today = new Date().toISOString().split("T")[0];

    // まず今日のデータを確認、なければ最新日付を取得
    let { data: cached } = await supabaseAdmin
      .from("ahrefs_brand_radar_snapshots")
      .select("*")
      .eq("customer_id", resolvedCustomerId)
      .eq("target", resolvedTarget)
      .eq("snapshot_date", today);

    if (!cached || cached.length === 0) {
      // 今日のデータがなければ最新のスナップショットを取得
      const { data: latest } = await supabaseAdmin
        .from("ahrefs_brand_radar_snapshots")
        .select("*")
        .eq("customer_id", resolvedCustomerId)
        .eq("target", resolvedTarget)
        .order("snapshot_date", { ascending: false })
        .limit(10);

      if (latest && latest.length > 0) {
        // 同じ snapshot_date のデータをグループ化
        const latestDate = latest[0].snapshot_date;
        cached = latest.filter((r) => r.snapshot_date === latestDate);
      }
    }

    if (cached && cached.length > 0) {
      return NextResponse.json({
        connected: true,
        platforms: cached.map((r) => ({
          platform: r.platform,
          mentions: r.mentions,
          citations: r.citations,
          sov: parseFloat(r.sov),
          impressions: r.impressions,
          trend: parseFloat(r.trend),
        })),
      });
    }

    // Config exists but no data yet (cron hasn't run)
    return NextResponse.json({ connected: true, platforms: [] });
  } catch (e) {
    console.error("brand-radar error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
