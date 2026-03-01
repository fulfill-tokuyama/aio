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

    const { data: competitors } = await supabaseAdmin
      .from("ahrefs_competitor_config")
      .select("*")
      .eq("customer_id", customerId)
      .order("display_order", { ascending: true });

    return NextResponse.json({
      connected: true,
      data: (competitors || []).map((c) => ({
        id: c.id,
        name: c.competitor_name,
        url: c.competitor_url,
        displayOrder: c.display_order,
      })),
    });
  } catch (e) {
    console.error("ahrefs/competitors GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAhrefsConnected()) {
      return NextResponse.json({ connected: false, data: null });
    }

    const body = await req.json();
    const { action, customerId, competitorName, competitorUrl, competitorId } = body;

    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }

    if (action === "add") {
      if (!competitorName || !competitorUrl) {
        return NextResponse.json({ error: "competitorName and competitorUrl required" }, { status: 400 });
      }

      // Get max display_order
      const { data: existing } = await supabaseAdmin
        .from("ahrefs_competitor_config")
        .select("display_order")
        .eq("customer_id", customerId)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

      const { data: inserted, error } = await supabaseAdmin
        .from("ahrefs_competitor_config")
        .insert({
          customer_id: customerId,
          competitor_name: competitorName,
          competitor_url: competitorUrl,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        connected: true,
        data: {
          id: inserted.id,
          name: inserted.competitor_name,
          url: inserted.competitor_url,
          displayOrder: inserted.display_order,
        },
      });
    }

    if (action === "delete") {
      if (!competitorId) {
        return NextResponse.json({ error: "competitorId required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("ahrefs_competitor_config")
        .delete()
        .eq("id", competitorId)
        .eq("customer_id", customerId);

      if (error) throw error;

      return NextResponse.json({ connected: true, deleted: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("ahrefs/competitors POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
