import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAhrefsConnected, fetchBrandRadarMentions, fetchBrandRadarOverview } from "@/lib/ahrefs";

export async function GET(req: NextRequest) {
  try {
    if (!isAhrefsConnected()) {
      return NextResponse.json({ connected: false, data: null });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");
    const target = searchParams.get("target");

    if (!customerId || !target) {
      return NextResponse.json({ error: "customer_id and target required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Check DB cache
    const { data: cached } = await supabaseAdmin
      .from("ahrefs_brand_radar_snapshots")
      .select("*")
      .eq("customer_id", customerId)
      .eq("target", target)
      .eq("snapshot_date", today);

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

    // Fetch from Ahrefs API
    const [mentionsData, overviewData] = await Promise.all([
      fetchBrandRadarMentions(target),
      fetchBrandRadarOverview(target),
    ]);

    if (!mentionsData && !overviewData) {
      return NextResponse.json({ connected: true, platforms: [] });
    }

    // Normalize and cache
    const platforms = (overviewData?.platforms || []).map((p: any) => ({
      customer_id: customerId,
      target,
      platform: p.platform || p.name,
      mentions: p.mentions || 0,
      citations: p.citations || 0,
      sov: p.sov || 0,
      impressions: p.impressions || 0,
      trend: p.trend || 0,
      snapshot_date: today,
      raw_data: p,
    }));

    if (platforms.length > 0) {
      await supabaseAdmin.from("ahrefs_brand_radar_snapshots").upsert(platforms, {
        onConflict: "customer_id,target,platform,snapshot_date",
        ignoreDuplicates: false,
      });
    }

    return NextResponse.json({
      connected: true,
      platforms: platforms.map((r: any) => ({
        platform: r.platform,
        mentions: r.mentions,
        citations: r.citations,
        sov: r.sov,
        impressions: r.impressions,
        trend: r.trend,
      })),
    });
  } catch (e) {
    console.error("ahrefs/brand-radar error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
