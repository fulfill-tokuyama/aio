import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DiagnosisDetailClient from "./DiagnosisDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DiagnosisDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/signup?diagnosis_id=${id}`);
  }

  // 診断結果を取得（service_role ではなく RLS 経由 or 公開読み取り）
  // user_id が紐付いていれば RLS で読める。紐付いていなければ紐付ける
  const { supabaseAdmin } = await import("@/lib/supabase");

  // まず user_id を紐付け（未紐付けの場合）
  await supabaseAdmin
    .from("diagnosis_reports")
    .update({ user_id: user.id })
    .eq("id", id)
    .is("user_id", null);

  // 診断結果を取得
  const { data: report, error } = await supabaseAdmin
    .from("diagnosis_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    redirect("/diagnosis");
  }

  return <DiagnosisDetailClient report={report} />;
}
