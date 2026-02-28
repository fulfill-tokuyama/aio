import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch customer info
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("supabase_user_id", user.id)
    .single();

  // Fetch diagnosis reports for this customer's email
  let diagnosisData = null;
  let diagnosisHistory: { score: number; createdAt: string; weaknesses: string[]; suggestions: string[]; breakdown: Record<string, number> | null }[] = [];
  if (customer?.email) {
    // Get all leads for this customer to collect reports across leads
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("id, company, url")
      .eq("email", customer.email)
      .order("created_at", { ascending: false });

    if (leads && leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      const latestLead = leads[0];

      // Fetch ALL diagnosis reports for this customer's leads (time series)
      const { data: allReports } = await supabaseAdmin
        .from("diagnosis_reports")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: true });

      if (allReports && allReports.length > 0) {
        // Latest report for main diagnosis display
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

        // Build history for trend chart
        diagnosisHistory = allReports.map(r => ({
          score: r.score,
          createdAt: r.created_at,
          weaknesses: r.weaknesses || [],
          suggestions: r.suggestions || [],
          breakdown: r.html_analysis?.breakdown || null,
        }));
      }
    }
  }

  return (
    <DashboardClient
      diagnosisData={diagnosisData}
      diagnosisHistory={diagnosisHistory}
      userEmail={user.email || ""}
    />
  );
}
