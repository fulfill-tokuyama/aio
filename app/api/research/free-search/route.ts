// app/api/research/free-search/route.ts
// パターン③: 無料API連携によるリード自動発見
// - 国税庁 法人番号公表サイト API（完全無料、登録不要）
// - Google Custom Search API 無料枠（100クエリ/日）

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 120;

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

// ====================================
// 方法A: 国税庁 法人番号API（完全無料）
// https://www.houjin-bangou.nta.go.jp/webapi/
// ====================================
type HoujinResult = {
  company: string;
  corporateNumber: string;
  address: string;
  url: string | null;
};

async function searchHoujinBangou(
  keyword: string,
  options: { prefecture?: string; from?: number; count?: number }
): Promise<{ results: HoujinResult[]; totalCount: number }> {
  const appId = process.env.HOUJIN_BANGOU_APP_ID;
  if (!appId) {
    return { results: [], totalCount: 0 };
  }

  const params = new URLSearchParams({
    id: appId,
    name: keyword,
    type: "12", // 02=法人のみ, 12=全種類
    mode: "2", // 部分一致
    kind: "04", // 04=JSON
    from: String(options.from || 1),
    count: String(options.count || 50),
  });
  if (options.prefecture) {
    // 都道府県コード
    const prefCode = PREF_CODE_MAP[options.prefecture];
    if (prefCode) params.set("address", prefCode);
  }

  const url = `https://api.houjin-bangou.nta.go.jp/4/name?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return { results: [], totalCount: 0 };
  const json = await res.json();

  const corps = json.corporations || [];
  const totalCount = json["count"] || 0;

  const results: HoujinResult[] = [];
  for (const corp of corps) {
    if (!corp.name) continue;
    results.push({
      company: corp.name,
      corporateNumber: corp.corporateNumber || "",
      address: [corp.prefectureName, corp.cityName, corp.streetNumber].filter(Boolean).join(""),
      url: null, // APIではURLは取得できない → Google検索で補完
    });
  }

  return { results, totalCount };
}

// ====================================
// 方法B: Google Custom Search API 無料枠
// 100クエリ/日の無料枠
// ====================================
type GoogleSearchResult = {
  company: string;
  url: string;
  snippet: string;
};

async function searchGoogle(
  query: string,
  maxResults: number
): Promise<GoogleSearchResult[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!apiKey || !cx) return [];

  const results: GoogleSearchResult[] = [];
  const perPage = 10; // Google CSEの上限

  for (let start = 1; start <= maxResults && start <= 91; start += perPage) {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      start: String(start),
      num: String(Math.min(perPage, maxResults - results.length)),
      lr: "lang_ja",
      cr: "countryJP",
    });

    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    if (!res.ok) break;
    const json = await res.json();

    for (const item of json.items || []) {
      const url = item.link;
      if (!url) continue;
      // 検索結果/SNS/ディレクトリページを除外
      if (/google\.|facebook\.|twitter\.|instagram\.|youtube\.|linkedin\.|wikipedia\./i.test(url)) continue;
      results.push({
        company: item.title?.replace(/ [-–|].*/g, "").trim() || domainToCompany(url),
        url: normalizeUrl(url),
        snippet: item.snippet || "",
      });
    }

    if (!json.queries?.nextPage) break;
  }

  return results;
}

// 都道府県名 → 都道府県コード
const PREF_CODE_MAP: Record<string, string> = {
  "東京": "13", "大阪": "27", "名古屋": "23", "愛知": "23",
  "福岡": "40", "札幌": "01", "北海道": "01", "仙台": "04",
  "宮城": "04", "横浜": "14", "神奈川": "14", "神戸": "28",
  "兵庫": "28", "京都": "26", "広島": "34",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      method,
      keyword,
      industries,
      regions,
      limit = 30,
    } = body as {
      method: "houjin" | "google" | "both";
      keyword?: string;
      industries?: string[];
      regions?: string[];
      limit?: number;
    };

    if (!method) {
      return NextResponse.json({ error: "method は必須です（houjin / google / both）" }, { status: 400 });
    }

    type ResultItem = {
      company: string;
      url: string | null;
      source: string;
      address?: string;
      snippet?: string;
      corporateNumber?: string;
    };
    const allResults: ResultItem[] = [];

    // 法人番号検索
    if (method === "houjin" || method === "both") {
      const appId = process.env.HOUJIN_BANGOU_APP_ID;
      if (!appId) {
        return NextResponse.json({
          error: "HOUJIN_BANGOU_APP_ID が未設定です。",
          setup: {
            steps: [
              "1. https://www.houjin-bangou.nta.go.jp/webapi/ にアクセス",
              "2. 「Web-API利用申請」から無料でアプリケーションIDを取得",
              "3. .env.local に HOUJIN_BANGOU_APP_ID=your_id を追加",
            ],
            cost: "完全無料（制限なし）",
          },
        }, { status: 400 });
      }

      const searchTerms: string[] = [];
      if (keyword) searchTerms.push(keyword);
      if (industries?.length) searchTerms.push(...industries);
      if (!searchTerms.length) searchTerms.push("株式会社");

      for (const term of searchTerms) {
        const region = regions?.[0];
        const { results } = await searchHoujinBangou(term, {
          prefecture: region,
          count: Math.min(limit, 50),
        });
        for (const r of results) {
          allResults.push({
            company: r.company,
            url: null,
            source: "法人番号API",
            address: r.address,
            corporateNumber: r.corporateNumber,
          });
        }
      }
    }

    // Google Custom Search
    if (method === "google" || method === "both") {
      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY;
      const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
      if (!apiKey || !cx) {
        if (method === "google") {
          return NextResponse.json({
            error: "Google Custom Search API の設定が必要です。",
            setup: {
              steps: [
                "1. Google Cloud Console で Custom Search API を有効化",
                "2. https://programmablesearchengine.google.com/ で検索エンジンを作成",
                "3. .env.local に以下を追加:",
                "   GOOGLE_CUSTOM_SEARCH_API_KEY=your_key",
                "   GOOGLE_CUSTOM_SEARCH_CX=your_cx",
              ],
              cost: "100クエリ/日 無料、追加は $5/1000クエリ",
            },
          }, { status: 400 });
        }
      } else {
        const queryParts: string[] = [];
        if (keyword) queryParts.push(keyword);
        if (industries?.length) queryParts.push(industries.join(" "));
        if (regions?.length) queryParts.push(regions.join(" "));
        if (!queryParts.length) queryParts.push("企業 公式サイト");
        queryParts.push("公式サイト");

        const searchResults = await searchGoogle(queryParts.join(" "), Math.min(limit, 30));
        for (const r of searchResults) {
          allResults.push({
            company: r.company,
            url: r.url,
            source: "Google検索",
            snippet: r.snippet,
          });
        }
      }
    }

    // URLがある結果のみフィルタ
    const withUrl = allResults.filter(r => r.url);

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

    const newResults = withUrl.filter(r => r.url && !existingUrls.has(r.url!));

    // DB挿入
    let insertedCount = 0;
    if (newResults.length > 0) {
      const dbRows = newResults.map(r => ({
        company: r.company,
        url: r.url!,
        industry: industries?.length === 1 ? industries[0] : null,
        region: regions?.length === 1 ? regions[0] : null,
        phase: "discovered",
        discovered_at: new Date().toISOString(),
        notes: `${r.source}で発見${r.snippet ? ` | ${r.snippet.slice(0, 100)}` : ""}`,
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
        withWebsite: withUrl.length,
        withoutWebsite: allResults.length - withUrl.length,
        inserted: insertedCount,
        duplicateSkipped: withUrl.length - newResults.length,
        sources: {
          houjin: allResults.filter(r => r.source === "法人番号API").length,
          google: allResults.filter(r => r.source === "Google検索").length,
        },
      },
      results: allResults.slice(0, 50).map(r => ({
        company: r.company,
        url: r.url,
        source: r.source,
        address: r.address,
        corporateNumber: r.corporateNumber,
        isNew: r.url ? !existingUrls.has(r.url) : false,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
