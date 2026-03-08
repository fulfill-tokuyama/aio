// app/api/ai-search/route.ts
// AI Search SSE ストリーミングエンドポイント
// LeadGenius の search-companies.ts を参考に、並列セグメント検索 + Firecrawl エンリッチ

import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 300;

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash"] as const;

const DEFAULT_SEARCH_SEGMENTS = [
  "Leading Providers & Major Organizations (大手・有名事業者)",
  "Local & Community-Based Providers (地域密着・中小事業者)",
  "New Entrants & Growing Services (新規参入・成長中)",
  "Organizations Actively Hiring (採用強化中・拡大中)",
  "Established & Trusted Providers (実績豊富・老舗)",
];

const BLOCKED_DOMAINS = new Set([
  "twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com",
  "linkedin.com", "amazon.co.jp", "rakuten.co.jp", "wikipedia.org",
  "tabelog.com", "hotpepper.jp", "indeed.com", "wantedly.com",
  "note.com", "qiita.com", "zenn.dev", "github.com", "yahoo.co.jp",
  "google.com", "tiktok.com", "pinterest.com", "google.co.jp",
  "bing.com", "duckduckgo.com",
]);
const BLOCKED_DOMAIN_PATTERNS = [".go.jp", ".ac.jp", ".ed.jp", ".lg.jp"];

// --- Firecrawl inline (Vercel _lib bundling issue workaround) ---
const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";
const ENRICH_CONCURRENCY = 5;
const ENRICH_MAX_COMPANIES = 20;

async function firecrawlScrape(
  url: string,
  formats: string[] = ["markdown"]
): Promise<{ success: boolean; markdown?: string; links?: string[] }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return { success: false };
  try {
    const resp = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats }),
    });
    if (!resp.ok) return { success: false };
    const data = await resp.json();
    return data.success
      ? { success: true, markdown: data.data?.markdown, links: data.data?.links }
      : { success: false };
  } catch {
    return { success: false };
  }
}

const COMPANY_PAGE_PATTERNS = [
  /\/company\/?$/i, /\/about\/?$/i, /\/corporate\/?$/i, /\/corp\/?$/i,
  /\/profile\/?$/i, /\/overview\/?$/i, /\/info\/?$/i,
  /\/company[-_]?(info|profile|overview)\/?$/i, /\/about[-_]?us\/?$/i,
];

function findCompanyInfoUrl(links: string[], baseUrl: string): string | null {
  let baseHost: string;
  try { baseHost = new URL(baseUrl).hostname.replace(/^www\./, ""); } catch { return null; }
  for (const link of links) {
    try {
      const u = new URL(link);
      if (u.hostname.replace(/^www\./, "") !== baseHost) continue;
      if (COMPANY_PAGE_PATTERNS.some(p => p.test(u.pathname))) return link;
    } catch { continue; }
  }
  return null;
}

interface EnrichFields {
  email?: string;
  phone?: string;
  founded_year?: number;
  employee_count?: string;
  representative?: string;
  contact_name?: string;
  contact_position?: string;
  capital?: string;
  description?: string;
}

async function extractFieldsFromMarkdown(
  apiKey: string, markdown: string, companyName: string
): Promise<EnrichFields> {
  const trimmed = markdown.slice(0, 4000);
  const prompt = `以下は「${companyName}」の企業サイトから取得したテキストです。
下記フィールドを抽出してください。不明な場合はnullとしてください。
JSONのみ出力（説明不要）:
{"email":"連絡先メール","phone":"代表電話番号","founded_year":設立年(数値),"employee_count":"従業員数(例:50名)","representative":"代表者名","contact_name":"問い合わせ担当者名","contact_position":"役職","capital":"資本金(例:1000万円)","description":"事業内容を1文で"}

---
${trimmed}`;

  try {
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) return {};
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      email: typeof parsed.email === "string" && parsed.email !== "null" ? parsed.email : undefined,
      phone: typeof parsed.phone === "string" && parsed.phone !== "null" ? parsed.phone : undefined,
      founded_year: typeof parsed.founded_year === "number" ? parsed.founded_year : undefined,
      employee_count: typeof parsed.employee_count === "string" && parsed.employee_count !== "null" ? parsed.employee_count : undefined,
      representative: typeof parsed.representative === "string" && parsed.representative !== "null" ? parsed.representative : undefined,
      contact_name: typeof parsed.contact_name === "string" && parsed.contact_name !== "null" ? parsed.contact_name : undefined,
      contact_position: typeof parsed.contact_position === "string" && parsed.contact_position !== "null" ? parsed.contact_position : undefined,
      capital: typeof parsed.capital === "string" && parsed.capital !== "null" ? parsed.capital : undefined,
      description: typeof parsed.description === "string" && parsed.description !== "null" ? parsed.description : undefined,
    };
  } catch {
    return {};
  }
}

// --- Company types ---
interface CompanyRaw {
  name?: string;
  url?: string;
  industry?: string;
  region?: string;
  address?: string;
  phone?: string;
  email?: string;
  google_maps_url?: string;
  founded_year?: number;
  employee_count?: string;
  representative?: string;
  contact_name?: string;
  contact_position?: string;
  capital?: string;
  description?: string;
  heat_score?: number;
}

interface CompanyResult {
  id: string;
  name: string;
  url: string;
  industry: string;
  region: string;
  address: string;
  phone: string;
  email?: string;
  google_maps_url?: string;
  founded_year?: number;
  employee_count?: string;
  representative?: string;
  contact_name?: string;
  contact_position?: string;
  capital?: string;
  description?: string;
  heat_score: number;
}

// --- Helpers ---

function isDomainBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_DOMAINS.has(host)) return true;
  for (const pattern of BLOCKED_DOMAIN_PATTERNS) {
    if (host.endsWith(pattern)) return true;
  }
  return false;
}

function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    let u = url.trim();
    u = u.replace(/\?utm_[^&]*&?/gi, "?").replace(/&utm_[^&]*/gi, "").replace(/\?$/, "");
    u = u.replace(/\/$/, "");
    u = u.toLowerCase().startsWith("http") ? u : `https://${u}`;
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname || "/"}${parsed.search || ""}`.replace(/\/$/, "");
  } catch { return url; }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes("429") || msg.includes("503") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("overloaded") || msg.includes("quota");
      if (!isRetryable || attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

function extractJsonArray(text: string): CompanyRaw[] {
  if (!text || typeof text !== "string") return [];
  let cleaned = text.replace(/```(?:json|JSON)?\s*\n?/g, "").replace(/```\s*/g, "").trim();
  const startIndex = cleaned.indexOf("[");
  const endIndex = cleaned.lastIndexOf("]");
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return [];
  cleaned = cleaned.substring(startIndex, endIndex + 1);

  const parseAttempts = [
    cleaned,
    cleaned.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}"),
    cleaned.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}").replace(/[\x00-\x1F\x7F]/g, ""),
    cleaned.replace(/\n/g, " ").replace(/\r/g, ""),
  ];
  for (const attempt of parseAttempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return parsed.filter(item => item && typeof item === "object");
    } catch { continue; }
  }
  return [];
}

function extractSourcesFromMetadata(groundingMetadata: unknown, segment: string) {
  const queries: string[] = [];
  const sources: Array<{ url: string; title: string; domain: string; segment: string }> = [];
  const meta = groundingMetadata as {
    webSearchQueries?: string[];
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  } | undefined;
  if (!meta) return { queries, sources };

  if (Array.isArray(meta.webSearchQueries)) {
    for (const s of meta.webSearchQueries) {
      if (typeof s === "string" && s.trim()) queries.push(s.trim());
    }
  }
  if (Array.isArray(meta.groundingChunks)) {
    for (const chunk of meta.groundingChunks) {
      const uri = chunk?.web?.uri;
      if (!uri || typeof uri !== "string") continue;
      const normalized = normalizeUrl(uri);
      if (!normalized) continue;
      let domain = "";
      try { domain = new URL(normalized).hostname.replace(/^www\./, ""); } catch { domain = normalized; }
      sources.push({
        url: normalized,
        title: (chunk?.web?.title && typeof chunk.web.title === "string" ? chunk.web.title : "") || domain,
        domain, segment,
      });
    }
  }
  return { queries, sources };
}

async function callGeminiWithSearch(
  apiKey: string, systemInstruction: string, query: string, modelName: string
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: query }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const err = errJson as { error?: { message?: string } };
    throw new Error(`Gemini API error [${res.status}]: ${err?.error?.message || res.statusText}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; groundingMetadata?: unknown }>;
    promptFeedback?: { blockReason?: string };
  };
  const first = json.candidates?.[0];
  if (!first) {
    const blockReason = json.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Response blocked: ${blockReason}` : "No response from API");
  }
  return { text: first.content?.parts?.map(p => p.text ?? "").join("") ?? "", groundingMetadata: first.groundingMetadata };
}

async function callGeminiWithSearchWithFallback(
  apiKey: string, systemInstruction: string, query: string
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const customModel = process.env.GEMINI_MODEL?.trim();
  const toTry = customModel
    ? [customModel, ...DEFAULT_MODELS.filter(m => m !== customModel)]
    : [...DEFAULT_MODELS];
  let lastError: Error | null = null;
  for (const model of toTry) {
    try {
      return await withRetry(() => callGeminiWithSearch(apiKey, systemInstruction, query, model));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      if (!(msg.includes("404") || msg.includes("not found") || msg.includes("Invalid model") || msg.includes("model not found"))) throw lastError;
    }
  }
  throw lastError ?? new Error("All models failed");
}

async function searchSegment(
  apiKey: string, systemInstruction: string, segment: string, targetTopic: string, region: string
) {
  const query = `
Find 8-12 distinct companies, organizations, or service providers in ${region} related to: ${targetTopic}.

Segment Focus: ${segment}

Use Google Search to verify they exist and get accurate addresses.
Return ONLY a valid JSON array. No markdown, no explanation.

Format each item: {"name": "...", "url": "...", "industry": "...", "region": "...", "address": "...", "phone": "...", "email": "...", "google_maps_url": "...", "founded_year": 2000, "employee_count": "50名", "representative": "代表者名", "contact_name": "担当者名", "contact_position": "役職", "capital": "1000万円", "description": "事業内容を1文で", "heat_score": 0-100}
`.trim();

  const { text, groundingMetadata } = await callGeminiWithSearchWithFallback(apiKey, systemInstruction, query);
  const companies = extractJsonArray(text);
  let queries: string[] = [];
  let sources: Array<{ url: string; title: string; domain: string; segment: string }> = [];
  let metaError: string | undefined;
  if (groundingMetadata) {
    const extracted = extractSourcesFromMetadata(groundingMetadata, segment);
    queries = extracted.queries;
    sources = extracted.sources;
  } else {
    metaError = "grounding metadata not available";
  }
  return { companies, queries, sources, metaError };
}

function mergeAndDeduplicate(
  allRaw: CompanyRaw[], industry: string, region: string, idMap: Map<string, string>
): CompanyResult[] {
  const seen = new Set<string>();
  const result: CompanyResult[] = [];
  for (const c of allRaw) {
    if (!c.name || typeof c.name !== "string") continue;
    const urlKey = c.url ? normalizeUrl(c.url) : null;
    // ブロックリストチェック
    if (urlKey) {
      try {
        const host = new URL(urlKey).hostname.replace(/^www\./, "");
        if (isDomainBlocked(host)) continue;
      } catch { /* skip */ }
    }
    const nameKey = String(c.name).toLowerCase() + (c.phone || "");
    const key = urlKey || nameKey;
    if (seen.has(key)) continue;
    seen.add(key);

    let id = idMap.get(key);
    if (!id) { id = crypto.randomUUID(); idMap.set(key, id); }

    result.push({
      id,
      name: String(c.name).trim(),
      url: c.url || "",
      industry: c.industry || industry || "",
      region: c.region || region || "",
      address: c.address || "",
      phone: c.phone || "",
      email: c.email,
      google_maps_url: c.google_maps_url,
      founded_year: typeof c.founded_year === "number" ? c.founded_year : undefined,
      employee_count: c.employee_count || undefined,
      representative: c.representative || undefined,
      contact_name: c.contact_name || undefined,
      contact_position: c.contact_position || undefined,
      capital: c.capital || undefined,
      description: c.description || undefined,
      heat_score: typeof c.heat_score === "number" ? c.heat_score : 50,
    });
  }
  result.sort((a, b) => b.heat_score - a.heat_score);
  return result;
}

// --- Main Handler ---

export async function POST(req: NextRequest): Promise<Response> {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const industry = (body.industry as string) ?? "";
  const region = (body.region as string) ?? "";
  const keyword = (body.keyword as string) ?? "";

  if (!keyword.trim() && !industry.trim() && !region.trim()) {
    return Response.json({ error: "キーワード、業種、地域のいずれかを指定してください" }, { status: 400 });
  }

  let segments: string[] = Array.isArray(body.segments) && body.segments.length > 0
    ? (body.segments as unknown[]).filter((s): s is string => typeof s === "string" && String(s).trim().length > 0)
    : DEFAULT_SEARCH_SEGMENTS;
  if (segments.length === 0) segments = [...DEFAULT_SEARCH_SEGMENTS];

  const targetTopic = keyword.trim() ? `"${keyword.trim()}"` : industry.trim() || "Business";
  const regionLabel = region.trim() || "Japan";

  const systemInstruction = `
You are a lead generation expert finding REAL businesses and service providers in Japan.
- Use Google Search to verify existence and addresses.
- Include corporations, NPOs, facilities (事業所) as relevant.
- Return ONLY a valid JSON array. No markdown, no explanation.
`.trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          console.error("SSE enqueue error:", e);
        }
      };

      try {
        const allRaw: CompanyRaw[] = [];
        const allQueries: string[] = [];
        const allSources: Array<{ url: string; title: string; domain: string; segment: string }> = [];
        const warnings: string[] = [];
        const idMap = new Map<string, string>();
        let completed = 0;
        const total = segments.length;
        const sentCompanyIds = new Set<string>();

        const onSegmentComplete = async (
          settled: PromiseSettledResult<{
            companies: CompanyRaw[];
            queries: string[];
            sources: Array<{ url: string; title: string; domain: string; segment: string }>;
            metaError?: string;
          }>
        ) => {
          if (settled.status === "fulfilled") {
            const v = settled.value;
            allRaw.push(...v.companies);
            allQueries.push(...v.queries);
            allSources.push(...v.sources);
            if (v.metaError) warnings.push("一部のセグメントで出典情報を取得できませんでした。");
          } else {
            warnings.push("一部セグメントの検索に失敗しました。");
          }
          completed++;

          // 重複排除して逐次送信
          const unique = mergeAndDeduplicate(allRaw, industry, region, idMap);
          for (const c of unique) {
            if (!sentCompanyIds.has(c.id)) {
              sentCompanyIds.add(c.id);
              sendEvent({ type: "company", company: c });
            }
          }

          // 全セグメント完了 → エンリッチ → complete
          if (completed === total) {
            const finalCompanies = mergeAndDeduplicate(allRaw, industry, region, idMap);

            // Firecrawl エンリッチ
            const enrichTargets = finalCompanies
              .filter(c => c.url && (!c.representative || !c.founded_year || !c.employee_count || !c.capital || !c.description))
              .slice(0, ENRICH_MAX_COMPANIES);

            if (enrichTargets.length > 0 && process.env.FIRECRAWL_API_KEY) {
              sendEvent({ type: "enrich_start", total: enrichTargets.length });
              const queue = [...enrichTargets];
              const workers = Array.from({ length: Math.min(ENRICH_CONCURRENCY, queue.length) }, async () => {
                while (queue.length > 0) {
                  const company = queue.shift()!;
                  try {
                    const fullUrl = company.url.startsWith("http") ? company.url : `https://${company.url}`;
                    const fc = await firecrawlScrape(fullUrl, ["markdown", "links"]);
                    if (!fc.success || !fc.markdown || fc.markdown.length < 50) continue;

                    let companyPageMd = "";
                    if (fc.links && fc.links.length > 0) {
                      const cpUrl = findCompanyInfoUrl(fc.links, fullUrl);
                      if (cpUrl) {
                        const cpFc = await firecrawlScrape(cpUrl);
                        if (cpFc.success && cpFc.markdown) companyPageMd = cpFc.markdown;
                      }
                    }

                    const combinedMd = companyPageMd
                      ? `[トップページ]\n${fc.markdown}\n\n[会社概要ページ]\n${companyPageMd}`
                      : fc.markdown;

                    const extracted = await extractFieldsFromMarkdown(apiKey, combinedMd, company.name);
                    const fields: Record<string, unknown> = {};
                    if (!company.email && extracted.email) fields.email = extracted.email;
                    if ((!company.phone || company.phone === "不明") && extracted.phone) fields.phone = extracted.phone;
                    if (!company.founded_year && extracted.founded_year) fields.founded_year = extracted.founded_year;
                    if (!company.employee_count && extracted.employee_count) fields.employee_count = extracted.employee_count;
                    if (!company.representative && extracted.representative) fields.representative = extracted.representative;
                    if (!company.contact_name && extracted.contact_name) fields.contact_name = extracted.contact_name;
                    if (!company.contact_position && extracted.contact_position) fields.contact_position = extracted.contact_position;
                    if (!company.capital && extracted.capital) fields.capital = extracted.capital;
                    if (!company.description && extracted.description) fields.description = extracted.description;

                    if (Object.keys(fields).length > 0) {
                      sendEvent({ type: "enrich", companyId: company.id, fields });
                    }
                  } catch (e) {
                    console.warn(`Enrich failed for ${company.name}:`, e);
                  }
                }
              });
              await Promise.all(workers);
            }

            const uniqueQueries = Array.from(new Set(allQueries.filter(q => q)));
            const seenSourceUrls = new Set<string>();
            const uniqueSources = allSources.filter(s => {
              const key = normalizeUrl(s.url);
              if (key && !seenSourceUrls.has(key)) { seenSourceUrls.add(key); return true; }
              return false;
            }).map(s => ({ id: crypto.randomUUID(), ...s }));

            sendEvent({
              type: "complete",
              totalCompanies: finalCompanies.length,
              searchMeta: {
                queries: uniqueQueries,
                sources: uniqueSources,
                ...(warnings.length > 0 && { warnings }),
              },
            });
            controller.close();
          }
        };

        // 全セグメント並列実行
        segments.forEach(segment => {
          searchSegment(apiKey, systemInstruction, segment, targetTopic, regionLabel)
            .then(value => onSegmentComplete({ status: "fulfilled", value }))
            .catch(reason => {
              console.warn("Segment search failed:", reason);
              onSegmentComplete({ status: "rejected", reason });
            });
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        sendEvent({ type: "error", error: errMsg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
