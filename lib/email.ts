import { supabaseAdmin } from "./supabase";
import {
  buildDiagnosisEmailSubject,
  buildDiagnosisEmailHtml,
} from "./email-templates/diagnosis";
import {
  buildWelcomeEmailSubject,
  buildWelcomeEmailHtml,
} from "./email-templates/welcome";
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
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
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
