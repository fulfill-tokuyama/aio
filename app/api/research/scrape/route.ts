// app/api/research/scrape/route.ts
// パターン④: API不要のWebスクレイピングによるリード発見
// cheerio（既存依存）を使用して、業種別ディレクトリからURLを収集

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as cheerio from "cheerio";

export const maxDuration = 300;

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

function domainToCompany(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "").split(".")[0];
  } catch {
    return url;
  }
}

// 企業サイトのURLかどうか判定（SNS/大手サイトを除外）
const EXCLUDED_DOMAINS = new Set([
  "google.com", "google.co.jp", "facebook.com", "twitter.com",
  "instagram.com", "youtube.com", "linkedin.com", "wikipedia.org",
  "amazon.co.jp", "amazon.com", "yahoo.co.jp", "rakuten.co.jp",
  "tabelog.com", "hotpepper.jp", "gnavi.co.jp", "suumo.jp",
  "indeed.com", "en-japan.com", "recruit.co.jp", "mynavi.jp",
  "github.com", "qiita.com", "note.com", "zenn.dev",
]);

function isCompanyUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    // 除外ドメインチェック
    for (const excluded of Array.from(EXCLUDED_DOMAINS)) {
      if (host === excluded || host.endsWith(`.${excluded}`)) return false;
    }
    // 日本の企業サイト（.co.jp, .jp, .com）
    if (/\.(co\.jp|or\.jp|ne\.jp|jp|com)$/i.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

type ScrapedLead = {
  company: string;
  url: string;
  source: string;
  description?: string;
};

// ====================================
// スクレイピング: Google検索結果（HTMLパース）
// ====================================
async function scrapeGoogleSearch(query: string, maxResults: number): Promise<ScrapedLead[]> {
  const results: ScrapedLead[] = [];
  const seenUrls = new Set<string>();

  for (let start = 0; start < maxResults && start < 50; start += 10) {
    const searchUrl = `https://www.google.co.jp/search?q=${encodeURIComponent(query)}&start=${start}&hl=ja&num=10`;
    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ja,en;q=0.9",
        },
      });
      if (!res.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);

      // 検索結果のリンクを抽出
      $("a").each((_i: number, el: any) => {
        const href = $(el).attr("href") || "";
        // Google の /url?q= 形式のリンクを処理
        const match = href.match(/\/url\?q=(https?:\/\/[^&]+)/);
        const url = match ? decodeURIComponent(match[1]) : (href.startsWith("http") ? href : "");
        if (!url) return;

        const normalized = normalizeUrl(url);
        if (!normalized || seenUrls.has(normalized) || !isCompanyUrl(normalized)) return;
        seenUrls.add(normalized);

        const title = $(el).text().trim();
        results.push({
          company: title?.replace(/ [-–|].*/g, "").trim().slice(0, 100) || domainToCompany(normalized),
          url: normalized,
          source: "Google検索スクレイピング",
          description: title,
        });
      });
    } catch {
      break;
    }

    // レート制限回避
    await new Promise(r => setTimeout(r, 2000));
  }

  return results.slice(0, maxResults);
}

// ====================================
// スクレイピング: 任意のディレクトリページからURL抽出
// ====================================
async function scrapeDirectoryPage(directoryUrl: string): Promise<ScrapedLead[]> {
  const results: ScrapedLead[] = [];
  const seenUrls = new Set<string>();

  try {
    const res = await fetch(directoryUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en;q=0.9",
      },
    });
    if (!res.ok) return results;
    const html = await res.text();
    const $ = cheerio.load(html);

    // 外部リンクを全て抽出
    const baseHost = new URL(directoryUrl).hostname;
    $("a[href]").each((_i: number, el: any) => {
      const href = $(el).attr("href") || "";
      if (!href.startsWith("http")) return;

      try {
        const linkHost = new URL(href).hostname;
        if (linkHost === baseHost) return; // 内部リンクはスキップ
      } catch {
        return;
      }

      const normalized = normalizeUrl(href);
      if (!normalized || seenUrls.has(normalized) || !isCompanyUrl(normalized)) return;
      seenUrls.add(normalized);

      const text = $(el).text().trim();
      results.push({
        company: text?.slice(0, 100) || domainToCompany(normalized),
        url: normalized,
        source: `ディレクトリ: ${new URL(directoryUrl).hostname}`,
        description: text,
      });
    });
  } catch {
    // ページ取得失敗
  }

  return results;
}

// ====================================
// スクレイピング: 業種別ポータルサイト
// ====================================
const INDUSTRY_DIRECTORIES: Record<string, string[]> = {
  "IT・SaaS": [
    "https://boxil.jp/service_categories/",
    "https://it-trend.jp/",
  ],
  "製造業": [
    "https://www.ipros.jp/",
  ],
  "不動産": [
    "https://www.fudousan.or.jp/member/",
  ],
  "士業": [
    "https://www.nichibenren.or.jp/",
  ],
  "医療": [
    "https://www.med.or.jp/",
  ],
  "飲食": [
    "https://r.gnavi.co.jp/",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode,
      keyword,
      industries,
      regions,
      directoryUrls,
      limit = 30,
    } = body as {
      mode: "google" | "directory" | "both";
      keyword?: string;
      industries?: string[];
      regions?: string[];
      directoryUrls?: string[];
      limit?: number;
    };

    if (!mode) {
      return NextResponse.json({ error: "mode は必須です（google / directory / both）" }, { status: 400 });
    }

    const allResults: ScrapedLead[] = [];
    const seenUrls = new Set<string>();

    // Google検索スクレイピング
    if (mode === "google" || mode === "both") {
      const queryParts: string[] = [];
      if (keyword) queryParts.push(keyword);
      if (industries?.length) queryParts.push(industries.join(" "));
      if (regions?.length) queryParts.push(regions.join(" "));
      if (!queryParts.length) queryParts.push("企業 公式サイト");

      const searchResults = await scrapeGoogleSearch(
        queryParts.join(" ") + " 公式サイト",
        Math.min(limit, 30)
      );
      for (const r of searchResults) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
    }

    // ディレクトリスクレイピング
    if (mode === "directory" || mode === "both") {
      const urls: string[] = [];

      // ユーザー指定のディレクトリURL
      if (directoryUrls?.length) {
        urls.push(...directoryUrls);
      }

      // 業種別デフォルトディレクトリ
      if (industries?.length) {
        for (const ind of industries) {
          const dirs = INDUSTRY_DIRECTORIES[ind];
          if (dirs) urls.push(...dirs);
        }
      }

      for (const dirUrl of urls.slice(0, 5)) { // 最大5ページ
        const pageResults = await scrapeDirectoryPage(dirUrl);
        for (const r of pageResults) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
        // レート制限
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // 既存URLとの重複チェック
    const { data: existingData } = await supabaseAdmin
      .from("pipeline_leads")
      .select("url");
    const existingUrls = new Set<string>();
    if (existingData) {
      for (const r of existingData) {
        if (r.url) existingUrls.add(normalizeUrl(r.url));
      }
    }

    const newResults = allResults.filter(r => !existingUrls.has(r.url));
    const duplicateCount = allResults.length - newResults.length;

    // DB挿入
    let insertedCount = 0;
    const toInsert = newResults.slice(0, limit);
    if (toInsert.length > 0) {
      const dbRows = toInsert.map(r => ({
        company: r.company,
        url: r.url,
        industry: industries?.length === 1 ? industries[0] : null,
        region: regions?.length === 1 ? regions[0] : null,
        phase: "discovered",
        discovered_at: new Date().toISOString(),
        notes: `${r.source}${r.description ? ` | ${r.description.slice(0, 100)}` : ""}`,
      }));

      for (let i = 0; i < dbRows.length; i += 100) {
        const batch = dbRows.slice(i, i + 100);
        const { error } = await supabaseAdmin.from("pipeline_leads").insert(batch);
        if (!error) insertedCount += batch.length;
      }
    }

    return NextResponse.json({
      summary: {
        totalFound: allResults.length,
        inserted: insertedCount,
        duplicateSkipped: duplicateCount,
        sources: {
          google: allResults.filter(r => r.source.includes("Google")).length,
          directory: allResults.filter(r => r.source.includes("ディレクトリ")).length,
        },
      },
      results: allResults.slice(0, 50).map(r => ({
        company: r.company,
        url: r.url,
        source: r.source,
        isNew: !existingUrls.has(r.url),
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
