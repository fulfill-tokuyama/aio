import { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

// ============================================================
// AIO DASHBOARD - AI Optimization Intelligence Dashboard
// Ahrefs Web Analytics API × Brand Radar Integration
// ============================================================

const COLORS = {
  bg: "#0B0F1A",
  surface: "#111827",
  surfaceHover: "#1A2235",
  card: "#151D2E",
  cardHover: "#1C2640",
  border: "#1E293B",
  borderLight: "#2A3A52",
  text: "#E2E8F0",
  textMuted: "#8896AB",
  textDim: "#5A6A80",
  accent: "#3B82F6",
  accentGlow: "rgba(59,130,246,0.15)",
  green: "#10B981",
  greenBg: "rgba(16,185,129,0.12)",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.12)",
  orange: "#F59E0B",
  orangeBg: "rgba(245,158,11,0.12)",
  purple: "#8B5CF6",
  purpleBg: "rgba(139,92,246,0.12)",
  cyan: "#06B6D4",
  cyanBg: "rgba(6,182,212,0.12)",
};

// Mock data generators
const generateTrafficData = () => {
  const days = 30;
  const data = [];
  let organic = 1200, ai = 180, direct = 800, social = 350;
  for (let i = 0; i < days; i++) {
    organic += Math.round((Math.random() - 0.45) * 80);
    ai += Math.round((Math.random() - 0.3) * 25);
    direct += Math.round((Math.random() - 0.48) * 50);
    social += Math.round((Math.random() - 0.47) * 30);
    data.push({
      day: i + 1,
      date: new Date(2026, 1, i + 1).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      organic: Math.max(organic, 400),
      ai: Math.max(ai, 50),
      direct: Math.max(direct, 300),
      social: Math.max(social, 100),
    });
  }
  return data;
};

const AI_PLATFORMS = [
  { name: "ChatGPT", mentions: 847, citations: 234, sov: 34.2, trend: 12.5, color: COLORS.green },
  { name: "Perplexity", mentions: 523, citations: 189, sov: 21.1, trend: 28.3, color: COLORS.cyan },
  { name: "Gemini", mentions: 412, citations: 145, sov: 16.6, trend: -5.2, color: COLORS.orange },
  { name: "Copilot", mentions: 389, citations: 98, sov: 15.7, trend: 8.1, color: COLORS.purple },
  { name: "AI Overviews", mentions: 310, citations: 267, sov: 12.4, trend: 45.6, color: COLORS.accent },
];

const COMPETITOR_DATA = [
  { name: "自社", sov: 34.2, mentions: 2481, citations: 933, traffic: 4250, color: COLORS.accent },
  { name: "競合A", sov: 28.7, mentions: 2103, citations: 812, traffic: 3800, color: COLORS.red },
  { name: "競合B", sov: 22.1, mentions: 1620, citations: 598, traffic: 2900, color: COLORS.orange },
  { name: "競合C", sov: 15.0, mentions: 1098, citations: 421, traffic: 1750, color: COLORS.textDim },
];

const TOP_PAGES = [
  { url: "/blog/ai-strategy-guide", aiTraffic: 523, totalTraffic: 2840, aiRatio: 18.4, trend: 32 },
  { url: "/products/enterprise", aiTraffic: 412, totalTraffic: 3120, aiRatio: 13.2, trend: 18 },
  { url: "/case-studies/retail", aiTraffic: 387, totalTraffic: 1950, aiRatio: 19.8, trend: 45 },
  { url: "/blog/llm-optimization", aiTraffic: 341, totalTraffic: 1680, aiRatio: 20.3, trend: -8 },
  { url: "/solutions/smb", aiTraffic: 298, totalTraffic: 2210, aiRatio: 13.5, trend: 22 },
];

const SOV_HISTORY = (() => {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  let self = 24, a = 32, b = 26, c = 18;
  return months.map(m => {
    self += Math.round((Math.random() - 0.3) * 4);
    a += Math.round((Math.random() - 0.52) * 3);
    b += Math.round((Math.random() - 0.48) * 3);
    c += Math.round((Math.random() - 0.55) * 2);
    return { month: m, self: Math.max(self, 15), a: Math.max(a, 15), b: Math.max(b, 10), c: Math.max(c, 8) };
  });
})();

// ============================================================
// COMPONENTS
// ============================================================

const Sparkline = ({ data, color, height = 32, width = 80 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="3" fill={color} />
    </svg>
  );
};

const MiniBarChart = ({ data, colors, height = 120, labels }) => {
  const max = Math.max(...data.flat());
  const barWidth = 100 / data[0].length;
  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data[0].map((_, i) => {
          let y = height;
          return data.map((series, si) => {
            const h = (series[i] / max) * (height - 20);
            y -= h;
            return (
              <rect key={`${si}-${i}`} x={i * barWidth + barWidth * 0.15} y={y} width={barWidth * 0.7} height={h} fill={colors[si]} rx="1" opacity={0.85} />
            );
          });
        })}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {labels.map((l, i) => <span key={i} style={{ fontSize: 9, color: COLORS.textDim }}>{l}</span>)}
        </div>
      )}
    </div>
  );
};

const AreaChart = ({ data, keys, colors, height = 200 }) => {
  const allValues = keys.flatMap(k => data.map(d => d[k]));
  const max = Math.max(...allValues) * 1.1;
  const w = 100;

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        {keys.map((key, ki) => {
          const pts = data.map((d, i) => ({
            x: (i / (data.length - 1)) * w,
            y: height - (d[key] / max) * (height - 20),
          }));
          const path = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
          const area = `${path} L${w},${height} L0,${height} Z`;
          return (
            <g key={key}>
              <path d={area} fill={colors[ki]} opacity="0.08" />
              <path d={path} fill="none" stroke={colors[ki]} strokeWidth="1.5" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "0 2px" }}>
        {data.filter((_, i) => i % 5 === 0).map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: COLORS.textDim }}>{d.date}</span>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({ segments, size = 120 }) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -90;

  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const angle = (seg.value / total) * 360;
        const startRad = (cumAngle * Math.PI) / 180;
        const endRad = ((cumAngle + angle) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const large = angle > 180 ? 1 : 0;
        cumAngle += angle;
        return (
          <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
            fill={seg.color} opacity={0.85} />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.6} fill={COLORS.card} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={COLORS.text} fontSize="16" fontWeight="700">{total.toLocaleString()}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={COLORS.textDim} fontSize="8">TOTAL</text>
    </svg>
  );
};

const StatCard = ({ label, value, change, icon, color = COLORS.accent, sub }) => (
  <div style={{
    background: COLORS.card, borderRadius: 12, padding: "18px 20px",
    border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden",
    transition: "border-color 0.2s", cursor: "default",
  }}
  onMouseEnter={e => e.currentTarget.style.borderColor = color}
  onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
  >
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.6 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {change !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
            color: change >= 0 ? COLORS.green : COLORS.red,
            background: change >= 0 ? COLORS.greenBg : COLORS.redBg,
          }}>
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 11, color: COLORS.textDim, margin: "2px 0 0" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Badge = ({ children, color = COLORS.accent }) => (
  <span style={{
    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
    background: `${color}20`, color, letterSpacing: 0.3,
  }}>{children}</span>
);

const TabButton = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", fontSize: 12, fontWeight: active ? 600 : 400,
    color: active ? COLORS.accent : COLORS.textMuted,
    background: active ? COLORS.accentGlow : "transparent",
    border: `1px solid ${active ? COLORS.accent + "40" : "transparent"}`,
    borderRadius: 6, cursor: "pointer", transition: "all 0.2s",
  }}>{children}</button>
);

// ============================================================
// MAIN APP
// ============================================================

export default function AIODashboard({ diagnosisData = null, diagnosisHistory = [], userEmail = "" }) {
  const [trafficData] = useState(generateTrafficData);
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredPlatform, setHoveredPlatform] = useState(null);
  const [dateRange, setDateRange] = useState("30d");
  const [mounted, setMounted] = useState(false);
  const mob = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalAITraffic = trafficData.reduce((a, d) => a + d.ai, 0);
  const totalOrganic = trafficData.reduce((a, d) => a + d.organic, 0);
  const totalAll = totalAITraffic + totalOrganic + trafficData.reduce((a, d) => a + d.direct + d.social, 0);
  const aiPercent = ((totalAITraffic / totalAll) * 100).toFixed(1);

  // --- Real data derived from diagnosisData & diagnosisHistory ---
  const latestScore = diagnosisData?.score ?? null;
  const prevScore = diagnosisHistory.length >= 2 ? diagnosisHistory[diagnosisHistory.length - 2].score : null;
  const scoreChange = latestScore !== null && prevScore !== null ? latestScore - prevScore : null;
  const weaknessCount = diagnosisData?.weaknesses?.length ?? 0;
  const suggestionCount = diagnosisData?.suggestions?.length ?? 0;

  // Score trend data for chart
  const scoreTrendData = diagnosisHistory.map(h => ({
    date: new Date(h.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
    score: h.score,
  }));

  // Category breakdown from latest diagnosisData.htmlAnalysis (the breakdown is stored in the report)
  const breakdown = diagnosisData?.htmlAnalysis?.breakdown || diagnosisData?.pagespeedData ? null : null;
  // We can reconstruct breakdown from htmlAnalysis fields if available
  const categoryBreakdown = (() => {
    if (!diagnosisData) return null;
    const ha = diagnosisData.htmlAnalysis || {};
    const ps = diagnosisData.pagespeedData;
    // Reconstruct scores using same logic as diagnosis.ts
    let coreWebVitals = 10;
    if (ps) {
      coreWebVitals = 0;
      if (ps.lcp < 2500) coreWebVitals += 10; else if (ps.lcp < 4000) coreWebVitals += 5;
      if (ps.cls < 0.1) coreWebVitals += 8; else if (ps.cls < 0.25) coreWebVitals += 4;
      if (ps.fid < 100) coreWebVitals += 7; else if (ps.fid < 300) coreWebVitals += 3;
    }
    let structuredData = 0;
    if (ha.hasJsonLd) structuredData += 10;
    if (ha.hasFaqSchema) structuredData += 5;
    if (ha.hasHowToSchema) structuredData += 5;
    let metaSeo = 0;
    if (ha.hasMetaDescription) {
      metaSeo += (ha.metaDescriptionLength >= 50 && ha.metaDescriptionLength <= 160) ? 6 : 3;
    }
    if (ha.hasH1) metaSeo += ha.h1Count === 1 ? 5 : 3;
    if (ha.hasOgTags) metaSeo += 5;
    if (ha.hasCanonical) metaSeo += 4;
    let eeat = 0;
    if (ha.hasAuthorMarkup) eeat += 8;
    if (ha.hasDateModified) eeat += 7;
    let crawlability = 0;
    // crawlability info isn't stored in htmlAnalysis, estimate from score
    const knownTotal = coreWebVitals + structuredData + metaSeo + eeat;
    let content = 0;
    if (ha.hasLangAttr) content += 3;
    if (ha.contentLength > 1000) content += 4; else if (ha.contentLength > 300) content += 2;
    if (ha.internalLinkCount >= 5) content += 3; else if (ha.internalLinkCount >= 2) content += 1;
    // Derive crawlability from total score
    crawlability = Math.max(0, (diagnosisData.score || 0) - knownTotal - content);
    crawlability = Math.min(crawlability, 10);
    return [
      { label: "Core Web Vitals", score: coreWebVitals, max: 25, color: COLORS.accent },
      { label: "構造化データ", score: structuredData, max: 20, color: COLORS.green },
      { label: "Meta/SEO", score: metaSeo, max: 20, color: COLORS.cyan },
      { label: "E-E-A-T", score: eeat, max: 15, color: COLORS.purple },
      { label: "クロール", score: crawlability, max: 10, color: COLORS.orange },
      { label: "コンテンツ", score: content, max: 10, color: COLORS.red },
    ];
  })();

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
      fontFamily: "'DM Sans', 'Noto Sans JP', sans-serif",
      opacity: mounted ? 1 : 0, transition: "opacity 0.5s",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        padding: mob ? "12px 16px" : "16px 28px", borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: mob ? 10 : 0,
        background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.bg} 100%)`,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#fff",
          }}>AI</div>
          <div>
            <h1 style={{ fontSize: mob ? 15 : 17, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>
              AIO Dashboard
            </h1>
            {!mob && <p style={{ fontSize: 10, color: COLORS.textDim, margin: 0 }}>
              AI Optimization Intelligence × Ahrefs Web Analytics
            </p>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["7d", "30d", "90d"].map(r => (
            <TabButton key={r} active={dateRange === r} onClick={() => setDateRange(r)}>
              {r === "7d" ? "7日" : r === "30d" ? "30日" : "90日"}
            </TabButton>
          ))}
          {!mob && <div style={{
            width: 1, height: 20, background: COLORS.border, margin: "0 4px"
          }} />}
          <div style={{
            padding: "6px 12px", borderRadius: 6, fontSize: 11,
            background: COLORS.greenBg, color: COLORS.green, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green, animation: "pulse 2s infinite" }} />
            LIVE
          </div>
        </div>
      </header>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; opacity: 0; }
        .card-hover:hover { border-color: ${COLORS.borderLight} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
      `}</style>

      {/* TABS */}
      <div style={{
        padding: mob ? "10px 16px" : "12px 28px", borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", gap: 4, background: COLORS.bg,
        overflowX: mob ? "auto" : undefined, WebkitOverflowScrolling: "touch",
      }}>
        {[
          { id: "overview", label: "📊 概要", },
          { id: "ai-traffic", label: "🤖 AIトラフィック" },
          { id: "brand-radar", label: "📡 Brand Radar" },
          { id: "competitors", label: "⚔️ 競合分析" },
        ].map(tab => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* CONTENT */}
      <main style={{ padding: mob ? "16px 12px" : "24px 28px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <div className="fade-up">

            {/* Diagnosis Result Panel (real data from props) */}
            {diagnosisData && (
              <div style={{
                background: COLORS.card, borderRadius: 12, padding: 24,
                border: `1px solid ${COLORS.border}`, marginBottom: 24,
              }}>
                <SectionHeader
                  title="AI可視性診断結果"
                  subtitle={`${diagnosisData.url} — ${new Date(diagnosisData.createdAt).toLocaleDateString("ja-JP")}に診断`}
                />
                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "200px 1fr", gap: mob ? 20 : 32 }}>
                  {/* Score */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                      width: 120, height: 120, borderRadius: "50%",
                      border: `4px solid ${diagnosisData.score >= 70 ? COLORS.green : diagnosisData.score >= 40 ? COLORS.orange : COLORS.red}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{
                        fontSize: 40, fontWeight: 800,
                        color: diagnosisData.score >= 70 ? COLORS.green : diagnosisData.score >= 40 ? COLORS.orange : COLORS.red,
                      }}>{diagnosisData.score}</span>
                    </div>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>/ 100点</span>
                  </div>

                  {/* Weaknesses & Suggestions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <h4 style={{ fontSize: 13, color: COLORS.red, margin: "0 0 10px", fontWeight: 700 }}>検出された弱点</h4>
                      {(diagnosisData.weaknesses || []).slice(0, 5).map((w, i) => (
                        <div key={i} style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7, padding: "3px 0" }}>
                          <span style={{ color: COLORS.red }}>-</span> {w}
                        </div>
                      ))}
                      {diagnosisData.weaknesses?.length > 5 && (
                        <span style={{ fontSize: 11, color: COLORS.textDim }}>他{diagnosisData.weaknesses.length - 5}件</span>
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, color: COLORS.green, margin: "0 0 10px", fontWeight: 700 }}>改善提案</h4>
                      {(diagnosisData.suggestions || []).slice(0, 5).map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7, padding: "3px 0" }}>
                          <span style={{ color: COLORS.green }}>+</span> {s}
                        </div>
                      ))}
                      {diagnosisData.suggestions?.length > 5 && (
                        <span style={{ fontSize: 11, color: COLORS.textDim }}>他{diagnosisData.suggestions.length - 5}件</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Row — Real diagnosis data */}
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: mob ? 10 : 16, marginBottom: 24 }}>
              <StatCard
                label="AI可視性スコア"
                value={latestScore !== null ? latestScore : "—"}
                icon="📊"
                color={latestScore !== null ? (latestScore >= 70 ? COLORS.green : latestScore >= 40 ? COLORS.orange : COLORS.red) : COLORS.accent}
                sub={latestScore !== null ? "/ 100点" : "診断データなし"}
              />
              <StatCard
                label="前回比変化"
                value={scoreChange !== null ? `${scoreChange >= 0 ? "+" : ""}${scoreChange}` : "—"}
                change={scoreChange !== null ? (scoreChange >= 0 ? Math.abs(scoreChange) : -Math.abs(scoreChange)) : undefined}
                icon="📈"
                color={scoreChange !== null ? (scoreChange >= 0 ? COLORS.green : COLORS.red) : COLORS.accent}
                sub={scoreChange !== null ? "ポイント" : "比較データなし"}
              />
              <StatCard
                label="検出された弱点"
                value={weaknessCount}
                icon="⚠️"
                color={weaknessCount > 5 ? COLORS.red : weaknessCount > 2 ? COLORS.orange : COLORS.green}
                sub="改善が必要な項目"
              />
              <StatCard
                label="改善提案数"
                value={suggestionCount}
                icon="💡"
                color={COLORS.cyan}
                sub="アクション可能な提案"
              />
            </div>

            {/* Score Trend Chart */}
            {scoreTrendData.length > 1 && (
              <div style={{
                background: COLORS.card, borderRadius: 12, padding: 24,
                border: `1px solid ${COLORS.border}`, marginBottom: 24,
              }}>
                <SectionHeader
                  title="スコア推移"
                  subtitle={`${scoreTrendData.length}回の診断結果（週次再スキャン）`}
                />
                <AreaChart
                  data={scoreTrendData.map(d => ({ date: d.date, score: d.score }))}
                  keys={["score"]}
                  colors={[COLORS.accent]}
                  height={200}
                />
              </div>
            )}
            {scoreTrendData.length <= 1 && (
              <div style={{
                background: COLORS.card, borderRadius: 12, padding: 24,
                border: `1px solid ${COLORS.border}`, marginBottom: 24,
                textAlign: "center",
              }}>
                <SectionHeader
                  title="スコア推移"
                  subtitle="週次再スキャンによりデータが蓄積されるとトレンドチャートが表示されます"
                />
                <div style={{ color: COLORS.textDim, fontSize: 13, padding: "20px 0" }}>
                  次回スキャン後にグラフが表示されます
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {categoryBreakdown && (
              <div style={{
                background: COLORS.card, borderRadius: 12, padding: 24,
                border: `1px solid ${COLORS.border}`, marginBottom: 24,
              }}>
                <SectionHeader
                  title="カテゴリ別スコア内訳"
                  subtitle="6つの評価カテゴリごとの獲得点数と満点"
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {categoryBreakdown.map((cat, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: COLORS.text }}>{cat.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "JetBrains Mono", color: cat.color }}>
                          {cat.score} / {cat.max}
                        </span>
                      </div>
                      <div style={{ height: 8, background: COLORS.surface, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          width: `${(cat.score / cat.max) * 100}%`,
                          height: "100%",
                          borderRadius: 4,
                          background: `linear-gradient(90deg, ${cat.color}90, ${cat.color})`,
                          transition: "width 0.8s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== AI TRAFFIC TAB ===== */}
        {activeTab === "ai-traffic" && (
          <div className="fade-up">
            <div style={{
              background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}30`,
              borderRadius: 8, padding: "10px 16px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>📌</span>
              <span style={{ fontSize: 12, color: COLORS.orange }}>
                Ahrefs Web Analytics連携後にリアルデータを表示します。現在はサンプルデータです。
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: mob ? 10 : 16, marginBottom: 24 }}>
              <StatCard label="AI検索トラフィック" value={totalAITraffic.toLocaleString()} change={32.4} icon="🤖" color={COLORS.green} sub="ChatGPT + Perplexity + Copilot" />
              <StatCard label="AI流入バウンス率" value="34.2%" change={-5.1} icon="📉" color={COLORS.cyan} sub="通常トラフィックより12%低い" />
              <StatCard label="AI滞在時間" value="4:32" change={15.3} icon="⏱️" color={COLORS.purple} sub="通常の1.8倍" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "2fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: COLORS.card, borderRadius: 12, padding: mob ? 16 : 24, border: `1px solid ${COLORS.border}` }}>
                <SectionHeader title="AI検索トラフィック推移" subtitle="chart エンドポイントからの時系列データ" />
                <AreaChart
                  data={trafficData}
                  keys={["ai"]}
                  colors={[COLORS.green]}
                  height={200}
                />
              </div>

              <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <SectionHeader title="AI検索ソース内訳" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {[
                    { name: "ChatGPT", pct: 42, color: COLORS.green },
                    { name: "Perplexity", pct: 28, color: COLORS.cyan },
                    { name: "Copilot", pct: 18, color: COLORS.purple },
                    { name: "その他AI", pct: 12, color: COLORS.textDim },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span>{s.name}</span>
                        <span style={{ fontWeight: 600, fontFamily: "JetBrains Mono" }}>{s.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: COLORS.surface, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${s.pct}%`, height: "100%", borderRadius: 3,
                          background: s.color, transition: "width 1s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Traffic by page */}
            <div style={{ background: COLORS.card, borderRadius: 12, padding: mob ? 16 : 24, border: `1px solid ${COLORS.border}` }}>
              <SectionHeader title="ページ別AIトラフィック詳細" subtitle="AI検索からの流入が多いページTOP 5" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowX: mob ? "auto" : undefined, WebkitOverflowScrolling: "touch" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px", minWidth: mob ? 600 : undefined,
                  padding: "8px 12px", fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.5,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <span>ページURL</span><span style={{ textAlign: "right" }}>AI流入</span>
                  <span style={{ textAlign: "right" }}>全体</span><span style={{ textAlign: "right" }}>AI比率</span>
                  <span style={{ textAlign: "right" }}>30日変化</span>
                </div>
                {TOP_PAGES.map((p, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px",
                    padding: "10px 12px", borderRadius: 6, fontSize: 12, alignItems: "center",
                    background: i % 2 === 0 ? "transparent" : COLORS.surfaceHover + "30",
                    minWidth: mob ? 600 : undefined,
                  }}>
                    <span style={{ color: COLORS.accent, fontFamily: "JetBrains Mono", fontSize: 11 }}>{p.url}</span>
                    <span style={{ textAlign: "right", fontWeight: 600, fontFamily: "JetBrains Mono", color: COLORS.green }}>
                      {p.aiTraffic.toLocaleString()}
                    </span>
                    <span style={{ textAlign: "right", fontFamily: "JetBrains Mono" }}>{p.totalTraffic.toLocaleString()}</span>
                    <span style={{ textAlign: "right" }}>
                      <Badge color={COLORS.cyan}>{p.aiRatio}%</Badge>
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <Sparkline
                        data={Array.from({ length: 7 }, () => Math.round(p.aiTraffic / 30 * (0.7 + Math.random() * 0.6)))}
                        color={p.trend >= 0 ? COLORS.green : COLORS.red}
                        width={60} height={20}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== BRAND RADAR TAB ===== */}
        {activeTab === "brand-radar" && (
          <div className="fade-up">
            <div style={{
              background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}30`,
              borderRadius: 8, padding: "10px 16px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>📌</span>
              <span style={{ fontSize: 12, color: COLORS.orange }}>
                Ahrefs Web Analytics連携後にリアルデータを表示します。現在はサンプルデータです。
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: mob ? 10 : 16, marginBottom: 24 }}>
              <StatCard label="AI言及数" value="2,481" change={18.7} icon="💬" color={COLORS.accent} sub="6プラットフォーム合計" />
              <StatCard label="AI引用数" value="933" change={22.1} icon="🔗" color={COLORS.green} sub="被リンクページ数" />
              <StatCard label="推定インプレッション" value="1.2M" change={45.3} icon="👁️" color={COLORS.purple} sub="検索ボリューム加重" />
              <StatCard label="AI SoV" value="34.2%" change={12.5} icon="📊" color={COLORS.cyan} sub="業界内1位" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* SoV by platform */}
              <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <SectionHeader title="プラットフォーム別 Share of Voice" subtitle="Brand Radar APIデータ" />
                {AI_PLATFORMS.map((p, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                        <span style={{ fontSize: 13 }}>{p.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{p.sov}%</span>
                        <span style={{
                          fontSize: 10, color: p.trend >= 0 ? COLORS.green : COLORS.red,
                        }}>
                          {p.trend >= 0 ? "↑" : "↓"}{Math.abs(p.trend)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: COLORS.surface, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        width: `${p.sov}%`, height: "100%", borderRadius: 4,
                        background: `linear-gradient(90deg, ${p.color}90, ${p.color})`,
                        transition: "width 0.8s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Mentions vs Citations */}
              <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                <SectionHeader title="言及 vs 引用" subtitle="プラットフォーム別の言及・引用比率" />
                <MiniBarChart
                  data={[
                    AI_PLATFORMS.map(p => p.mentions),
                    AI_PLATFORMS.map(p => p.citations),
                  ]}
                  colors={[COLORS.accent, COLORS.green]}
                  height={140}
                  labels={AI_PLATFORMS.map(p => p.name.slice(0, 4))}
                />
                <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.accent }} />
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>言及</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.green }} />
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>引用</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cited domains */}
            <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
              <SectionHeader title="被引用ドメイン TOP 5" subtitle="AIレスポンスで自社コンテンツが引用されるソース" />
              {[
                { domain: "example.co.jp/blog", citations: 312, pages: 45, growth: 28 },
                { domain: "example.co.jp/docs", citations: 245, pages: 38, growth: 15 },
                { domain: "example.co.jp/case", citations: 189, pages: 22, growth: 42 },
                { domain: "example.co.jp/products", citations: 112, pages: 15, growth: -3 },
                { domain: "example.co.jp/about", citations: 75, pages: 8, growth: 5 },
              ].map((d, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", alignItems: "center",
                  padding: "10px 12px", borderBottom: i < 4 ? `1px solid ${COLORS.border}` : "none",
                }}>
                  <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: COLORS.accent }}>{d.domain}</span>
                  <span style={{ textAlign: "right", fontSize: 12 }}><strong>{d.citations}</strong> 引用</span>
                  <span style={{ textAlign: "right", fontSize: 12, color: COLORS.textMuted }}>{d.pages} ページ</span>
                  <span style={{
                    textAlign: "right", fontSize: 11, fontWeight: 600,
                    color: d.growth >= 0 ? COLORS.green : COLORS.red,
                  }}>
                    {d.growth >= 0 ? "+" : ""}{d.growth}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== COMPETITORS TAB ===== */}
        {activeTab === "competitors" && (
          <div className="fade-up">
            <div style={{
              background: `${COLORS.orange}15`, border: `1px solid ${COLORS.orange}30`,
              borderRadius: 8, padding: "10px 16px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>📌</span>
              <span style={{ fontSize: 12, color: COLORS.orange }}>
                Ahrefs Web Analytics連携後にリアルデータを表示します。現在はサンプルデータです。
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: mob ? 10 : 16, marginBottom: 24 }}>
              {COMPETITOR_DATA.map((c, i) => (
                <div key={i} style={{
                  background: COLORS.card, borderRadius: 12, padding: "18px 20px",
                  border: `1px solid ${i === 0 ? COLORS.accent + "60" : COLORS.border}`,
                  position: "relative", overflow: "hidden",
                }}>
                  {i === 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: COLORS.accent }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                    {i === 0 && <Badge color={COLORS.green}>YOU</Badge>}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "JetBrains Mono", color: c.color, marginBottom: 4 }}>
                    {c.sov}%
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.textDim }}>AI Share of Voice</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: COLORS.textDim }}>言及</div>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "JetBrains Mono" }}>{c.mentions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: COLORS.textDim }}>引用</div>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "JetBrains Mono" }}>{c.citations.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SoV History */}
            <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
              <SectionHeader title="Share of Voice 推移" subtitle="過去6ヶ月の競合比較トレンド" />
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                {[
                  { label: "自社", color: COLORS.accent },
                  { label: "競合A", color: COLORS.red },
                  { label: "競合B", color: COLORS.orange },
                  { label: "競合C", color: COLORS.textDim },
                ].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{l.label}</span>
                  </div>
                ))}
              </div>
              <AreaChart
                data={SOV_HISTORY.map(h => ({ date: h.month, organic: h.self, ai: h.a, direct: h.b, social: h.c }))}
                keys={["organic", "ai", "direct", "social"]}
                colors={[COLORS.accent, COLORS.red, COLORS.orange, COLORS.textDim]}
                height={200}
              />
            </div>

            {/* Gap Analysis */}
            <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
              <SectionHeader title="AIメンションギャップ分析" subtitle="競合に言及があり自社にない領域" />
              {[
                { topic: "クラウド移行ガイド", competitor: "競合A", mentions: 45, opportunity: "HIGH" },
                { topic: "DX推進事例", competitor: "競合B", mentions: 38, opportunity: "HIGH" },
                { topic: "AI導入ROI計算", competitor: "競合A", mentions: 32, opportunity: "MED" },
                { topic: "セキュリティ対策", competitor: "競合C", mentions: 28, opportunity: "MED" },
                { topic: "API連携方法", competitor: "競合B", mentions: 22, opportunity: "LOW" },
              ].map((g, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", alignItems: "center",
                  padding: "10px 12px", borderBottom: i < 4 ? `1px solid ${COLORS.border}` : "none",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{g.topic}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>{g.competitor}</span>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono" }}>{g.mentions} 件</span>
                  <span style={{ textAlign: "right" }}>
                    <Badge color={
                      g.opportunity === "HIGH" ? COLORS.red :
                      g.opportunity === "MED" ? COLORS.orange : COLORS.textDim
                    }>{g.opportunity}</Badge>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 32, padding: "16px 0", borderTop: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: mob ? "column" : "row",
          justifyContent: "space-between", alignItems: mob ? "flex-start" : "center",
          gap: mob ? 8 : 0,
        }}>
          <div style={{ fontSize: 11, color: COLORS.textDim }}>
            Powered by Ahrefs Web Analytics API (stats/chart) + Brand Radar API
          </div>
          <div style={{ fontSize: 11, color: COLORS.textDim }}>
            Fulfill Corporation × BeginAI © 2026
          </div>
        </div>
      </main>
    </div>
  );
}
