// lib/firecrawl.ts
// Firecrawl API クライアント（LeadGenius 統合）
// SPA・JS レンダリングサイトのスクレイピングに対応

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";

export interface FirecrawlResult {
  success: boolean;
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: { title?: string; description?: string };
}

/**
 * Firecrawl で URL をスクレイピング
 * @param url スクレイピング対象URL
 * @param formats 取得形式（markdown, html, links）
 */
export async function scrapeWithFirecrawl(
  url: string,
  formats: ("markdown" | "html" | "links")[] = ["markdown"]
): Promise<FirecrawlResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return { success: false };

  try {
    const resp = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats }),
    });

    if (!resp.ok) return { success: false };
    const data = await resp.json();
    if (!data.success) return { success: false };

    return {
      success: true,
      markdown: data.data?.markdown,
      html: data.data?.html,
      links: data.data?.links,
      metadata: data.data?.metadata,
    };
  } catch {
    return { success: false };
  }
}

const CRAWL_TIMEOUT_MS = 15000;
const CRAWL_MAX_CHARS = 12000;

/** HTMLからテキスト抽出 */
function extractTextFromHtml(html: string): string {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, CRAWL_MAX_CHARS);
}

/** JSON-LDのスキーマタイプを抽出 */
export function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        const t = item["@type"];
        if (t) {
          const list = Array.isArray(t) ? t : [t];
          list.forEach((x: string) => types.push(x));
        }
      }
    } catch {
      /* ignore */
    }
  }
  return Array.from(new Set(types));
}

/** 素のfetchによるフォールバッククロール */
async function fallbackCrawl(fullUrl: string): Promise<{
  success: boolean;
  summary?: string;
  html?: string;
  schemaTypes?: string[];
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);
  try {
    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIOInsightBot/1.0)" },
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();
    const text = extractTextFromHtml(html);
    const schemaTypes = extractSchemaTypes(html);

    if (!text || text.length < 50) {
      return { success: false, error: "十分なテキストを取得できませんでした", schemaTypes };
    }
    return { success: true, summary: text.slice(0, 3000), html, schemaTypes };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "クロール失敗" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 企業URLをクロール（Firecrawl優先、失敗時はfetchフォールバック） */
export async function crawlUrl(url: string): Promise<{
  success: boolean;
  summary?: string;
  html?: string;
  schemaTypes?: string[];
  links?: string[];
  error?: string;
}> {
  let fullUrl = url;
  if (!fullUrl.startsWith("http")) fullUrl = "https://" + fullUrl;

  const fc = await scrapeWithFirecrawl(fullUrl, ["markdown", "html", "links"]);
  if (fc.success && fc.markdown) {
    const schemaTypes = fc.html ? extractSchemaTypes(fc.html) : [];
    return {
      success: true,
      summary: fc.markdown.slice(0, 3000),
      html: fc.html,
      schemaTypes,
      links: fc.links,
    };
  }

  return fallbackCrawl(fullUrl);
}
