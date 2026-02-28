"use client";

import AIODashboard from "@/components/AIODashboard";

interface DiagnosisData {
  company: string;
  url: string;
  score: number;
  pagespeedData: Record<string, unknown> | null;
  htmlAnalysis: Record<string, unknown>;
  weaknesses: string[];
  suggestions: string[];
  createdAt: string;
}

interface Props {
  diagnosisData: DiagnosisData | null;
  userEmail: string;
}

export default function DashboardClient({ diagnosisData, userEmail }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Dashboard = AIODashboard as any;
  return <Dashboard diagnosisData={diagnosisData} userEmail={userEmail} />;
}
