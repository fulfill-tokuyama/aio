import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { batchDiagnose, isLeadGeniusConnected } from "@/lib/leadgenius";
import { mapToPipelineLead } from "@/lib/leadgenius-mapper";
import { supabaseAdmin } from "@/lib/supabase";
import type { LeadGeniusDiagnoseRequest } from "@/types/leadgenius";

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

  let body: LeadGeniusDiagnoseRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.leadIds || body.leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds required" }, { status: 400 });
  }

  if (body.leadIds.length > 10) {
    return NextResponse.json(
      { error: "Max 10 leads per batch" },
      { status: 400 }
    );
  }

  const { data: leads } = await supabaseAdmin
    .from("pipeline_leads")
    .select("id, company, url, industry, region")
    .in("id", body.leadIds);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No matching leads found" }, { status: 404 });
  }

  const companies = leads.map((l) => ({
    id: l.id,
    name: l.company,
    url: l.url,
    industry: l.industry || undefined,
    region: l.region || undefined,
  }));

  const result = await batchDiagnose(companies);

  if (!result) {
    return NextResponse.json(
      { error: "LeadGenius batch-diagnose failed" },
      { status: 502 }
    );
  }

  for (const diag of result.results) {
    const lead = leads.find((l) => l.id === diag.companyId);
    if (!lead) continue;

    const company = {
      id: lead.id,
      name: lead.company,
      url: lead.url,
      industry: lead.industry || "",
      region: lead.region || "",
      address: "",
      phone: "",
      heat_score: 0,
    };

    const mapped = mapToPipelineLead(company, diag, false);
    const { phase, discovered_at, company: _c, url: _u, ...updateData } = mapped;

    await supabaseAdmin
      .from("pipeline_leads")
      .update(updateData)
      .eq("id", lead.id);
  }

  return NextResponse.json({
    results: result.results,
    summary: result.summary,
  });
}
