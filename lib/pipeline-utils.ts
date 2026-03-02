// lib/pipeline-utils.ts
// pipeline-scan と auto-pipeline で共有する関数群

import { supabaseAdmin } from "./supabase";
import type { Weakness } from "./diagnosis";

// URL正規化: httpsプレフィックス追加 + 末尾スラッシュ除去
export function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

// ドメインから会社名フォールバック
export function domainToCompany(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "").split(".")[0];
  } catch {
    return url;
  }
}

// AIスコア算出: 重要度加重方式
export const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4.0,
  high: 2.5,
  medium: 1.5,
  low: 0.5,
};

export function calculateAiScore(llmoScore: number, weaknesses: string[], weaknessDetails?: Weakness[]): number {
  const baseScore = 100 - llmoScore;

  let weaknessBonus: number;
  let criticalCount = 0;

  if (weaknessDetails && weaknessDetails.length > 0) {
    weaknessBonus = Math.min(
      weaknessDetails.reduce((sum, w) => sum + (SEVERITY_WEIGHT[w.severity] || 1), 0),
      30
    );
    criticalCount = weaknessDetails.filter(w => w.severity === "critical").length;
  } else {
    weaknessBonus = Math.min(weaknesses.length * 1.5, 30);
  }

  const criticalMultiplier = criticalCount >= 2 ? 1.10 : 1.0;
  const raw = (baseScore + weaknessBonus) * criticalMultiplier;
  return Math.round(Math.max(0, Math.min(150, raw)));
}

// 既存pipeline_leads + leads のURL一覧を取得（テーブル横断で重複防止）
export async function getExistingUrls(): Promise<Set<string>> {
  const [pipelineResult, leadsResult] = await Promise.all([
    supabaseAdmin.from("pipeline_leads").select("url"),
    supabaseAdmin.from("leads").select("url"),
  ]);

  const urls = new Set<string>();
  if (pipelineResult.data) {
    for (const row of pipelineResult.data) {
      if (row.url) urls.add(normalizeUrl(row.url));
    }
  }
  if (leadsResult.data) {
    for (const row of leadsResult.data) {
      if (row.url) urls.add(normalizeUrl(row.url));
    }
  }
  return urls;
}
