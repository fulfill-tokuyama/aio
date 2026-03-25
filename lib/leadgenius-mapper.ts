// lib/leadgenius-mapper.ts
import type {
  LeadGeniusCompany,
  LeadGeniusDiagnosisResult,
} from "@/types/leadgenius";
import { calculateAiScore } from "@/lib/pipeline-utils";

interface PipelineLeadUpsertData {
  company: string;
  url: string;
  industry?: string;
  region?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  heat_score?: number;
  llmo_score?: number;
  ai_score?: number;
  campaign: string;
  description?: string;
  weaknesses?: Array<{ category: string; severity: string; description: string }>;
  founded_year?: number;
  employee_count?: string;
  representative?: string;
  contact_name?: string;
  contact_position?: string;
  phase?: string;
  discovered_at?: string;
}

export function mapToPipelineLead(
  company: LeadGeniusCompany,
  diagnosis: LeadGeniusDiagnosisResult | undefined,
  isNew: boolean
): PipelineLeadUpsertData {
  const segment = diagnosis?.targetSegment;
  const campaign = segment && segment !== "none"
    ? `leadgenius-${segment}`
    : "leadgenius";

  const weaknesses: Array<{ category: string; severity: string; description: string }> = [];

  if (diagnosis?.top3Improvements) {
    for (const item of diagnosis.top3Improvements) {
      weaknesses.push({ category: "llmo", severity: "high", description: item });
    }
  }

  if (diagnosis?.schemaAudit) {
    weaknesses.push({
      category: "schema",
      severity: diagnosis.schemaAudit.score < 20 ? "critical" : "medium",
      description: `Schema score: ${diagnosis.schemaAudit.score}/100. Types found: ${diagnosis.schemaAudit.types.join(", ") || "none"}`,
    });
  }

  const llmoScore = diagnosis?.visibilityScore?.total ?? 0;
  const weaknessStrings = weaknesses.map((w) => w.description);
  const aiScore = calculateAiScore(llmoScore, weaknessStrings);

  const data: PipelineLeadUpsertData = {
    company: company.name,
    url: company.url,
    industry: company.industry || undefined,
    region: company.region || undefined,
    contact_email: company.email || undefined,
    contact_phone: company.phone || undefined,
    address: company.address || undefined,
    heat_score: company.heat_score,
    llmo_score: llmoScore,
    ai_score: aiScore,
    campaign,
    description: diagnosis?.executiveSummary || undefined,
    weaknesses: weaknesses.length > 0 ? weaknesses : undefined,
    founded_year: company.founded_year || undefined,
    employee_count: company.employee_count || undefined,
    representative: company.representative || undefined,
    contact_name: company.contact_name || undefined,
    contact_position: company.contact_position || undefined,
  };

  if (isNew) {
    data.phase = "discovered";
    data.discovered_at = new Date().toISOString();
  }

  return data;
}
