// app/api/auto-pipeline/route.ts
// 全自動パイプライン: 重複排除 → LLMO診断 → リード保存 → フォーム探索 → 初回メール送信

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis, Weakness, type DiagnosisResult } from "@/lib/diagnosis";
import { scanUrl } from "@/lib/scan-forms";
import { enrichLeadContact } from "@/lib/firecrawl-enrich";
import { sendOutreachEmail } from "@/lib/email";
import { normalizeUrl, domainToCompany, calculateAiScore, getExistingUrls, incrementTemplateStat } from "@/lib/pipeline-utils";
import { requireAuth } from "@/lib/api-auth";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

export const maxDuration = 300;

const MAX_URLS = 20;
const DIAGNOSIS_BATCH = 3;
const FORM_SCAN_BATCH = 5;

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
  const authError = await requireAuth(req);
  if (authError) return authError;
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
      diagnosis: DiagnosisResult;
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
              diagnosis,
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
    // Step 3: リード保存（診断レポートも保存し、メールリンク用に紐付け）
    // ============================================================
    const savedLeads: { id: string; url: string; company: string; llmoScore: number; aiScore: number; weaknesses: string[]; diagnosisReportId: string | null }[] = [];

    for (const lead of diagnosedLeads) {
      let diagnosisReportId: string | null = null;

      // 事前診断済みレポートを diagnosis_reports に保存
      const { data: reportData, error: reportError } = await supabaseAdmin
        .from("diagnosis_reports")
        .insert({
          url: lead.url,
          score: lead.diagnosis.score,
          breakdown: lead.diagnosis.breakdown,
          pagespeed_data: lead.diagnosis.pagespeedData,
          html_analysis: lead.diagnosis.htmlAnalysis,
          weaknesses: lead.diagnosis.weaknesses,
          weakness_details: lead.diagnosis.weaknessDetails,
          suggestions: lead.diagnosis.suggestions,
        })
        .select("id")
        .single();

      if (!reportError && reportData) {
        diagnosisReportId = reportData.id;
      }

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
      if (diagnosisReportId) insertData.diagnosis_report_id = diagnosisReportId;

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
          diagnosisReportId,
        });
      } else if (error) {
        results.push({
          url: lead.url,
          company: lead.company,
          llmoScore: lead.llmoScore,
          aiScore: lead.aiScore,
          weaknesses: lead.weaknesses,
          status: "error",
          error: `DB insert failed: ${error.message}`,
        });
      }
    }

    // ============================================================
    // Step 4: フォーム探索（5並列バッチ）
    // ============================================================
    const leadsWithContact: Array<{
      id: string; url: string; company: string; llmoScore: number; aiScore: number; weaknesses: string[];
      diagnosisReportId?: string | null;
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

      for (let k = 0; k < scanResults.length; k++) {
        const result = scanResults[k];
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
            diagnosisReportId: lead.diagnosisReportId,
            contactEmail: scanResult.contactEmail,
            contactPhone: scanResult.contactPhone,
            formUrl: scanResult.formUrl,
          });
        } else {
          // フォーム探索失敗はリード自体は残す
          leadsWithContact.push({
            ...batch[k],
            diagnosisReportId: batch[k].diagnosisReportId,
            contactEmail: null,
            contactPhone: null,
            formUrl: null,
          });
        }
      }
    }

    // ============================================================
    // Step 4.5: Firecrawl エンリッチ（contact_email が空のリードのみ）
    // ============================================================
    if (process.env.FIRECRAWL_API_KEY) {
      const needsEnrich = leadsWithContact.filter((l) => !l.contactEmail && l.url);
      for (const lead of needsEnrich) {
        try {
          const enriched = await enrichLeadContact(lead.url, lead.company);
          if (enriched.contactEmail || enriched.contactPhone) {
            const updates: Record<string, unknown> = {};
            if (enriched.contactEmail) updates.contact_email = enriched.contactEmail;
            if (enriched.contactPhone) updates.contact_phone = enriched.contactPhone;
            if (enriched.contactEmail || lead.formUrl) updates.phase = "form_found";

            if (Object.keys(updates).length > 0) {
              await supabaseAdmin
                .from("pipeline_leads")
                .update(updates)
                .eq("id", lead.id);
            }

            lead.contactEmail = enriched.contactEmail ?? lead.contactEmail;
            lead.contactPhone = enriched.contactPhone ?? lead.contactPhone;
          }
        } catch {
          // エンリッチ失敗はスキップ
        }
      }
    }

    // ============================================================
    // Step 5: 初回メール送信（skipAutoSend=false の場合のみ）
    // ============================================================
    let emailsSent = 0;
    const sentLeadIds = new Set<string>();

    if (!skipAutoSend) {
      const sendTargets = leadsWithContact.filter(l => l.contactEmail);

      for (const lead of sendTargets) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
          const diagnosisLink = lead.diagnosisReportId
            ? `${appUrl}/signup?diagnosis_id=${lead.diagnosisReportId}`
            : `${appUrl}/diagnosis?url=${encodeURIComponent(lead.url)}`;
          const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";
          const senderName = process.env.NEXT_PUBLIC_SENDER_NAME || "AIO Insight";
          const unsubscribeLink = buildUnsubscribeUrl(lead.id, appUrl);

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
          sentLeadIds.add(lead.id);

          // テンプレート統計更新
          await incrementTemplateStat(1, "sent").catch(() => {});
        } catch (emailErr) {
          console.error(`Email send error for ${lead.company}:`, emailErr);
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
        emailSent: sentLeadIds.has(lead.id),
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
