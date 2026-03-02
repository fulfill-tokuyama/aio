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

// テンプレート統計: step → テンプレート名マッピング
const STEP_TO_TEMPLATE: Record<number, string> = {
  1: "Step1: 初回アウトリーチ",
  2: "Step2: 競合比較データ",
  3: "Step3: 成功事例",
};

/**
 * テンプレート統計を更新
 * @param step 1-3 のステップ番号（4は統計なし）
 * @param field "sent" | "opened" | "converted"
 */
export async function incrementTemplateStat(
  step: number,
  field: "sent" | "opened" | "converted"
): Promise<void> {
  const templateName = STEP_TO_TEMPLATE[step];
  if (!templateName) return; // step 4 等は統計対象外

  // pipeline_template_stats テーブルの該当行を取得 or 作成して increment
  const { data: existing } = await supabaseAdmin
    .from("pipeline_template_stats")
    .select("id, sent, opened, converted")
    .eq("template_name", templateName)
    .single();

  if (existing) {
    await supabaseAdmin
      .from("pipeline_template_stats")
      .update({ [field]: (existing[field] || 0) + 1 })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("pipeline_template_stats")
      .insert({
        template_name: templateName,
        sent: field === "sent" ? 1 : 0,
        opened: field === "opened" ? 1 : 0,
        converted: field === "converted" ? 1 : 0,
      });
  }
}
