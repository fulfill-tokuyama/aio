import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { sendOutreach, isLeadGeniusConnected } from "@/lib/leadgenius";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  LeadGeniusOutreachRequest,
  LeadGeniusOutreachLead,
} from "@/types/leadgenius";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  if (!isLeadGeniusConnected()) {
    return NextResponse.json(
      { error: "LeadGenius API not configured" },
      { status: 503 }
    );
  }

  let body: LeadGeniusOutreachRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { leadIds, dryRun } = body;

  if (!leadIds || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds required" }, { status: 400 });
  }

  const { data: dbLeads } = await supabaseAdmin
    .from("pipeline_leads")
    .select("id, company, url, contact_email, industry, region, llmo_score, weaknesses, description, campaign")
    .in("id", leadIds);

  if (!dbLeads || dbLeads.length === 0) {
    return NextResponse.json({ error: "No matching leads found" }, { status: 404 });
  }

  const leadsWithEmail = dbLeads.filter((l) => l.contact_email);
  if (leadsWithEmail.length === 0) {
    return NextResponse.json(
      { error: "None of the selected leads have an email address" },
      { status: 400 }
    );
  }

  const outreachLeads: LeadGeniusOutreachLead[] = leadsWithEmail.map((l) => {
    const campaignSegment = (l.campaign || "").replace("leadgenius-", "");
    const segment = (["hpcreater", "llmo", "both"].includes(campaignSegment)
      ? campaignSegment
      : "llmo") as "hpcreater" | "llmo" | "both";

    return {
      companyId: l.id,
      companyName: l.company,
      email: l.contact_email!,
      targetSegment: segment,
      visibilityScore: l.llmo_score || undefined,
      executiveSummary: l.description || undefined,
      top3Improvements: Array.isArray(l.weaknesses)
        ? l.weaknesses.slice(0, 3).map((w: { description?: string }) => w.description || String(w))
        : undefined,
      industry: l.industry || undefined,
      region: l.region || undefined,
      url: l.url,
    };
  });

  const sender = {
    companyName: process.env.OUTREACH_SENDER_COMPANY || "BeginAI株式会社",
    contactName: process.env.OUTREACH_SENDER_NAME || "徳山",
    email: process.env.OUTREACH_SENDER_EMAIL || "info@e-learning-ai.jp",
  };

  const result = await sendOutreach(outreachLeads, sender, {
    dryRun: dryRun ?? false,
  });

  if (!result) {
    return NextResponse.json(
      { error: "LeadGenius outreach API failed" },
      { status: 502 }
    );
  }

  if (!dryRun) {
    const now = new Date().toISOString();

    for (const entry of result.results) {
      if (entry.status === "sent" || entry.status === "scheduled") {
        await supabaseAdmin
          .from("pipeline_leads")
          .update({
            phase: "sent",
            sent_at: now,
            follow_up_count: 99,
            previous_phase: null,
          })
          .eq("id", entry.companyId);
      }
    }

    await supabaseAdmin.from("pipeline_activity_log").insert({
      event_type: "leadgenius_outreach",
      message: `LeadGeniusアウトリーチ: ${result.summary.sent}件送信, ${result.summary.failed}件失敗`,
      metadata: {
        leadIds,
        summary: result.summary,
        results: result.results.map((r) => ({
          companyId: r.companyId,
          companyName: r.companyName,
          status: r.status,
          segment: r.segment,
        })),
      },
    });
  }

  return NextResponse.json(result);
}
