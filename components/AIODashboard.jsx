import { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

// ============================================================
// AIO DASHBOARD - AI Optimization Intelligence Dashboard
// Ahrefs Web Analytics API × Brand Radar Integration
// ============================================================

const COLORS = {
  bg: "#FFFFFF",
  surface: "#F9FAFB",
  surfaceHover: "#F3F4F6",
  card: "#FFFFFF",
  cardHover: "#F9FAFB",
  border: "#E5E7EB",
  borderLight: "#D1D5DB",
  text: "#111827",
  textMuted: "#4B5563",
  textDim: "#9CA3AF",
  accent: "#2563EB",
  accentGlow: "rgba(37,99,235,0.07)",
  green: "#059669",
  greenBg: "rgba(5,150,105,0.08)",
  red: "#DC2626",
  redBg: "rgba(220,38,38,0.08)",
  orange: "#D97706",
  orangeBg: "rgba(217,119,6,0.08)",
  purple: "#7C3AED",
  purpleBg: "rgba(124,58,237,0.08)",
  cyan: "#0891B2",
  cyanBg: "rgba(8,145,178,0.08)",
};

// Platform color mapping for Brand Radar data
const PLATFORM_COLORS = {
  ChatGPT: COLORS.green,
  Perplexity: COLORS.cyan,
  Gemini: COLORS.orange,
  Copilot: COLORS.purple,
  "AI Overviews": COLORS.accent,
  "AI Mode": COLORS.red,
};

// Not-connected state component
const NotConnectedState = ({ title, description }) => (
  <div style={{
    background: COLORS.card, borderRadius: 12, padding: "48px 24px",
    border: `1px solid ${COLORS.border}`, textAlign: "center",
  }}>
    <div style={{ fontSize: 36, marginBottom: 16 }}>🔗</div>
    <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: "0 0 8px" }}>{title}</h3>
    <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
      {description}
    </p>
  </div>
);

// Loading spinner component
const LoadingState = () => (
  <div style={{
    background: COLORS.card, borderRadius: 12, padding: "48px 24px",
    border: `1px solid ${COLORS.border}`, textAlign: "center",
  }}>
    <div style={{
      width: 32, height: 32, border: `3px solid ${COLORS.border}`,
      borderTopColor: COLORS.accent, borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto 16px",
    }} />
    <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>データを読み込み中...</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

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
          {labels.map((l, i) => <span key={i} style={{ fontSize: 13, color: COLORS.textDim }}>{l}</span>)}
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
          <span key={i} style={{ fontSize: 13, color: COLORS.textDim }}>{d.date}</span>
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
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, lineHeight: 1.4 }}>{value}</div>
        {sub && <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {change !== undefined && (
          <span style={{
            fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
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
      {subtitle && <p style={{ fontSize: 13, color: COLORS.textDim, margin: "2px 0 0" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Badge = ({ children, color = COLORS.accent }) => (
  <span style={{
    fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
    background: `${color}20`, color, letterSpacing: 0.3,
  }}>{children}</span>
);

const TabButton = ({ active, children, onClick }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? COLORS.accent : COLORS.textMuted,
    background: active ? COLORS.accentGlow : "transparent",
    border: `1px solid ${active ? COLORS.accent + "40" : "transparent"}`,
    borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
  }}>{children}</button>
);

// ============================================================
// MAIN APP
// ============================================================

export default function AIODashboard({ diagnosisData = null, diagnosisHistory = [], userEmail = "" }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredPlatform, setHoveredPlatform] = useState(null);
  const [dateRange, setDateRange] = useState("30d");
  const [mounted, setMounted] = useState(false);
  const mob = useIsMobile();

  // Ahrefs API states
  const [ahrefsConnected, setAhrefsConnected] = useState(null); // null=loading, true/false
  const [trafficData, setTrafficData] = useState([]);
  const [brandRadarData, setBrandRadarData] = useState([]);
  const [competitorData, setCompetitorData] = useState([]);
  const [topPagesData, setTopPagesData] = useState([]);
  const [ahrefsLoading, setAhrefsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Fetch all Ahrefs data in parallel
    const fetchAhrefsData = async () => {
      try {
        const params = new URLSearchParams({ customer_id: "default", site_url: userEmail || "default", target: userEmail || "default" });
        const [trafficRes, brandRes, compRes, pagesRes] = await Promise.all([
          fetch(`/api/ahrefs/traffic?${params}`).then(r => r.json()).catch(() => ({ connected: false })),
          fetch(`/api/ahrefs/brand-radar?${params}`).then(r => r.json()).catch(() => ({ connected: false })),
          fetch(`/api/ahrefs/competitors?customer_id=default`).then(r => r.json()).catch(() => ({ connected: false })),
          fetch(`/api/ahrefs/top-pages?customer_id=default`).then(r => r.json()).catch(() => ({ connected: false })),
        ]);

        const connected = trafficRes.connected !== false;
        setAhrefsConnected(connected);

        if (connected) {
          if (trafficRes.data) setTrafficData(trafficRes.data.map((d, i) => ({
            ...d, day: i + 1,
            date: new Date(d.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
          })));
          if (brandRes.platforms) setBrandRadarData(brandRes.platforms.map(p => ({
            ...p, color: PLATFORM_COLORS[p.platform] || COLORS.textDim,
          })));
          if (compRes.data) setCompetitorData(compRes.data);
          if (pagesRes.data) setTopPagesData(pagesRes.data);
        }
      } catch (e) {
        console.error("Ahrefs data fetch error:", e);
        setAhrefsConnected(false);
      } finally {
        setAhrefsLoading(false);
      }
    };

    fetchAhrefsData();
  }, [userEmail]);

  const totalAITraffic = trafficData.reduce((a, d) => a + (d.ai || 0), 0);
  const totalOrganic = trafficData.reduce((a, d) => a + (d.organic || 0), 0);
  const totalAll = totalAITraffic + totalOrganic + trafficData.reduce((a, d) => a + (d.direct || 0) + (d.social || 0), 0);
  const aiPercent = totalAll > 0 ? ((totalAITraffic / totalAll) * 100).toFixed(1) : "0";

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

  // Category breakdown from latest diagnosisData.htmlAnalysis (reconstructed using same logic as diagnosis.ts)
  const categoryBreakdown = (() => {
    if (!diagnosisData) return null;
    const ha = diagnosisData.htmlAnalysis || {};
    const ps = diagnosisData.pagespeedData;

    // E-E-A-T (max 25): 著者(7) + 著者ページ(3) + 更新日(5) + 鮮度(5) + Organization(3) + 外部引用(2)
    let eeat = 0;
    if (ha.hasAuthorMarkup) eeat += 7;
    if (ha.hasAuthorPageLink) eeat += 3;
    if (ha.hasDateModified) eeat += 5;
    if (ha.dateModifiedValue) {
      const daysDiff = (Date.now() - new Date(ha.dateModifiedValue).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 90) eeat += 5;
      else if (daysDiff <= 180) eeat += 3;
      else if (daysDiff <= 365) eeat += 1;
    }
    if (ha.hasOrganizationSchema) eeat += 3;
    if (ha.hasExternalCitations) eeat += 2;

    // コンテンツ品質・構造 (max 25): テキスト(5) + H2+H3(5) + Q&A(4) + lang(2) + 内部リンク(4) + セマンティック(3) + リスト(2)
    let contentQuality = 0;
    if (ha.contentLength >= 3000) contentQuality += 5;
    else if (ha.contentLength >= 1500) contentQuality += 3;
    if ((ha.h2Count || 0) >= 3 && (ha.h3Count || 0) >= 2) contentQuality += 5;
    else if ((ha.h2Count || 0) >= 2) contentQuality += 3;
    else if ((ha.h2Count || 0) >= 1) contentQuality += 1;
    if (ha.hasQAFormat) contentQuality += 4;
    if (ha.hasLangAttr) contentQuality += 2;
    if (ha.internalLinkCount >= 5) contentQuality += 4;
    else if (ha.internalLinkCount >= 3) contentQuality += 2;
    else if (ha.internalLinkCount >= 1) contentQuality += 1;
    if (ha.hasSemanticHtml) contentQuality += 3;
    if (ha.hasListStructure) contentQuality += 2;

    // 構造化データ (max 20): JSON-LD(5) + スキーマ種類(6) + FAQ(3) + HowTo(2) + Breadcrumb(2) + Product(2)
    let structuredData = 0;
    if (ha.hasJsonLd) structuredData += 5;
    const stc = ha.schemaTypeCount || 0;
    if (stc >= 4) structuredData += 6;
    else if (stc === 3) structuredData += 4;
    else if (stc === 2) structuredData += 3;
    if (ha.hasFaqSchema) structuredData += 3;
    if (ha.hasHowToSchema) structuredData += 2;
    if (ha.hasBreadcrumbSchema) structuredData += 2;
    if (ha.hasProductSchema) structuredData += 2;

    // AIクローラビリティ (max 15): sitemap(4) + robots(3) + AI非ブロック(3) + SSR(3) + canonical(2)
    // crawlability details not fully in htmlAnalysis, derive from total score
    const knownTotal = eeat + contentQuality + structuredData;
    let techPerformance = 2; // default partial credit
    if (ps) {
      techPerformance = 0;
      if (ps.seoScore >= 90) techPerformance += 3;
      else if (ps.seoScore >= 70) techPerformance += 2;
      else if (ps.seoScore >= 50) techPerformance += 1;
      const lcpOk = ps.lcp < 2500;
      const clsOk = ps.cls < 0.1;
      if (lcpOk && clsOk) techPerformance += 2;
      else if (lcpOk || clsOk) techPerformance += 1;
    }
    // メタ・エンティティ (max 10)
    let metaEntity = 0;
    if (ha.hasMetaDescription) metaEntity += 3;
    if (ha.hasH1) metaEntity += ha.h1Count === 1 ? 2 : 1;
    if (ha.hasOgTags) metaEntity += 3;
    if (ha.title && ha.hasOgTags && ha.hasMetaDescription) metaEntity += 2;

    // Derive crawlability from total score
    let crawlability = Math.max(0, (diagnosisData.score || 0) - knownTotal - metaEntity - techPerformance);
    crawlability = Math.min(crawlability, 15);

    return [
      { label: "E-E-A-T", score: eeat, max: 25, color: COLORS.purple },
      { label: "コンテンツ品質", score: contentQuality, max: 25, color: COLORS.green },
      { label: "構造化データ", score: structuredData, max: 20, color: COLORS.cyan },
      { label: "AIクロール", score: crawlability, max: 15, color: COLORS.orange },
      { label: "メタ・エンティティ", score: metaEntity, max: 10, color: COLORS.accent },
      { label: "技術パフォーマンス", score: techPerformance, max: 5, color: COLORS.red },
    ];
  })();

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
      fontFamily: "'Noto Sans JP', system-ui, sans-serif",
      opacity: mounted ? 1 : 0, transition: "opacity 0.5s",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

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
            {!mob && <p style={{ fontSize: 13, color: COLORS.textDim, margin: 0 }}>
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
            padding: "8px 16px", borderRadius: 8, fontSize: 13,
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
                    <span style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8 }}>/ 100点</span>
                  </div>

                  {/* Weaknesses & Suggestions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <h4 style={{ fontSize: 13, color: COLORS.red, margin: "0 0 10px", fontWeight: 700 }}>検出された弱点</h4>
                      {(diagnosisData.weaknesses || []).slice(0, 5).map((w, i) => (
                        <div key={i} style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.7, padding: "3px 0" }}>
                          <span style={{ color: COLORS.red }}>-</span> {w}
                        </div>
                      ))}
                      {diagnosisData.weaknesses?.length > 5 && (
                        <span style={{ fontSize: 13, color: COLORS.textDim }}>他{diagnosisData.weaknesses.length - 5}件</span>
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 13, color: COLORS.green, margin: "0 0 10px", fontWeight: 700 }}>改善提案</h4>
                      {(diagnosisData.suggestions || []).slice(0, 5).map((s, i) => (
                        <div key={i} style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.7, padding: "3px 0" }}>
                          <span style={{ color: COLORS.green }}>+</span> {s}
                        </div>
                      ))}
                      {diagnosisData.suggestions?.length > 5 && (
                        <span style={{ fontSize: 13, color: COLORS.textDim }}>他{diagnosisData.suggestions.length - 5}件</span>
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
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Noto Sans JP', system-ui, sans-serif", color: cat.color }}>
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
            {ahrefsLoading ? (
              <LoadingState />
            ) : ahrefsConnected === false ? (
              <NotConnectedState
                title="Ahrefs Web Analytics 未連携"
                description="Ahrefs Web Analyticsと連携すると、AI検索トラフィックの詳細分析が表示されます。管理画面でAHREFS_API_KEYを設定してください。"
              />
            ) : trafficData.length === 0 ? (
              <NotConnectedState
                title="トラフィックデータなし"
                description="まだトラフィックデータが取得されていません。サイトURLの設定を確認してください。"
              />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: mob ? 10 : 16, marginBottom: 24 }}>
                  <StatCard label="AI検索トラフィック" value={totalAITraffic.toLocaleString()} icon="🤖" color={COLORS.green} sub="ChatGPT + Perplexity + Copilot" />
                  <StatCard label="オーガニック" value={totalOrganic.toLocaleString()} icon="🔍" color={COLORS.cyan} sub="検索エンジン経由" />
                  <StatCard label="AI比率" value={`${aiPercent}%`} icon="📊" color={COLORS.purple} sub="全トラフィック中" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "2fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div style={{ background: COLORS.card, borderRadius: 12, padding: mob ? 16 : 24, border: `1px solid ${COLORS.border}` }}>
                    <SectionHeader title="AI検索トラフィック推移" subtitle="Ahrefs Web Analytics APIデータ" />
                    <AreaChart
                      data={trafficData}
                      keys={["ai"]}
                      colors={[COLORS.green]}
                      height={200}
                    />
                  </div>

                  <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                    <SectionHeader title="トラフィック構成" />
                    <DonutChart
                      segments={[
                        { value: totalAITraffic, color: COLORS.green },
                        { value: totalOrganic, color: COLORS.cyan },
                        { value: trafficData.reduce((a, d) => a + (d.direct || 0), 0), color: COLORS.orange },
                        { value: trafficData.reduce((a, d) => a + (d.social || 0), 0), color: COLORS.purple },
                      ]}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                      {[
                        { name: "AI検索", color: COLORS.green, val: totalAITraffic },
                        { name: "オーガニック", color: COLORS.cyan, val: totalOrganic },
                        { name: "ダイレクト", color: COLORS.orange, val: trafficData.reduce((a, d) => a + (d.direct || 0), 0) },
                        { name: "ソーシャル", color: COLORS.purple, val: trafficData.reduce((a, d) => a + (d.social || 0), 0) },
                      ].map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          <span style={{ color: COLORS.textMuted }}>{s.name}</span>
                          <span style={{ marginLeft: "auto", fontWeight: 600, fontFamily: "'Noto Sans JP', system-ui, sans-serif" }}>{s.val.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Traffic by page */}
                {topPagesData.length > 0 && (
                  <div style={{ background: COLORS.card, borderRadius: 12, padding: mob ? 16 : 24, border: `1px solid ${COLORS.border}` }}>
                    <SectionHeader title="ページ別AIトラフィック詳細" subtitle="AI検索からの流入が多いページ" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowX: mob ? "auto" : undefined, WebkitOverflowScrolling: "touch" }}>
                      <div style={{
                        display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px", minWidth: mob ? 600 : undefined,
                        padding: "8px 12px", fontSize: 13, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.5,
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}>
                        <span>ページURL</span><span style={{ textAlign: "right" }}>AI流入</span>
                        <span style={{ textAlign: "right" }}>全体</span><span style={{ textAlign: "right" }}>AI比率</span>
                        <span style={{ textAlign: "right" }}>トレンド</span>
                      </div>
                      {topPagesData.map((p, i) => (
                        <div key={i} style={{
                          display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 100px",
                          padding: "10px 12px", borderRadius: 8, fontSize: 14, alignItems: "center",
                          background: i % 2 === 0 ? "transparent" : COLORS.surfaceHover + "30",
                          minWidth: mob ? 600 : undefined,
                        }}>
                          <span style={{ color: COLORS.accent, fontFamily: "'Noto Sans JP', system-ui, sans-serif", fontSize: 13 }}>{p.url}</span>
                          <span style={{ textAlign: "right", fontWeight: 600, fontFamily: "'Noto Sans JP', system-ui, sans-serif", color: COLORS.green }}>
                            {p.aiTraffic.toLocaleString()}
                          </span>
                          <span style={{ textAlign: "right", fontFamily: "'Noto Sans JP', system-ui, sans-serif" }}>{p.totalTraffic.toLocaleString()}</span>
                          <span style={{ textAlign: "right" }}>
                            <Badge color={COLORS.cyan}>{p.aiRatio}%</Badge>
                          </span>
                          <span style={{
                            textAlign: "right", fontSize: 13, fontWeight: 600,
                            color: p.trend >= 0 ? COLORS.green : COLORS.red,
                          }}>
                            {p.trend >= 0 ? "+" : ""}{p.trend}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== BRAND RADAR TAB ===== */}
        {activeTab === "brand-radar" && (
          <div className="fade-up">
            {ahrefsLoading ? (
              <LoadingState />
            ) : ahrefsConnected === false ? (
              <NotConnectedState
                title="Ahrefs Brand Radar 未連携"
                description="Ahrefs Brand Radarと連携すると、AIプラットフォームでのブランド言及・引用データが表示されます。管理画面でAHREFS_API_KEYを設定してください。"
              />
            ) : brandRadarData.length === 0 ? (
              <NotConnectedState
                title="Brand Radarデータなし"
                description="まだBrand Radarデータが取得されていません。ターゲットの設定を確認してください。"
              />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: mob ? 10 : 16, marginBottom: 24 }}>
                  <StatCard label="AI言及数" value={brandRadarData.reduce((a, p) => a + p.mentions, 0).toLocaleString()} icon="💬" color={COLORS.accent} sub={`${brandRadarData.length}プラットフォーム合計`} />
                  <StatCard label="AI引用数" value={brandRadarData.reduce((a, p) => a + p.citations, 0).toLocaleString()} icon="🔗" color={COLORS.green} sub="被リンクページ数" />
                  <StatCard label="推定インプレッション" value={brandRadarData.reduce((a, p) => a + (p.impressions || 0), 0).toLocaleString()} icon="👁️" color={COLORS.purple} sub="検索ボリューム加重" />
                  <StatCard label="AI SoV (平均)" value={`${(brandRadarData.reduce((a, p) => a + p.sov, 0) / brandRadarData.length).toFixed(1)}%`} icon="📊" color={COLORS.cyan} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {/* SoV by platform */}
                  <div style={{ background: COLORS.card, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.border}` }}>
                    <SectionHeader title="プラットフォーム別 Share of Voice" subtitle="Brand Radar APIデータ" />
                    {brandRadarData.map((p, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
                            <span style={{ fontSize: 13 }}>{p.platform}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Noto Sans JP', system-ui, sans-serif" }}>{p.sov}%</span>
                            <span style={{
                              fontSize: 13, color: p.trend >= 0 ? COLORS.green : COLORS.red,
                            }}>
                              {p.trend >= 0 ? "+" : ""}{p.trend}%
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
                        brandRadarData.map(p => p.mentions),
                        brandRadarData.map(p => p.citations),
                      ]}
                      colors={[COLORS.accent, COLORS.green]}
                      height={140}
                      labels={brandRadarData.map(p => (p.platform || "").slice(0, 4))}
                    />
                    <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.accent }} />
                        <span style={{ fontSize: 13, color: COLORS.textMuted }}>言及</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.green }} />
                        <span style={{ fontSize: 13, color: COLORS.textMuted }}>引用</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== COMPETITORS TAB ===== */}
        {activeTab === "competitors" && (
          <div className="fade-up">
            {ahrefsLoading ? (
              <LoadingState />
            ) : ahrefsConnected === false ? (
              <NotConnectedState
                title="Ahrefs 競合分析 未連携"
                description="Ahrefsと連携すると、競合他社とのAI Share of Voice比較が表示されます。管理画面でAHREFS_API_KEYを設定してください。"
              />
            ) : competitorData.length === 0 ? (
              <NotConnectedState
                title="競合データなし"
                description="まだ競合が設定されていません。競合追加APIを使用して競合を登録してください。"
              />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2, 1fr)" : `repeat(${Math.min(competitorData.length, 4)}, 1fr)`, gap: mob ? 10 : 16, marginBottom: 24 }}>
                  {competitorData.map((c, i) => {
                    const compColors = [COLORS.accent, COLORS.red, COLORS.orange, COLORS.textDim];
                    return (
                      <div key={c.id} style={{
                        background: COLORS.card, borderRadius: 12, padding: "18px 20px",
                        border: `1px solid ${i === 0 ? COLORS.accent + "60" : COLORS.border}`,
                        position: "relative", overflow: "hidden",
                      }}>
                        {i === 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: COLORS.accent }} />}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                        </div>
                        <div style={{ fontSize: 13, color: COLORS.textMuted, wordBreak: "break-all" }}>{c.url}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 32, padding: "16px 0", borderTop: `1px solid ${COLORS.border}`,
          display: "flex", flexDirection: mob ? "column" : "row",
          justifyContent: "space-between", alignItems: mob ? "flex-start" : "center",
          gap: mob ? 8 : 0,
        }}>
          <div style={{ fontSize: 13, color: COLORS.textDim }}>
            Powered by Ahrefs Web Analytics API (stats/chart) + Brand Radar API
          </div>
          <div style={{ fontSize: 13, color: COLORS.textDim }}>
            Fulfill Corporation × BeginAI © 2026
          </div>
        </div>
      </main>
    </div>
  );
}
