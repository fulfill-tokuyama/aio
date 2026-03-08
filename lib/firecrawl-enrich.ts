// lib/firecrawl-enrich.ts
// Firecrawl + Gemini による企業連絡先エンリッチ（LeadGenius 統合）

import { scrapeWithFirecrawl } from "./firecrawl";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const COMPANY_PAGE_PATTERNS = [
  /\/company\/?$/i,
  /\/about\/?$/i,
  /\/corporate\/?$/i,
  /\/corp\/?$/i,
  /\/profile\/?$/i,
  /\/overview\/?$/i,
  /\/info\/?$/i,
  /\/company[\-_]?(info|profile|overview)\/?$/i,
  /\/about[\-_]?us\/?$/i,
];

function findCompanyInfoUrl(links: string[], baseUrl: string): string | null {
  let baseHost: string;
  try {
    baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  for (const link of links) {
    try {
      const u = new URL(link);
      const linkHost = u.hostname.replace(/^www\./, "");
      if (linkHost !== baseHost) continue;
      const path = u.pathname;
      if (COMPANY_PAGE_PATTERNS.some((p) => p.test(path))) {
        return link;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export interface EnrichFields {
  contactEmail?: string;
  contactPhone?: string;
  representative?: string;
  contactName?: string;
  contactPosition?: string;
  foundedYear?: number;
  employeeCount?: string;
  capital?: string;
  description?: string;
}

/** Gemini でマークダウンから連絡先を抽出 */
async function extractFieldsFromMarkdown(
  apiKey: string,
  markdown: string,
  companyName: string
): Promise<EnrichFields> {
  const trimmed = markdown.slice(0, 4000);
  const prompt = `以下は「${companyName}」の企業サイトから取得したテキストです。
下記フィールドを抽出してください。不明な場合はnullとしてください。
JSONのみ出力（説明不要）:
{"email":"連絡先メールアドレス","phone":"代表電話番号","representative":"代表者名","contact_name":"問い合わせ担当者名","contact_position":"その役職","founded_year":設立年(数値),"employee_count":"従業員数(例:50名)","capital":"資本金(例:1000万円)","description":"事業内容を1文で"}

---
${trimmed}`;

  try {
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
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
      contactEmail:
        typeof parsed.email === "string" && parsed.email !== "null" ? parsed.email : undefined,
      contactPhone:
        typeof parsed.phone === "string" && parsed.phone !== "null" ? parsed.phone : undefined,
      representative:
        typeof parsed.representative === "string" && parsed.representative !== "null"
          ? parsed.representative
          : undefined,
      contactName:
        typeof parsed.contact_name === "string" && parsed.contact_name !== "null"
          ? parsed.contact_name
          : undefined,
      contactPosition:
        typeof parsed.contact_position === "string" && parsed.contact_position !== "null"
          ? parsed.contact_position
          : undefined,
      foundedYear:
        typeof parsed.founded_year === "number" ? parsed.founded_year : undefined,
      employeeCount:
        typeof parsed.employee_count === "string" && parsed.employee_count !== "null"
          ? parsed.employee_count
          : undefined,
      capital:
        typeof parsed.capital === "string" && parsed.capital !== "null" ? parsed.capital : undefined,
      description:
        typeof parsed.description === "string" && parsed.description !== "null"
          ? parsed.description
          : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * 企業URLを Firecrawl + Gemini でエンリッチ（contact_email が空の場合に使用）
 */
export async function enrichLeadContact(
  url: string,
  companyName: string
): Promise<EnrichFields> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || !firecrawlKey) return {};

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  const fc = await scrapeWithFirecrawl(fullUrl, ["markdown", "links"]);
  if (!fc.success || !fc.markdown || fc.markdown.length < 50) return {};

  let companyPageMarkdown = "";
  if (fc.links && fc.links.length > 0) {
    const companyInfoUrl = findCompanyInfoUrl(fc.links, fullUrl);
    if (companyInfoUrl) {
      const cpFc = await scrapeWithFirecrawl(companyInfoUrl, ["markdown"]);
      if (cpFc.success && cpFc.markdown) {
        companyPageMarkdown = cpFc.markdown;
      }
    }
  }

  const combinedMarkdown = companyPageMarkdown
    ? `[トップページ]\n${fc.markdown}\n\n[会社概要ページ]\n${companyPageMarkdown}`
    : fc.markdown;

  return extractFieldsFromMarkdown(apiKey, combinedMarkdown, companyName);
}
