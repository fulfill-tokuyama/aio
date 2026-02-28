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

  // Fetch latest diagnosis report for this customer's email
  let diagnosisData = null;
  if (customer?.email) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, company, url")
      .eq("email", customer.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lead) {
      const { data: report } = await supabaseAdmin
        .from("diagnosis_reports")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (report) {
        diagnosisData = {
          company: lead.company,
          url: lead.url,
          score: report.score,
          pagespeedData: report.pagespeed_data,
          htmlAnalysis: report.html_analysis,
          weaknesses: report.weaknesses,
          suggestions: report.suggestions,
          createdAt: report.created_at,
        };
      }
    }
  }

  return <DashboardClient diagnosisData={diagnosisData} userEmail={user.email || ""} />;
}
