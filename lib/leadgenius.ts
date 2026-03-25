// lib/leadgenius.ts
import type {
  LeadGeniusSearchDiagnoseResult,
  LeadGeniusBatchDiagnoseResult,
  LeadGeniusOutreachLead,
  LeadGeniusOutreachResult,
} from "@/types/leadgenius";

const LEADGENIUS_API_URL =
  process.env.LEADGENIUS_API_URL ||
  "https://leadgenius-ai-search.vercel.app";

const LEADGENIUS_API_KEY = process.env.LEADGENIUS_API_KEY || "";

export function isLeadGeniusConnected(): boolean {
  return !!process.env.LEADGENIUS_API_KEY;
}

async function leadgeniusRequest<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 120_000
): Promise<T | null> {
  if (!isLeadGeniusConnected()) {
    console.warn("[leadgenius] API key not configured");
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LEADGENIUS_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LEADGENIUS_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[leadgenius] ${path} returned ${res.status}: ${text.slice(0, 200)}`
      );
      return null;
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(`[leadgenius] ${path} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`[leadgenius] ${path} failed:`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchAndDiagnose(params: {
  search: { industry?: string; region?: string; keyword?: string };
  diagnoseTop?: number;
  options?: { skipCrawl?: boolean };
}): Promise<LeadGeniusSearchDiagnoseResult | null> {
  return leadgeniusRequest<LeadGeniusSearchDiagnoseResult>(
    "/api/v1/search-and-diagnose",
    {
      search: params.search,
      diagnoseTop: params.diagnoseTop ?? 5,
      options: params.options,
    }
  );
}

export async function batchDiagnose(
  companies: Array<{
    id: string;
    name: string;
    url: string;
    industry?: string;
    region?: string;
  }>,
  options?: { concurrency?: number; skipCrawl?: boolean }
): Promise<LeadGeniusBatchDiagnoseResult | null> {
  return leadgeniusRequest<LeadGeniusBatchDiagnoseResult>(
    "/api/v1/batch-diagnose",
    { companies, options }
  );
}

export async function sendOutreach(
  leads: LeadGeniusOutreachLead[],
  sender: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
  },
  options?: { dryRun?: boolean; scheduledAt?: string }
): Promise<LeadGeniusOutreachResult | null> {
  return leadgeniusRequest<LeadGeniusOutreachResult>(
    "/api/v1/send-outreach",
    { leads, sender, options },
    60_000
  );
}
