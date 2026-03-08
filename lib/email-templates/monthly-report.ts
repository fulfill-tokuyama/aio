// lib/email-templates/monthly-report.ts
// 月次LLMO再診断レポートメール

import { generateTrackingSig } from "@/lib/unsubscribe-token";

export interface MonthlyReportData {
  company: string;
  url: string;
  currentScore: number;
  previousScore: number | null;
  breakdown: {
    eeat: number;
    contentQuality: number;
    structuredData: number;
    crawlability: number;
    metaEntity: number;
    techPerformance: number;
  };
  previousBreakdown: {
    eeat: number;
    contentQuality: number;
    structuredData: number;
    crawlability: number;
    metaEntity: number;
    techPerformance: number;
  } | null;
  improvedItems: string[];
  newIssues: string[];
  nextActions: string[];
  dashboardLink: string;
  leadId?: string;
  unsubscribeLink?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function getDiffText(diff: number): string {
  if (diff > 0) return `<span style="color:#10B981;font-weight:700;">↑ +${diff}pt</span>`;
  if (diff < 0) return `<span style="color:#EF4444;font-weight:700;">↓ ${diff}pt</span>`;
  return `<span style="color:#8896AB;font-weight:700;">→ 変動なし</span>`;
}

function wrapLayout(content: string, options?: { leadId?: string; unsubscribeLink?: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  const trackingPixel = options?.leadId
    ? `<img src="${appUrl}/api/track?type=open&lid=${options.leadId}&sig=${generateTrackingSig(options.leadId)}" width="1" height="1" alt="" style="display:none;" />`
    : "";
  const unsubscribeHtml = options?.unsubscribeLink
    ? `<a href="${options.unsubscribeLink}" style="color:#3E4A5C;font-size:10px;text-decoration:underline;">配信停止</a>`
    : `<span style="color:#3E4A5C;font-size:10px;">配信停止をご希望の場合は本メールにご返信ください。</span>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#F0B429,#D49B1F);line-height:40px;font-size:20px;text-align:center;">⚡</div>
      <h1 style="color:#E2E8F0;font-size:20px;margin:12px 0 4px;">AIO Insight</h1>
      <p style="color:#8896AB;font-size:12px;margin:0;">月次 AI検索可視性レポート</p>
    </div>

${content}

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="color:#5A6A80;font-size:11px;margin:0 0 4px;">
        AIO Insight by BeginAI / 株式会社Fulfill
      </p>
      <p style="margin:0;">
        ${unsubscribeHtml}
      </p>
    </div>

    ${trackingPixel}
  </div>
</body>
</html>`;
}

export function buildMonthlyReportSubject(company: string, score: number, diff: number | null): string {
  const diffText = diff !== null
    ? diff > 0 ? `+${diff}pt改善` : diff < 0 ? `${diff}pt低下` : "変動なし"
    : "";
  return `【月次レポート】${company}様のAI検索スコア: ${score}点${diffText ? ` (${diffText})` : ""}`;
}

export function buildMonthlyReportHtml(data: MonthlyReportData): string {
  const scoreColor = getScoreColor(data.currentScore);
  const diff = data.previousScore !== null ? data.currentScore - data.previousScore : null;
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const breakdownItems = [
    { label: "E-E-A-T（信頼性）", key: "eeat" as const, max: 25 },
    { label: "コンテンツ品質", key: "contentQuality" as const, max: 25 },
    { label: "構造化データ", key: "structuredData" as const, max: 20 },
    { label: "AIクローラビリティ", key: "crawlability" as const, max: 15 },
    { label: "メタ・エンティティ", key: "metaEntity" as const, max: 10 },
    { label: "技術パフォーマンス", key: "techPerformance" as const, max: 5 },
  ];

  const breakdownRows = breakdownItems.map(item => {
    const current = data.breakdown[item.key];
    const prev = data.previousBreakdown ? data.previousBreakdown[item.key] : null;
    const catDiff = prev !== null ? current - prev : null;
    const catDiffHtml = catDiff !== null ? getDiffText(catDiff) : "";
    const pct = Math.round((current / item.max) * 100);
    return `
      <tr>
        <td style="color:#8896AB;font-size:12px;padding:8px 0;border-bottom:1px solid #1E293B20;">${item.label}</td>
        <td style="font-size:13px;font-weight:700;text-align:center;padding:8px 0;border-bottom:1px solid #1E293B20;color:#E2E8F0;">${current} / ${item.max}</td>
        <td style="font-size:12px;text-align:right;padding:8px 0;border-bottom:1px solid #1E293B20;">${catDiffHtml}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:0 0 8px;">
          <div style="height:4px;background:#1E293B;border-radius:2px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${getScoreColor(Math.round(current / item.max * 100))};border-radius:2px;"></div>
          </div>
        </td>
      </tr>`;
  }).join("");

  const improvedHtml = data.improvedItems.length > 0
    ? `<div style="margin-bottom:20px;">
        <h3 style="color:#10B981;font-size:13px;margin:0 0 10px;">✅ 改善された項目（${data.improvedItems.length}件）</h3>
        <ul style="margin:0;padding:0 0 0 20px;">
          ${data.improvedItems.map(item => `<li style="color:#8896AB;font-size:13px;line-height:1.8;">${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const newIssuesHtml = data.newIssues.length > 0
    ? `<div style="margin-bottom:20px;">
        <h3 style="color:#EF4444;font-size:13px;margin:0 0 10px;">⚠ 新たな課題（${data.newIssues.length}件）</h3>
        <ul style="margin:0;padding:0 0 0 20px;">
          ${data.newIssues.map(item => `<li style="color:#8896AB;font-size:13px;line-height:1.8;">${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const nextActionsHtml = data.nextActions.length > 0
    ? `<div>
        <h3 style="color:#3B82F6;font-size:13px;margin:0 0 10px;">📋 次のアクション</h3>
        <ol style="margin:0;padding:0 0 0 20px;">
          ${data.nextActions.map(item => `<li style="color:#8896AB;font-size:13px;line-height:1.8;">${escapeHtml(item)}</li>`).join("")}
        </ol>
      </div>`
    : "";

  return wrapLayout(`
    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">
      <p style="color:#E2E8F0;font-size:15px;margin:0 0 8px;">
        ${escapeHtml(data.company)} ご担当者様
      </p>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 24px;">
        ${monthLabel}のAI検索可視性レポートをお届けします。
      </p>

      <!-- Score -->
      <div style="text-align:center;padding:24px 0;border-top:1px solid #1E293B;border-bottom:1px solid #1E293B;margin-bottom:24px;">
        <p style="color:#8896AB;font-size:12px;margin:0 0 8px;">${monthLabel} AI可視性スコア</p>
        <div style="display:inline-block;width:90px;height:90px;border-radius:50%;border:3px solid ${scoreColor};line-height:90px;text-align:center;">
          <span style="color:${scoreColor};font-size:34px;font-weight:800;">${data.currentScore}</span>
        </div>
        <p style="color:#8896AB;font-size:11px;margin:8px 0 0;">100点満点中</p>
        ${diff !== null ? `<p style="font-size:16px;margin:12px 0 0;">${getDiffText(diff)}</p>` : ""}
        ${data.previousScore !== null ? `<p style="color:#5A6A80;font-size:11px;margin:4px 0 0;">前回: ${data.previousScore}点</p>` : ""}
      </div>

      <!-- Category Breakdown -->
      <h3 style="color:#E2E8F0;font-size:14px;margin:0 0 12px;">カテゴリ別スコア</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${breakdownRows}
      </table>

      <!-- Improved / New Issues / Next Actions -->
      ${improvedHtml}
      ${newIssuesHtml}
      ${nextActionsHtml}
    </div>

    <!-- CTA -->
    <div style="background:#111827;border-radius:16px;border:1px solid #3B82F620;padding:32px;text-align:center;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:16px;margin:0 0 12px;">ダッシュボードで詳細を確認</h3>
      <p style="color:#8896AB;font-size:12px;line-height:1.7;margin:0 0 20px;">
        改善アクション・構造化データ生成・競合分析などをご利用いただけます。
      </p>
      <a href="${escapeHtml(data.dashboardLink)}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
        ダッシュボードを開く →
      </a>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}
