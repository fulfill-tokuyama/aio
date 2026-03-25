import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

// snake_case (DB) → camelCase (client) 変換
function dbRowToClientLead(row: Record<string, unknown>) {
  return {
    id: row.id,
    company: row.company,
    url: row.url,
    industry: row.industry,
    region: row.region,
    companySize: row.company_size,
    revenue: row.revenue,
    hasAdSpend: row.has_ad_spend,
    llmoScore: row.llmo_score,
    aiScore: row.ai_score,
    weaknesses: row.weaknesses ?? [],
    phase: row.phase,
    previousPhase: row.previous_phase,
    formUrl: row.form_url,
    stripeStatus: row.stripe_status,
    mrr: row.mrr,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    repliedAt: row.replied_at,
    discoveredAt: row.discovered_at,
    templateUsed: row.template_used,
    followUpCount: row.follow_up_count,
    followUpScheduled: row.follow_up_scheduled,
    diagnosisSent: row.diagnosis_sent,
    openedEmail: row.opened_email,
    clickedLink: row.clicked_link,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactPageUrl: row.contact_page_url,
    address: row.address,
    foundedYear: row.founded_year,
    employeeCount: row.employee_count,
    representative: row.representative,
    contactName: row.contact_name,
    contactPosition: row.contact_position,
    capital: row.capital,
    description: row.description,
    heatScore: row.heat_score,
    googleMapsUrl: row.google_maps_url,
    campaign: row.campaign,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// camelCase (client) → snake_case (DB) 変換
const FIELD_MAP: Record<string, string> = {
  companySize: "company_size",
  hasAdSpend: "has_ad_spend",
  llmoScore: "llmo_score",
  aiScore: "ai_score",
  formUrl: "form_url",
  stripeStatus: "stripe_status",
  scheduledAt: "scheduled_at",
  sentAt: "sent_at",
  repliedAt: "replied_at",
  discoveredAt: "discovered_at",
  templateUsed: "template_used",
  followUpCount: "follow_up_count",
  followUpScheduled: "follow_up_scheduled",
  diagnosisSent: "diagnosis_sent",
  openedEmail: "opened_email",
  clickedLink: "clicked_link",
  contactEmail: "contact_email",
  contactPhone: "contact_phone",
  contactPageUrl: "contact_page_url",
  foundedYear: "founded_year",
  employeeCount: "employee_count",
  representative: "representative",
  contactName: "contact_name",
  contactPosition: "contact_position",
  capital: "capital",
  description: "description",
  heatScore: "heat_score",
  googleMapsUrl: "google_maps_url",
  address: "address",
  campaign: "campaign",
  previousPhase: "previous_phase",
};

// 許可されたフィールドのみDB更新に含める
const ALLOWED_DB_FIELDS = new Set([
  "company", "url", "industry", "region", "notes", "phase", "weaknesses", "previous_phase",
  ...Object.values(FIELD_MAP),
]);

function clientToDbFields(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "id") continue;
    const dbKey = FIELD_MAP[key] || key;
    if (!ALLOWED_DB_FIELDS.has(dbKey)) continue;
    result[dbKey] = value;
  }
  return result;
}

// GET: リード一覧取得（フィルタ対応）
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const phase = searchParams.get("phase");
    const industry = searchParams.get("industry");
    const campaign = searchParams.get("campaign");
    const q = searchParams.get("q");

    let query = supabaseAdmin
      .from("pipeline_leads")
      .select("*")
      .order("ai_score", { ascending: false });

    if (phase && phase !== "all") {
      query = query.eq("phase", phase);
    }
    if (industry && industry !== "all") {
      query = query.eq("industry", industry);
    }
    if (campaign && campaign !== "all") {
      query = query.eq("campaign", campaign);
    }
    if (q) {
      // PostgREST特殊文字をサニタイズ
      const sanitized = q.replace(/[.,%()]/g, "");
      if (sanitized) {
        query = query.or(`company.ilike.%${sanitized}%,url.ilike.%${sanitized}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leads = (data || []).map(dbRowToClientLead);
    return NextResponse.json({ leads });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: リード新規作成
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();

    if (!body.company?.trim() || !body.url?.trim()) {
      return NextResponse.json(
        { error: "会社名とURLは必須です" },
        { status: 400 }
      );
    }

    const dbFields = clientToDbFields(body);

    const { data, error } = await supabaseAdmin
      .from("pipeline_leads")
      .insert(dbFields)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: dbRowToClientLead(data) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: リード更新
export async function PUT(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "idは必須です" }, { status: 400 });
    }

    const dbFields = clientToDbFields(updates);

    const { data, error } = await supabaseAdmin
      .from("pipeline_leads")
      .update(dbFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead: dbRowToClientLead(data) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: リード削除
export async function DELETE(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "idは必須です" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("pipeline_leads")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
