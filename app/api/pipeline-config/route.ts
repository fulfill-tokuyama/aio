import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const DEFAULT_KEY = "default";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("pipeline_automation_config")
      .select("*")
      .eq("config_key", DEFAULT_KEY)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found

    return NextResponse.json({
      config: data?.config_value || null,
    });
  } catch (e) {
    console.error("pipeline-config GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { config } = body;

    if (!config || typeof config !== "object") {
      return NextResponse.json({ error: "config object required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("pipeline_automation_config")
      .upsert(
        {
          config_key: DEFAULT_KEY,
          config_value: config,
        },
        { onConflict: "config_key" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      config: data.config_value,
    });
  } catch (e) {
    console.error("pipeline-config PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
