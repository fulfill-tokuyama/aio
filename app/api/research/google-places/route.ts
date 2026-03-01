// app/api/research/google-places/route.ts
// パターン②: Google Places API (有料) によるリード自動発見

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 120;

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

// 業種 → Google Places タイプマッピング
const INDUSTRY_TYPE_MAP: Record<string, string[]> = {
  "IT・SaaS": ["software_company", "computer_store"],
  "製造業": ["factory", "industrial_area"],
  "不動産": ["real_estate_agency"],
  "士業": ["lawyer", "accounting", "insurance_agency"],
  "医療": ["hospital", "doctor", "dentist", "pharmacy"],
  "EC": ["store", "shopping_mall"],
  "飲食": ["restaurant", "cafe", "bar"],
  "教育": ["school", "university"],
  "人材": ["employment_agency"],
  "金融": ["bank", "finance"],
  "建設": ["general_contractor"],
  "物流": ["moving_company", "storage"],
};

// 地域 → 座標マッピング（日本の主要都市）
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  "東京": { lat: 35.6762, lng: 139.6503 },
  "大阪": { lat: 34.6937, lng: 135.5023 },
  "名古屋": { lat: 35.1815, lng: 136.9066 },
  "福岡": { lat: 33.5904, lng: 130.4017 },
  "札幌": { lat: 43.0618, lng: 141.3545 },
  "仙台": { lat: 38.2682, lng: 140.8694 },
  "横浜": { lat: 35.4437, lng: 139.6380 },
  "神戸": { lat: 34.6901, lng: 135.1956 },
  "京都": { lat: 35.0116, lng: 135.7681 },
  "広島": { lat: 34.3853, lng: 132.4553 },
};

type PlaceResult = {
  company: string;
  url: string | null;
  address: string | null;
  rating: number | null;
  placeId: string;
};

// Google Places API Text Search (New)
async function searchPlaces(
  query: string,
  region: string,
  apiKey: string,
  maxResults: number
): Promise<PlaceResult[]> {
  const coords = REGION_COORDS[region];
  const results: PlaceResult[] = [];

  // Text Search API を使用
  const searchUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const params = new URLSearchParams({
    query: `${query} ${region}`,
    key: apiKey,
    language: "ja",
    region: "jp",
  });
  if (coords) {
    params.set("location", `${coords.lat},${coords.lng}`);
    params.set("radius", "30000"); // 30km
  }

  let nextPageToken: string | undefined;
  let fetched = 0;

  while (fetched < maxResults) {
    const url = nextPageToken
      ? `${searchUrl}?pagetoken=${nextPageToken}&key=${apiKey}`
      : `${searchUrl}?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) break;
    const json = await res.json();

    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") break;

    for (const place of json.results || []) {
      if (fetched >= maxResults) break;
      results.push({
        company: place.name,
        url: null, // Text Searchではwebsite取得不可、Place Detailsで補完
        address: place.formatted_address || null,
        rating: place.rating || null,
        placeId: place.place_id,
      });
      fetched++;
    }

    nextPageToken = json.next_page_token;
    if (!nextPageToken) break;

    // Google APIはnext_page_tokenを使う前に少し待つ必要がある
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
}

// Place Details API でWebサイトURLを取得
async function getPlaceWebsite(placeId: string, apiKey: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website&key=${apiKey}&language=ja`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.result?.website || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      industries,
      regions,
      keyword,
      limit = 20,
    } = body as {
      industries: string[];
      regions: string[];
      keyword?: string;
      limit?: number;
    };

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GOOGLE_PLACES_API_KEY が未設定です。Google Cloud Console で Places API を有効化し、.env に追加してください。",
          setup: {
            steps: [
              "1. Google Cloud Console (https://console.cloud.google.com/) にアクセス",
              "2. 「APIとサービス」→「ライブラリ」で Places API を有効化",
              "3. 「認証情報」でAPIキーを作成",
              "4. .env.local に GOOGLE_PLACES_API_KEY=your_key を追加",
            ],
            estimatedCost: "Text Search: $32/1000リクエスト、Place Details: $17/1000リクエスト",
          },
        },
        { status: 400 }
      );
    }

    if (!industries?.length || !regions?.length) {
      return NextResponse.json({ error: "業種と地域は必須です" }, { status: 400 });
    }

    const maxPerQuery = Math.min(limit, 60);
    const allResults: PlaceResult[] = [];

    // 業種 × 地域の組み合わせで検索
    for (const industry of industries) {
      for (const region of regions) {
        const searchQuery = keyword
          ? `${keyword} ${industry} ${region}`
          : `${industry} ${region}`;
        const perQuery = Math.ceil(maxPerQuery / (industries.length * regions.length));
        const places = await searchPlaces(searchQuery, region, apiKey, perQuery);
        allResults.push(...places);
      }
    }

    // Place Details で website URL を取得（5件ずつバッチ処理）
    const DETAIL_BATCH = 5;
    for (let i = 0; i < allResults.length; i += DETAIL_BATCH) {
      const batch = allResults.slice(i, i + DETAIL_BATCH);
      const websites = await Promise.allSettled(
        batch.map(p => getPlaceWebsite(p.placeId, apiKey))
      );
      for (let j = 0; j < batch.length; j++) {
        const result = websites[j];
        if (result.status === "fulfilled" && result.value) {
          allResults[i + j].url = normalizeUrl(result.value);
        }
      }
    }

    // URL があるもののみフィルタ
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

    const newResults = withUrl.filter(r => r.url && !existingUrls.has(r.url));
    const duplicateCount = withUrl.length - newResults.length;

    // DB挿入
    let insertedCount = 0;
    if (newResults.length > 0) {
      const dbRows = newResults.map(r => ({
        company: r.company,
        url: r.url!,
        industry: industries.length === 1 ? industries[0] : null,
        region: regions.length === 1 ? regions[0] : null,
        phase: "discovered",
        discovered_at: new Date().toISOString(),
        notes: `Google Places API で発見${r.address ? ` | ${r.address}` : ""}${r.rating ? ` | 評価${r.rating}` : ""}`,
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
        inserted: insertedCount,
        duplicateSkipped: duplicateCount,
        noWebsite: allResults.length - withUrl.length,
      },
      results: withUrl.slice(0, 50).map(r => ({
        company: r.company,
        url: r.url,
        address: r.address,
        rating: r.rating,
        isNew: r.url ? !existingUrls.has(r.url) : false,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
