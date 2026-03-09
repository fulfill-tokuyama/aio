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

  await sendEmail(params.to, subject, html, "training_outreach");
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
      from: { email: FROM_EMAIL, name: FROM_NAME },
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
