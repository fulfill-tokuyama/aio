# LeadGenius API Client Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a LeadGenius API client to AIO Insight with BFF API routes and a dedicated UI page for search, diagnosis, queue management, and outreach.

**Architecture:** `/lib/leadgenius.ts` client calls LeadGenius v1 API. BFF routes in `/app/api/leadgenius/` proxy requests and persist results to Supabase `pipeline_leads`. A new `/app/leadgenius/` page provides a 3-tab UI (search results, send queue, sent history).

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Tailwind CSS, LeadGenius REST API v1

**Spec:** `docs/superpowers/specs/2026-03-25-leadgenius-client-integration-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `types/leadgenius.ts` | LeadGenius API response types |
| Create | `lib/leadgenius.ts` | API client (connection check, request wrappers) |
| Create | `supabase-migration-leadgenius.sql` | Add `previous_phase` column |
| Create | `app/api/leadgenius/search/route.ts` | BFF: search-and-diagnose proxy + Supabase upsert |
| Create | `app/api/leadgenius/diagnose/route.ts` | BFF: batch-diagnose proxy |
| Create | `app/api/leadgenius/queue/route.ts` | BFF: queue CRUD (phase management) |
| Create | `app/api/leadgenius/outreach/route.ts` | BFF: send-outreach proxy + activity log |
| Create | `lib/leadgenius-mapper.ts` | LeadGenius → pipeline_leads data mapping |
| Create | `app/leadgenius/page.tsx` | Page shell (imports LeadGeniusView) |
| Create | `components/leadgenius/LeadGeniusView.tsx` | Main 3-tab container |
| Create | `components/leadgenius/SearchTab.tsx` | Search form + diagnosis results |
| Create | `components/leadgenius/QueueTab.tsx` | Send queue + approve/reject |
| Create | `components/leadgenius/HistoryTab.tsx` | Sent history list |
| Create | `components/leadgenius/DiagnosisCard.tsx` | Single diagnosis result card |
| Modify | `lib/pipeline-utils.ts` | Export `calculateAiScore` (already exported, verify) |
| Modify | `app/api/pipeline-leads/route.ts` | Add `previous_phase` to ALLOWED_DB_FIELDS and field mappings |

---

## Task 1: TypeScript Type Definitions

**Files:**
- Create: `types/leadgenius.ts`

- [ ] **Step 1: Create type definitions file**

```typescript
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
  leadIds: string[]; // pipeline_leads IDs to diagnose
}

export interface LeadGeniusQueueAction {
  action: "enqueue" | "dequeue";
  leadIds: string[];
}

export interface LeadGeniusOutreachRequest {
  leadIds: string[];
  dryRun?: boolean;
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc types/leadgenius.ts --noEmit --esModuleInterop --strict 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add types/leadgenius.ts
git commit -m "feat(leadgenius): add TypeScript type definitions for LeadGenius API"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase-migration-leadgenius.sql`
- Modify: `app/api/pipeline-leads/route.ts` (add `previous_phase` to mappings)

- [ ] **Step 1: Create migration SQL file**

```sql
-- supabase-migration-leadgenius.sql
-- Add previous_phase column for LeadGenius queue management
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS previous_phase TEXT;
```

- [ ] **Step 2: Add `previous_phase` to pipeline-leads route mappings**

In `app/api/pipeline-leads/route.ts`, find `dbRowToClientLead` and add:
```typescript
previousPhase: row.previous_phase,
```

Find `FIELD_MAP` and add:
```typescript
previousPhase: "previous_phase",
```

Find `ALLOWED_DB_FIELDS` and add `"previous_phase"` to the Set.

- [ ] **Step 3: Run migration against Supabase**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && cat supabase-migration-leadgenius.sql`
Then instruct user to run in Supabase SQL Editor.

- [ ] **Step 4: Commit**

```bash
git add supabase-migration-leadgenius.sql app/api/pipeline-leads/route.ts
git commit -m "feat(leadgenius): add previous_phase column for queue management"
```

---

## Task 3: API Client Module

**Files:**
- Create: `lib/leadgenius.ts`

**Reference:** `lib/ahrefs.ts` for the pattern (function exports, AbortController timeout, null on error).

- [ ] **Step 1: Create the client module**

```typescript
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
    60_000 // shorter timeout for outreach
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc lib/leadgenius.ts --noEmit --esModuleInterop --strict --moduleResolution node --paths '{"@/*":["./*"]}' 2>&1 | head -20`
Expected: No errors (or minor path resolution issues that work in Next.js)

- [ ] **Step 3: Commit**

```bash
git add lib/leadgenius.ts
git commit -m "feat(leadgenius): add API client module with search, diagnose, outreach"
```

---

## Task 4: Data Mapper

**Files:**
- Create: `lib/leadgenius-mapper.ts`

**Reference:** `lib/pipeline-utils.ts` for `calculateAiScore`.

- [ ] **Step 1: Create the mapper module**

```typescript
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

/**
 * Map LeadGenius search + diagnosis results to pipeline_leads upsert data.
 * For new leads: sets phase=discovered, campaign=leadgenius-{segment}.
 * For existing leads: omits phase (caller decides whether to overwrite).
 */
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
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add lib/leadgenius-mapper.ts
git commit -m "feat(leadgenius): add data mapper for LeadGenius → pipeline_leads"
```

---

## Task 5: BFF API Route — Search

**Files:**
- Create: `app/api/leadgenius/search/route.ts`

**Reference:** `app/api/pipeline-leads/route.ts` for route pattern, `lib/api-auth.ts` for auth.

- [ ] **Step 1: Create search route**

```typescript
// app/api/leadgenius/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { searchAndDiagnose, isLeadGeniusConnected } from "@/lib/leadgenius";
import { mapToPipelineLead } from "@/lib/leadgenius-mapper";
import { supabaseAdmin } from "@/lib/supabase";
import type { LeadGeniusSearchRequest } from "@/types/leadgenius";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  if (!isLeadGeniusConnected()) {
    return NextResponse.json(
      { error: "LeadGenius API not configured" },
      { status: 503 }
    );
  }

  let body: LeadGeniusSearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { industry, region, keyword, diagnoseTop } = body;

  if (!industry && !region && !keyword) {
    return NextResponse.json(
      { error: "At least one search parameter required (industry, region, or keyword)" },
      { status: 400 }
    );
  }

  const result = await searchAndDiagnose({
    search: { industry, region, keyword },
    diagnoseTop: diagnoseTop ?? 5,
  });

  if (!result) {
    return NextResponse.json(
      { error: "LeadGenius API call failed" },
      { status: 502 }
    );
  }

  // Upsert companies into pipeline_leads
  const upsertedIds: string[] = [];

  for (const company of result.searchResults.companies) {
    const diagnosis = result.diagnosisResults.find(
      (d) => d.companyId === company.id
    );

    // Check if lead already exists by URL
    const { data: existing } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id")
      .eq("url", company.url)
      .maybeSingle();

    const isNew = !existing;
    const mapped = mapToPipelineLead(company, diagnosis, isNew);

    if (isNew) {
      const { data: inserted } = await supabaseAdmin
        .from("pipeline_leads")
        .insert(mapped)
        .select("id")
        .single();
      if (inserted) upsertedIds.push(inserted.id);
    } else {
      // Update existing lead (don't overwrite phase or campaign if already set)
      const { phase, discovered_at, campaign, ...updateData } = mapped;
      await supabaseAdmin
        .from("pipeline_leads")
        .update(updateData)
        .eq("id", existing.id);
      upsertedIds.push(existing.id);
    }
  }

  // Log activity
  await supabaseAdmin.from("pipeline_activity_log").insert({
    event_type: "leadgenius_search",
    message: `LeadGenius検索: ${[industry, region, keyword].filter(Boolean).join(" ")}`,
    metadata: {
      query: { industry, region, keyword },
      totalFound: result.searchResults.totalFound,
      diagnosed: result.diagnosisResults.length,
      upserted: upsertedIds.length,
    },
  });

  return NextResponse.json({
    searchResults: result.searchResults,
    diagnosisResults: result.diagnosisResults,
    actionableLeads: result.actionableLeads,
    savedLeadIds: upsertedIds,
  });
}
```

- [ ] **Step 2: Verify route compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc --noEmit 2>&1 | grep -i "leadgenius" | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/leadgenius/search/route.ts
git commit -m "feat(leadgenius): add search BFF route with Supabase upsert"
```

---

## Task 6: BFF API Route — Diagnose

**Files:**
- Create: `app/api/leadgenius/diagnose/route.ts`

- [ ] **Step 1: Create diagnose route**

```typescript
// app/api/leadgenius/diagnose/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { batchDiagnose, isLeadGeniusConnected } from "@/lib/leadgenius";
import { mapToPipelineLead } from "@/lib/leadgenius-mapper";
import { supabaseAdmin } from "@/lib/supabase";
import type { LeadGeniusDiagnoseRequest } from "@/types/leadgenius";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  if (!isLeadGeniusConnected()) {
    return NextResponse.json(
      { error: "LeadGenius API not configured" },
      { status: 503 }
    );
  }

  let body: LeadGeniusDiagnoseRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.leadIds || body.leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds required" }, { status: 400 });
  }

  if (body.leadIds.length > 10) {
    return NextResponse.json(
      { error: "Max 10 leads per batch" },
      { status: 400 }
    );
  }

  // Fetch leads from Supabase
  const { data: leads } = await supabaseAdmin
    .from("pipeline_leads")
    .select("id, company, url, industry, region")
    .in("id", body.leadIds);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No matching leads found" }, { status: 404 });
  }

  const companies = leads.map((l) => ({
    id: l.id,
    name: l.company,
    url: l.url,
    industry: l.industry || undefined,
    region: l.region || undefined,
  }));

  const result = await batchDiagnose(companies);

  if (!result) {
    return NextResponse.json(
      { error: "LeadGenius batch-diagnose failed" },
      { status: 502 }
    );
  }

  // Update each lead with diagnosis results
  for (const diag of result.results) {
    const lead = leads.find((l) => l.id === diag.companyId);
    if (!lead) continue;

    const company = {
      id: lead.id,
      name: lead.company,
      url: lead.url,
      industry: lead.industry || "",
      region: lead.region || "",
      address: "",
      phone: "",
      heat_score: 0,
    };

    const mapped = mapToPipelineLead(company, diag, false);
    const { phase, discovered_at, company: _c, url: _u, campaign, ...updateData } = mapped;

    await supabaseAdmin
      .from("pipeline_leads")
      .update({ ...updateData, campaign })
      .eq("id", lead.id);
  }

  return NextResponse.json({
    results: result.results,
    summary: result.summary,
  });
}
```

- [ ] **Step 2: Verify route compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc --noEmit 2>&1 | grep -i "diagnose" | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/leadgenius/diagnose/route.ts
git commit -m "feat(leadgenius): add batch-diagnose BFF route"
```

---

## Task 7: BFF API Route — Queue

**Files:**
- Create: `app/api/leadgenius/queue/route.ts`

- [ ] **Step 1: Create queue route**

```typescript
// app/api/leadgenius/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { LeadGeniusQueueAction } from "@/types/leadgenius";

export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from("pipeline_leads")
    .select("*")
    .eq("phase", "queued")
    .ilike("campaign", "leadgenius%")
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

export async function PUT(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  let body: LeadGeniusQueueAction;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, leadIds } = body;

  if (!action || !leadIds || leadIds.length === 0) {
    return NextResponse.json(
      { error: "action and leadIds required" },
      { status: 400 }
    );
  }

  if (action === "enqueue") {
    // Save current phase as previous_phase, then set phase to queued
    const { data: leads } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, phase")
      .in("id", leadIds);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No matching leads" }, { status: 404 });
    }

    for (const lead of leads) {
      await supabaseAdmin
        .from("pipeline_leads")
        .update({
          previous_phase: lead.phase,
          phase: "queued",
          scheduled_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
    }

    return NextResponse.json({ updated: leads.length });
  }

  if (action === "dequeue") {
    // Restore previous phase
    const { data: leads } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id, previous_phase")
      .in("id", leadIds)
      .eq("phase", "queued");

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No queued leads found" }, { status: 404 });
    }

    for (const lead of leads) {
      await supabaseAdmin
        .from("pipeline_leads")
        .update({
          phase: lead.previous_phase || "discovered",
          previous_phase: null,
          scheduled_at: null,
        })
        .eq("id", lead.id);
    }

    return NextResponse.json({ updated: leads.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

- [ ] **Step 2: Verify route compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc --noEmit 2>&1 | grep -i "queue" | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/leadgenius/queue/route.ts
git commit -m "feat(leadgenius): add queue BFF route with enqueue/dequeue"
```

---

## Task 8: BFF API Route — Outreach

**Files:**
- Create: `app/api/leadgenius/outreach/route.ts`

- [ ] **Step 1: Create outreach route**

```typescript
// app/api/leadgenius/outreach/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { sendOutreach, isLeadGeniusConnected } from "@/lib/leadgenius";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  LeadGeniusOutreachRequest,
  LeadGeniusOutreachLead,
} from "@/types/leadgenius";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  if (!isLeadGeniusConnected()) {
    return NextResponse.json(
      { error: "LeadGenius API not configured" },
      { status: 503 }
    );
  }

  let body: LeadGeniusOutreachRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { leadIds, dryRun } = body;

  if (!leadIds || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds required" }, { status: 400 });
  }

  // Fetch leads from DB (security: email comes from DB, not request)
  const { data: dbLeads } = await supabaseAdmin
    .from("pipeline_leads")
    .select("id, company, url, contact_email, industry, region, llmo_score, weaknesses, description, campaign")
    .in("id", leadIds);

  if (!dbLeads || dbLeads.length === 0) {
    return NextResponse.json({ error: "No matching leads found" }, { status: 404 });
  }

  // Filter leads that have email
  const leadsWithEmail = dbLeads.filter((l) => l.contact_email);
  if (leadsWithEmail.length === 0) {
    return NextResponse.json(
      { error: "None of the selected leads have an email address" },
      { status: 400 }
    );
  }

  // Map to LeadGenius outreach format
  const outreachLeads: LeadGeniusOutreachLead[] = leadsWithEmail.map((l) => {
    const campaignSegment = (l.campaign || "").replace("leadgenius-", "");
    const segment = (["hpcreater", "llmo", "both"].includes(campaignSegment)
      ? campaignSegment
      : "llmo") as "hpcreater" | "llmo" | "both";

    return {
      companyId: l.id,
      companyName: l.company,
      email: l.contact_email!,
      targetSegment: segment,
      visibilityScore: l.llmo_score || undefined,
      executiveSummary: l.description || undefined,
      top3Improvements: Array.isArray(l.weaknesses)
        ? l.weaknesses.slice(0, 3).map((w: { description?: string }) => w.description || String(w))
        : undefined,
      industry: l.industry || undefined,
      region: l.region || undefined,
      url: l.url,
    };
  });

  // Get sender from env
  const sender = {
    companyName: process.env.OUTREACH_SENDER_COMPANY || "BeginAI株式会社",
    contactName: process.env.OUTREACH_SENDER_NAME || "徳山",
    email: process.env.OUTREACH_SENDER_EMAIL || "info@e-learning-ai.jp",
  };

  const result = await sendOutreach(outreachLeads, sender, {
    dryRun: dryRun ?? false,
  });

  if (!result) {
    return NextResponse.json(
      { error: "LeadGenius outreach API failed" },
      { status: 502 }
    );
  }

  // If not dry run, update lead states in DB
  if (!dryRun) {
    const now = new Date().toISOString();

    for (const entry of result.results) {
      if (entry.status === "sent" || entry.status === "scheduled") {
        await supabaseAdmin
          .from("pipeline_leads")
          .update({
            phase: "sent",
            sent_at: now,
            follow_up_count: 99, // Exclude from auto-send follow-ups
            previous_phase: null,
          })
          .eq("id", entry.companyId);
      }
    }

    // Log activity
    await supabaseAdmin.from("pipeline_activity_log").insert({
      event_type: "leadgenius_outreach",
      message: `LeadGeniusアウトリーチ: ${result.summary.sent}件送信, ${result.summary.failed}件失敗`,
      metadata: {
        leadIds,
        summary: result.summary,
        results: result.results.map((r) => ({
          companyId: r.companyId,
          companyName: r.companyName,
          status: r.status,
          segment: r.segment,
        })),
      },
    });
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Verify all routes compile**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/leadgenius/outreach/route.ts
git commit -m "feat(leadgenius): add outreach BFF route with DB state updates"
```

---

## Task 9: UI — DiagnosisCard Component

**Files:**
- Create: `components/leadgenius/DiagnosisCard.tsx`

**Reference:** Existing card patterns in `components/FormPilotAutoV2.jsx`. Use Tailwind CSS per CLAUDE.md.

- [ ] **Step 1: Create DiagnosisCard**

```typescript
// components/leadgenius/DiagnosisCard.tsx
"use client";

import type {
  LeadGeniusCompany,
  LeadGeniusDiagnosisResult,
} from "@/types/leadgenius";

interface DiagnosisCardProps {
  company: LeadGeniusCompany;
  diagnosis?: LeadGeniusDiagnosisResult;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEnqueue: (id: string) => void;
}

const SEGMENT_LABELS: Record<string, { label: string; color: string }> = {
  hpcreater: { label: "HPCreater対象", color: "text-amber-400 bg-amber-400/10" },
  llmo: { label: "LLMO対象", color: "text-cyan-400 bg-cyan-400/10" },
  both: { label: "HP + LLMO対象", color: "text-emerald-400 bg-emerald-400/10" },
  none: { label: "対象外", color: "text-gray-400 bg-gray-400/10" },
};

export default function DiagnosisCard({
  company,
  diagnosis,
  selected,
  onToggleSelect,
  onEnqueue,
}: DiagnosisCardProps) {
  const segment = diagnosis?.targetSegment || "none";
  const segmentInfo = SEGMENT_LABELS[segment] || SEGMENT_LABELS.none;
  const score = diagnosis?.visibilityScore?.total;

  return (
    <div className="rounded-lg border border-white/10 bg-[#111622] p-4 transition hover:border-white/20">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(company.id)}
          className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#f0f0f5] truncate">
              {company.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${segmentInfo.color}`}>
              {segmentInfo.label}
            </span>
          </div>

          <a
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#53a8b6] hover:underline truncate block mt-1"
          >
            {company.url}
          </a>

          <div className="mt-2 flex items-center gap-4 text-xs text-[#888888]">
            {company.industry && <span>{company.industry}</span>}
            {company.region && <span>{company.region}</span>}
            {score !== undefined && (
              <span>
                AI可視性: <span className={score < 40 ? "text-red-400" : "text-emerald-400"}>{score}</span>/100
              </span>
            )}
            {company.email && <span>{company.email}</span>}
          </div>

          {diagnosis?.executiveSummary && (
            <p className="mt-2 text-xs text-[#99a4b8] line-clamp-2">
              {diagnosis.executiveSummary}
            </p>
          )}

          {diagnosis?.top3Improvements && diagnosis.top3Improvements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {diagnosis.top3Improvements.map((item, i) => (
                <li key={i} className="text-xs text-[#888888] flex items-start gap-1">
                  <span className="text-amber-400 mt-0.5">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => onEnqueue(company.id)}
          className="shrink-0 rounded bg-[#e94560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e94560]/80 transition"
        >
          キューに追加
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/leadgenius/DiagnosisCard.tsx
git commit -m "feat(leadgenius): add DiagnosisCard component"
```

---

## Task 10: UI — SearchTab Component

**Files:**
- Create: `components/leadgenius/SearchTab.tsx`

- [ ] **Step 1: Create SearchTab**

```typescript
// components/leadgenius/SearchTab.tsx
"use client";

import { useState } from "react";
import DiagnosisCard from "./DiagnosisCard";
import type {
  LeadGeniusCompany,
  LeadGeniusDiagnosisResult,
  LeadGeniusSearchDiagnoseResult,
} from "@/types/leadgenius";

interface SearchTabProps {
  onEnqueueLeads: (ids: string[]) => Promise<void>;
}

export default function SearchTab({ onEnqueueLeads }: SearchTabProps) {
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [keyword, setKeyword] = useState("");
  const [diagnoseTop, setDiagnoseTop] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LeadGeniusSearchDiagnoseResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!industry && !region && !keyword) {
      setError("業種、地域、キーワードのいずれかを入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/leadgenius/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          industry: industry || undefined,
          region: region || undefined,
          keyword: keyword || undefined,
          diagnoseTop,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error: ${res.status}`);
      }

      setResults(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!results) return;
    const allIds = results.searchResults.companies.map((c) => c.id);
    setSelectedIds(
      selectedIds.size === allIds.length ? new Set() : new Set(allIds)
    );
  };

  const handleBulkEnqueue = async () => {
    if (selectedIds.size === 0) return;
    await onEnqueueLeads(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const companies = results?.searchResults.companies || [];
  const diagMap = new Map(
    (results?.diagnosisResults || []).map((d) => [d.companyId, d])
  );

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="rounded-lg border border-white/10 bg-[#111622] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-[#888888] mb-1">業種</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="例: IT, 製造業"
              className="w-full rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#555] focus:border-[#53a8b6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#888888] mb-1">地域</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="例: 東京, 大阪"
              className="w-full rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#555] focus:border-[#53a8b6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#888888] mb-1">キーワード</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例: AI導入, DX推進"
              className="w-full rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#555] focus:border-[#53a8b6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-[#888888] mb-1">診断件数</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={10}
                value={diagnoseTop}
                onChange={(e) => setDiagnoseTop(Number(e.target.value))}
                className="w-20 rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] focus:border-[#53a8b6] focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 rounded bg-[#e94560] px-4 py-2 text-sm font-medium text-white hover:bg-[#e94560]/80 transition disabled:opacity-50"
              >
                {loading ? "検索中..." : "検索+診断"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-[#888888]">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[#53a8b6] border-t-transparent mx-auto" />
            <p className="text-sm">LeadGenius APIで検索+診断中...</p>
            <p className="text-xs mt-1">（2〜3分かかる場合があります）</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888888]">
              {companies.length}社見つかりました（{results.diagnosisResults.length}社を診断済み）
            </p>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="rounded border border-white/10 px-3 py-1.5 text-xs text-[#888888] hover:bg-white/5 transition"
              >
                {selectedIds.size === companies.length ? "選択解除" : "全選択"}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkEnqueue}
                  className="rounded bg-[#e94560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e94560]/80 transition"
                >
                  選択した{selectedIds.size}社をキューに追加
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {companies.map((company) => (
              <DiagnosisCard
                key={company.id}
                company={company}
                diagnosis={diagMap.get(company.id)}
                selected={selectedIds.has(company.id)}
                onToggleSelect={toggleSelect}
                onEnqueue={async (id) => {
                  await onEnqueueLeads([id]);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/leadgenius/SearchTab.tsx
git commit -m "feat(leadgenius): add SearchTab component with form and results"
```

---

## Task 11: UI — QueueTab Component

**Files:**
- Create: `components/leadgenius/QueueTab.tsx`

- [ ] **Step 1: Create QueueTab**

```typescript
// components/leadgenius/QueueTab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

interface QueueLead {
  id: string;
  company: string;
  url: string;
  contact_email: string | null;
  campaign: string | null;
  llmo_score: number | null;
  scheduled_at: string | null;
}

interface QueueTabProps {
  refreshTrigger: number; // increment to trigger refresh
}

export default function QueueTab({ refreshTrigger }: QueueTabProps) {
  const [leads, setLeads] = useState<QueueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leadgenius/queue");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshTrigger]);

  const handleDequeue = async (ids: string[]) => {
    await fetch("/api/leadgenius/queue", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dequeue", leadIds: ids }),
    });
    setSelectedIds(new Set());
    fetchQueue();
  };

  const handlePreview = async (ids: string[]) => {
    setSending(true);
    try {
      const res = await fetch("/api/leadgenius/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, dryRun: true }),
      });
      if (res.ok) {
        setPreviewData(await res.json());
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (ids: string[]) => {
    if (!confirm(`${ids.length}社にメールを送信します。よろしいですか？`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/leadgenius/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, dryRun: false }),
      });
      if (res.ok) {
        alert("送信完了");
        setPreviewData(null);
        setSelectedIds(new Set());
        fetchQueue();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`送信失敗: ${data.error || res.status}`);
      }
    } finally {
      setSending(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#888888]">キュー読み込み中...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[#888888]">
        送信キューは空です。検索結果タブからリードを追加してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#888888]">{leads.length}社がキューにあります</p>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => handlePreview(Array.from(selectedIds))}
                disabled={sending}
                className="rounded border border-[#53a8b6] px-3 py-1.5 text-xs text-[#53a8b6] hover:bg-[#53a8b6]/10 transition disabled:opacity-50"
              >
                プレビュー ({selectedIds.size})
              </button>
              <button
                onClick={() => handleSend(Array.from(selectedIds))}
                disabled={sending}
                className="rounded bg-[#e94560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e94560]/80 transition disabled:opacity-50"
              >
                {sending ? "送信中..." : `承認・送信 (${selectedIds.size})`}
              </button>
              <button
                onClick={() => handleDequeue(Array.from(selectedIds))}
                className="rounded border border-white/10 px-3 py-1.5 text-xs text-[#888888] hover:bg-white/5 transition"
              >
                キューから除外
              </button>
            </>
          )}
        </div>
      </div>

      {/* Queue list */}
      <div className="space-y-2">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111622] p-3"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(lead.id)}
              onChange={() => toggleSelect(lead.id)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f0f0f5] truncate">{lead.company}</p>
              <div className="flex gap-3 text-xs text-[#888888] mt-0.5">
                <span>{lead.contact_email || "メールなし"}</span>
                {lead.llmo_score !== null && <span>LLMO: {lead.llmo_score}</span>}
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/5">
                  {(lead.campaign || "").replace("leadgenius-", "")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[#111622] border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">メールプレビュー（dryRun）</h3>
            <pre className="whitespace-pre-wrap text-xs text-[#99a4b8] bg-[#0a0a0f] rounded p-4">
              {JSON.stringify(previewData, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPreviewData(null)}
                className="rounded border border-white/10 px-4 py-2 text-sm text-[#888888] hover:bg-white/5"
              >
                閉じる
              </button>
              <button
                onClick={() => handleSend(Array.from(selectedIds))}
                disabled={sending}
                className="rounded bg-[#e94560] px-4 py-2 text-sm font-medium text-white hover:bg-[#e94560]/80 disabled:opacity-50"
              >
                このまま送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/leadgenius/QueueTab.tsx
git commit -m "feat(leadgenius): add QueueTab component with preview and send"
```

---

## Task 12: UI — HistoryTab Component

**Files:**
- Create: `components/leadgenius/HistoryTab.tsx`

- [ ] **Step 1: Create HistoryTab**

```typescript
// components/leadgenius/HistoryTab.tsx
"use client";

import { useState, useEffect } from "react";

interface HistoryEntry {
  t: string;    // timestamp
  msg: string;  // message
  type: string; // event_type
  metadata?: Record<string, unknown>;
}

export default function HistoryTab() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pipeline-activity");
        if (res.ok) {
          const data = await res.json();
          const allEntries: HistoryEntry[] = data.entries || [];
          setEntries(allEntries.filter((e) => e.type === "leadgenius_outreach"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#888888]">履歴読み込み中...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[#888888]">
        送信履歴はまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => {
        const summary = entry.metadata?.summary as Record<string, unknown> | undefined;

        return (
          <div
            key={idx}
            className="rounded-lg border border-white/10 bg-[#111622] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#f0f0f5]">
                LeadGenius送信
              </span>
              <span className="text-xs text-[#888888]">
                {new Date(entry.t).toLocaleString("ja-JP")}
              </span>
            </div>
            <p className="text-xs text-[#99a4b8] mt-1">{entry.msg}</p>
            {summary && (
              <div className="mt-2 flex gap-4 text-xs text-[#888888]">
                <span>送信: <span className="text-emerald-400">{String(summary.sent || 0)}</span></span>
                <span>失敗: <span className="text-red-400">{String(summary.failed || 0)}</span></span>
                <span>スキップ: {String(summary.skipped || 0)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/leadgenius/HistoryTab.tsx
git commit -m "feat(leadgenius): add HistoryTab component"
```

---

## Task 13: UI — LeadGeniusView Main Container

**Files:**
- Create: `components/leadgenius/LeadGeniusView.tsx`

- [ ] **Step 1: Create LeadGeniusView**

```typescript
// components/leadgenius/LeadGeniusView.tsx
"use client";

import { useState, useCallback } from "react";
import SearchTab from "./SearchTab";
import QueueTab from "./QueueTab";
import HistoryTab from "./HistoryTab";

const TABS = [
  { id: "search", label: "検索結果" },
  { id: "queue", label: "送信キュー" },
  { id: "history", label: "送信済み" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LeadGeniusView() {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [queueRefresh, setQueueRefresh] = useState(0);

  const handleEnqueueLeads = useCallback(
    async (ids: string[]) => {
      const res = await fetch("/api/leadgenius/queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enqueue", leadIds: ids }),
      });

      if (res.ok) {
        setQueueRefresh((prev) => prev + 1);
        setActiveTab("queue");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`キュー追加に失敗: ${data.error || res.status}`);
      }
    },
    [adminSecret]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <h1 className="text-xl font-bold mb-1">LeadGenius</h1>
        <p className="text-sm text-[#888888] mb-6">
          企業検索 → LLMO診断 → アウトリーチ送信
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-white/10 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-[#e94560] text-[#f0f0f5]"
                  : "border-transparent text-[#888888] hover:text-[#f0f0f5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "search" && (
          <SearchTab onEnqueueLeads={handleEnqueueLeads} />
        )}
        {activeTab === "queue" && (
          <QueueTab refreshTrigger={queueRefresh} />
        )}
        {activeTab === "history" && (
          <HistoryTab />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/leadgenius/LeadGeniusView.tsx
git commit -m "feat(leadgenius): add LeadGeniusView main container with tabs"
```

---

## Task 14: Page Shell

**Files:**
- Create: `app/leadgenius/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/leadgenius/page.tsx
"use client";

import LeadGeniusView from "@/components/leadgenius/LeadGeniusView";

export default function LeadGeniusPage() {
  return <LeadGeniusView />;
}
```

- [ ] **Step 2: Verify dev server loads the page**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx next build 2>&1 | tail -20`
Expected: Build succeeds. Page at `/leadgenius` should be accessible.

- [ ] **Step 3: Commit**

```bash
git add app/leadgenius/page.tsx
git commit -m "feat(leadgenius): add /leadgenius page shell"
```

---

## Task 15: Integration Verification

- [ ] **Step 1: Check full project compiles**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx tsc --noEmit 2>&1 | head -30`
Expected: No TypeScript errors

- [ ] **Step 2: Verify build succeeds**

Run: `cd /c/Users/tokuc/AI/claude/aio-project && npx next build 2>&1 | tail -30`
Expected: Build succeeds with `/leadgenius` page listed

- [ ] **Step 3: Remind user to run migration and set env vars**

User action needed:
1. Run `supabase-migration-leadgenius.sql` in Supabase SQL Editor
2. Set in Vercel environment variables:
   - `LEADGENIUS_API_KEY` = (API key from LeadGenius project)
   - `LEADGENIUS_API_URL` = `https://leadgenius-ai-search.vercel.app`

- [ ] **Step 4: Final commit with all files**

```bash
git add -A
git status
# Verify only expected files are staged
git commit -m "feat(leadgenius): complete LeadGenius API client integration

- Types, client module, data mapper
- BFF API routes: search, diagnose, queue, outreach
- UI: SearchTab, QueueTab, HistoryTab with LeadGeniusView container
- /leadgenius page
- DB migration for previous_phase column"
```
