// app/api/auto-pipeline/route.ts
// 全自動パイプライン: 重複排除 → LLMO診断 → リード保存 → フォーム探索 → 初回メール送信

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis, Weakness } from "@/lib/diagnosis";
import { scanUrl } from "@/lib/scan-forms";
import { sendOutreachEmail } from "@/lib/email";

export const maxDuration = 300;

const MAX_URLS = 20;
const DIAGNOSIS_BATCH = 3;
const FORM_SCAN_BATCH = 5;

// --- Reused from pipeline-scan ---
function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

function domainToCompany(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "").split(".")[0];
  } catch {
    return url;
  }
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4.0,
  high: 2.5,
  medium: 1.5,
  low: 0.5,
};

function calculateAiScore(llmoScore: number, weaknesses: string[], weaknessDetails?: Weakness[]): number {
  const baseScore = 100 - llmoScore;

  let weaknessBonus: number;
  let criticalCount = 0;

  if (weaknessDetails && weaknessDetails.length > 0) {
    weaknessBonus = Math.min(
      weaknessDetails.reduce((sum, w) => sum + (SEVERITY_WEIGHT[w.severity] || 1), 0),
      30
    );
    criticalCount = weaknessDetails.filter(w => w.severity === "critical").length;
  } else {
    weaknessBonus = Math.min(weaknesses.length * 1.5, 30);
  }

  const criticalMultiplier = criticalCount >= 2 ? 1.10 : 1.0;
  const raw = (baseScore + weaknessBonus) * criticalMultiplier;
  return Math.round(Math.max(0, Math.min(150, raw)));
}

async function getExistingUrls(): Promise<Set<string>> {
  // pipeline_leads と leads 両方から既存URLを取得し、重複を防ぐ
  const [pipelineResult, leadsResult] = await Promise.all([
    supabaseAdmin.from("pipeline_leads").select("url"),
    supabaseAdmin.from("leads").select("url"),
  ]);

  const urls = new Set<string>();
  if (pipelineResult.data) {
    for (const row of pipelineResult.data) {
      if (row.url) urls.add(normalizeUrl(row.url));
    }
  }
  if (leadsResult.data) {
    for (const row of leadsResult.data) {
      if (row.url) urls.add(normalizeUrl(row.url));
    }
  }
  return urls;
}

// --- Step result types ---
interface PipelineLeadResult {
  url: string;
  company: string;
  llmoScore: number;
  aiScore: number;
  weaknesses: string[];
  leadId?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  formUrl?: string | null;
  emailSent?: boolean;
  status: "success" | "error" | "skipped" | "filtered";
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      urls: rawUrls,
      llmoScoreMax = 40,
      industry,
      region,
      skipAutoSend = false,
    } = body as {
      urls: string[];
      llmoScoreMax?: number;
      industry?: string;
      region?: string;
      skipAutoSend?: boolean;
    };

    if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
      return NextResponse.json({ error: "URLリストは必須です" }, { status: 400 });
    }

    // 最大20 URL/回
    const limitedUrls = rawUrls.slice(0, MAX_URLS);

    // ============================================================
    // Step 1: 重複排除
    // ============================================================
    const normalized = Array.from(new Set(limitedUrls.map(normalizeUrl).filter(Boolean)));
    const existingUrls = await getExistingUrls();
    const toProcess: string[] = [];
    const skippedDuplicates: string[] = [];

    for (const url of normalized) {
      if (existingUrls.has(url)) {
        skippedDuplicates.push(url);
      } else {
        toProcess.push(url);
      }
    }

    const results: PipelineLeadResult[] = [];

    // 重複分
    for (const url of skippedDuplicates) {
      results.push({
        url,
        company: domainToCompany(url),
        llmoScore: 0,
        aiScore: 0,
        weaknesses: [],
        status: "skipped",
      });
    }

    // ============================================================
    // Step 2: LLMO診断（3並列バッチ）
    // ============================================================
    const diagnosedLeads: {
      url: string;
      company: string;
      llmoScore: number;
      aiScore: number;
      weaknesses: string[];
      weaknessDetails: Weakness[];
    }[] = [];

    let diagFailed = 0;

    for (let i = 0; i < toProcess.length; i += DIAGNOSIS_BATCH) {
      const batch = toProcess.slice(i, i + DIAGNOSIS_BATCH);
      const batchResults = await Promise.allSettled(
        batch.map(async (url) => {
          const diagnosis = await runDiagnosis(url);
          return { url, diagnosis };
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === "fulfilled") {
          const { url, diagnosis } = result.value;
          const company = diagnosis.htmlAnalysis.title || domainToCompany(url);
          const llmoScore = diagnosis.score;
          const aiScore = calculateAiScore(llmoScore, diagnosis.weaknesses, diagnosis.weaknessDetails);

          if (llmoScore <= llmoScoreMax) {
            diagnosedLeads.push({
              url,
              company,
              llmoScore,
              aiScore,
              weaknesses: diagnosis.weaknesses,
              weaknessDetails: diagnosis.weaknessDetails,
            });
          } else {
            results.push({
              url,
              company,
              llmoScore,
              aiScore,
              weaknesses: diagnosis.weaknesses,
              status: "filtered",
            });
          }
        } else {
          const url = batch[j];
          diagFailed++;
          results.push({
            url,
            company: domainToCompany(url),
            llmoScore: 0,
            aiScore: 0,
            weaknesses: [],
            status: "error",
            error: result.reason?.message || "診断エラー",
          });
        }
      }
    }

    // ============================================================
    // Step 3: リード保存
    // ============================================================
    const savedLeads: { id: string; url: string; company: string; llmoScore: number; aiScore: number; weaknesses: string[] }[] = [];

    for (const lead of diagnosedLeads) {
      const insertData: Record<string, unknown> = {
        company: lead.company,
        url: lead.url,
        llmo_score: lead.llmoScore,
        ai_score: lead.aiScore,
        weaknesses: lead.weaknesses,
        phase: "discovered",
        discovered_at: new Date().toISOString(),
      };
      if (industry) insertData.industry = industry;
      if (region) insertData.region = region;

      const { data, error } = await supabaseAdmin
        .from("pipeline_leads")
        .insert(insertData)
        .select("id")
        .single();

      if (!error && data) {
        savedLeads.push({
          id: data.id,
          url: lead.url,
          company: lead.company,
          llmoScore: lead.llmoScore,
          aiScore: lead.aiScore,
          weaknesses: lead.weaknesses,
        });
      }
    }

    // ============================================================
    // Step 4: フォーム探索（5並列バッチ）
    // ============================================================
    const leadsWithContact: Array<{
      id: string; url: string; company: string; llmoScore: number; aiScore: number; weaknesses: string[];
      contactEmail?: string | null;
      contactPhone?: string | null;
      formUrl?: string | null;
    }> = [];

    for (let i = 0; i < savedLeads.length; i += FORM_SCAN_BATCH) {
      const batch = savedLeads.slice(i, i + FORM_SCAN_BATCH);
      const scanResults = await Promise.allSettled(
        batch.map(async (lead) => {
          const scanResult = await scanUrl(lead.url);
          return { lead, scanResult };
        })
      );

      for (const result of scanResults) {
        if (result.status === "fulfilled") {
          const { lead, scanResult } = result.value;
          const updates: Record<string, unknown> = {};

          if (scanResult.contactEmail) updates.contact_email = scanResult.contactEmail;
          if (scanResult.contactPhone) updates.contact_phone = scanResult.contactPhone;
          if (scanResult.formUrl) updates.form_url = scanResult.formUrl;
          if (scanResult.contactPageUrl) updates.contact_page_url = scanResult.contactPageUrl;
          if (scanResult.contactEmail || scanResult.formUrl) {
            updates.phase = "form_found";
          }

          if (Object.keys(updates).length > 0) {
            await supabaseAdmin
              .from("pipeline_leads")
              .update(updates)
              .eq("id", lead.id);
          }

          leadsWithContact.push({
            ...lead,
            contactEmail: scanResult.contactEmail,
            contactPhone: scanResult.contactPhone,
            formUrl: scanResult.formUrl,
          });
        } else {
          // フォーム探索失敗はリード自体は残す
          leadsWithContact.push({
            ...batch[scanResults.indexOf(result)],
            contactEmail: null,
            contactPhone: null,
            formUrl: null,
          });
        }
      }
    }

    // ============================================================
    // Step 5: 初回メール送信（skipAutoSend=false の場合のみ）
    // ============================================================
    let emailsSent = 0;

    if (!skipAutoSend) {
      const sendTargets = leadsWithContact.filter(l => l.contactEmail);

      for (const lead of sendTargets) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
          const diagnosisLink = `${appUrl}/diagnosis?url=${encodeURIComponent(lead.url)}`;
          const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";
          const senderName = process.env.NEXT_PUBLIC_SENDER_NAME || "AIO Insight";
          const unsubscribeLink = `${appUrl}/unsubscribe?lid=${lead.id}`;

          await sendOutreachEmail({
            to: lead.contactEmail!,
            data: {
              company: lead.company,
              llmoScore: lead.llmoScore,
              weaknesses: lead.weaknesses,
              diagnosisLink,
              paymentLink,
              senderName,
              leadId: lead.id,
              unsubscribeLink,
            },
            step: 1,
          });

          // DB更新: sent phaseに遷移
          const nextScheduled = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
          await supabaseAdmin
            .from("pipeline_leads")
            .update({
              phase: "sent",
              sent_at: new Date().toISOString(),
              template_used: "outreach_step1",
              follow_up_count: 1,
              follow_up_scheduled: nextScheduled,
            })
            .eq("id", lead.id);

          emailsSent++;
        } catch {
          // メール送信エラーは継続
        }
      }
    }

    // ============================================================
    // 結果まとめ
    // ============================================================
    for (const lead of leadsWithContact) {
      results.push({
        url: lead.url,
        company: lead.company,
        llmoScore: lead.llmoScore,
        aiScore: lead.aiScore,
        weaknesses: lead.weaknesses,
        leadId: lead.id,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        formUrl: lead.formUrl,
        emailSent: !skipAutoSend && !!lead.contactEmail,
        status: "success",
      });
    }

    const summary = {
      totalInput: limitedUrls.length,
      duplicateSkipped: skippedDuplicates.length,
      diagnosed: toProcess.length - diagFailed,
      diagnosisFailed: diagFailed,
      filteredByScore: diagnosedLeads.length < (toProcess.length - diagFailed)
        ? (toProcess.length - diagFailed) - diagnosedLeads.length
        : 0,
      savedAsLeads: savedLeads.length,
      formsFound: leadsWithContact.filter(l => l.contactEmail || l.formUrl).length,
      emailsSent,
    };

    return NextResponse.json({ summary, results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Pipeline failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
