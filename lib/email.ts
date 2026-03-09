import { supabaseAdmin } from "./supabase";
import {
  buildDiagnosisEmailSubject,
  buildDiagnosisEmailHtml,
} from "./email-templates/diagnosis";
import {
  buildWelcomeEmailSubject,
  buildWelcomeEmailHtml,
} from "./email-templates/welcome";
import {
  buildOutreachSubject,
  buildOutreachHtml,
  type OutreachEmailData,
} from "./email-templates/outreach";
import {
  buildTrainingOutreachSubject,
  buildTrainingOutreachHtml,
  type TrainingOutreachEmailData,
} from "./email-templates/outreach-training";
import type { DiagnosisResult } from "./diagnosis";

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "info@beginai.jp";
const FROM_NAME = process.env.NEXT_PUBLIC_SENDER_NAME || "AIO Insight";

// ============================================================
// Send diagnosis result email
// ============================================================
export async function sendDiagnosisEmail(params: {
  to: string;
  company: string;
  name: string;
  url: string;
  diagnosis: DiagnosisResult;
}): Promise<void> {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

  const subject = buildDiagnosisEmailSubject(params.company, params.diagnosis.score);
  const html = buildDiagnosisEmailHtml({
    company: params.company,
    name: params.name,
    score: params.diagnosis.score,
    breakdown: params.diagnosis.breakdown,
    weaknesses: params.diagnosis.weaknesses,
    suggestions: params.diagnosis.suggestions,
    url: params.url,
    paymentLink,
  });

  await sendEmail(params.to, subject, html, "diagnosis");
}

// ============================================================
// Send welcome email (after payment)
// ============================================================
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  tempPassword: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  const loginUrl = `${appUrl}/login`;

  const subject = buildWelcomeEmailSubject();
  const html = buildWelcomeEmailHtml({
    name: params.name,
    email: params.to,
    tempPassword: params.tempPassword,
    loginUrl,
  });

  await sendEmail(params.to, subject, html, "welcome");
}

// ============================================================
// Send outreach step email (pipeline auto-sales)
// ============================================================
export async function sendOutreachEmail(params: {
  to: string;
  data: OutreachEmailData;
  step: 1 | 2 | 3 | 4;
}): Promise<void> {
  const subject = buildOutreachSubject(params.data.company, params.step);
  const html = buildOutreachHtml(params.data, params.step);

  await sendEmail(params.to, subject, html, "outreach");
}

// ============================================================
// Send training outreach step email (AI研修・人材派遣営業)
// ============================================================
export async function sendTrainingOutreachEmail(params: {
  to: string;
  data: TrainingOutreachEmailData;
  step: 1 | 2 | 3 | 4;
}): Promise<void> {
  const subject = buildTrainingOutreachSubject(params.data.company, params.step);
  const html = buildTrainingOutreachHtml(params.data, params.step);

  const trainingFrom = {
    email: process.env.TRAINING_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "info@and-and.co.jp",
    name: process.env.NEXT_PUBLIC_TRAINING_SENDER_NAME || "フルフィル株式会社 AI研修事業部",
  };

  await sendEmail(params.to, subject, html, "training_outreach", trainingFrom);
}

// ============================================================
// Send workshop confirmation email to registrant
// ============================================================
export async function sendWorkshopConfirmationEmail(params: {
  to: string;
  name: string;
  company: string;
  workshopDate?: string;
}): Promise<void> {
  const subject = `【参加確定】無料AIワークショップ — ${params.company}様`;
  const zoomUrl = process.env.WORKSHOP_ZOOM_URL || "";
  const zoomSection = zoomUrl
    ? `<tr>
        <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">Zoom URL</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><a href="${zoomUrl}" style="color:#2563EB;word-break:break-all;">${zoomUrl}</a></td>
       </tr>`
    : `<tr>
        <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">Zoom URL</td>
        <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">開催日の前日までにメールでお送りします</td>
       </tr>`;

  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;padding:24px 0;border-bottom:2px solid #2563EB;">
    <h1 style="color:#1e293b;font-size:18px;margin:0 0 4px;">フルフィル株式会社</h1>
    <p style="color:#64748b;font-size:12px;margin:0;">AI研修・AI人材派遣サービス</p>
  </div>
  <div style="padding:28px 0;">
    <p style="font-size:15px;color:#1e293b;margin:0 0 20px;">${params.name}様</p>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 24px;">
      無料AIワークショップへのお申込みありがとうございます。<br>
      以下の内容でご参加を確定いたしました。
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
      <h3 style="color:#1e293b;font-size:14px;margin:0 0 12px;">ワークショップ詳細</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;width:100px;">日時</td>
          <td style="color:#1e293b;font-weight:600;padding:8px 0;border-bottom:1px solid #e2e8f0;">${params.workshopDate || "日程確定後にご連絡いたします"}</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">形式</td>
          <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">オンライン（Zoom）</td>
        </tr>
        <tr>
          <td style="color:#64748b;padding:8px 0;border-bottom:1px solid #e2e8f0;">所要時間</td>
          <td style="color:#1e293b;padding:8px 0;border-bottom:1px solid #e2e8f0;">約90分</td>
        </tr>
        ${zoomSection}
        <tr>
          <td style="color:#64748b;padding:8px 0;">参加費</td>
          <td style="color:#dc2626;font-weight:700;padding:8px 0;">無料</td>
        </tr>
      </table>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#1e40af;font-size:14px;margin:0 0 8px;">当日学べること</h3>
      <ul style="margin:0;padding:0 0 0 20px;color:#475569;font-size:13px;line-height:2;">
        <li>ChatGPT・Gemini・Claude の使い分け戦略</li>
        <li>NotebookLM で社内資料をAIに読ませる方法</li>
        <li>Google AI Studio でノーコードAIアプリ構築</li>
        <li>Claude Code でシステム開発</li>
      </ul>
    </div>
    <p style="font-size:14px;color:#475569;line-height:1.8;margin:0;">
      ご不明な点がございましたら、このメールにご返信ください。<br>
      当日のご参加をお待ちしております。
    </p>
  </div>
  <div style="text-align:center;padding:24px 0;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:11px;margin:0;">フルフィル株式会社 AI研修事業部</p>
  </div>
</div>
</body></html>`;

  const trainingFrom = {
    email: process.env.TRAINING_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "info@and-and.co.jp",
    name: process.env.NEXT_PUBLIC_TRAINING_SENDER_NAME || "フルフィル株式会社 AI研修事業部",
  };

  await sendEmail(params.to, subject, html, "workshop_confirmation", trainingFrom);
}

// ============================================================
// Notify admin (徳山さん) about hot leads / workshop registrations
// ============================================================
export async function notifyAdmin(params: {
  subject: string;
  body: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || "t.tokuyama@fulfill-net.com";
  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1e293b;border-radius:8px 8px 0 0;padding:16px 24px;">
    <h1 style="color:#f8fafc;font-size:16px;margin:0;">FormPilot 通知</h1>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;padding:24px;">
    ${params.body}
  </div>
  <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px;">
    この通知はFormPilotから自動送信されています
  </p>
</div>
</body></html>`;

  await sendEmail(adminEmail, params.subject, html, "admin_notify");
}

// ============================================================
// Generic send + log (lazy-load SendGrid to avoid build-time errors)
// ============================================================
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  template: string,
  fromOverride?: { email: string; name: string },
): Promise<void> {
  let status = "sent";
  let error: string | undefined;

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from: fromOverride || { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
    });
  } catch (err: unknown) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    // Log to email_logs table (best-effort)
    try {
      await supabaseAdmin.from("email_logs").insert({
        to_email: to,
        subject,
        template,
        status,
        error: error || null,
      });
    } catch {
      console.error("Failed to log email");
    }
  }
}
