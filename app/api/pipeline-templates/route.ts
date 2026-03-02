import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("pipeline_template_stats")
      .select("*")
      .order("template_id", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      templates: (data || []).map((r) => ({
        templateId: r.template_id,
        templateName: r.template_name,
        sent: r.sent,
        opened: r.opened,
        replied: r.replied,
        converted: r.converted,
      })),
    });
  } catch (e) {
    console.error("pipeline-templates GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, templateName, field, increment } = body;

    if (!templateId || !templateName) {
      return NextResponse.json({ error: "templateId and templateName required" }, { status: 400 });
    }

    // fieldの許可リストチェック
    const ALLOWED_FIELDS = ["sent", "opened", "replied", "converted"];
    if (field && !ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: `field must be one of: ${ALLOWED_FIELDS.join(", ")}` }, { status: 400 });
    }

    // Upsert the template row first (ensure it exists)
    const { data: existing } = await supabaseAdmin
      .from("pipeline_template_stats")
      .select("*")
      .eq("template_id", templateId)
      .single();

    if (!existing) {
      // Insert new row with initial counters
      const newRow: Record<string, any> = {
        template_id: templateId,
        template_name: templateName,
        sent: 0,
        opened: 0,
        replied: 0,
        converted: 0,
      };
      if (field && typeof increment === "number") {
        newRow[field] = increment;
      }

      const { data, error } = await supabaseAdmin
        .from("pipeline_template_stats")
        .insert(newRow)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        template: {
          templateId: data.template_id,
          templateName: data.template_name,
          sent: data.sent,
          opened: data.opened,
          replied: data.replied,
          converted: data.converted,
        },
      });
    }

    // Update existing row
    const updates: Record<string, any> = { template_name: templateName };
    if (field && typeof increment === "number") {
      updates[field] = (existing[field] || 0) + increment;
    }

    const { data, error } = await supabaseAdmin
      .from("pipeline_template_stats")
      .update(updates)
      .eq("template_id", templateId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      template: {
        templateId: data.template_id,
        templateName: data.template_name,
        sent: data.sent,
        opened: data.opened,
        replied: data.replied,
        converted: data.converted,
      },
    });
  } catch (e) {
    console.error("pipeline-templates PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
