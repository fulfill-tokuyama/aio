// app/api/cron/monthly-report/route.ts
// 月次LLMO再診断 → スコア変動レポートメール送信
// Vercel Cron: 毎月1日 00:00 UTC (= JST 09:00)

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis } from "@/lib/diagnosis";
import {
  buildMonthlyReportSubject,
  buildMonthlyReportHtml,
  type MonthlyReportData,
} from "@/lib/email-templates/monthly-report";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    // CRON_SECRET 認証
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. active な customers を取得
    const { data: customers, error: custError } = await supabaseAdmin
      .from("customers")
      .select("id, email, supabase_user_id")
      .eq("status", "active");

    if (custError || !customers) {
      console.error("Monthly report: Failed to fetch customers", custError);
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }

    if (customers.length === 0) {
      return NextResponse.json({ success: true, message: "No active customers", processed: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
    const results: { email: string; score?: number; diff?: number | null; error?: string }[] = [];

    // 2. 順次処理（レート制限対策）
    for (const customer of customers) {
      try {
        // 顧客のリード情報（URLが必要）を取得
        const { data: leads } = await supabaseAdmin
          .from("leads")
          .select("id, company, url")
          .eq("email", customer.email)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!leads || leads.length === 0 || !leads[0].url) {
          results.push({ email: customer.email, error: "No lead/URL found" });
          continue;
        }

        const lead = leads[0];

        // 前回の診断結果を取得
        const { data: prevReports } = await supabaseAdmin
          .from("diagnosis_reports")
          .select("score, weaknesses, weakness_details, breakdown, created_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const prevReport = prevReports && prevReports.length > 0 ? prevReports[0] : null;
        const previousScore = prevReport?.score ?? null;
        const previousWeaknesses: string[] = prevReport?.weaknesses ?? [];
        const previousBreakdown = prevReport?.breakdown ?? null;

        // 再診断実行
        const diagnosis = await runDiagnosis(lead.url);

        // diagnosis_reports に保存
        const { error: insertError } = await supabaseAdmin
          .from("diagnosis_reports")
          .insert({
            lead_id: lead.id,
            url: lead.url,
            score: diagnosis.score,
            breakdown: diagnosis.breakdown,
            pagespeed_data: diagnosis.pagespeedData,
            html_analysis: diagnosis.htmlAnalysis,
            weaknesses: diagnosis.weaknesses,
            weakness_details: diagnosis.weaknessDetails,
            suggestions: diagnosis.suggestions,
            user_id: customer.supabase_user_id || null,
          });

        if (insertError) {
          console.error(`Monthly report: insert error for ${customer.email}`, insertError);
        }

        // leads テーブルのスコアも更新
        await supabaseAdmin
          .from("leads")
          .update({ llmo_score: diagnosis.score })
          .eq("id", lead.id);

        // 差分計算
        const diff = previousScore !== null ? diagnosis.score - previousScore : null;

        // 改善された項目: 前回あったが今回なくなった weakness
        const currentWeaknessSet = new Set(diagnosis.weaknesses);
        const improvedItems = previousWeaknesses.filter(w => !currentWeaknessSet.has(w));

        // 新たな課題: 今回あるが前回なかった weakness
        const prevWeaknessSet = new Set(previousWeaknesses);
        const newIssues = diagnosis.weaknesses.filter(w => !prevWeaknessSet.has(w));

        // 次のアクション: 最も深刻な課題のsuggestionを最大3件
        const nextActions = diagnosis.weaknessDetails
          .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
          })
          .slice(0, 3)
          .map(w => w.suggestion);

        // レポートメール送信
        const reportData: MonthlyReportData = {
          company: lead.company || "お客様",
          url: lead.url,
          currentScore: diagnosis.score,
          previousScore,
          breakdown: diagnosis.breakdown,
          previousBreakdown: previousBreakdown as MonthlyReportData["previousBreakdown"],
          improvedItems: improvedItems.slice(0, 5),
          newIssues: newIssues.slice(0, 5),
          nextActions,
          dashboardLink: `${appUrl}/dashboard`,
        };

        const subject = buildMonthlyReportSubject(
          lead.company || "お客様",
          diagnosis.score,
          diff,
        );
        const html = buildMonthlyReportHtml(reportData);

        await sendMonthlyEmail(customer.email, subject, html);

        results.push({ email: customer.email, score: diagnosis.score, diff });
      } catch (err) {
        console.error(`Monthly report failed for ${customer.email}:`, err);
        results.push({
          email: customer.email,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (e) {
    console.error("Monthly report cron error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// メール送信（SendGrid）+ ログ記録
async function sendMonthlyEmail(to: string, subject: string, html: string): Promise<void> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "info@beginai.jp";
  const fromName = process.env.NEXT_PUBLIC_SENDER_NAME || "AIO Insight";
  let status = "sent";
  let error: string | undefined;

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) throw new Error("SENDGRID_API_KEY is not configured");

    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from: { email: fromEmail, name: fromName },
      subject,
      html,
    });
  } catch (err: unknown) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
    console.error(`Monthly email send failed for ${to}:`, error);
  } finally {
    try {
      await supabaseAdmin.from("email_logs").insert({
        to_email: to,
        subject,
        template: "monthly-report",
        status,
        error: error || null,
      });
    } catch {
      console.error("Failed to log monthly email");
    }
  }
}
