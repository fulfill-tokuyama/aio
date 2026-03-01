// 診断結果メール HTMLテンプレート

interface DiagnosisEmailData {
  company: string;
  name: string;
  score: number;
  breakdown: {
    eeat: number;
    contentQuality: number;
    structuredData: number;
    crawlability: number;
    metaEntity: number;
    techPerformance: number;
  };
  weaknesses: string[];
  suggestions: string[];
  url: string;
  paymentLink: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "良好";
  if (score >= 40) return "改善の余地あり";
  return "要改善";
}

export function buildDiagnosisEmailSubject(company: string, score: number): string {
  return `【AI可視性診断結果】${company}様 — スコア ${score}/100`;
}

export function buildDiagnosisEmailHtml(data: DiagnosisEmailData): string {
  const scoreColor = getScoreColor(data.score);
  const scoreLabel = getScoreLabel(data.score);

  const breakdownRows = [
    { label: "E-E-A-Tシグナル", score: data.breakdown.eeat, max: 25 },
    { label: "コンテンツ品質・構造", score: data.breakdown.contentQuality, max: 25 },
    { label: "構造化データ", score: data.breakdown.structuredData, max: 20 },
    { label: "AIクローラビリティ", score: data.breakdown.crawlability, max: 15 },
    { label: "メタ・エンティティ", score: data.breakdown.metaEntity, max: 10 },
    { label: "技術パフォーマンス", score: data.breakdown.techPerformance, max: 5 },
  ];

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
      <p style="color:#8896AB;font-size:12px;margin:0;">AI可視性診断レポート</p>
    </div>

    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">

      <p style="color:#E2E8F0;font-size:15px;margin:0 0 24px;">
        ${data.name}様（${data.company}）
      </p>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 24px;">
        この度はAI可視性診断をご利用いただき、ありがとうございます。<br>
        <strong style="color:#E2E8F0;">${data.url}</strong> の診断結果をお届けします。
      </p>

      <!-- Score Circle -->
      <div style="text-align:center;padding:24px 0;border-top:1px solid #1E293B;border-bottom:1px solid #1E293B;margin-bottom:24px;">
        <div style="display:inline-block;width:100px;height:100px;border-radius:50%;border:4px solid ${scoreColor};line-height:100px;text-align:center;">
          <span style="color:${scoreColor};font-size:36px;font-weight:800;">${data.score}</span>
        </div>
        <p style="color:${scoreColor};font-size:14px;font-weight:700;margin:12px 0 4px;">${scoreLabel}</p>
        <p style="color:#8896AB;font-size:12px;margin:0;">100点満点中</p>
      </div>

      <!-- Breakdown -->
      <h3 style="color:#E2E8F0;font-size:14px;margin:0 0 16px;">カテゴリ別スコア</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${breakdownRows.map(r => `
        <tr>
          <td style="color:#8896AB;font-size:13px;padding:8px 0;border-bottom:1px solid #1E293B20;">${r.label}</td>
          <td style="color:#E2E8F0;font-size:13px;padding:8px 0;border-bottom:1px solid #1E293B20;text-align:right;font-weight:600;">
            <span style="color:${getScoreColor((r.score / r.max) * 100)}">${r.score}</span>
            <span style="color:#5A6A80;"> / ${r.max}</span>
          </td>
        </tr>`).join("")}
      </table>

      <!-- Weaknesses -->
      ${data.weaknesses.length > 0 ? `
      <h3 style="color:#EF4444;font-size:14px;margin:0 0 12px;">⚠ 検出された弱点（${data.weaknesses.length}件）</h3>
      <ul style="margin:0 0 24px;padding:0 0 0 20px;">
        ${data.weaknesses.map(w => `<li style="color:#8896AB;font-size:13px;line-height:1.8;">${w}</li>`).join("")}
      </ul>
      ` : ""}

      <!-- Suggestions -->
      ${data.suggestions.length > 0 ? `
      <h3 style="color:#10B981;font-size:14px;margin:0 0 12px;">💡 改善提案</h3>
      <ul style="margin:0 0 24px;padding:0 0 0 20px;">
        ${data.suggestions.slice(0, 5).map(s => `<li style="color:#8896AB;font-size:13px;line-height:1.8;">${s}</li>`).join("")}
      </ul>
      ${data.suggestions.length > 5 ? `<p style="color:#5A6A80;font-size:12px;margin:0 0 24px;">他${data.suggestions.length - 5}件の改善提案があります</p>` : ""}
      ` : ""}

    </div>

    <!-- CTA Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #3B82F620;padding:32px;text-align:center;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:16px;margin:0 0 12px;">AI検索での可視性を改善しませんか？</h3>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 24px;">
        AIO Insightの継続モニタリングで、AIトラフィックの推移・競合比較・<br>
        改善アクションを月額¥10,000でご利用いただけます。
      </p>
      <a href="${data.paymentLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
        月額プランに申し込む →
      </a>
      <p style="color:#5A6A80;font-size:11px;margin:12px 0 0;">初月からダッシュボードでAI可視性をモニタリング</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="color:#5A6A80;font-size:11px;margin:0 0 4px;">
        AIO Insight by BeginAI / 株式会社Fulfill
      </p>
      <p style="color:#3E4A5C;font-size:10px;margin:0;">
        このメールはAI可視性診断の結果通知です。
      </p>
    </div>

  </div>
</body>
</html>`;
}
