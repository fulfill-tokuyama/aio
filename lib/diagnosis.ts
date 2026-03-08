import * as cheerio from "cheerio";
import { crawlUrl } from "./firecrawl";
import { runAiTest, type AiTestResult } from "./diagnosis-ai-test";

// ============================================================
// AIO Diagnosis Engine
// URL → LLMOスコア (0-100) + 弱点リスト + 改善提案
// ============================================================

export interface Weakness {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  suggestion: string;
}

const SEVERITY_WEIGHT: Record<Weakness["severity"], number> = {
  critical: 4.0,
  high: 2.5,
  medium: 1.5,
  low: 0.5,
};

export interface DiagnosisResult {
  score: number;
  breakdown: {
    eeat: number;              // max 25
    contentQuality: number;    // max 25
    structuredData: number;    // max 20
    crawlability: number;      // max 15
    metaEntity: number;        // max 10
    techPerformance: number;   // max 5
  };
  pagespeedData: PageSpeedData | null;
  htmlAnalysis: HtmlAnalysis;
  weaknesses: string[];
  weaknessDetails: Weakness[];
  suggestions: string[];
  /** AI実測スコア（includeAiTest: true の場合のみ） */
  aiTest?: AiTestResult;
}

export interface RunDiagnosisOptions {
  /** AI実測を実行する（6プロンプト × Gemini、約40秒追加） */
  includeAiTest?: boolean;
  industry?: string;
  region?: string;
}

interface PageSpeedData {
  performanceScore: number;
  seoScore: number;
  lcp: number;
  cls: number;
  fid: number;
}

export interface HtmlAnalysis {
  title: string;
  hasJsonLd: boolean;
  hasFaqSchema: boolean;
  hasHowToSchema: boolean;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  hasH1: boolean;
  h1Count: number;
  hasAuthorMarkup: boolean;
  hasAuthorPageLink: boolean;
  hasDateModified: boolean;
  dateModifiedValue: string;
  hasOrganizationSchema: boolean;
  hasExternalCitations: boolean;
  hasOgTags: boolean;
  hasCanonical: boolean;
  hasLangAttr: boolean;
  contentLength: number;
  internalLinkCount: number;
  h2Count: number;
  h3Count: number;
  hasQAFormat: boolean;
  hasSemanticHtml: boolean;
  hasListStructure: boolean;
  hasBreadcrumbSchema: boolean;
  hasProductSchema: boolean;
  schemaTypeCount: number;
}

interface CrawlabilityResult {
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  aiBotsBlocked: boolean;
  isSSR: boolean;
}

// ============================================================
// Main diagnosis function
// ============================================================
export async function runDiagnosis(
  url: string,
  options?: RunDiagnosisOptions
): Promise<DiagnosisResult> {
  // Normalize URL
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }

  // Run 3 checks in parallel
  const [pagespeedResult, htmlResult, crawlResult] = await Promise.allSettled([
    checkPageSpeed(url),
    checkHtml(url),
    checkCrawlability(url),
  ]);

  const pagespeedData = pagespeedResult.status === "fulfilled" ? pagespeedResult.value : null;
  const htmlAnalysis = htmlResult.status === "fulfilled"
    ? htmlResult.value
    : getDefaultHtmlAnalysis();
  const crawl = crawlResult.status === "fulfilled"
    ? crawlResult.value
    : { hasSitemap: false, hasRobotsTxt: false, aiBotsBlocked: false, isSSR: false };

  // Score each category
  const breakdown = {
    eeat: scoreEeat(htmlAnalysis),
    contentQuality: scoreContentQuality(htmlAnalysis),
    structuredData: scoreStructuredData(htmlAnalysis),
    crawlability: scoreCrawlability(crawl, htmlAnalysis),
    metaEntity: scoreMetaEntity(htmlAnalysis),
    techPerformance: scoreTechPerformance(pagespeedData),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Generate weakness details
  const weaknessDetails = generateWeaknessDetails(htmlAnalysis, crawl, pagespeedData);
  const weaknesses = weaknessDetails.map(w => w.message);
  const suggestions = weaknessDetails.map(w => w.suggestion);

  const result: DiagnosisResult = {
    score,
    breakdown,
    pagespeedData,
    htmlAnalysis,
    weaknesses,
    weaknessDetails,
    suggestions,
  };

  // AI実測（オプション）
  if (options?.includeAiTest && htmlAnalysis.title) {
    try {
      const aiTest = await runAiTest(
        htmlAnalysis.title,
        options.industry || "",
        options.region || ""
      );
      result.aiTest = aiTest;
    } catch {
      // AI実測失敗時はスキップ
    }
  }

  return result;
}

// ============================================================
// 1. PageSpeed Insights API
// ============================================================
async function checkPageSpeed(url: string): Promise<PageSpeedData> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  const apiUrl = apiKey
    ? `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&category=seo&strategy=mobile&key=${apiKey}`
    : `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=performance&category=seo&strategy=mobile`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`);

    const data = await res.json();
    const lighthouse = data.lighthouseResult;

    const performanceScore = Math.round((lighthouse?.categories?.performance?.score ?? 0) * 100);
    const seoScore = Math.round((lighthouse?.categories?.seo?.score ?? 0) * 100);

    const audits = lighthouse?.audits ?? {};
    const lcp = audits["largest-contentful-paint"]?.numericValue ?? 0;
    const cls = audits["cumulative-layout-shift"]?.numericValue ?? 0;
    const fid = audits["max-potential-fid"]?.numericValue ?? 0;

    return { performanceScore, seoScore, lcp, cls, fid };
  } catch {
    clearTimeout(timeout);
    throw new Error("PageSpeed API timeout or error");
  }
}

/** fetch による HTML 取得（Firecrawl フォールバック用） */
async function fetchHtmlFallback(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIOInsightBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

// ============================================================
// 2. HTML Analysis (Firecrawl優先、失敗時はfetch+cheerio)
// ============================================================
async function checkHtml(url: string): Promise<HtmlAnalysis> {
  let html: string;

  // Firecrawl が設定されている場合は優先（SPA・JS レンダリング対応）
  if (process.env.FIRECRAWL_API_KEY) {
    const crawl = await crawlUrl(url);
    if (crawl.success && crawl.html) {
      html = crawl.html;
    } else {
      html = await fetchHtmlFallback(url);
    }
  } else {
    html = await fetchHtmlFallback(url);
  }

  if (!html) throw new Error("HTML取得に失敗しました");

  const $ = cheerio.load(html);

  // Title extraction (og:site_name preferred, fallback to <title> cleaned)
    const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
    const rawTitle = $("title").text().trim();
    const title = ogSiteName || rawTitle
      .replace(/[\|–—\-]\s*(ホーム|HOME|公式|トップ|TOP|Official).*/i, "")
      .trim() || rawTitle.split(/[\|–—\-]/)[0].trim();

    // JSON-LD
    const jsonLdScripts = $('script[type="application/ld+json"]');
    const hasJsonLd = jsonLdScripts.length > 0;

    let hasFaqSchema = false;
    let hasHowToSchema = false;
    let hasAuthorMarkup = false;
    let hasDateModified = false;
    let dateModifiedValue = "";
    let hasOrganizationSchema = false;
    let hasBreadcrumbSchema = false;
    let hasProductSchema = false;
    const schemaTypes = new Set<string>();

    jsonLdScripts.each((_, el) => {
      try {
        const text = $(el).html() || "";
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        const processItem = (item: Record<string, unknown>) => {
          const t = (item["@type"] || "") as string;
          if (t) schemaTypes.add(t);
          if (t === "FAQPage" || t.includes("FAQ")) hasFaqSchema = true;
          if (t === "HowTo" || t.includes("HowTo")) hasHowToSchema = true;
          if (t === "Organization" || t === "LocalBusiness") hasOrganizationSchema = true;
          if (t === "BreadcrumbList") hasBreadcrumbSchema = true;
          if (t === "Product" || t === "Service") hasProductSchema = true;
          if (item.author) hasAuthorMarkup = true;
          if (item.dateModified) {
            hasDateModified = true;
            dateModifiedValue = String(item.dateModified);
          }
          // Process @graph array
          if (Array.isArray(item["@graph"])) {
            for (const graphItem of item["@graph"] as Record<string, unknown>[]) {
              processItem(graphItem);
            }
          }
        };

        for (const item of items) {
          processItem(item);
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });

    // Author from meta tags or visible markup
    if (!hasAuthorMarkup) {
      hasAuthorMarkup = $('meta[name="author"]').length > 0
        || $('[rel="author"]').length > 0
        || $('[itemprop="author"]').length > 0;
    }

    // Author page link (rel="author" with href, or link to /author/ path)
    let hasAuthorPageLink = $('a[rel="author"]').length > 0;
    if (!hasAuthorPageLink) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (/\/author\//i.test(href) || /\/profile\//i.test(href) || /\/about\//i.test(href)) {
          hasAuthorPageLink = true;
          return false; // break
        }
      });
    }

    // Date modified from meta
    if (!hasDateModified) {
      const articleModified = $('meta[property="article:modified_time"]').attr("content") || "";
      const itempropDate = $('[itemprop="dateModified"]').attr("content") || $('[itemprop="dateModified"]').text().trim();
      if (articleModified) {
        hasDateModified = true;
        dateModifiedValue = articleModified;
      } else if (itempropDate) {
        hasDateModified = true;
        dateModifiedValue = itempropDate;
      }
    }

    // Meta description
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const hasMetaDescription = metaDesc.length > 0;
    const metaDescriptionLength = metaDesc.length;

    // H1
    const h1Count = $("h1").length;
    const hasH1 = h1Count > 0;

    // H2 and H3 counts
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;

    // Q&A format detection
    const hasQAFormat = $("details").length > 0
      || $("summary").length > 0
      || $('[itemtype*="Question"]').length > 0
      || $('[class*="faq"]').length > 0
      || $('[class*="FAQ"]').length > 0
      || $('[id*="faq"]').length > 0
      || hasFaqSchema;

    // Semantic HTML check (article, section, nav, main, aside, header, footer)
    const hasSemanticHtml = $("article").length > 0
      || $("section").length > 0
      || ($("main").length > 0 && $("nav").length > 0);

    // List structure
    const hasListStructure = $("ul li").length >= 3 || $("ol li").length >= 2;

    // OG tags
    const hasOgTags = $('meta[property="og:title"]').length > 0
      && $('meta[property="og:description"]').length > 0;

    // Canonical
    const hasCanonical = $('link[rel="canonical"]').length > 0;

    // Language
    const langAttr = $("html").attr("lang") || "";
    const hasLangAttr = langAttr.length > 0;

    // Content length (body text)
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const contentLength = bodyText.length;

    // Internal links and external citations
    const baseHost = new URL(url).hostname;
    let internalLinkCount = 0;
    let hasExternalCitations = false;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseHost) {
          internalLinkCount++;
        } else if (linkUrl.protocol.startsWith("http")) {
          hasExternalCitations = true;
        }
      } catch {
        if (href.startsWith("/") || href.startsWith("#")) internalLinkCount++;
      }
    });

    return {
      title,
      hasJsonLd, hasFaqSchema, hasHowToSchema,
      hasMetaDescription, metaDescriptionLength,
      hasH1, h1Count,
      hasAuthorMarkup, hasAuthorPageLink,
      hasDateModified, dateModifiedValue,
      hasOrganizationSchema, hasExternalCitations,
      hasOgTags, hasCanonical,
      hasLangAttr, contentLength, internalLinkCount,
      h2Count, h3Count,
      hasQAFormat, hasSemanticHtml, hasListStructure,
      hasBreadcrumbSchema, hasProductSchema,
      schemaTypeCount: schemaTypes.size,
    };
}

// ============================================================
// 3. Crawlability check (with AI bot block detection)
// ============================================================
async function checkCrawlability(url: string): Promise<CrawlabilityResult> {
  const origin = new URL(url).origin;

  const [sitemapRes, robotsRes] = await Promise.allSettled([
    fetch(`${origin}/sitemap.xml`, { method: "HEAD", signal: AbortSignal.timeout(5000) }),
    fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) }),
  ]);

  const hasSitemap = sitemapRes.status === "fulfilled" && sitemapRes.value.ok;
  const hasRobotsTxt = robotsRes.status === "fulfilled" && robotsRes.value.ok;

  // AI bot block detection
  let aiBotsBlocked = false;
  if (robotsRes.status === "fulfilled" && robotsRes.value.ok) {
    try {
      const robotsText = await robotsRes.value.text();
      const lower = robotsText.toLowerCase();
      // Check for common AI bot user agents being disallowed
      const aiAgents = ["gptbot", "chatgpt", "claudebot", "claude-web", "anthropic", "google-extended", "ccbot", "bingbot"];

      // robots.txtをブロック単位で解析（User-agentごとに区切る）
      const blocks = robotsText.split(/(?=user-agent\s*:)/i);
      for (const block of blocks) {
        const blockLower = block.toLowerCase();
        for (const agent of aiAgents) {
          if (blockLower.includes(`user-agent:`) &&
              blockLower.match(new RegExp(`user-agent:\\s*${agent}`, "i")) &&
              /disallow:\s*\/\s*$/m.test(blockLower)) {
            aiBotsBlocked = true;
            break;
          }
        }
        if (aiBotsBlocked) break;
      }
    } catch {
      // ignore read errors
    }
  }

  // SSR detection: check if main page HTML has substantial text content
  // This is approximated - if contentLength > 200 from checkHtml, it's SSR
  // We'll set isSSR = true by default and let the caller override based on contentLength
  const isSSR = true; // Default; overridden in scoring based on contentLength

  return { hasSitemap, hasRobotsTxt, aiBotsBlocked, isSSR };
}

// ============================================================
// Scoring functions (new LLMO-optimized allocations)
// ============================================================

// E-E-A-T (max 25): 著者マークアップ(7) + 著者ページリンク(3) + 更新日(5) + 鮮度(5) + Organization(3) + 外部引用(2)
function scoreEeat(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasAuthorMarkup) score += 7;
  if (html.hasAuthorPageLink) score += 3;
  if (html.hasDateModified) score += 5;

  // Freshness score based on dateModifiedValue
  if (html.dateModifiedValue) {
    const modified = new Date(html.dateModifiedValue);
    const now = new Date();
    const daysDiff = (now.getTime() - modified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 90) score += 5;
    else if (daysDiff <= 180) score += 3;
    else if (daysDiff <= 365) score += 1;
    // > 365 days: 0 points
  }

  if (html.hasOrganizationSchema) score += 3;
  if (html.hasExternalCitations) score += 2;
  return score; // max 25
}

// コンテンツ品質・構造 (max 25): テキスト量(5) + H2+H3階層(5) + Q&A形式(4) + lang属性(2) + 内部リンク数(4) + セマンティックHTML(3) + リスト構造(2)
function scoreContentQuality(html: HtmlAnalysis): number {
  let score = 0;

  // Text volume
  if (html.contentLength >= 3000) score += 5;
  else if (html.contentLength >= 1500) score += 3;

  // Heading hierarchy (H2 + H3)
  if (html.h2Count >= 3 && html.h3Count >= 2) score += 5;
  else if (html.h2Count >= 2) score += 3;
  else if (html.h2Count >= 1) score += 1;

  // Q&A format
  if (html.hasQAFormat) score += 4;

  // Language attribute
  if (html.hasLangAttr) score += 2;

  // Internal links
  if (html.internalLinkCount >= 5) score += 4;
  else if (html.internalLinkCount >= 3) score += 2;
  else if (html.internalLinkCount >= 1) score += 1;

  // Semantic HTML
  if (html.hasSemanticHtml) score += 3;

  // List structure
  if (html.hasListStructure) score += 2;

  return score; // max 25
}

// 構造化データ (max 20): JSON-LD(5) + スキーマ種類数(6) + FAQ(3) + HowTo(2) + BreadcrumbList(2) + Product/Service(2)
function scoreStructuredData(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasJsonLd) score += 5;

  // Schema type count
  if (html.schemaTypeCount >= 4) score += 6;
  else if (html.schemaTypeCount === 3) score += 4;
  else if (html.schemaTypeCount === 2) score += 3;

  if (html.hasFaqSchema) score += 3;
  if (html.hasHowToSchema) score += 2;
  if (html.hasBreadcrumbSchema) score += 2;
  if (html.hasProductSchema) score += 2;
  return score; // max 20
}

// AIクローラビリティ (max 15): sitemap(4) + robots.txt(3) + AIボット非ブロック(3) + SSR(3) + canonical(2)
function scoreCrawlability(crawl: CrawlabilityResult, html: HtmlAnalysis): number {
  let score = 0;
  if (crawl.hasSitemap) score += 4;
  if (crawl.hasRobotsTxt) score += 3;
  if (!crawl.aiBotsBlocked) score += 3;

  // SSR check: if content length >= 200, assume server-rendered
  if (html.contentLength >= 200) score += 3;

  if (html.hasCanonical) score += 2;
  return score; // max 15
}

// メタ・エンティティ (max 10): メタディスクリプション(3) + H1(2) + OGP(3) + ブランド一貫性(2)
function scoreMetaEntity(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasMetaDescription) score += 3;
  if (html.hasH1 && html.h1Count === 1) score += 2;
  else if (html.hasH1) score += 1;
  if (html.hasOgTags) score += 3;

  // Brand consistency: title exists and OG tags exist
  if (html.title && html.hasOgTags && html.hasMetaDescription) score += 2;
  return score; // max 10
}

// 技術パフォーマンス (max 5): PageSpeed SEOスコア(3) + 基本CWV(2)
function scoreTechPerformance(data: PageSpeedData | null): number {
  if (!data) return 2; // Partial credit if API unavailable

  let score = 0;
  // PageSpeed SEO score
  if (data.seoScore >= 90) score += 3;
  else if (data.seoScore >= 70) score += 2;
  else if (data.seoScore >= 50) score += 1;

  // Basic CWV (LCP + CLS combined)
  const lcpOk = data.lcp < 2500;
  const clsOk = data.cls < 0.1;
  if (lcpOk && clsOk) score += 2;
  else if (lcpOk || clsOk) score += 1;

  return score; // max 5
}

// ============================================================
// Weakness detail generation (Japanese) with severity
// ============================================================
function generateWeaknessDetails(
  html: HtmlAnalysis,
  crawl: CrawlabilityResult,
  pagespeed: PageSpeedData | null,
): Weakness[] {
  const weaknesses: Weakness[] = [];

  // --- CRITICAL ---
  if (!html.hasJsonLd) {
    weaknesses.push({
      id: "no-jsonld",
      severity: "critical",
      message: "構造化データ（JSON-LD）が未実装です",
      suggestion: "Organization, WebSite, BreadcrumbListなどのJSON-LDを追加し、AIが情報を正確に理解できるようにしましょう",
    });
  }
  if (!html.hasAuthorMarkup) {
    weaknesses.push({
      id: "no-author",
      severity: "critical",
      message: "著者情報（E-E-A-T）のマークアップがありません",
      suggestion: "記事の著者名・プロフィールを構造化データまたはmetaタグで明示し、信頼性を向上させましょう",
    });
  }
  if (html.hasDateModified && html.dateModifiedValue) {
    const modified = new Date(html.dateModifiedValue);
    const daysDiff = (new Date().getTime() - modified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      weaknesses.push({
        id: "stale-content",
        severity: "critical",
        message: `コンテンツが${Math.floor(daysDiff)}日間更新されておらず、鮮度が非常に低い`,
        suggestion: "AI検索は最新の情報を優先します。定期的にコンテンツを見直し、最新情報に更新しましょう",
      });
    }
  }
  if (html.contentLength < 500) {
    weaknesses.push({
      id: "very-thin-content",
      severity: "critical",
      message: "ページのテキスト量が極端に少ない（500文字未満）",
      suggestion: "AIが引用するには十分な情報量が必要です。3,000文字以上の充実したコンテンツを作成しましょう",
    });
  }
  if (crawl.aiBotsBlocked) {
    weaknesses.push({
      id: "ai-bots-blocked",
      severity: "critical",
      message: "robots.txtでAIボット（GPTBot/ClaudeBot等）がブロックされています",
      suggestion: "AIクローラーへのアクセスを許可して、AI検索結果に表示されるようにしましょう",
    });
  }

  // --- HIGH ---
  if (!html.hasDateModified) {
    weaknesses.push({
      id: "no-date-modified",
      severity: "high",
      message: "更新日のマークアップがありません",
      suggestion: "article:modified_timeメタタグや構造化データでコンテンツの鮮度を示してください",
    });
  }
  if (html.h2Count === 0) {
    weaknesses.push({
      id: "no-heading-hierarchy",
      severity: "high",
      message: "見出し階層（H2）がありません",
      suggestion: "H2・H3で情報を構造化し、AIがコンテンツの論理構造を理解できるようにしましょう",
    });
  }
  if (!html.hasFaqSchema) {
    weaknesses.push({
      id: "no-faq-schema",
      severity: "high",
      message: "FAQスキーマが未実装です",
      suggestion: "よくある質問をFAQPage構造化データで実装すると、AIの回答に引用されやすくなります",
    });
  }
  if (!crawl.hasSitemap) {
    weaknesses.push({
      id: "no-sitemap",
      severity: "high",
      message: "sitemap.xmlが見つかりません",
      suggestion: "sitemap.xmlを生成し、検索エンジンとAIクローラーがサイトを効率的に巡回できるようにしましょう",
    });
  }
  if (html.hasJsonLd && html.schemaTypeCount < 2) {
    weaknesses.push({
      id: "low-schema-diversity",
      severity: "high",
      message: "スキーマの種類が不足しています（1種類のみ）",
      suggestion: "Organization, BreadcrumbList, FAQPageなど複数のスキーマタイプを実装してAIの理解を深めましょう",
    });
  }
  if (!html.hasSemanticHtml) {
    weaknesses.push({
      id: "no-semantic-html",
      severity: "high",
      message: "セマンティックHTML（article/section/main）が使用されていません",
      suggestion: "article, section, main, nav等のセマンティックタグを使い、コンテンツの意味構造を明示しましょう",
    });
  }
  if (!html.hasOrganizationSchema) {
    weaknesses.push({
      id: "no-organization-schema",
      severity: "high",
      message: "Organization/LocalBusinessスキーマがありません",
      suggestion: "Organizationスキーマで企業・団体情報を構造化し、エンティティとしてAIに認識させましょう",
    });
  }

  // --- MEDIUM ---
  if (html.contentLength >= 500 && html.contentLength < 1500) {
    weaknesses.push({
      id: "moderate-content",
      severity: "medium",
      message: "コンテンツ量が中程度です（1,500文字未満）",
      suggestion: "AIが十分に引用できるよう、3,000文字以上のコンテンツを目指しましょう",
    });
  }
  if (!html.hasQAFormat) {
    weaknesses.push({
      id: "no-qa-format",
      severity: "medium",
      message: "Q&A形式のコンテンツがありません",
      suggestion: "FAQやQ&A形式で情報を整理すると、AI検索での引用率が向上します",
    });
  }
  if (!html.hasHowToSchema) {
    weaknesses.push({
      id: "no-howto-schema",
      severity: "medium",
      message: "HowToスキーマが未実装です",
      suggestion: "手順解説コンテンツがある場合、HowTo構造化データを追加してAIへの露出を強化しましょう",
    });
  }
  if (!crawl.hasRobotsTxt) {
    weaknesses.push({
      id: "no-robots-txt",
      severity: "medium",
      message: "robots.txtが見つかりません",
      suggestion: "robots.txtを設置し、クロールポリシーを明示してください",
    });
  }
  if (!html.hasMetaDescription) {
    weaknesses.push({
      id: "no-meta-description",
      severity: "medium",
      message: "メタディスクリプションが設定されていません",
      suggestion: "50〜160文字の簡潔なメタディスクリプションを各ページに設定してください",
    });
  }
  if (html.internalLinkCount < 3) {
    weaknesses.push({
      id: "low-internal-links",
      severity: "medium",
      message: "内部リンクが不足しています",
      suggestion: "関連ページへの内部リンクを5つ以上設置し、サイト構造をAIに理解させましょう",
    });
  }
  if (!html.hasExternalCitations) {
    weaknesses.push({
      id: "no-external-citations",
      severity: "medium",
      message: "外部引用リンクがありません",
      suggestion: "権威あるソースへの外部リンクを追加して、コンテンツの信頼性を高めましょう",
    });
  }
  if (html.h2Count > 0 && html.h3Count === 0) {
    weaknesses.push({
      id: "no-h3",
      severity: "medium",
      message: "H3見出しがなく、見出し階層が浅い",
      suggestion: "H3を使ってH2の下に詳細な小見出しを追加し、コンテンツの階層構造を深めましょう",
    });
  }
  if (!html.hasBreadcrumbSchema) {
    weaknesses.push({
      id: "no-breadcrumb",
      severity: "medium",
      message: "BreadcrumbListスキーマがありません",
      suggestion: "パンくずリストの構造化データを追加して、サイト階層をAIに理解させましょう",
    });
  }
  if (html.contentLength < 200) {
    weaknesses.push({
      id: "js-dependent",
      severity: "medium",
      message: "コンテンツが非常に少なく、JavaScriptに依存している可能性があります",
      suggestion: "SSR（サーバーサイドレンダリング）を導入して、AIクローラーがコンテンツを読み取れるようにしましょう",
    });
  }

  // --- LOW ---
  if (!html.hasOgTags) {
    weaknesses.push({
      id: "no-ogp",
      severity: "low",
      message: "OGP（Open Graph）タグが未設定です",
      suggestion: "og:title, og:description, og:imageを設定し、SNSやAIでの表示を改善しましょう",
    });
  }
  if (!html.hasLangAttr) {
    weaknesses.push({
      id: "no-lang",
      severity: "low",
      message: "HTML言語属性（lang）が未設定です",
      suggestion: "html要素にlang属性を追加し、コンテンツの言語を明示してください",
    });
  }
  if (!html.hasH1) {
    weaknesses.push({
      id: "no-h1",
      severity: "low",
      message: "H1見出しタグがありません",
      suggestion: "各ページに1つのH1タグを設定し、ページの主題を明確にしてください",
    });
  }
  if (html.hasMetaDescription && (html.metaDescriptionLength < 50 || html.metaDescriptionLength > 160)) {
    weaknesses.push({
      id: "meta-length-suboptimal",
      severity: "low",
      message: `メタディスクリプションの長さが${html.metaDescriptionLength}文字で最適範囲外`,
      suggestion: "メタディスクリプションは50〜160文字が最適です",
    });
  }
  if (html.h1Count > 1) {
    weaknesses.push({
      id: "multiple-h1",
      severity: "low",
      message: `H1タグが${html.h1Count}個あります（推奨は1つ）`,
      suggestion: "H1タグは1ページに1つに統一し、ページの主題を明確にしてください",
    });
  }
  if (!html.hasListStructure) {
    weaknesses.push({
      id: "no-list",
      severity: "low",
      message: "リスト構造（ul/ol）がありません",
      suggestion: "箇条書きや番号付きリストでコンテンツを整理すると、AIが情報を抽出しやすくなります",
    });
  }
  if (!html.hasCanonical) {
    weaknesses.push({
      id: "no-canonical",
      severity: "low",
      message: "canonicalタグが未設定です",
      suggestion: "重複コンテンツを防ぐためcanonical URLを設定してください",
    });
  }
  // Brand inconsistency
  if (html.title && (!html.hasOgTags || !html.hasMetaDescription)) {
    weaknesses.push({
      id: "brand-inconsistency",
      severity: "low",
      message: "ブランド情報の一貫性が不足しています（タイトル・OGP・メタ不揃い）",
      suggestion: "タイトル、OGPタグ、メタディスクリプションでブランド名を統一的に使用しましょう",
    });
  }
  if (pagespeed && (pagespeed.lcp >= 4000 || pagespeed.cls >= 0.25)) {
    weaknesses.push({
      id: "cwv-issues",
      severity: "low",
      message: "Core Web Vitalsに問題があります（LCPまたはCLS）",
      suggestion: "画像最適化やレイアウトシフト防止でCWVを改善してください",
    });
  }
  if (!html.hasAuthorPageLink && html.hasAuthorMarkup) {
    weaknesses.push({
      id: "no-author-page",
      severity: "low",
      message: "著者ページへのリンクがありません",
      suggestion: "著者のプロフィールページへのリンクを追加して、E-E-A-Tシグナルを強化しましょう",
    });
  }

  return weaknesses;
}

function getDefaultHtmlAnalysis(): HtmlAnalysis {
  return {
    title: "",
    hasJsonLd: false, hasFaqSchema: false, hasHowToSchema: false,
    hasMetaDescription: false, metaDescriptionLength: 0,
    hasH1: false, h1Count: 0,
    hasAuthorMarkup: false, hasAuthorPageLink: false,
    hasDateModified: false, dateModifiedValue: "",
    hasOrganizationSchema: false, hasExternalCitations: false,
    hasOgTags: false, hasCanonical: false,
    hasLangAttr: false, contentLength: 0, internalLinkCount: 0,
    h2Count: 0, h3Count: 0,
    hasQAFormat: false, hasSemanticHtml: false, hasListStructure: false,
    hasBreadcrumbSchema: false, hasProductSchema: false, schemaTypeCount: 0,
  };
}
