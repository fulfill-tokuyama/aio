import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAhrefsConnected, fetchWebAnalyticsChart } from "@/lib/ahrefs";

export async function GET(req: NextRequest) {
  try {
    if (!isAhrefsConnected()) {
      return NextResponse.json({ connected: false, data: null });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");
    const siteUrl = searchParams.get("site_url");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!customerId || !siteUrl) {
      return NextResponse.json({ error: "customer_id and site_url required" }, { status: 400 });
    }

    // Check DB cache (data from today)
    const today = new Date().toISOString().split("T")[0];
    const { data: cached } = await supabaseAdmin
      .from("ahrefs_traffic_snapshots")
      .select("*")
      .eq("customer_id", customerId)
      .eq("site_url", siteUrl)
      .gte("date", new Date(Date.now() - days * 86400000).toISOString().split("T")[0])
      .order("date", { ascending: true });

    // If we have recent cached data (last entry is today), return it
    if (cached && cached.length > 0 && cached[cached.length - 1].date === today) {
      return NextResponse.json({
        connected: true,
        data: cached.map((r) => ({
          date: r.date,
          organic: r.organic,
          ai: r.ai,
          direct: r.direct,
          social: r.social,
          total: r.total,
          bounceRate: r.bounce_rate,
          avgDuration: r.avg_duration_seconds,
        })),
      });
    }

    // Fetch from Ahrefs API
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const apiData = await fetchWebAnalyticsChart(siteUrl, dateFrom, today);

    if (!apiData) {
      // API call failed — return cached data if any
      if (cached && cached.length > 0) {
        return NextResponse.json({
          connected: true,
          data: cached.map((r) => ({
            date: r.date,
            organic: r.organic,
            ai: r.ai,
            direct: r.direct,
            social: r.social,
            total: r.total,
            bounceRate: r.bounce_rate,
            avgDuration: r.avg_duration_seconds,
          })),
        });
      }
      return NextResponse.json({ connected: true, data: [] });
    }

    // Cache the API response
    const rows = (apiData.data || []).map((d: any) => ({
      customer_id: customerId,
      site_url: siteUrl,
      date: d.date,
      organic: d.organic || 0,
      ai: d.ai || 0,
      direct: d.direct || 0,
      social: d.social || 0,
      total: d.total || 0,
      bounce_rate: d.bounce_rate,
      avg_duration_seconds: d.avg_duration_seconds,
      raw_data: d,
    }));

    if (rows.length > 0) {
      await supabaseAdmin.from("ahrefs_traffic_snapshots").upsert(rows, {
        onConflict: "customer_id,site_url,date",
        ignoreDuplicates: false,
      });
    }

    return NextResponse.json({
      connected: true,
      data: rows.map((r: any) => ({
        date: r.date,
        organic: r.organic,
        ai: r.ai,
        direct: r.direct,
        social: r.social,
        total: r.total,
        bounceRate: r.bounce_rate,
        avgDuration: r.avg_duration_seconds,
      })),
    });
  } catch (e) {
    console.error("ahrefs/traffic error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
