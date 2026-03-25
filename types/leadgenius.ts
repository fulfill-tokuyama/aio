// types/leadgenius.ts
// LeadGenius API v1 response types

export interface LeadGeniusCompany {
  id: string;
  name: string;
  url: string;
  industry: string;
  region: string;
  address: string;
  phone: string;
  email?: string;
  heat_score: number;
  founded_year?: number;
  employee_count?: string;
  representative?: string;
  contact_name?: string;
  contact_position?: string;
}

export interface LeadGeniusDiagnosisResult {
  companyId: string;
  companyName: string;
  companyUrl: string;
  targetSegment: "hpcreater" | "llmo" | "both" | "none";
  visibilityScore?: {
    inclusionRate: number;
    recommendationPosition: number;
    total: number;
  };
  executiveSummary?: string;
  top3Improvements?: string[];
  schemaAudit?: { types: string[]; score: number };
}

export interface LeadGeniusSearchDiagnoseResult {
  searchResults: {
    companies: LeadGeniusCompany[];
    totalFound: number;
  };
  diagnosisResults: LeadGeniusDiagnosisResult[];
  actionableLeads: {
    hpcreater: Array<LeadGeniusDiagnosisResult & { company: LeadGeniusCompany }>;
    llmo: Array<LeadGeniusDiagnosisResult & { company: LeadGeniusCompany }>;
  };
  processedAt: string;
}

export interface LeadGeniusBatchDiagnoseResult {
  results: LeadGeniusDiagnosisResult[];
  summary: {
    total: number;
    diagnosed: number;
    failed: number;
    segments: Record<string, number>;
  };
  processedAt: string;
}

export interface LeadGeniusOutreachLead {
  companyId: string;
  companyName: string;
  email: string;
  targetSegment: "hpcreater" | "llmo" | "both";
  visibilityScore?: number;
  targetReasons?: string[];
  executiveSummary?: string;
  top3Improvements?: string[];
  industry?: string;
  region?: string;
  url?: string;
}

export interface LeadGeniusOutreachResultEntry {
  companyId: string;
  companyName: string;
  to: string;
  subject: string;
  body: string;
  segment: string;
  status: "sent" | "scheduled" | "dry_run" | "failed" | "skipped";
  resendId?: string;
  error?: string;
}

export interface LeadGeniusOutreachResult {
  results: LeadGeniusOutreachResultEntry[];
  summary: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    dryRun: boolean;
  };
}

// BFF request/response types (used by UI ↔ BFF routes)

export interface LeadGeniusSearchRequest {
  industry?: string;
  region?: string;
  keyword?: string;
  diagnoseTop?: number;
}

export interface LeadGeniusDiagnoseRequest {
  leadIds: string[];
}

export interface LeadGeniusQueueAction {
  action: "enqueue" | "dequeue";
  leadIds: string[];
}

export interface LeadGeniusOutreachRequest {
  leadIds: string[];
  dryRun?: boolean;
}
