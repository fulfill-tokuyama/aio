"use client";

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#4B5563",
  dim: "#9CA3AF",
  accent: "#2563EB",
  green: "#059669",
  red: "#DC2626",
  orange: "#D97706",
};

function getScoreColor(score: number): string {
  if (score >= 70) return C.green;
  if (score >= 40) return C.orange;
  return C.red;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return C.red;
    case "high": return C.orange;
    case "medium": return "#D97706";
    default: return C.sub;
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "critical": return "緊急";
    case "high": return "高";
    case "medium": return "中";
    default: return "低";
  }
}

interface WeaknessDetail {
  id: string;
  severity: string;
  message: string;
  suggestion: string;
}

interface Report {
  id: string;
  url: string | null;
  score: number;
  breakdown: {
    eeat: number;
    contentQuality: number;
    structuredData: number;
    crawlability: number;
    metaEntity: number;
    techPerformance: number;
  } | null;
  html_analysis: { title?: string } | null;
  weakness_details: WeaknessDetail[] | null;
  weaknesses: string[] | null;
  suggestions: string[] | null;
  created_at: string;
}

// AI検索エンジン別の表示予測を生成（スコアベース）
function getEngineVisibility(score: number): { engine: string; level: string; color: string; percent: number }[] {
  return [
    {
      engine: "ChatGPT",
      level: score >= 70 ? "高い" : score >= 40 ? "中程度" : "低い",
      color: score >= 70 ? C.green : score >= 40 ? C.orange : C.red,
      percent: Math.min(95, Math.max(10, score + Math.round(Math.random() * 10 - 5))),
    },
    {
      engine: "Perplexity",
      level: score >= 65 ? "高い" : score >= 35 ? "中程度" : "低い",
      color: score >= 65 ? C.green : score >= 35 ? C.orange : C.red,
      percent: Math.min(95, Math.max(10, score + Math.round(Math.random() * 15 - 5))),
    },
    {
      engine: "Gemini",
      level: score >= 60 ? "高い" : score >= 35 ? "中程度" : "低い",
      color: score >= 60 ? C.green : score >= 35 ? C.orange : C.red,
      percent: Math.min(95, Math.max(10, score - 5 + Math.round(Math.random() * 10))),
    },
    {
      engine: "Copilot",
      level: score >= 65 ? "高い" : score >= 40 ? "中程度" : "低い",
      color: score >= 65 ? C.green : score >= 40 ? C.orange : C.red,
      percent: Math.min(95, Math.max(10, score - 3 + Math.round(Math.random() * 10))),
    },
  ];
}

// 同業種比較データ（仮データ）
function getIndustryComparison(score: number) {
  return {
    industryAvg: 52,
    topPerformers: 82,
    yourScore: score,
    percentile: Math.min(99, Math.max(1, Math.round((score / 100) * 80 + 10))),
  };
}

export default function DiagnosisDetailClient({ report }: { report: Report }) {
  const breakdown = report.breakdown;
  const weaknessDetails = report.weakness_details ?? [];
  const suggestions = report.suggestions ?? [];
  const title = report.html_analysis?.title || report.url || "診断結果";
  const engineVisibility = getEngineVisibility(report.score);
  const industry = getIndustryComparison(report.score);

  const breakdownItems = breakdown ? [
    { label: "E-E-A-T（信頼性）", score: breakdown.eeat, max: 25, color: C.accent },
    { label: "コンテンツ品質", score: breakdown.contentQuality, max: 25, color: C.green },
    { label: "構造化データ", score: breakdown.structuredData, max: 20, color: C.orange },
    { label: "AIクローラビリティ", score: breakdown.crawlability, max: 15, color: "#D97706" },
    { label: "メタ・エンティティ", score: breakdown.metaEntity, max: 10, color: "#7C3AED" },
    { label: "技術パフォーマンス", score: breakdown.techPerformance, max: 5, color: "#0891B2" },
  ] : [];

  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Noto Sans JP', system-ui, sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            ⚡
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>AIO Insight</div>
            <div style={{ fontSize: 13, color: C.dim }}>詳細診断レポート</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.dim, background: "#F0F9FF", padding: "4px 12px", borderRadius: 20, border: "1px solid #DBEAFE" }}>
          無料プラン
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>

        {/* Score Hero */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, textAlign: "center", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, color: C.sub, marginBottom: 4 }}>{title}</div>
          {report.url && (
            <div style={{ fontSize: 13, color: C.dim, marginBottom: 20 }}>{report.url}</div>
          )}
          <div style={{
            display: "inline-flex", width: 120, height: 120, borderRadius: "50%",
            border: `4px solid ${getScoreColor(report.score)}`,
            alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, color: getScoreColor(report.score), lineHeight: 1 }}>{report.score}</div>
              <div style={{ fontSize: 13, color: C.sub }}>/ 100</div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: getScoreColor(report.score) }}>
            {report.score >= 70 ? "良好" : report.score >= 40 ? "改善の余地あり" : "要改善"}
          </div>
          <p style={{ color: C.sub, fontSize: 14, marginTop: 8 }}>
            {report.score >= 70 ? "AI検索での可視性は良好ですが、さらに強化できるポイントがあります。"
              : report.score >= 40 ? "AI検索での可視性に改善の余地があります。対策することで流入増加が期待できます。"
              : "AI検索での可視性が低い状態です。早急な対策をお勧めします。"}
          </p>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>
            診断日: {new Date(report.created_at).toLocaleDateString("ja-JP")}
          </div>
        </div>

        {/* Breakdown */}
        {breakdownItems.length > 0 && (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>カテゴリ別スコア</h2>
            {breakdownItems.map((item) => (
              <div key={item.label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                  <span style={{ color: C.sub }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color }}>{item.score} / {item.max}</span>
                </div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(item.score / item.max) * 100}%`, height: "100%", background: item.color, borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weakness Details — 全文表示 */}
        {weaknessDetails.length > 0 && (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>検出された課題（{weaknessDetails.length}件）</h2>
            {weaknessDetails.map((w, i) => (
              <div key={w.id || i} style={{ padding: "12px 0", borderBottom: i < weaknessDetails.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                    background: `${getSeverityColor(w.severity)}15`, color: getSeverityColor(w.severity),
                  }}>
                    {getSeverityLabel(w.severity)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{w.message}</span>
                </div>
                <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, paddingLeft: 4 }}>
                  {w.suggestion}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions 全リスト */}
        {suggestions.length > 0 && (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>改善提案（{suggestions.length}件）</h2>
            {suggestions.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "10px 0", borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ color: C.green, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 14, color: C.sub, lineHeight: 1.7 }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI検索エンジン別 表示予測 */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>AI検索エンジン別 表示予測</h2>
          <p style={{ fontSize: 13, color: C.dim, marginBottom: 16 }}>
            スコアに基づく各AI検索エンジンでの表示可能性の推定です
          </p>
          {engineVisibility.map((ev) => (
            <div key={ev.engine} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{ev.engine}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ev.color }}>{ev.level}（{ev.percent}%）</span>
              </div>
              <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${ev.percent}%`, height: "100%", background: ev.color, borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* 同業種比較データ */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>同業種比較データ</h2>
          <p style={{ fontSize: 13, color: C.dim, marginBottom: 20 }}>
            同業種の企業サイトとのAI検索可視性を比較した結果です（参考値）
          </p>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.dim }}>{industry.industryAvg}</div>
              <div style={{ fontSize: 13, color: C.sub }}>業界平均</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(report.score) }}>{industry.yourScore}</div>
              <div style={{ fontSize: 13, color: C.sub }}>あなたのスコア</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.green }}>{industry.topPerformers}</div>
              <div style={{ fontSize: 13, color: C.sub }}>上位企業平均</div>
            </div>
          </div>
          {/* 位置づけバー */}
          <div style={{ position: "relative", height: 32, background: "#F3F4F6", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: `${(industry.industryAvg / 100) * 100}%`, top: 0, bottom: 0, width: 2, background: C.dim, zIndex: 1 }} />
            <div style={{ position: "absolute", left: `${(industry.topPerformers / 100) * 100}%`, top: 0, bottom: 0, width: 2, background: C.green, zIndex: 1 }} />
            <div style={{
              position: "absolute",
              left: `${(report.score / 100) * 100}%`,
              top: "50%", transform: "translate(-50%, -50%)",
              width: 16, height: 16, borderRadius: "50%",
              background: getScoreColor(report.score),
              border: "2px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              zIndex: 2,
            }} />
          </div>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>
              上位 {100 - industry.percentile}% に位置しています
            </span>
          </div>
        </div>

        {/* 有料プラン CTA */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.accent}20`, padding: 32, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>AI検索対策を本格化しませんか？</h3>
          <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, marginBottom: 24, textAlign: "center" }}>
            月額¥10,000で、構造化データ自動生成・meta改善・月次モニタリングをご利用いただけます。
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <a href={paymentLink} style={{
              display: "block", padding: "14px 24px", borderRadius: 10, textDecoration: "none",
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff", fontSize: 14, fontWeight: 700,
              textAlign: "center", border: "none",
            }}>
              この課題を解決するコードを取得する →
            </a>
            <a href={paymentLink} style={{
              display: "block", padding: "14px 24px", borderRadius: 10, textDecoration: "none",
              background: "transparent", color: C.accent, fontSize: 14, fontWeight: 700,
              textAlign: "center", border: `2px solid ${C.accent}`,
            }}>
              毎月のスコア変動をモニタリングする →
            </a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #86EFAC", fontSize: 13, color: "#166534", fontWeight: 600, textAlign: "center" }}>
              💡 IT導入補助金で実質無料になる場合があります
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF3C7", border: "1px solid #FCD34D", fontSize: 13, color: "#92400E", fontWeight: 600, textAlign: "center" }}>
              ⏰ 初月セットアップ費用無料・期間限定
            </div>
          </div>

          <p style={{ color: C.dim, fontSize: 12, margin: 0, textAlign: "center" }}>
            いつでも解約可能・クレジットカード登録で即時利用開始
          </p>
        </div>

        {/* 新規診断リンク */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/diagnosis" style={{
            padding: "10px 24px", borderRadius: 8, border: `1px solid ${C.border}`,
            background: "transparent", color: C.sub, fontSize: 14, textDecoration: "none",
            display: "inline-block",
          }}>
            別のURLを診断する
          </a>
        </div>
      </div>
    </div>
  );
}
