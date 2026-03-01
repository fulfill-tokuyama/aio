import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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
};

function clientToDbFields(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "id") continue;
    const dbKey = FIELD_MAP[key] || key;
    result[dbKey] = value;
  }
  return result;
}

// GET: リード一覧取得（フィルタ対応）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phase = searchParams.get("phase");
    const industry = searchParams.get("industry");
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
    if (q) {
      query = query.or(`company.ilike.%${q}%,url.ilike.%${q}%`);
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
