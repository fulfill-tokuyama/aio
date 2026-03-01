import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("pipeline_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      entries: (data || []).map((r) => ({
        t: r.created_at,
        msg: r.message,
        type: r.event_type,
        metadata: r.metadata,
      })),
    });
  } catch (e) {
    console.error("pipeline-activity GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, type, metadata } = body;

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("pipeline_activity_log")
      .insert({
        event_type: type || "info",
        message,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      entry: {
        t: data.created_at,
        msg: data.message,
        type: data.event_type,
      },
    });
  } catch (e) {
    console.error("pipeline-activity POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
