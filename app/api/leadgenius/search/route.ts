import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { searchAndDiagnose, isLeadGeniusConnected } from "@/lib/leadgenius";
import { mapToPipelineLead } from "@/lib/leadgenius-mapper";
import { supabaseAdmin } from "@/lib/supabase";
import type { LeadGeniusSearchRequest } from "@/types/leadgenius";

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

  let body: LeadGeniusSearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { industry, region, keyword, diagnoseTop } = body;

  if (!industry && !region && !keyword) {
    return NextResponse.json(
      { error: "At least one search parameter required (industry, region, or keyword)" },
      { status: 400 }
    );
  }

  const result = await searchAndDiagnose({
    search: { industry, region, keyword },
    diagnoseTop: diagnoseTop ?? 5,
  });

  if (!result) {
    return NextResponse.json(
      { error: "LeadGenius API call failed" },
      { status: 502 }
    );
  }

  const upsertedIds: string[] = [];

  for (const company of result.searchResults.companies) {
    const diagnosis = result.diagnosisResults.find(
      (d) => d.companyId === company.id
    );

    const { data: existing } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id")
      .eq("url", company.url)
      .maybeSingle();

    const isNew = !existing;
    const mapped = mapToPipelineLead(company, diagnosis, isNew);

    if (isNew) {
      const { data: inserted } = await supabaseAdmin
        .from("pipeline_leads")
        .insert(mapped)
        .select("id")
        .single();
      if (inserted) upsertedIds.push(inserted.id);
    } else {
      const { phase, discovered_at, campaign, ...updateData } = mapped;
      await supabaseAdmin
        .from("pipeline_leads")
        .update(updateData)
        .eq("id", existing.id);
      upsertedIds.push(existing.id);
    }
  }

  await supabaseAdmin.from("pipeline_activity_log").insert({
    event_type: "leadgenius_search",
    message: `LeadGenius検索: ${[industry, region, keyword].filter(Boolean).join(" ")}`,
    metadata: {
      query: { industry, region, keyword },
      totalFound: result.searchResults.totalFound,
      diagnosed: result.diagnosisResults.length,
      upserted: upsertedIds.length,
    },
  });

  return NextResponse.json({
    searchResults: result.searchResults,
    diagnosisResults: result.diagnosisResults,
    actionableLeads: result.actionableLeads,
    savedLeadIds: upsertedIds,
  });
}
