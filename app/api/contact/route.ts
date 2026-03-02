// app/api/contact/route.ts
// フォーム送信 → Supabase保存 → 診断実行 → メール送信

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis } from "@/lib/diagnosis";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { company, name, email, url, message } = data;

    // 1. Validation
    if (!company?.trim() || !name?.trim() || !email?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: "必須項目が未入力です" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "正しいメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    // 2. 24時間以内の重複チェック
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("email", email)
      .gte("created_at", oneDayAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "24時間以内に既に診断リクエストを送信済みです。メールをご確認ください。" },
        { status: 429 }
      );
    }

    // 3. Supabase leads テーブルに保存
    const { data: lead, error: insertError } = await supabaseAdmin
      .from("leads")
      .insert({
        company: company.trim(),
        name: name.trim(),
        email: email.trim(),
        url: url.trim(),
        message: message?.trim() || null,
        status: "diagnosing",
      })
      .select("id")
      .single();

    if (insertError || !lead) {
      console.error("Lead insert error:", insertError);
      return NextResponse.json(
        { error: "データの保存に失敗しました" },
        { status: 500 }
      );
    }

    // 4. 診断実行
    const diagnosis = await runDiagnosis(url.trim());

    // 5. diagnosis_reports に保存
    const { error: reportError } = await supabaseAdmin.from("diagnosis_reports").insert({
      lead_id: lead.id,
      score: diagnosis.score,
      pagespeed_data: diagnosis.pagespeedData,
      html_analysis: diagnosis.htmlAnalysis,
      weaknesses: diagnosis.weaknesses,
      suggestions: diagnosis.suggestions,
    });

    if (reportError) {
      console.error("Diagnosis report insert error:", reportError);
    }

    // 6. leads のステータスとスコアを更新
    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({ status: "diagnosed", llmo_score: diagnosis.score })
      .eq("id", lead.id);

    if (updateError) {
      console.error("Lead status update error:", updateError);
    }

    // 7. 診断結果メールを送信
    try {
      const { sendDiagnosisEmail } = await import("@/lib/email");
      await sendDiagnosisEmail({
        to: email.trim(),
        company: company.trim(),
        name: name.trim(),
        url: url.trim(),
        diagnosis,
      });

      await supabaseAdmin
        .from("leads")
        .update({ status: "emailed" })
        .eq("id", lead.id);
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      // メール送信失敗でもリクエスト自体は成功として返す
    }

    return NextResponse.json({
      success: true,
      message: "診断リクエストを受け付けました。数分以内に結果をメールでお届けします。",
      score: diagnosis.score,
    });
  } catch (error) {
    console.error("Contact API error:", error);
    // 診断失敗時にleadが作成済みなら "failed" に更新
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.email) {
        await supabaseAdmin
          .from("leads")
          .update({ status: "failed" })
          .eq("email", body.email.trim())
          .eq("status", "diagnosing");
      }
    } catch { /* cleanup失敗は無視 */ }
    return NextResponse.json(
      { error: "診断の実行に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    );
  }
}
