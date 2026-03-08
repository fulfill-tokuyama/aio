// app/api/cron/lead-pipeline/route.ts
// リード発見 → 診断 → フォーム探索 → 初回メール送信 の定期実行
// 設定は pipeline_automation_config の autoDiscoverEnabled, autoInitialSendEnabled で ON/OFF

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { searchCompaniesWithGemini } from "@/lib/gemini-search";

export const maxDuration = 300;

const BLOCKED_DOMAINS = new Set([
  "twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com",
  "linkedin.com", "amazon.co.jp", "rakuten.co.jp", "wikipedia.org",
  "tabelog.com", "hotpepper.jp", "indeed.com", "wantedly.com",
  "note.com", "qiita.com", "zenn.dev", "github.com", "yahoo.co.jp",
  "google.com", "tiktok.com", "pinterest.com", "google.co.jp",
  "bing.com", "duckduckgo.com",
]);

const BLOCKED_PATTERNS = [".go.jp", ".ac.jp", ".ed.jp", ".lg.jp"];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isDomainBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_DOMAINS.has(host)) return true;
  for (const p of BLOCKED_PATTERNS) {
    if (host.endsWith(p)) return true;
  }
  return false;
}

// URL正規化
function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    let u = url.trim();
    u = u.replace(/\?utm_[^&]*&?/gi, "?").replace(/&utm_[^&]*/gi, "").replace(/\?$/, "");
    u = u.replace(/\/$/, "");
    u = u.toLowerCase().startsWith("http") ? u : `https://${u}`;
    const parsed = new URL(u);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname || "/"}${parsed.search || ""}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 設定取得
    const { data: configRow, error: configError } = await supabaseAdmin
      .from("pipeline_automation_config")
      .select("config_value")
      .eq("config_key", "default")
      .single();

    if (configError || !configRow?.config_value) {
      return NextResponse.json({
        success: true,
        message: "Config not found, skipping",
        summary: { discovered: 0, saved: 0, emailsSent: 0 },
      });
    }

    const config = configRow.config_value as Record<string, unknown>;
    const autoDiscoverEnabled = config.autoDiscoverEnabled === true;
    const autoInitialSendEnabled = config.autoInitialSendEnabled !== false; // デフォルト true

    if (!autoDiscoverEnabled) {
      return NextResponse.json({
        success: true,
        message: "Auto discover disabled",
        summary: { discovered: 0, saved: 0, emailsSent: 0 },
      });
    }

    const industry = (config.scanIndustries as string[])?.[0] || "士業";
    const region = (config.scanRegions as string[])?.[0] || "大阪";
    const keyword = (config.keyword as string) || "";
    const llmoScoreMax = typeof config.llmoScoreMax === "number" ? config.llmoScoreMax : 40;

    // 1. リード発見（Gemini Search）
    const discoverResult = await searchCompaniesWithGemini(industry, region, keyword);
    const urls = discoverResult.urls.map((u) => u.url);

    if (urls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No URLs discovered",
        summary: { discovered: 0, saved: 0, emailsSent: 0 },
      });
    }

    // 2. ブロックリストフィルタ
    const seenDomains = new Set<string>();
    const filtered: string[] = [];
    for (const item of urls) {
      const domain = extractDomain(item);
      if (!domain || isDomainBlocked(domain) || seenDomains.has(domain)) continue;
      seenDomains.add(domain);
      const norm = normalizeUrl(item);
      if (norm) filtered.push(norm);
    }

    const urlsToProcess = filtered.slice(0, 20); // 最大20件

    if (urlsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All URLs filtered",
        summary: { discovered: urls.length, saved: 0, emailsSent: 0 },
      });
    }

    // 3. auto-pipeline を内部呼び出し（同一オリジン）
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
    const pipelineUrl = `${origin.replace(/\/$/, "")}/api/auto-pipeline`;

    const pipelineRes = await fetch(pipelineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        urls: urlsToProcess,
        llmoScoreMax,
        industry,
        region,
        skipAutoSend: !autoInitialSendEnabled,
      }),
    });

    if (!pipelineRes.ok) {
      const errText = await pipelineRes.text();
      return NextResponse.json(
        { error: `Pipeline failed: ${pipelineRes.status}`, detail: errText },
        { status: 500 }
      );
    }

    const pipelineJson = (await pipelineRes.json()) as { summary?: { savedAsLeads?: number; emailsSent?: number } };
    const summary = pipelineJson.summary || {};

    return NextResponse.json({
      success: true,
      message: "Cron lead pipeline completed",
      summary: {
        discovered: urlsToProcess.length,
        saved: summary.savedAsLeads ?? 0,
        emailsSent: summary.emailsSent ?? 0,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cron lead pipeline failed";
    console.error("Cron lead-pipeline error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
