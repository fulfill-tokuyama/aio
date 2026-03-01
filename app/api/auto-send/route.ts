// app/api/auto-send/route.ts
// ステップメール自動送信（手動一括 + Cron自動送信）

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendOutreachEmail } from "@/lib/email";

const MAX_BATCH = 20;

// follow_up_count → ステップの対応表
// count=0 → step1(初回), count=1 → step2, count=2 → step3, count=3 → step4
function getStepFromCount(count: number): 1 | 2 | 3 | 4 {
  if (count <= 0) return 1;
  if (count === 1) return 2;
  if (count === 2) return 3;
  return 4;
}

// ステップ → 次のフォローアップまでの日数
function getDaysUntilNext(step: 1 | 2 | 3 | 4): number | null {
  switch (step) {
    case 1: return 3;   // step1 → step2: 3日後
    case 2: return 4;   // step2 → step3: 4日後（計7日目）
    case 3: return 7;   // step3 → step4: 7日後（計14日目）
    case 4: return null; // 最終ステップ
  }
}

// ステップ → phase名
function getPhaseForStep(step: 1 | 2 | 3 | 4): string {
  switch (step) {
    case 1: return "sent";
    case 2: return "step2";
    case 3: return "step3";
    case 4: return "step4";
  }
}

interface LeadRow {
  id: string;
  company: string;
  url: string;
  contact_email: string | null;
  llmo_score: number;
  weaknesses: string[] | null;
  phase: string;
  follow_up_count: number;
  follow_up_scheduled: string | null;
}

async function sendStepEmail(lead: LeadRow, step: 1 | 2 | 3 | 4): Promise<{ success: boolean; error?: string }> {
  if (!lead.contact_email) {
    return { success: false, error: "No contact email" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  const diagnosisLink = `${appUrl}/diagnosis?url=${encodeURIComponent(lead.url)}`;
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";
  const senderName = process.env.NEXT_PUBLIC_SENDER_NAME || "AIO Insight";
  const unsubscribeLink = `${appUrl}/unsubscribe?lid=${lead.id}`;

  try {
    await sendOutreachEmail({
      to: lead.contact_email,
      data: {
        company: lead.company,
        llmoScore: lead.llmo_score || 0,
        weaknesses: lead.weaknesses || [],
        diagnosisLink,
        paymentLink,
        senderName,
        leadId: lead.id,
        unsubscribeLink,
      },
      step,
    });

    // 送信成功 → DB更新
    const daysUntilNext = getDaysUntilNext(step);
    const nextScheduled = daysUntilNext
      ? new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newCount = (lead.follow_up_count || 0) + 1;

    await supabaseAdmin
      .from("pipeline_leads")
      .update({
        phase: getPhaseForStep(step),
        sent_at: new Date().toISOString(),
        template_used: `outreach_step${step}`,
        follow_up_count: newCount,
        follow_up_scheduled: nextScheduled,
      })
      .eq("id", lead.id);

    // 全4通送信済み（follow_up_count=4）で dormant に遷移
    if (newCount >= 4) {
      await supabaseAdmin
        .from("pipeline_leads")
        .update({ phase: "dormant", follow_up_scheduled: null })
        .eq("id", lead.id);
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// ============================================================
// POST: 手動一括送信
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadIds, step } = body as { leadIds: string[]; step?: number };

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds (array) is required" }, { status: 400 });
    }

    // 最大20件/回
    const targetIds = leadIds.slice(0, MAX_BATCH);

    const { data: leads, error } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, company, url, contact_email, llmo_score, weaknesses, phase, follow_up_count, follow_up_scheduled")
      .in("id", targetIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { leadId: string; company: string; success: boolean; step: number; error?: string }[] = [];

    for (const lead of (leads || []) as LeadRow[]) {
      // メールなしリードはスキップ
      if (!lead.contact_email) {
        results.push({ leadId: lead.id, company: lead.company, success: false, step: 0, error: "No contact email" });
        continue;
      }

      // 顧客・休眠・配信停止済みはスキップ
      if (["customer", "dormant"].includes(lead.phase)) {
        results.push({ leadId: lead.id, company: lead.company, success: false, step: 0, error: "Customer or dormant" });
        continue;
      }

      // step指定あればそれを使う、なければfollow_up_countから判定
      const targetStep = (step as 1 | 2 | 3 | 4) || getStepFromCount(lead.follow_up_count || 0);
      const result = await sendStepEmail(lead, targetStep);
      results.push({ leadId: lead.id, company: lead.company, success: result.success, step: targetStep, error: result.error });
    }

    const sent = results.filter(r => r.success).length;
    const skipped = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: { total: results.length, sent, skipped },
      results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// GET: Cron自動送信（Vercel Cron: 毎朝 UTC 01:00 = JST 10:00）
// ============================================================
export async function GET(req: NextRequest) {
  try {
    // CRON_SECRET による認証
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 対象リード抽出: フォローアップ予定日が過ぎたリード（顧客・休眠を除外）
    const { data: leads, error } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, company, url, contact_email, llmo_score, weaknesses, phase, follow_up_count, follow_up_scheduled")
      .in("phase", ["sent", "step2", "step3"])
      .not("phase", "in", '("customer","dormant")')
      .lte("follow_up_scheduled", new Date().toISOString())
      .lt("follow_up_count", 4)
      .order("follow_up_scheduled", { ascending: true })
      .limit(MAX_BATCH);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No leads due for follow-up",
        summary: { total: 0, sent: 0, skipped: 0 },
      });
    }

    const results: { leadId: string; company: string; success: boolean; step: number; error?: string }[] = [];

    for (const lead of leads as LeadRow[]) {
      if (!lead.contact_email) {
        results.push({ leadId: lead.id, company: lead.company, success: false, step: 0, error: "No contact email" });
        continue;
      }

      const targetStep = getStepFromCount(lead.follow_up_count || 0);
      const result = await sendStepEmail(lead, targetStep);
      results.push({ leadId: lead.id, company: lead.company, success: result.success, step: targetStep, error: result.error });
    }

    const sent = results.filter(r => r.success).length;
    const skipped = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: { total: results.length, sent, skipped },
      results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Cron send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
