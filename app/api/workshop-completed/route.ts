// app/api/workshop-completed/route.ts
// ワークショップ実施完了API
// 徳山さんがWS終了後にトリガー → n8nが後フォローを開始

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { fireN8nWebhook } from "@/lib/n8n-webhook";

export const maxDuration = 30;

interface CompletedBody {
  workshopDate: string;
  attendeeEmails: string[];   // 参加者のメールアドレス
  recordingUrl?: string;      // 録画URL
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as CompletedBody;

    if (!body.workshopDate) {
      return NextResponse.json({ error: "workshopDate は必須です" }, { status: 400 });
    }
    if (!body.attendeeEmails || body.attendeeEmails.length === 0) {
      return NextResponse.json({ error: "attendeeEmails は必須です" }, { status: 400 });
    }

    const attendeeSet = new Set(
      body.attendeeEmails.map((e) => e.trim().toLowerCase())
    );

    // WS申込者を取得
    const { data: registrations } = await supabaseAdmin
      .from("workshop_registrations")
      .select("id, email, name, company")
      .eq("workshop_date", body.workshopDate);

    const attendeeIds: string[] = [];
    const noShowIds: string[] = [];

    for (const reg of registrations || []) {
      if (attendeeSet.has(reg.email)) {
        attendeeIds.push(reg.id);
        // ステータス更新: attended
        await supabaseAdmin
          .from("workshop_registrations")
          .update({ status: "attended", updated_at: new Date().toISOString() })
          .eq("id", reg.id);
        // pipeline_leads も更新
        await supabaseAdmin
          .from("pipeline_leads")
          .update({ phase: "workshop_attended", heat_score: 80 })
          .eq("contact_email", reg.email)
          .eq("campaign", "training");
      } else {
        noShowIds.push(reg.id);
        // ステータス更新: no_show
        await supabaseAdmin
          .from("workshop_registrations")
          .update({ status: "no_show", updated_at: new Date().toISOString() })
          .eq("id", reg.id);
      }
    }

    // n8n Webhook発火 → 後フォローワークフロー開始
    await fireN8nWebhook({
      event: "workshop_completed",
      timestamp: new Date().toISOString(),
      data: {
        workshopDate: body.workshopDate,
        attendeeIds,
        noShowIds,
        recordingUrl: body.recordingUrl,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRegistered: (registrations || []).length,
        attended: attendeeIds.length,
        noShow: noShowIds.length,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
