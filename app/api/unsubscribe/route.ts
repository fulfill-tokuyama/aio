// app/api/unsubscribe/route.ts
// メール配信停止処理

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // 既存のnotesを1回だけ取得
    const { data: current } = await supabaseAdmin
      .from("pipeline_leads")
      .select("notes")
      .eq("id", leadId)
      .single();

    const timestamp = new Date().toISOString();
    const existingNotes = current?.notes || "";
    const newNotes = existingNotes
      ? `${existingNotes}\n[配信停止: ${timestamp}]`
      : `[配信停止: ${timestamp}]`;

    // pipeline_leads を dormant に更新し、フォローアップを停止
    const { error } = await supabaseAdmin
      .from("pipeline_leads")
      .update({
        phase: "dormant",
        follow_up_scheduled: null,
        notes: newNotes,
      })
      .eq("id", leadId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unsubscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
