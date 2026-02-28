import * as cheerio from "cheerio";

// ============================================================
// AIO Diagnosis Engine
// URL → LLMOスコア (0-100) + 弱点リスト + 改善提案
// ============================================================

export interface DiagnosisResult {
  score: number;
  breakdown: {
    coreWebVitals: number;    // max 25
    structuredData: number;    // max 20
    metaSeo: number;           // max 20
    eeat: number;              // max 15
    crawlability: number;      // max 10
    content: number;           // max 10
  };
  pagespeedData: PageSpeedData | null;
  htmlAnalysis: HtmlAnalysis;
  weaknesses: string[];
  suggestions: string[];
}

interface PageSpeedData {
  performanceScore: number;
  seoScore: number;
  lcp: number;
  cls: number;
  fid: number;
}

interface HtmlAnalysis {
  hasJsonLd: boolean;
  hasFaqSchema: boolean;
  hasHowToSchema: boolean;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  hasH1: boolean;
  h1Count: number;
  hasAuthorMarkup: boolean;
  hasDateModified: boolean;
  hasOgTags: boolean;
  hasCanonical: boolean;
  hasLangAttr: boolean;
  contentLength: number;
  internalLinkCount: number;
}

// ============================================================
// Main diagnosis function
// ============================================================
export async function runDiagnosis(url: string): Promise<DiagnosisResult> {
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
    : { hasSitemap: false, hasRobotsTxt: false };

  // Score each category
  const breakdown = {
    coreWebVitals: scoreCoreWebVitals(pagespeedData),
    structuredData: scoreStructuredData(htmlAnalysis),
    metaSeo: scoreMetaSeo(htmlAnalysis),
    eeat: scoreEeat(htmlAnalysis),
    crawlability: scoreCrawlability(crawl),
    content: scoreContent(htmlAnalysis),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Generate weaknesses and suggestions
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  generateInsights(breakdown, pagespeedData, htmlAnalysis, crawl, weaknesses, suggestions);

  return {
    score,
    breakdown,
    pagespeedData,
    htmlAnalysis,
    weaknesses,
    suggestions,
  };
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

// ============================================================
// 2. HTML Analysis (fetch + cheerio)
// ============================================================
async function checkHtml(url: string): Promise<HtmlAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AIOInsightBot/1.0)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Fetch error: ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // JSON-LD
    const jsonLdScripts = $('script[type="application/ld+json"]');
    const hasJsonLd = jsonLdScripts.length > 0;

    let hasFaqSchema = false;
    let hasHowToSchema = false;
    let hasAuthorMarkup = false;
    let hasDateModified = false;

    jsonLdScripts.each((_, el) => {
      try {
        const text = $(el).html() || "";
        const parsed = JSON.parse(text);
        const types = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of types) {
          const t = item["@type"] || "";
          if (t === "FAQPage" || t.includes("FAQ")) hasFaqSchema = true;
          if (t === "HowTo" || t.includes("HowTo")) hasHowToSchema = true;
          if (item.author) hasAuthorMarkup = true;
          if (item.dateModified) hasDateModified = true;
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

    // Date modified from meta
    if (!hasDateModified) {
      hasDateModified = $('meta[property="article:modified_time"]').length > 0
        || $('[itemprop="dateModified"]').length > 0;
    }

    // Meta description
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const hasMetaDescription = metaDesc.length > 0;
    const metaDescriptionLength = metaDesc.length;

    // H1
    const h1Count = $("h1").length;
    const hasH1 = h1Count > 0;

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

    // Internal links
    const baseHost = new URL(url).hostname;
    let internalLinkCount = 0;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseHost) internalLinkCount++;
      } catch {
        if (href.startsWith("/") || href.startsWith("#")) internalLinkCount++;
      }
    });

    return {
      hasJsonLd, hasFaqSchema, hasHowToSchema,
      hasMetaDescription, metaDescriptionLength,
      hasH1, h1Count,
      hasAuthorMarkup, hasDateModified,
      hasOgTags, hasCanonical,
      hasLangAttr, contentLength, internalLinkCount,
    };
  } catch {
    clearTimeout(timeout);
    throw new Error("HTML fetch timeout or error");
  }
}

// ============================================================
// 3. Crawlability check
// ============================================================
async function checkCrawlability(url: string): Promise<{ hasSitemap: boolean; hasRobotsTxt: boolean }> {
  const origin = new URL(url).origin;

  const [sitemapRes, robotsRes] = await Promise.allSettled([
    fetch(`${origin}/sitemap.xml`, { method: "HEAD", signal: AbortSignal.timeout(5000) }),
    fetch(`${origin}/robots.txt`, { method: "HEAD", signal: AbortSignal.timeout(5000) }),
  ]);

  const hasSitemap = sitemapRes.status === "fulfilled" && sitemapRes.value.ok;
  const hasRobotsTxt = robotsRes.status === "fulfilled" && robotsRes.value.ok;

  return { hasSitemap, hasRobotsTxt };
}

// ============================================================
// Scoring functions
// ============================================================

function scoreCoreWebVitals(data: PageSpeedData | null): number {
  if (!data) return 10; // Partial credit if API unavailable

  let score = 0;
  // LCP: good < 2500ms, needs improvement < 4000ms
  if (data.lcp < 2500) score += 10;
  else if (data.lcp < 4000) score += 5;

  // CLS: good < 0.1, needs improvement < 0.25
  if (data.cls < 0.1) score += 8;
  else if (data.cls < 0.25) score += 4;

  // FID: good < 100ms, needs improvement < 300ms
  if (data.fid < 100) score += 7;
  else if (data.fid < 300) score += 3;

  return score; // max 25
}

function scoreStructuredData(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasJsonLd) score += 10;
  if (html.hasFaqSchema) score += 5;
  if (html.hasHowToSchema) score += 5;
  return score; // max 20
}

function scoreMetaSeo(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasMetaDescription) {
    score += html.metaDescriptionLength >= 50 && html.metaDescriptionLength <= 160 ? 6 : 3;
  }
  if (html.hasH1) {
    score += html.h1Count === 1 ? 5 : 3; // Exactly 1 H1 is ideal
  }
  if (html.hasOgTags) score += 5;
  if (html.hasCanonical) score += 4;
  return score; // max 20
}

function scoreEeat(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasAuthorMarkup) score += 8;
  if (html.hasDateModified) score += 7;
  return score; // max 15
}

function scoreCrawlability(crawl: { hasSitemap: boolean; hasRobotsTxt: boolean }): number {
  let score = 0;
  if (crawl.hasSitemap) score += 5;
  if (crawl.hasRobotsTxt) score += 5;
  return score; // max 10
}

function scoreContent(html: HtmlAnalysis): number {
  let score = 0;
  if (html.hasLangAttr) score += 3;
  if (html.contentLength > 1000) score += 4;
  else if (html.contentLength > 300) score += 2;
  if (html.internalLinkCount >= 5) score += 3;
  else if (html.internalLinkCount >= 2) score += 1;
  return score; // max 10
}

// ============================================================
// Insight generation (Japanese)
// ============================================================
function generateInsights(
  breakdown: DiagnosisResult["breakdown"],
  pagespeed: PageSpeedData | null,
  html: HtmlAnalysis,
  crawl: { hasSitemap: boolean; hasRobotsTxt: boolean },
  weaknesses: string[],
  suggestions: string[],
) {
  // Core Web Vitals
  if (!pagespeed) {
    weaknesses.push("PageSpeed Insights APIでの計測に失敗しました");
    suggestions.push("サイトのアクセシビリティを確認し、外部からのアクセスが可能か確認してください");
  } else {
    if (pagespeed.lcp >= 4000) {
      weaknesses.push(`LCP（最大コンテンツ描画）が${(pagespeed.lcp / 1000).toFixed(1)}秒と遅い`);
      suggestions.push("画像の最適化、不要なJavaScriptの削減、サーバー応答時間の改善を検討してください");
    } else if (pagespeed.lcp >= 2500) {
      weaknesses.push(`LCPが${(pagespeed.lcp / 1000).toFixed(1)}秒で改善の余地あり`);
      suggestions.push("画像のWebP変換やCDN導入でLCPを2.5秒以下に改善できます");
    }
    if (pagespeed.cls >= 0.25) {
      weaknesses.push(`CLS（累積レイアウトシフト）が${pagespeed.cls.toFixed(3)}と大きい`);
      suggestions.push("画像やiframeにwidth/height属性を指定し、レイアウトシフトを防止してください");
    }
    if (pagespeed.fid >= 300) {
      weaknesses.push("FID（初回入力遅延）が300ms以上で応答性に問題あり");
      suggestions.push("重いJavaScriptの分割・遅延読み込みで応答性を改善してください");
    }
  }

  // Structured Data
  if (!html.hasJsonLd) {
    weaknesses.push("構造化データ（JSON-LD）が未実装です");
    suggestions.push("Organization, WebSite, BreadcrumbListなどのJSON-LDを追加し、AIが情報を正確に理解できるようにしましょう");
  }
  if (!html.hasFaqSchema) {
    weaknesses.push("FAQスキーマが未実装です");
    suggestions.push("よくある質問をFAQPage構造化データで実装すると、AIの回答に引用されやすくなります");
  }
  if (!html.hasHowToSchema) {
    weaknesses.push("HowToスキーマが未実装です");
    suggestions.push("手順解説コンテンツがある場合、HowTo構造化データを追加してAIへの露出を強化しましょう");
  }

  // Meta/SEO
  if (!html.hasMetaDescription) {
    weaknesses.push("メタディスクリプションが設定されていません");
    suggestions.push("50〜160文字の簡潔なメタディスクリプションを各ページに設定してください");
  } else if (html.metaDescriptionLength < 50 || html.metaDescriptionLength > 160) {
    weaknesses.push(`メタディスクリプションの長さが${html.metaDescriptionLength}文字で最適範囲外`);
    suggestions.push("メタディスクリプションは50〜160文字が最適です");
  }
  if (!html.hasH1) {
    weaknesses.push("H1見出しタグがありません");
    suggestions.push("各ページに1つのH1タグを設定し、ページの主題を明確にしてください");
  }
  if (!html.hasOgTags) {
    weaknesses.push("OGP（Open Graph）タグが未設定です");
    suggestions.push("og:title, og:description, og:imageを設定し、SNSやAIでの表示を改善しましょう");
  }
  if (!html.hasCanonical) {
    weaknesses.push("canonicalタグが未設定です");
    suggestions.push("重複コンテンツを防ぐためcanonical URLを設定してください");
  }

  // E-E-A-T
  if (!html.hasAuthorMarkup) {
    weaknesses.push("著者情報（E-E-A-T）のマークアップがありません");
    suggestions.push("記事の著者名・プロフィールを構造化データまたはmetaタグで明示し、信頼性を向上させましょう");
  }
  if (!html.hasDateModified) {
    weaknesses.push("更新日のマークアップがありません");
    suggestions.push("article:modified_timeメタタグや構造化データでコンテンツの鮮度を示してください");
  }

  // Crawlability
  if (!crawl.hasSitemap) {
    weaknesses.push("sitemap.xmlが見つかりません");
    suggestions.push("sitemap.xmlを生成し、検索エンジンとAIクローラーがサイトを効率的に巡回できるようにしましょう");
  }
  if (!crawl.hasRobotsTxt) {
    weaknesses.push("robots.txtが見つかりません");
    suggestions.push("robots.txtを設置し、クロールポリシーを明示してください");
  }

  // Content
  if (!html.hasLangAttr) {
    weaknesses.push("HTML言語属性（lang）が未設定です");
    suggestions.push("html要素にlang属性を追加し、コンテンツの言語を明示してください");
  }
  if (html.contentLength < 300) {
    weaknesses.push("ページのテキスト量が少なすぎます");
    suggestions.push("1,000文字以上の充実したコンテンツで、AIが引用しやすい情報量を確保しましょう");
  }
  if (html.internalLinkCount < 2) {
    weaknesses.push("内部リンクが不足しています");
    suggestions.push("関連ページへの内部リンクを5つ以上設置し、サイト構造をAIに理解させましょう");
  }
}

function getDefaultHtmlAnalysis(): HtmlAnalysis {
  return {
    hasJsonLd: false, hasFaqSchema: false, hasHowToSchema: false,
    hasMetaDescription: false, metaDescriptionLength: 0,
    hasH1: false, h1Count: 0,
    hasAuthorMarkup: false, hasDateModified: false,
    hasOgTags: false, hasCanonical: false,
    hasLangAttr: false, contentLength: 0, internalLinkCount: 0,
  };
}
