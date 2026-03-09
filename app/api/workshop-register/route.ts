// app/api/workshop-register/route.ts
// 無料AIワークショップの参加申込API
// 申込時に徳山さんへ即通知メール送信

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyAdmin, sendWorkshopConfirmationEmail } from "@/lib/email";
import { fireN8nWebhook } from "@/lib/n8n-webhook";

export const maxDuration = 30;

interface RegisterBody {
  company: string;
  name: string;
  email: string;
  position?: string;
  employeeCount?: string;
  industry?: string;
  interests?: string[];
  workshopDate?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;

    // バリデーション
    if (!body.company?.trim()) {
      return NextResponse.json({ error: "会社名は必須です" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "お名前は必須です" }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes("@")) {
      return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
    }

    // 重複チェック（同じメール + 同じワークショップ日）
    const { data: existing } = await supabaseAdmin
      .from("workshop_registrations")
      .select("id")
      .eq("email", body.email.trim().toLowerCase())
      .eq("workshop_date", body.workshopDate || "")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "既にお申込み済みです。当日のご参加をお待ちしております。",
        duplicate: true,
      });
    }

    // 登録
    const { data, error } = await supabaseAdmin
      .from("workshop_registrations")
      .insert({
        company: body.company.trim(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        position: body.position?.trim() || null,
        employee_count: body.employeeCount?.trim() || null,
        industry: body.industry?.trim() || null,
        interests: body.interests || [],
        workshop_date: body.workshopDate || null,
        status: "registered",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Workshop registration error:", error);
      return NextResponse.json({ error: "登録に失敗しました。しばらく経ってから再度お試しください。" }, { status: 500 });
    }

    // pipeline_leads にも追加（campaign=training でリード管理に接続）
    try {
      await supabaseAdmin
        .from("pipeline_leads")
        .insert({
          company: body.company.trim(),
          contact_name: body.name.trim(),
          contact_email: body.email.trim().toLowerCase(),
          contact_position: body.position?.trim() || null,
          employee_count: body.employeeCount?.trim() || null,
          industry: body.industry?.trim() || null,
          url: "",
          phase: "workshop_registered",
          campaign: "training",
          notes: `ワークショップ申込 (${body.workshopDate || "未定"})`,
          heat_score: 60, // 申込者は温度高め
        });
    } catch {
      // pipeline追加は best-effort
    }

    // === 申込者に確認メール送信 ===
    try {
      await sendWorkshopConfirmationEmail({
        to: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        company: body.company.trim(),
        workshopDate: body.workshopDate || undefined,
      });
    } catch {
      // 確認メール失敗は申込自体には影響させない
    }

    // === n8n Webhook発火（WS前リマインド・後フォローのトリガー） ===
    fireN8nWebhook({
      event: "workshop_registered",
      timestamp: new Date().toISOString(),
      data: {
        registrationId: data.id,
        company: body.company.trim(),
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        position: body.position?.trim() || null,
        employeeCount: body.employeeCount?.trim() || null,
        industry: body.industry?.trim() || null,
        interests: body.interests || [],
        workshopDate: body.workshopDate || null,
      },
    }).catch(() => {});

    // === 徳山さんへ即通知 ===
    try {
      const interests = body.interests?.length
        ? body.interests.map(i => `<li>${escapeHtml(i)}</li>`).join("")
        : "<li>未選択</li>";

      await notifyAdmin({
        subject: `🔔 WS申込: ${body.company} ${body.name}様`,
        body: `
          <h2 style="color:#1e293b;font-size:18px;margin:0 0 16px;">ワークショップ新規申込</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;width:120px;">会社名</td>
              <td style="color:#1e293b;font-weight:600;padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(body.company)}</td>
            </tr>
            <tr>
              <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">お名前</td>
              <td style="color:#1e293b;font-weight:600;padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(body.name)}</td>
            </tr>
            <tr>
              <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">メール</td>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                <a href="mailto:${escapeHtml(body.email)}" style="color:#2563EB;">${escapeHtml(body.email)}</a>
              </td>
            </tr>
            <tr>
              <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">役職</td>
              <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(body.position || "未入力")}</td>
            </tr>
            <tr>
              <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">従業員数</td>
              <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(body.employeeCount || "未入力")}</td>
            </tr>
            <tr>
              <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">業種</td>
              <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(body.industry || "未入力")}</td>
            </tr>
          </table>
          <div style="margin-top:16px;">
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;">興味のあるトピック:</p>
            <ul style="color:#1e293b;font-size:13px;margin:0;padding:0 0 0 20px;line-height:1.8;">${interests}</ul>
          </div>
          <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;">
            <p style="color:#1e40af;font-size:13px;font-weight:600;margin:0;">
              💡 「AI研修について」「AI人材の派遣について」に興味ありの場合は商談候補です
            </p>
          </div>
        `,
      });
    } catch {
      // 通知失敗は申込自体には影響させない
    }

    return NextResponse.json({
      success: true,
      message: "お申込みありがとうございます。ワークショップの詳細をメールでお送りいたします。",
      registrationId: data.id,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
