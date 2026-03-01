import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAhrefsConnected } from "@/lib/ahrefs";

export async function GET(req: NextRequest) {
  try {
    if (!isAhrefsConnected()) {
      return NextResponse.json({ connected: false, data: null });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json({ error: "customer_id required" }, { status: 400 });
    }

    // Get the latest snapshot_date
    const { data: latest } = await supabaseAdmin
      .from("ahrefs_top_pages")
      .select("snapshot_date")
      .eq("customer_id", customerId)
      .order("snapshot_date", { ascending: false })
      .limit(1);

    if (!latest || latest.length === 0) {
      return NextResponse.json({ connected: true, data: [] });
    }

    const { data: pages } = await supabaseAdmin
      .from("ahrefs_top_pages")
      .select("*")
      .eq("customer_id", customerId)
      .eq("snapshot_date", latest[0].snapshot_date)
      .order("ai_traffic", { ascending: false })
      .limit(10);

    return NextResponse.json({
      connected: true,
      data: (pages || []).map((p) => ({
        url: p.page_url,
        aiTraffic: p.ai_traffic,
        totalTraffic: p.total_traffic,
        aiRatio: parseFloat(p.ai_ratio),
        trend: parseFloat(p.trend),
      })),
    });
  } catch (e) {
    console.error("ahrefs/top-pages error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
