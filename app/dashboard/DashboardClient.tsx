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

interface DiagnosisHistoryEntry {
  score: number;
  createdAt: string;
  weaknesses: string[];
  suggestions: string[];
  breakdown: Record<string, number> | null;
}

interface Props {
  customerId: string;
  diagnosisData: DiagnosisData | null;
  diagnosisHistory: DiagnosisHistoryEntry[];
  userEmail: string;
}

export default function DashboardClient({ customerId, diagnosisData, diagnosisHistory, userEmail }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Dashboard = AIODashboard as any;
  return (
    <Dashboard
      customerId={customerId}
      diagnosisData={diagnosisData}
      diagnosisHistory={diagnosisHistory}
      userEmail={userEmail}
    />
  );
}
