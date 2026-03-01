import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDiagnosis } from "@/lib/diagnosis";

export const maxDuration = 300;

// URL正規化: httpsプレフィックス追加 + 末尾スラッシュ除去
function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

// ドメインから会社名フォールバック
function domainToCompany(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "").split(".")[0];
  } catch {
    return url;
  }
}

// AIスコア算出: LLMOスコアが低いほど営業チャンス → AIスコアが高い
function calculateAiScore(llmoScore: number, weaknesses: string[]): number {
  const weaknessBonus = Math.min(weaknesses.length, 10) * 1.5;
  return Math.round(100 - llmoScore + weaknessBonus);
}

// 既存pipeline_leadsのURL一覧を取得
async function getExistingUrls(): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("pipeline_leads")
    .select("url");
  const urls = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.url) urls.add(normalizeUrl(row.url));
    }
  }
  return urls;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrls: string[] = body.urls;
    const llmoScoreMax: number = body.llmoScoreMax ?? 40;

    if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
      return NextResponse.json({ error: "URLリストは必須です" }, { status: 400 });
    }

    if (rawUrls.length > 50) {
      return NextResponse.json({ error: "最大50件までです" }, { status: 400 });
    }

    // 正規化 + 空除去 + 重複除去
    const urls = Array.from(new Set(rawUrls.map(normalizeUrl).filter(Boolean)));

    // 既存URLとの重複チェック
    const existingUrls = await getExistingUrls();
    const toProcess: string[] = [];
    const skippedDuplicates: string[] = [];

    for (const url of urls) {
      if (existingUrls.has(url)) {
        skippedDuplicates.push(url);
      } else {
        toProcess.push(url);
      }
    }

    // 結果格納
    type ScanResult = {
      url: string;
      company: string;
      llmoScore: number;
      aiScore: number;
      weaknesses: string[];
      status: "success" | "error" | "skipped";
      saved: boolean;
      error?: string;
    };

    const results: ScanResult[] = [];

    // 重複分を先に追加
    for (const url of skippedDuplicates) {
      results.push({
        url,
        company: domainToCompany(url),
        llmoScore: 0,
        aiScore: 0,
        weaknesses: [],
        status: "skipped",
        saved: false,
      });
    }

    // 3件ずつバッチ処理
    const BATCH_SIZE = 3;
    let savedAsLeads = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (url) => {
          const diagnosis = await runDiagnosis(url);
          return { url, diagnosis };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          const { url, diagnosis } = result.value;
          const company = diagnosis.htmlAnalysis.title || domainToCompany(url);
          const llmoScore = diagnosis.score;
          const aiScore = calculateAiScore(llmoScore, diagnosis.weaknesses);
          const saved = llmoScore <= llmoScoreMax;

          if (saved) {
            const { error } = await supabaseAdmin
              .from("pipeline_leads")
              .insert({
                company,
                url,
                llmo_score: llmoScore,
                ai_score: aiScore,
                weaknesses: diagnosis.weaknesses,
                phase: "discovered",
                discovered_at: new Date().toISOString(),
              });
            if (!error) savedAsLeads++;
          }

          results.push({
            url,
            company,
            llmoScore,
            aiScore,
            weaknesses: diagnosis.weaknesses,
            status: "success",
            saved,
          });
        } else {
          const url = batch[batchResults.indexOf(result)];
          failed++;
          results.push({
            url,
            company: domainToCompany(url),
            llmoScore: 0,
            aiScore: 0,
            weaknesses: [],
            status: "error",
            saved: false,
            error: result.reason?.message || "診断エラー",
          });
        }
      }
    }

    const summary = {
      total: urls.length,
      processed: toProcess.length,
      skippedDuplicate: skippedDuplicates.length,
      succeeded: toProcess.length - failed,
      failed,
      savedAsLeads,
    };

    return NextResponse.json({ summary, results });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
