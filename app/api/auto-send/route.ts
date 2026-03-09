// app/api/auto-send/route.ts
// ステップメール自動送信（手動一括 + Cron自動送信）

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendOutreachEmail, sendTrainingOutreachEmail } from "@/lib/email";
import { requireAuth } from "@/lib/api-auth";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { incrementTemplateStat } from "@/lib/pipeline-utils";

export const maxDuration = 60;

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

// キャンペーン種別: aio(LLMO診断) / training(AI研修・派遣)
type CampaignType = "aio" | "training";

interface LeadRow {
  id: string;
  company: string;
  url: string;
  contact_email: string | null;
  contact_name: string | null;
  industry: string | null;
  employee_count: string | null;
  llmo_score: number;
  weaknesses: string[] | null;
  phase: string;
  follow_up_count: number;
  follow_up_scheduled: string | null;
  diagnosis_report_id: string | null;
  campaign: CampaignType | null;
}

async function sendStepEmail(lead: LeadRow, step: 1 | 2 | 3 | 4): Promise<{ success: boolean; error?: string }> {
  if (!lead.contact_email) {
    return { success: false, error: "No contact email" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  const unsubscribeLink = buildUnsubscribeUrl(lead.id, appUrl);
  const campaign: CampaignType = lead.campaign || "aio";

  try {
    if (campaign === "training") {
      // === AI研修・人材派遣キャンペーン（2ステップマーケティング） ===
      const workshopLink = process.env.NEXT_PUBLIC_WORKSHOP_URL
        || `${appUrl}/workshop?ref=email&lid=${lead.id}`;
      const senderName = process.env.NEXT_PUBLIC_TRAINING_SENDER_NAME || "フルフィル株式会社 AI研修事業部";

      await sendTrainingOutreachEmail({
        to: lead.contact_email,
        data: {
          company: lead.company,
          industry: lead.industry || undefined,
          employeeCount: lead.employee_count || undefined,
          contactName: lead.contact_name || undefined,
          workshopLink,
          senderName,
          leadId: lead.id,
          unsubscribeLink,
        },
        step,
      });
    } else {
      // === AIO（LLMO診断）キャンペーン ===
      const diagnosisLink = `${appUrl}/signup?from=email&url=${encodeURIComponent(lead.url)}`;
      const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";
      const senderName = process.env.NEXT_PUBLIC_SENDER_NAME || "AIO Insight";

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
    }

    // テンプレート統計更新（AIOキャンペーンのみ既存統計に記録）
    if (campaign === "aio") {
      await incrementTemplateStat(step, "sent").catch(() => {});
    }

    // 送信成功 → DB更新
    const daysUntilNext = getDaysUntilNext(step);
    const nextScheduled = daysUntilNext
      ? new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newCount = (lead.follow_up_count || 0) + 1;

    // 全4通送信済み（follow_up_count=4）で直接 dormant に遷移
    const finalPhase = newCount >= 4 ? "dormant" : getPhaseForStep(step);
    const finalScheduled = newCount >= 4 ? null : nextScheduled;

    await supabaseAdmin
      .from("pipeline_leads")
      .update({
        phase: finalPhase,
        sent_at: new Date().toISOString(),
        template_used: `${campaign}_step${step}`,
        follow_up_count: newCount,
        follow_up_scheduled: finalScheduled,
      })
      .eq("id", lead.id);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// ============================================================
// POST: 手動一括送信（認証必須）
// ============================================================
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
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
      .select("id, company, url, contact_email, contact_name, industry, employee_count, llmo_score, weaknesses, phase, follow_up_count, follow_up_scheduled, diagnosis_report_id, campaign")
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

      // 顧客・休眠・WS申込済み・配信停止済みはスキップ
      if (["customer", "dormant", "workshop_registered", "workshop_attended"].includes(lead.phase)) {
        results.push({ leadId: lead.id, company: lead.company, success: false, step: 0, error: `Skipped: ${lead.phase}` });
        continue;
      }

      // step指定あればそれを使う、なければfollow_up_countから判定
      // step値をバリデーション（1-4のみ許可）
      const validStep = typeof step === "number" && [1, 2, 3, 4].includes(step) ? step as 1 | 2 | 3 | 4 : null;
      const targetStep = validStep || getStepFromCount(lead.follow_up_count || 0);
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
    // CRON_SECRET 認証（必須）
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 対象リード抽出: フォローアップ予定日が過ぎたリード（顧客・休眠を除外）
    const { data: leads, error } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, company, url, contact_email, contact_name, industry, employee_count, llmo_score, weaknesses, phase, follow_up_count, follow_up_scheduled, diagnosis_report_id, campaign")
      .in("phase", ["sent", "step2", "step3"])
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

    // Cron冪等性: 即座に全対象の follow_up_scheduled を null でclaim
    const typedLeads = leads as LeadRow[];
    const leadScheduleMap = new Map<string, string | null>();
    for (const lead of typedLeads) {
      leadScheduleMap.set(lead.id, lead.follow_up_scheduled);
    }
    await supabaseAdmin
      .from("pipeline_leads")
      .update({ follow_up_scheduled: null })
      .in("id", typedLeads.map(l => l.id));

    const results: { leadId: string; company: string; success: boolean; step: number; error?: string }[] = [];

    for (const lead of typedLeads) {
      if (!lead.contact_email) {
        // メールなし: follow_up_scheduled を復元
        const original = leadScheduleMap.get(lead.id);
        if (original) {
          await supabaseAdmin
            .from("pipeline_leads")
            .update({ follow_up_scheduled: original })
            .eq("id", lead.id);
        }
        results.push({ leadId: lead.id, company: lead.company, success: false, step: 0, error: "No contact email" });
        continue;
      }

      const targetStep = getStepFromCount(lead.follow_up_count || 0);
      const result = await sendStepEmail(lead, targetStep);

      if (!result.success) {
        // 送信失敗: follow_up_scheduled を元の値に復元
        const original = leadScheduleMap.get(lead.id);
        if (original) {
          await supabaseAdmin
            .from("pipeline_leads")
            .update({ follow_up_scheduled: original })
            .eq("id", lead.id);
        }
      }
      // 成功時は sendStepEmail 内で次回スケジュールが設定される

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
