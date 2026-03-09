// lib/gemini-search.ts
// Gemini API + Google Search grounding による企業URL検索

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash"] as const;

export interface GeminiSearchSource {
  url: string;
  title: string;
  domain: string;
  segment: string;
}

/** URL正規化 */
function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    let u = url.trim();
    u = u.replace(/\?utm_[^&]*&?/gi, "?").replace(/&utm_[^&]*/gi, "").replace(/\?$/, "");
    u = u.replace(/\/$/, "");
    u = u.toLowerCase().startsWith("http") ? u : `https://${u}`;
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname || "/"}${parsed.search || ""}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** grounding metadata から SearchSource を抽出 */
function extractSourcesFromMetadata(
  groundingMetadata: unknown,
  segment: string
): { queries: string[]; sources: GeminiSearchSource[] } {
  const queries: string[] = [];
  const sources: GeminiSearchSource[] = [];

  const meta = groundingMetadata as {
    webSearchQueries?: string[];
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  } | undefined;

  if (!meta) return { queries, sources };

  const q = meta.webSearchQueries;
  if (Array.isArray(q)) {
    for (const s of q) {
      if (typeof s === "string" && s.trim()) queries.push(s.trim());
    }
  }

  const chunks = meta.groundingChunks;
  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      const web = chunk?.web;
      const uri = web?.uri;
      if (!uri || typeof uri !== "string") continue;
      const normalized = normalizeUrl(uri);
      if (!normalized) continue;
      let domain = "";
      try {
        domain = new URL(normalized).hostname.replace(/^www\./, "");
      } catch {
        domain = normalized;
      }
      sources.push({
        url: normalized,
        title: (web?.title && typeof web.title === "string" ? web.title : "") || domain || normalized,
        domain,
        segment,
      });
    }
  }

  return { queries, sources };
}

/** Gemini REST API（Google Search grounding） */
async function callGeminiWithSearch(
  apiKey: string,
  systemInstruction: string,
  query: string,
  modelName: string
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: query }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const err = errJson as { error?: { message?: string } };
    const msg = err?.error?.message || res.statusText || `HTTP ${res.status}`;
    throw new Error(`Gemini API error [${res.status}]: ${msg}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: unknown;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  const first = json.candidates?.[0];
  if (!first) {
    const blockReason = json.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Response blocked: ${blockReason}` : "No response from API");
  }
  const text = first.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { text, groundingMetadata: first.groundingMetadata };
}

/** モデルフォールバック付きで Gemini を呼び出し */
async function callGeminiWithSearchWithFallback(
  apiKey: string,
  systemInstruction: string,
  query: string
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const customModel = process.env.GEMINI_MODEL?.trim();
  const toTry = customModel
    ? [customModel, ...DEFAULT_MODELS.filter((m) => m !== customModel)]
    : [...DEFAULT_MODELS];

  let lastError: Error | null = null;
  for (const model of toTry) {
    try {
      return await callGeminiWithSearch(apiKey, systemInstruction, query, model);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const isModelError =
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("Invalid model") ||
        msg.includes("Model ") ||
        msg.includes("model not found");
      if (!isModelError) throw lastError;
      console.warn(`Model ${model} failed, trying next:`, msg);
    }
  }
  throw lastError ?? new Error("All models failed");
}

/** デフォルトの検索セグメント */
const DEFAULT_SEARCH_SEGMENTS = [
  "Leading Providers & Major Organizations (大手・有名事業者)",
  "Local & Community-Based Providers (地域密着・中小事業者)",
  "New Entrants & Growing Services (新規参入・成長中)",
  "Organizations Actively Hiring (採用強化中・拡大中)",
  "Established & Trusted Providers (実績豊富・老舗)",
];

/** AI研修ターゲット向け検索セグメント */
export const TRAINING_SEARCH_SEGMENTS = [
  "Companies hiring for DX or AI roles (DX推進・AI人材を採用中の企業)",
  "Companies mentioning AI or ChatGPT adoption (AI・ChatGPT導入を検討中の企業)",
  "Manufacturing & Construction companies with 20-500 employees (従業員20-500名の製造・建設企業)",
  "Professional services & Real estate firms seeking efficiency (業務効率化を目指す士業・不動産企業)",
  "Companies that received IT subsidies or DX grants (IT導入補助金・DX関連助成金の採択企業)",
];

export interface GeminiSearchResult {
  urls: Array<{ url: string; title: string; source: string; company?: string }>;
  queries: string[];
  sources: GeminiSearchSource[];
  summary: { totalFound: number; afterFilter: number; segments: number };
}

/**
 * AI研修ターゲット企業を検索（Gemini Google Search）
 * DX推進中・AI導入検討中・助成金対象の中小企業を発見
 */
export async function searchTrainingTargetsWithGemini(
  industry: string,
  region: string,
  keyword?: string,
  segments?: string[]
): Promise<GeminiSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const targetTopic = keyword?.trim()
    ? `"${keyword.trim()}"`
    : industry?.trim() || "Business";
  const regionLabel = region?.trim() || "Japan";
  const segList = segments && segments.length > 0 ? segments : TRAINING_SEARCH_SEGMENTS;

  const systemInstruction = `
You are a B2B lead generation expert finding companies in Japan that would benefit from AI training programs.
Target: Companies with 20-500 employees that are interested in AI/DX but haven't fully adopted it yet.
Key signals: DX hiring, efficiency initiatives, traditional industries modernizing.
- Use Google Search to verify existence and get contact information.
- Focus on companies with actual business websites (not media articles or directories).
- Return ONLY a valid JSON array. No markdown, no explanation.
`.trim();

  const allSources: GeminiSearchSource[] = [];
  const allQueries: string[] = [];

  for (const segment of segList) {
    const query = `
Find 8-12 distinct companies in ${regionLabel} related to: ${targetTopic}.

Segment Focus: ${segment}

Target companies that:
- Have 20-500 employees
- Are likely interested in AI training or digital transformation
- Have a corporate website with contact information

Use Google Search to verify they exist.
Return ONLY a valid JSON array. No markdown, no explanation.

Format each item: {"name": "...", "url": "...", "industry": "...", "region": "...", "address": "...", "phone": "...", "email": "...", "employee_estimate": "..."}
`.trim();

    try {
      const { groundingMetadata } = await callGeminiWithSearchWithFallback(
        apiKey,
        systemInstruction,
        query
      );

      if (groundingMetadata) {
        const extracted = extractSourcesFromMetadata(groundingMetadata, segment);
        allQueries.push(...extracted.queries);
        allSources.push(...extracted.sources);
      }
    } catch (err) {
      console.warn(`Training target search segment failed:`, err);
    }
  }

  // 重複排除
  const seenUrls = new Set<string>();
  const uniqueSources: GeminiSearchSource[] = [];
  for (const s of allSources) {
    const key = normalizeUrl(s.url);
    if (key && !seenUrls.has(key)) {
      seenUrls.add(key);
      uniqueSources.push(s);
    }
  }

  const urls = uniqueSources.map((s) => ({
    url: s.url,
    title: s.title || s.domain,
    source: `gemini_training:${s.segment}`,
    company: s.title || undefined,
  }));

  return {
    urls,
    queries: Array.from(new Set(allQueries.filter((q) => q))),
    sources: uniqueSources,
    summary: {
      totalFound: allSources.length,
      afterFilter: urls.length,
      segments: segList.length,
    },
  };
}

/**
 * Gemini Google Search で企業URLを検索
 */
export async function searchCompaniesWithGemini(
  industry: string,
  region: string,
  keyword?: string,
  segments?: string[]
): Promise<GeminiSearchResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const targetTopic = keyword?.trim()
    ? `"${keyword.trim()}"`
    : industry?.trim() || "Business";
  const regionLabel = region?.trim() || "Japan";
  const segList = segments && segments.length > 0 ? segments : DEFAULT_SEARCH_SEGMENTS;

  const systemInstruction = `
You are a lead generation expert finding REAL businesses and service providers in Japan.
- Use Google Search to verify existence and addresses.
- Include corporations, NPOs, facilities (事業所) as relevant.
- Return ONLY a valid JSON array. No markdown, no explanation.
`.trim();

  const allSources: GeminiSearchSource[] = [];
  const allQueries: string[] = [];

  for (const segment of segList) {
    const query = `
Find 8-12 distinct companies, organizations, or service providers in ${regionLabel} related to: ${targetTopic}.

Segment Focus: ${segment}

Use Google Search to verify they exist and get accurate addresses.
Return ONLY a valid JSON array. No markdown, no explanation.

Format each item: {"name": "...", "url": "...", "industry": "...", "region": "...", "address": "...", "phone": "...", "email": "..."}
`.trim();

    try {
      const { groundingMetadata } = await callGeminiWithSearchWithFallback(
        apiKey,
        systemInstruction,
        query
      );

      if (groundingMetadata) {
        const extracted = extractSourcesFromMetadata(groundingMetadata, segment);
        allQueries.push(...extracted.queries);
        allSources.push(...extracted.sources);
      }
    } catch (err) {
      console.warn(`Gemini search segment failed:`, err);
    }
  }

  // 重複排除
  const seenUrls = new Set<string>();
  const uniqueSources: GeminiSearchSource[] = [];
  for (const s of allSources) {
    const key = normalizeUrl(s.url);
    if (key && !seenUrls.has(key)) {
      seenUrls.add(key);
      uniqueSources.push(s);
    }
  }

  const urls = uniqueSources.map((s) => ({
    url: s.url,
    title: s.title || s.domain,
    source: `gemini:${s.segment}`,
    company: s.title || undefined,
  }));

  return {
    urls,
    queries: Array.from(new Set(allQueries.filter((q) => q))),
    sources: uniqueSources,
    summary: {
      totalFound: allSources.length,
      afterFilter: urls.length,
      segments: segList.length,
    },
  };
}
