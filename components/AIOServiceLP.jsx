import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

// ============================================================
// AIO INSIGHT - Service Landing Page
// Stripe決済 + 問い合わせフォーム + エビデンス
// ============================================================

const C = {
  bg: "#08090E",
  bgAlt: "#0D0F17",
  surface: "#12151F",
  card: "#161A28",
  cardHover: "#1C2133",
  border: "#1E2436",
  borderAccent: "#2A3350",
  text: "#E8ECF4",
  textSub: "#9BA4B8",
  textDim: "#5C6478",
  accent: "#4F6EF7",
  accentLight: "#6B8AFF",
  accentGlow: "rgba(79,110,247,0.12)",
  accentGlow2: "rgba(79,110,247,0.06)",
  green: "#22C55E",
  greenBg: "rgba(34,197,94,0.1)",
  amber: "#F59E0B",
  amberBg: "rgba(245,158,11,0.1)",
  red: "#EF4444",
  cyan: "#0EA5E9",
  cyanBg: "rgba(14,165,233,0.08)",
};

// Stripe Payment Link (from environment variable)
const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

// ============================================================
// Evidence Data — All sourced from official Ahrefs documentation
// ============================================================
const EVIDENCE = [
  {
    category: "データソース",
    icon: "🔬",
    items: [
      {
        claim: "Web Analytics APIは完全無料・APIユニット不要",
        source: "Ahrefs公式ドキュメント",
        url: "https://docs.ahrefs.com/docs/api/web-analytics/",
        detail: "statsとchartの2つのエンドポイントに対応。WAレポートの「API」ボタンからクエリを自動生成可能。Enterpriseプラン不要で全ユーザーが利用可能。",
        verified: true,
      },
      {
        claim: "Brand Radarは月間260M+のプロンプトを分析",
        source: "Ahrefs Brand Radar公式ページ",
        url: "https://ahrefs.com/brand-radar",
        detail: "ChatGPT (10.6M)、Perplexity (13.1M)、Gemini (7.2M)、Copilot (13.3M)、AI Overviews (134M)、AI Mode (13.5M)の合計。検索ベースのプロンプトを使用し、合成クエリではない。",
        verified: true,
      },
      {
        claim: "Cookie不使用・個人情報非収集・GDPR対応",
        source: "Ahrefs Help Center",
        url: "https://help.ahrefs.com/en/articles/10247870-about-ahrefs-web-analytics",
        detail: "IPアドレスはハッシュ化され24時間で破棄。個人を追跡せず、デバイス×サイト×日単位でのデータポイントのみ保持。",
        verified: true,
      },
    ]
  },
  {
    category: "データの信頼性に関する注意",
    icon: "⚠️",
    items: [
      {
        claim: "Brand Radarの指標は「方向性指標」であり絶対値ではない",
        source: "Ahrefs Brand Radar Methodology",
        url: "https://ahrefs.com/blog/brand-radar-methodology/",
        detail: "「Metrics are directional indicators, not exact traffic counts – best understood as modeled visibility signals, and not performance metrics.」トレンド把握には有効だが、精密なトラフィック予測には使えない。",
        verified: true,
        isWarning: true,
      },
      {
        claim: "AIプロンプトは月次更新・90日レポートウィンドウ",
        source: "Ahrefs Brand Radar Methodology",
        url: "https://ahrefs.com/blog/brand-radar-methodology/",
        detail: "プロンプトセットは月次で更新・テストされ、90日間のレポートウィンドウで報告。リアルタイムの変化は捕捉しきれない場合がある。",
        verified: true,
        isWarning: true,
      },
      {
        claim: "Web Analyticsのユニーク訪問者は日単位のカウント",
        source: "Ahrefs Help Center",
        url: "https://help.ahrefs.com/en/articles/10247870-about-ahrefs-web-analytics",
        detail: "同一人物が異なるデバイスや異なる日にアクセスした場合、別の訪問者としてカウントされる。GA4等との数値差異が生じる可能性あり。",
        verified: true,
        isWarning: true,
      },
    ]
  },
  {
    category: "市場背景",
    icon: "📊",
    items: [
      {
        claim: "AIプラットフォームからのトラフィックが前年比527%増加",
        source: "AllAboutAI 2025 Visibility Statistics",
        url: "https://www.allaboutai.com/ai-seo/website-traffic-checker/",
        detail: "AI検索（ChatGPT、Perplexity等）からのWebサイト訪問が急増しており、従来のSEOだけでは不十分な時代に突入。",
        verified: true,
      },
      {
        claim: "AIオーバービューはデスクトップキーワードの9.46%に表示",
        source: "Ahrefs AI Visibility Guide",
        url: "https://ahrefs.com/blog/ai-visibility/",
        detail: "2025年5月時点。米国では16%に達する。AIO表示時はクリック率が約34.5%減少するため、AIO対策は事業インパクトに直結。",
        verified: true,
      },
    ]
  },
];

// ============================================================
// Components
// ============================================================

const Section = ({ children, id, style = {}, mob: isMob }) => (
  <section id={id} style={{ padding: isMob ? "48px 0" : "80px 0", ...style }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMob ? "0 16px" : "0 24px" }}>
      {children}
    </div>
  </section>
);

const SectionTitle = ({ tag, title, sub }) => (
  <div style={{ marginBottom: 48, textAlign: "center" }}>
    {tag && (
      <div style={{
        display: "inline-block", padding: "4px 14px", borderRadius: 20,
        background: C.accentGlow, border: `1px solid ${C.accent}30`,
        fontSize: 12, fontWeight: 600, color: C.accentLight, letterSpacing: 1,
        marginBottom: 16, textTransform: "uppercase",
      }}>{tag}</div>
    )}
    <h2 style={{
      fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: "0 0 12px",
      color: C.text, lineHeight: 1.2, letterSpacing: -0.5,
    }}>{title}</h2>
    {sub && <p style={{ fontSize: 16, color: C.textSub, maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>{sub}</p>}
  </div>
);

const FeatureCard = ({ icon, title, desc, delay = 0 }) => (
  <div className="fade-up" style={{
    background: C.card, borderRadius: 14, padding: 28,
    border: `1px solid ${C.border}`, animationDelay: `${delay}ms`,
    transition: "border-color 0.3s, transform 0.3s",
    cursor: "default",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "50"; e.currentTarget.style.transform = "translateY(-2px)"; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
  >
    <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
    <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: C.text }}>{title}</h3>
    <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6, margin: 0 }}>{desc}</p>
  </div>
);

const CheckItem = ({ children }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
    <span style={{ color: C.green, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
    <span style={{ fontSize: 14, color: C.textSub, lineHeight: 1.5 }}>{children}</span>
  </div>
);

// ============================================================
// Main App
// ============================================================

export default function AIOServiceLP() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ company: "", name: "", email: "", url: "", message: "" });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSending, setFormSending] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState({});
  const [activeEvidenceTab, setActiveEvidenceTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const mob = useIsMobile();

  useEffect(() => { setMounted(true); }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.company.trim()) errors.company = "会社名を入力してください";
    if (!formData.name.trim()) errors.name = "お名前を入力してください";
    if (!formData.email.trim()) errors.email = "メールアドレスを入力してください";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "正しいメールアドレスを入力してください";
    if (!formData.url.trim()) errors.url = "WebサイトURLを入力してください";
    return errors;
  };

  const [formError, setFormError] = useState("");

  const handleSubmit = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setFormSending(true);
    setFormError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error || "送信に失敗しました");
        setFormSending(false);
        return;
      }
      setFormSending(false);
      setFormSubmitted(true);
    } catch {
      setFormError("ネットワークエラーが発生しました。もう一度お試しください。");
      setFormSending(false);
    }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
      opacity: mounted ? 1 : 0, transition: "opacity 0.6s",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse2 { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; opacity:0; }
        .input-field { width:100%; padding:12px 16px; border-radius:8px; border:1px solid ${C.border}; background:${C.bgAlt}; color:${C.text}; font-size:14px; font-family:inherit; outline:none; transition:border-color 0.2s; box-sizing:border-box; }
        .input-field:focus { border-color:${C.accent}; }
        .input-field::placeholder { color:${C.textDim}; }
        .input-error { border-color:${C.red} !important; }
        .btn-primary { padding:14px 32px; border-radius:10px; border:none; background:${C.accent}; color:#fff; font-size:15px; font-weight:700; font-family:inherit; cursor:pointer; transition:all 0.2s; letter-spacing:0.3px; }
        .btn-primary:hover { background:${C.accentLight}; transform:translateY(-1px); box-shadow:0 8px 30px ${C.accentGlow}; }
        .btn-outline { padding:14px 32px; border-radius:10px; border:1px solid ${C.border}; background:transparent; color:${C.text}; font-size:15px; font-weight:600; font-family:inherit; cursor:pointer; transition:all 0.2s; }
        .btn-outline:hover { border-color:${C.accent}; color:${C.accentLight}; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
      `}</style>

      {/* ===== NAV ===== */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, padding: mob ? "10px 16px" : "12px 28px",
        background: `${C.bg}E8`, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, #8B5CF6)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
          }}>AI</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>AIO Insight</span>
        </div>
        {mob ? (
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: 4,
          }}>{menuOpen ? "✕" : "☰"}</button>
        ) : (
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {[
              { label: "機能", id: "features" },
              { label: "エビデンス", id: "evidence" },
              { label: "料金", id: "pricing" },
            ].map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} style={{
                background: "none", border: "none", color: C.textSub, fontSize: 13,
                fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.textSub}
              >{n.label}</button>
            ))}
            <button className="btn-primary" onClick={() => scrollTo("contact")}
              style={{ padding: "8px 20px", fontSize: 13 }}>
              お問い合わせ
            </button>
          </div>
        )}
      </nav>
      {/* Mobile dropdown menu */}
      {mob && menuOpen && (
        <div style={{
          position: "sticky", top: 53, zIndex: 49,
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", padding: "8px 16px",
        }}>
          {[
            { label: "機能", id: "features" },
            { label: "エビデンス", id: "evidence" },
            { label: "料金", id: "pricing" },
          ].map(n => (
            <button key={n.id} onClick={() => { scrollTo(n.id); setMenuOpen(false); }} style={{
              background: "none", border: "none", color: C.textSub, fontSize: 14,
              fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "10px 0",
              textAlign: "left", borderBottom: `1px solid ${C.border}`,
            }}>{n.label}</button>
          ))}
          <button className="btn-primary" onClick={() => { scrollTo("contact"); setMenuOpen(false); }}
            style={{ padding: "10px 20px", fontSize: 14, marginTop: 8, marginBottom: 4 }}>
            お問い合わせ
          </button>
        </div>
      )}

      {/* ===== HERO ===== */}
      <Section mob={mob} style={{ padding: mob ? "60px 0 48px" : "100px 0 80px", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: -200, right: -200, width: 600, height: 600,
          background: `radial-gradient(circle, ${C.accent}08, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div className="fade-up" style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 20,
            background: C.greenBg, border: `1px solid ${C.green}25`,
            fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 24,
          }}>
            🚀 月額 ¥10,000 で始めるAI可視性モニタリング
          </div>

          <h1 className="fade-up" style={{
            fontSize: "clamp(36px, 5.5vw, 60px)", fontWeight: 800,
            lineHeight: 1.15, margin: "0 0 20px", letterSpacing: -1,
            animationDelay: "100ms",
          }}>
            <span style={{ color: C.text }}>AI検索で</span>
            <span style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight}, #A78BFA)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>見つけてもらえる</span>
            <br />
            <span style={{ color: C.text }}>ブランドへ</span>
          </h1>

          <p className="fade-up" style={{
            fontSize: 18, color: C.textSub, maxWidth: 600, margin: "0 auto 36px",
            lineHeight: 1.7, animationDelay: "200ms",
          }}>
            Ahrefs Web Analytics API × Brand Radar を活用した
            <br />AI最適化ダッシュボード。ChatGPT・Perplexity・Geminiでの
            <br />ブランド可視性を計測・分析・改善。
          </p>

          <div className="fade-up" style={{
            display: "flex", gap: 16, justifyContent: "center",
            flexDirection: mob ? "column" : "row",
            alignItems: "center",
            animationDelay: "300ms",
          }}>
            <button className="btn-primary" onClick={() => scrollTo("pricing")} style={mob ? { width: "100%" } : undefined}>
              月額¥10,000で始める →
            </button>
            <button className="btn-outline" onClick={() => scrollTo("evidence")} style={mob ? { width: "100%" } : undefined}>
              エビデンスを確認
            </button>
          </div>

          {/* Trust badges */}
          <div className="fade-up" style={{
            display: "grid",
            gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, auto)",
            gap: mob ? 12 : 32,
            justifyContent: mob ? undefined : "center",
            justifyItems: mob ? "center" : undefined,
            marginTop: mob ? 32 : 48,
            animationDelay: "400ms",
          }}>
            {[
              { icon: "🔒", label: "Cookie不使用" },
              { icon: "📊", label: "Ahrefs公式API" },
              { icon: "⚡", label: "リアルタイム更新" },
              { icon: "🌐", label: "6 AIプラットフォーム対応" },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== FEATURES ===== */}
      <Section mob={mob} id="features" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Features"
          title="AIOダッシュボードでできること"
          sub="Ahrefs Web Analytics APIの無料エンドポイント（stats/chart）とBrand Radar APIを統合し、AI時代のマーケティングインテリジェンスを提供します"
        />
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
          <FeatureCard delay={0} icon="🤖" title="AIトラフィック計測"
            desc="ChatGPT、Perplexity、Copilotからの流入を自動識別。従来のGA4では分離できないAI検索トラフィックを正確に把握。Web Analytics API (chart) で時系列推移も可視化。" />
          <FeatureCard delay={80} icon="📡" title="AI Share of Voice"
            desc="Brand Radar APIにより、6つのAIプラットフォームでの自社ブランド言及率・引用率をモニタリング。競合との可視性比較で戦略的な意思決定を支援。" />
          <FeatureCard delay={160} icon="⚔️" title="競合AIギャップ分析"
            desc="競合が言及されているが自社が言及されていない領域を特定。コンテンツ改善の優先順位を明確にし、AI検索でのシェア拡大を実現。" />
          <FeatureCard delay={240} icon="📄" title="月次レポート自動生成"
            desc="stats/chartエンドポイントから自動取得したデータをPDFレポートとして毎月配信。経営陣への報告資料としてそのまま利用可能。" />
          <FeatureCard delay={320} icon="🔗" title="被引用ページ分析"
            desc="AIレスポンスで引用されている自社ページを特定。どのコンテンツがAI検索で評価されているかを把握し、コンテンツ戦略に反映。" />
          <FeatureCard delay={400} icon="🎯" title="AIO改善アクション提案"
            desc="データに基づいた具体的な改善施策を提示。構造化データの最適化、E-E-A-T強化、AI引用獲得のためのコンテンツ改善をガイド。" />
        </div>
      </Section>

      {/* ===== EVIDENCE ===== */}
      <Section mob={mob} id="evidence">
        <SectionTitle
          tag="Evidence & Transparency"
          title="データソースと信頼性について"
          sub="本サービスで使用するデータの出典と、その限界について透明に開示します。信頼できる意思決定のために、エビデンスベースのアプローチを徹底しています。"
        />

        {/* Evidence tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {EVIDENCE.map((cat, i) => (
            <button key={i} onClick={() => setActiveEvidenceTab(i)} style={{
              padding: "8px 18px", borderRadius: 8, border: `1px solid ${activeEvidenceTab === i ? C.accent + "50" : C.border}`,
              background: activeEvidenceTab === i ? C.accentGlow : "transparent",
              color: activeEvidenceTab === i ? C.accentLight : C.textSub,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}>
              {cat.icon} {cat.category}
            </button>
          ))}
        </div>

        {/* Evidence cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {EVIDENCE[activeEvidenceTab].items.map((item, i) => {
            const key = `${activeEvidenceTab}-${i}`;
            const isOpen = expandedEvidence[key];
            return (
              <div key={key} style={{
                background: C.card, borderRadius: 12, overflow: "hidden",
                border: `1px solid ${item.isWarning ? C.amber + "30" : C.border}`,
                transition: "border-color 0.2s",
              }}>
                <button onClick={() => setExpandedEvidence(prev => ({ ...prev, [key]: !prev[key] }))}
                  style={{
                    width: "100%", padding: "18px 22px", background: "none", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                    fontFamily: "inherit", textAlign: "left",
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: item.isWarning ? C.amberBg : item.verified ? C.greenBg : C.accentGlow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16,
                  }}>
                    {item.isWarning ? "⚠️" : item.verified ? "✅" : "📄"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{item.claim}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>出典: {item.source}</div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 4,
                    background: item.verified ? C.greenBg : C.amberBg,
                    color: item.verified ? C.green : C.amber,
                    flexShrink: 0,
                  }}>
                    {item.verified ? "検証済" : "未検証"}
                  </div>
                  <span style={{
                    color: C.textDim, fontSize: 14, transition: "transform 0.2s",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    flexShrink: 0,
                  }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{
                    padding: "0 22px 18px", borderTop: `1px solid ${C.border}`,
                    marginTop: -2, paddingTop: 16,
                  }}>
                    <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, margin: "0 0 12px" }}>
                      {item.detail}
                    </p>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12, color: C.accent, textDecoration: "none",
                      padding: "6px 12px", borderRadius: 6, background: C.accentGlow,
                      border: `1px solid ${C.accent}25`, fontWeight: 600,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.accentGlow2}
                    onMouseLeave={e => e.currentTarget.style.background = C.accentGlow}
                    >
                      🔗 ソースを確認 → {item.url.replace("https://", "").split("/").slice(0, 2).join("/")}
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Transparency note */}
        <div style={{
          marginTop: 32, padding: 22, borderRadius: 12,
          background: C.cyanBg, border: `1px solid ${C.cyan}20`,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                透明性へのコミットメント
              </div>
              <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, margin: 0 }}>
                本サービスのデータはすべてAhrefs公式APIから取得しています。Brand Radarの数値は方向性指標であり、
                絶対的なトラフィック数値ではありません。この制約を正直にお伝えした上で、トレンドの把握と戦略的な意思決定に
                有効なインサイトを提供します。不明点があれば、いつでもお気軽にお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ===== PRICING ===== */}
      <Section mob={mob} id="pricing" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Pricing"
          title="シンプルな料金プラン"
          sub="AIO対策に必要なすべてを、月額¥10,000でご利用いただけます"
        />

        <div style={{
          maxWidth: 520, margin: "0 auto", background: C.card, borderRadius: 16,
          border: `1px solid ${C.accent}40`, overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${C.accent}, #8B5CF6, ${C.accentLight})`,
          }} />

          <div style={{ padding: mob ? "20px 20px 0" : "36px 36px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  AIO Insight プラン
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, color: C.text, fontFamily: "Outfit" }}>¥10,000</span>
                  <span style={{ fontSize: 14, color: C.textDim }}>/月（税別）</span>
                </div>
              </div>
              <div style={{
                padding: "6px 14px", borderRadius: 8,
                background: C.greenBg, border: `1px solid ${C.green}20`,
                fontSize: 11, fontWeight: 700, color: C.green,
              }}>
                POPULAR
              </div>
            </div>

            <div style={{ height: 1, background: C.border, margin: "24px 0" }} />

            <div style={{ marginBottom: 28 }}>
              <CheckItem>AIトラフィック計測ダッシュボード</CheckItem>
              <CheckItem>AI Share of Voice モニタリング（6プラットフォーム）</CheckItem>
              <CheckItem>競合比較分析（3社まで）</CheckItem>
              <CheckItem>AIメンションギャップ分析</CheckItem>
              <CheckItem>被引用ページ分析</CheckItem>
              <CheckItem>月次PDFレポート自動配信</CheckItem>
              <CheckItem>AIO改善アクション提案</CheckItem>
              <CheckItem>メールサポート（営業日48時間以内）</CheckItem>
            </div>
          </div>

          <div style={{ padding: mob ? "0 20px 24px" : "0 36px 32px" }}>
            <button className="btn-primary" onClick={() => window.open(STRIPE_PAYMENT_LINK, "_blank")}
              style={{
                width: "100%", padding: "16px", fontSize: 16, borderRadius: 12,
                background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Stripeで安全に決済する
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 11, color: C.textDim }}>Powered by</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#635BFF" }}>Stripe</span>
              <span style={{ fontSize: 11, color: C.textDim }}>|</span>
              <span style={{ fontSize: 11, color: C.textDim }}>SSL暗号化 · いつでも解約可</span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640, margin: "48px auto 0" }}>
          {[
            { q: "契約期間の縛りはありますか？", a: "ありません。月額制でいつでも解約可能です。Stripeのサブスクリプション管理から簡単に手続きできます。" },
            { q: "導入に技術的な知識は必要ですか？", a: "不要です。Ahrefs Web Analyticsのスクリプト設置（2KBのコード1行）のみお願いしています。設置方法のサポートも無料で行います。" },
            { q: "データの正確性はどの程度ですか？", a: "Web Analyticsデータは自社サイトの実トラフィックを計測するため高精度です。Brand Radarの指標はAhrefs公式が「方向性指標」と定義しており、トレンド把握に最適ですが、絶対値としての利用は推奨しません。詳しくはエビデンスセクションをご確認ください。" },
          ].map((faq, i) => (
            <div key={i} style={{
              padding: "18px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== CONTACT FORM ===== */}
      <Section mob={mob} id="contact">
        <SectionTitle
          tag="Contact"
          title="無料AI可視性診断"
          sub="貴社サイトのURLを入力するだけ。AI検索での可視性をスコアリングし、弱点と改善提案を数分以内にメールでお届けします。"
        />

        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {formSubmitted ? (
            <div className="fade-up" style={{
              background: C.card, borderRadius: 16, padding: 48,
              border: `1px solid ${C.green}30`, textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🎉</div>
              <h3 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>診断リクエストを受け付けました</h3>
              <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, margin: "0 0 8px" }}>
                数分以内に診断結果をメールでお届けします。
              </p>
              <p style={{ fontSize: 13, color: C.textDim }}>
                ※ 迷惑メールフォルダもご確認ください
              </p>
            </div>
          ) : (
            <div style={{
              background: C.card, borderRadius: 16, padding: "36px 32px",
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textSub, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    会社名 <span style={{ color: C.red }}>*</span>
                  </label>
                  <input className={`input-field ${formErrors.company ? "input-error" : ""}`}
                    placeholder="株式会社サンプル" value={formData.company}
                    onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} />
                  {formErrors.company && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: "block" }}>{formErrors.company}</span>}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textSub, fontWeight: 600, display: "block", marginBottom: 6 }}>
                    お名前 <span style={{ color: C.red }}>*</span>
                  </label>
                  <input className={`input-field ${formErrors.name ? "input-error" : ""}`}
                    placeholder="山田 太郎" value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                  {formErrors.name && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: "block" }}>{formErrors.name}</span>}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: C.textSub, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  メールアドレス <span style={{ color: C.red }}>*</span>
                </label>
                <input className={`input-field ${formErrors.email ? "input-error" : ""}`}
                  type="email" placeholder="your@company.co.jp" value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                {formErrors.email && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: "block" }}>{formErrors.email}</span>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: C.textSub, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  WebサイトURL <span style={{ color: C.red }}>*</span>
                </label>
                <input className={`input-field ${formErrors.url ? "input-error" : ""}`}
                  placeholder="https://www.example.co.jp" value={formData.url}
                  onChange={e => setFormData(p => ({ ...p, url: e.target.value }))} />
                {formErrors.url && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: "block" }}>{formErrors.url}</span>}
                <span style={{ fontSize: 11, color: C.textDim, marginTop: 4, display: "block" }}>
                  ※ 簡易AI可視性診断に使用します
                </span>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: C.textSub, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  ご相談内容（任意）
                </label>
                <textarea className="input-field" rows={4}
                  placeholder="AI検索での自社の見え方について知りたい、競合との差を把握したい、等"
                  value={formData.message}
                  onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                  style={{ resize: "vertical", minHeight: 80 }}
                />
              </div>

              <button className="btn-primary" onClick={handleSubmit}
                disabled={formSending}
                style={{
                  width: "100%", padding: 16, fontSize: 15,
                  opacity: formSending ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                {formSending ? (
                  <>
                    <span style={{ animation: "pulse2 1s infinite" }}>送信中...</span>
                  </>
                ) : (
                  <>無料AI可視性診断を受ける</>
                )}
              </button>

              {formError && (
                <p style={{ fontSize: 13, color: C.red, textAlign: "center", marginTop: 12 }}>
                  {formError}
                </p>
              )}

              <p style={{ fontSize: 11, color: C.textDim, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
                ※ ご入力いただいた情報は、AI可視性診断の目的のみに使用します。
                <br />第三者への提供は一切行いません。
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        padding: mob ? "24px 16px" : "32px 28px", borderTop: `1px solid ${C.border}`,
        background: C.bgAlt,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", flexDirection: mob ? "column" : "row",
          justifyContent: "space-between", alignItems: mob ? "flex-start" : "center",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: `linear-gradient(135deg, ${C.accent}, #8B5CF6)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#fff",
            }}>AI</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>AIO Insight</span>
            <span style={{ fontSize: 11, color: C.textDim }}>by Fulfill Corporation / BeginAI</span>
          </div>
          <div style={{ fontSize: 11, color: C.textDim }}>
            データソース: Ahrefs Web Analytics API (stats/chart) + Brand Radar API | © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
