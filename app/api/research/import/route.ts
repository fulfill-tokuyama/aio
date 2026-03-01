// app/api/research/import/route.ts
// パターン①: ユーザーが所有するURLリスト（CSV/テキスト）のインポート

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

// CSVの1行をパース（カンマ区切り、クオート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// URLカラムを自動検出
function detectColumns(headers: string[]): { urlIdx: number; companyIdx: number; industryIdx: number; regionIdx: number } {
  const lower = headers.map(h => h.toLowerCase().trim());
  const urlIdx = lower.findIndex(h =>
    ["url", "website", "ウェブサイト", "サイト", "ホームページ", "hp", "link"].includes(h)
  );
  const companyIdx = lower.findIndex(h =>
    ["company", "会社", "会社名", "企業名", "企業", "name", "社名"].includes(h)
  );
  const industryIdx = lower.findIndex(h =>
    ["industry", "業種", "業界", "カテゴリ", "category"].includes(h)
  );
  const regionIdx = lower.findIndex(h =>
    ["region", "地域", "エリア", "都道府県", "所在地", "location", "住所"].includes(h)
  );
  return { urlIdx, companyIdx, industryIdx, regionIdx };
}

type ImportRow = {
  company: string;
  url: string;
  industry: string | null;
  region: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, format } = body as {
      content: string;
      format: "csv" | "text" | "auto";
    };

    if (!content?.trim()) {
      return NextResponse.json({ error: "コンテンツが空です" }, { status: 400 });
    }

    const lines = content.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) {
      return NextResponse.json({ error: "有効な行がありません" }, { status: 400 });
    }

    const rows: ImportRow[] = [];
    const detectedFormat = format === "auto"
      ? (lines[0].includes(",") || lines[0].includes("\t") ? "csv" : "text")
      : format;

    if (detectedFormat === "csv") {
      // CSV解析: ヘッダー行 + データ行
      const separator = lines[0].includes("\t") ? "\t" : ",";
      const headers = separator === "\t"
        ? lines[0].split("\t").map(h => h.trim())
        : parseCSVLine(lines[0]);
      const { urlIdx, companyIdx, industryIdx, regionIdx } = detectColumns(headers);

      if (urlIdx === -1) {
        // ヘッダーなし: 1列目をURL、2列目を会社名と推定
        for (const line of lines) {
          const cols = separator === "\t" ? line.split("\t").map(c => c.trim()) : parseCSVLine(line);
          const url = normalizeUrl(cols[0] || "");
          if (!url) continue;
          rows.push({
            url,
            company: cols[1]?.trim() || domainToCompany(url),
            industry: cols[2]?.trim() || null,
            region: cols[3]?.trim() || null,
          });
        }
      } else {
        // ヘッダーあり: マッピングに基づいて解析
        for (let i = 1; i < lines.length; i++) {
          const cols = separator === "\t" ? lines[i].split("\t").map(c => c.trim()) : parseCSVLine(lines[i]);
          const url = normalizeUrl(cols[urlIdx] || "");
          if (!url) continue;
          rows.push({
            url,
            company: (companyIdx >= 0 ? cols[companyIdx]?.trim() : "") || domainToCompany(url),
            industry: industryIdx >= 0 ? cols[industryIdx]?.trim() || null : null,
            region: regionIdx >= 0 ? cols[regionIdx]?.trim() || null : null,
          });
        }
      }
    } else {
      // テキスト: 1行1URL
      for (const line of lines) {
        const url = normalizeUrl(line);
        if (!url) continue;
        rows.push({
          url,
          company: domainToCompany(url),
          industry: null,
          region: null,
        });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "有効なURLが見つかりません" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "最大500件までです" }, { status: 400 });
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

    const newRows = rows.filter(r => !existingUrls.has(r.url));
    const duplicateCount = rows.length - newRows.length;

    // DB一括挿入
    let insertedCount = 0;
    if (newRows.length > 0) {
      const dbRows = newRows.map(r => ({
        company: r.company,
        url: r.url,
        industry: r.industry,
        region: r.region,
        phase: "discovered",
        discovered_at: new Date().toISOString(),
      }));

      // 100件ずつバッチ挿入
      for (let i = 0; i < dbRows.length; i += 100) {
        const batch = dbRows.slice(i, i + 100);
        const { error } = await supabaseAdmin.from("pipeline_leads").insert(batch);
        if (!error) insertedCount += batch.length;
      }
    }

    return NextResponse.json({
      summary: {
        total: rows.length,
        inserted: insertedCount,
        duplicateSkipped: duplicateCount,
        format: detectedFormat,
      },
      preview: rows.slice(0, 10).map(r => ({
        company: r.company,
        url: r.url,
        industry: r.industry,
        region: r.region,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
