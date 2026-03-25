import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { LeadGeniusQueueAction } from "@/types/leadgenius";

export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("pipeline_leads")
    .select("*")
    .eq("phase", "queued")
    .ilike("campaign", "leadgenius%")
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

export async function PUT(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  let body: LeadGeniusQueueAction;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, leadIds } = body;

  if (!action || !leadIds || leadIds.length === 0) {
    return NextResponse.json(
      { error: "action and leadIds required" },
      { status: 400 }
    );
  }

  if (action === "enqueue") {
    const { data: leads } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, phase")
      .in("id", leadIds);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No matching leads" }, { status: 404 });
    }

    for (const lead of leads) {
      await supabaseAdmin
        .from("pipeline_leads")
        .update({
          previous_phase: lead.phase,
          phase: "queued",
          scheduled_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
    }

    return NextResponse.json({ updated: leads.length });
  }

  if (action === "dequeue") {
    const { data: leads } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, previous_phase")
      .in("id", leadIds)
      .eq("phase", "queued");

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No queued leads found" }, { status: 404 });
    }

    for (const lead of leads) {
      await supabaseAdmin
        .from("pipeline_leads")
        .update({
          phase: lead.previous_phase || "discovered",
          previous_phase: null,
          scheduled_at: null,
        })
        .eq("id", lead.id);
    }

    return NextResponse.json({ updated: leads.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
