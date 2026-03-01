import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

// 顧客emailから診断データを取得する共通関数
async function fetchDiagnosisForEmail(email: string) {
  let diagnosisData = null;
  let diagnosisHistory: { score: number; createdAt: string; weaknesses: string[]; suggestions: string[]; breakdown: Record<string, number> | null }[] = [];

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, company, url")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (leads && leads.length > 0) {
    const leadIds = leads.map(l => l.id);
    const latestLead = leads[0];

    const { data: allReports } = await supabaseAdmin
      .from("diagnosis_reports")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true });

    if (allReports && allReports.length > 0) {
      const latestReport = allReports[allReports.length - 1];
      diagnosisData = {
        company: latestLead.company,
        url: latestLead.url,
        score: latestReport.score,
        pagespeedData: latestReport.pagespeed_data,
        htmlAnalysis: latestReport.html_analysis,
        weaknesses: latestReport.weaknesses,
        suggestions: latestReport.suggestions,
        createdAt: latestReport.created_at,
      };

      diagnosisHistory = allReports.map(r => ({
        score: r.score,
        createdAt: r.created_at,
        weaknesses: r.weaknesses || [],
        suggestions: r.suggestions || [],
        breakdown: r.html_analysis?.breakdown || null,
      }));
    }
  }

  return { diagnosisData, diagnosisHistory };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const adminSecret = process.env.ADMIN_SECRET;
  const isAdminPreview = !!(adminSecret && token === adminSecret);

  // 管理者プレビュー: 最新の顧客データを表示
  if (isAdminPreview) {
    const { data: latestCustomer } = await supabaseAdmin
      .from("customers")
      .select("id, email")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestCustomer?.email) {
      const { diagnosisData, diagnosisHistory } = await fetchDiagnosisForEmail(latestCustomer.email);
      return (
        <DashboardClient
          customerId={latestCustomer.id}
          diagnosisData={diagnosisData}
          diagnosisHistory={diagnosisHistory}
          userEmail={`admin-preview (${latestCustomer.email})`}
        />
      );
    }

    // 顧客がいない場合は空のダッシュボードを表示
    return (
      <DashboardClient
        customerId=""
        diagnosisData={null}
        diagnosisHistory={[]}
        userEmail="admin-preview"
      />
    );
  }

  // 通常の認証フロー
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("supabase_user_id", user.id)
    .single();

  let diagnosisData = null;
  let diagnosisHistory: { score: number; createdAt: string; weaknesses: string[]; suggestions: string[]; breakdown: Record<string, number> | null }[] = [];
  if (customer?.email) {
    const result = await fetchDiagnosisForEmail(customer.email);
    diagnosisData = result.diagnosisData;
    diagnosisHistory = result.diagnosisHistory;
  }

  return (
    <DashboardClient
      customerId={customer?.id || ""}
      diagnosisData={diagnosisData}
      diagnosisHistory={diagnosisHistory}
      userEmail={user.email || ""}
    />
  );
}
