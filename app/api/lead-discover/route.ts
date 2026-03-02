// app/api/lead-discover/route.ts
// URL自動発見: 検索スクレイピング or CSV取込

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 60;

// ドメインブロックリスト（SNS・マーケットプレイス・メディア・政府サイト等を除外）
const BLOCKED_DOMAINS = new Set([
  "twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com",
  "linkedin.com", "amazon.co.jp", "rakuten.co.jp", "wikipedia.org",
  "tabelog.com", "hotpepper.jp", "indeed.com", "wantedly.com",
  "note.com", "qiita.com", "zenn.dev", "github.com", "yahoo.co.jp",
  "google.com", "tiktok.com", "pinterest.com", "google.co.jp",
  "bing.com", "duckduckgo.com",
]);

// パターンベースのブロック（政府・教育・自治体サイト）
const BLOCKED_DOMAIN_PATTERNS = [".go.jp", ".ac.jp", ".ed.jp", ".lg.jp"];

function isDomainBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_DOMAINS.has(host)) return true;
  for (const pattern of BLOCKED_DOMAIN_PATTERNS) {
    if (host.endsWith(pattern)) return true;
  }
  return false;
}

// URLからドメインを抽出
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// DuckDuckGo HTMLからURLを抽出
function extractUrlsFromDDG(html: string): { url: string; title: string }[] {
  const $ = cheerio.load(html);
  const results: { url: string; title: string }[] = [];

  $("a.result__a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().trim();

    // DuckDuckGoのリダイレクトURLからuddgパラメータをデコード
    let actualUrl = href;
    try {
      const parsed = new URL(href, "https://duckduckgo.com");
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) {
        actualUrl = decodeURIComponent(uddg);
      }
    } catch {
      // hrefが相対パスの場合はそのまま
    }

    // http/httpsのURLのみ
    if (actualUrl.startsWith("http")) {
      results.push({ url: actualUrl, title });
    }
  });

  return results;
}

// 検索クエリ生成
function buildSearchQueries(industry: string, region: string, keyword?: string): string[] {
  const queries: string[] = [
    `${industry} ${region} 企業 ホームページ`,
    `${industry} ${region} 会社 サイト`,
  ];
  if (keyword) {
    queries.push(`${keyword} ${industry} ${region}`);
  }
  return queries;
}

// DuckDuckGo HTML検索をfetch
async function searchDDG(query: string, page: number = 0): Promise<string> {
  const params = new URLSearchParams({ q: query });
  if (page > 0) {
    // DuckDuckGo paginates with 's' parameter (offset)
    params.set("s", String(page * 30));
    params.set("dc", String(page * 30 + 1));
  }

  const url = `https://html.duckduckgo.com/html/?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`DDG search failed: ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// スリープ
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CSV/URL テキストのパース
function parseCsvText(csvText: string): { url: string; company?: string; industry?: string; region?: string }[] {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // 最大100行
  const trimmed = lines.slice(0, 101); // +1 for possible header

  // ヘッダー行検出（演算子優先順位を明示）
  const firstLine = trimmed[0].toLowerCase();
  const hasHeader = firstLine.includes("url") || (!firstLine.includes("http") && (
    firstLine.includes("company") || firstLine.includes("会社") || firstLine.includes("業種") || firstLine.includes("industry")
  ));

  const dataLines = hasHeader ? trimmed.slice(1) : trimmed;
  const results: { url: string; company?: string; industry?: string; region?: string }[] = [];

  for (const line of dataLines.slice(0, 100)) {
    const trimLine = line.trim();
    if (!trimLine) continue;

    // URLのみ（1行1URL）のフォーマット検出
    if (!trimLine.includes(",") && !trimLine.includes("\t")) {
      let url = trimLine;
      if (!url.startsWith("http")) url = "https://" + url;
      try {
        new URL(url); // validate
        results.push({ url });
      } catch {
        // invalid URL skip
      }
      continue;
    }

    // CSV形式: url,company,industry,region
    const cols = trimLine.includes("\t") ? trimLine.split("\t") : trimLine.split(",");
    let url = (cols[0] || "").trim();
    if (!url) continue;
    if (!url.startsWith("http")) url = "https://" + url;

    try {
      new URL(url); // validate
      results.push({
        url,
        company: cols[1]?.trim() || undefined,
        industry: cols[2]?.trim() || undefined,
        region: cols[3]?.trim() || undefined,
      });
    } catch {
      // invalid URL skip
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === "search") {
      // === 検索スクレイピングモード ===
      const { industry, region, keyword } = body as {
        industry: string;
        region: string;
        keyword?: string;
      };

      if (!industry || !region) {
        return NextResponse.json({ error: "industry と region は必須です" }, { status: 400 });
      }

      const queries = buildSearchQueries(industry, region, keyword);
      const seenDomains = new Set<string>();
      const allUrls: { url: string; title: string; source: string }[] = [];

      for (const query of queries) {
        // 最大2ページ取得
        for (let page = 0; page < 2; page++) {
          try {
            const html = await searchDDG(query, page);
            const found = extractUrlsFromDDG(html);

            for (const item of found) {
              const domain = extractDomain(item.url);
              if (!domain) continue;
              if (isDomainBlocked(domain)) continue;
              if (seenDomains.has(domain)) continue;

              seenDomains.add(domain);
              allUrls.push({
                url: item.url,
                title: item.title || "",
                source: `search:${query}`,
              });
            }

            // ページ間の間隔（レート制限対策）
            if (page < 1) await sleep(1500);
          } catch {
            // 検索エラーはスキップ
            continue;
          }
        }

        // クエリ間の間隔
        await sleep(1500);
      }

      return NextResponse.json({
        urls: allUrls,
        summary: {
          totalFound: allUrls.length,
          afterFilter: allUrls.length,
          queries: queries.length,
        },
      });

    } else if (mode === "csv") {
      // === CSVモード ===
      const { csvText } = body as { csvText: string };

      if (!csvText || !csvText.trim()) {
        return NextResponse.json({ error: "csvText は必須です" }, { status: 400 });
      }

      const parsed = parseCsvText(csvText);

      // ドメイン単位で重複排除 + ブロックリストフィルタ
      const seenDomains = new Set<string>();
      const filtered: { url: string; title?: string; source: string; company?: string; industry?: string; region?: string }[] = [];

      for (const item of parsed) {
        const domain = extractDomain(item.url);
        if (!domain) continue;
        if (isDomainBlocked(domain)) continue;
        if (seenDomains.has(domain)) continue;

        seenDomains.add(domain);
        filtered.push({
          url: item.url,
          source: "csv",
          company: item.company,
          industry: item.industry,
          region: item.region,
        });
      }

      return NextResponse.json({
        urls: filtered,
        summary: {
          totalFound: parsed.length,
          afterFilter: filtered.length,
        },
      });

    } else {
      return NextResponse.json({ error: "mode は 'search' または 'csv' を指定してください" }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
