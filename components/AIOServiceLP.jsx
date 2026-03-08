"use client";

import { useState, useEffect } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

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
  purple: "#8B5CF6",
  purpleBg: "rgba(139,92,246,0.08)",
};

const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

const goToDiagnosis = (url) => {
  const path = url ? `/diagnosis?url=${encodeURIComponent(url)}` : "/diagnosis";
  if (typeof window !== "undefined") window.location.href = path;
};

// ── Data ──

const PROBLEMS = [
  {
    icon: "🔍",
    title: "AI検索で自社がどう表示されているか分からない",
    desc: "ChatGPTやPerplexityで業界の質問をすると、競合は出てくるのに自社は出てこない。そもそも現状が見えていない。",
  },
  {
    icon: "📉",
    title: "従来のSEO対策だけでは限界を感じている",
    desc: "AI Overview表示時にクリック率が約34.5%減少。Google検索だけを見ていては、機会損失が拡大する一方。",
  },
  {
    icon: "😩",
    title: "AIプラットフォームごとに手動確認するしかない",
    desc: "ChatGPT、Perplexity、Gemini… 各プラットフォームを毎回手作業で確認するのは非現実的で、体系的なモニタリングができない。",
  },
  {
    icon: "📊",
    title: "\"AI対策\"の効果測定ができない",
    desc: "コンテンツを改善しても、AIでの言及が増えたのか減ったのか定量的に把握できず、経営層への報告・予算確保にデータが不足。",
  },
  {
    icon: "🤷",
    title: "何から手をつければいいのか分からない",
    desc: "AIO対策、E-E-A-T強化、構造化データ… 施策が多すぎて優先順位が不明。闇雲な施策では成果が出ない。",
  },
];

const FEATURES = [
  { icon: "📡", title: "AI Share of Voice", desc: "ChatGPT・Perplexity・Geminiでの自社ブランド言及率・引用率を自動モニタリング。「AI検索で見えているのか」を数値で把握。" },
  { icon: "🤖", title: "AIトラフィック計測", desc: "AI検索からの流入を自動識別。GA4では分離できないAIトラフィックを正確に把握し、SEOとAIOの効果を分けて評価。" },
  { icon: "⚔️", title: "競合AIギャップ分析", desc: "競合が言及されて自社が言及されていない領域を自動検出。コンテンツ改善の優先順位を明確化。" },
  { icon: "📈", title: "トレンド推移ダッシュボード", desc: "全指標を時系列で可視化。施策前後の変化を定量的に比較し、効果測定の根拠に。" },
  { icon: "🎯", title: "AIO改善アクション提案", desc: "データに基づいた具体的な改善施策をAIが自動提案。構造化データ・E-E-A-T・コンテンツの優先度付き。" },
  { icon: "📄", title: "月次レポート自動生成", desc: "経営層への報告資料としてそのまま使えるPDFレポートを毎月自動配信。レポート作成工数をゼロに。" },
];

const FUNCTIONS = [
  {
    category: "AI Brand Monitor",
    icon: "📡",
    color: C.accent,
    items: [
      "6つのAIプラットフォームを定期自動スキャン",
      "業界特化プロンプトによるブランド言及検出",
      "カスタムプロンプト設定（業界・競合に最適化）",
      "言及率・引用率のスコアリング",
      "競合との比較ベンチマーク",
    ],
  },
  {
    category: "Web Analytics 連携",
    icon: "📊",
    color: C.green,
    items: [
      "Ahrefs Web Analytics APIとの統合",
      "AI検索トラフィックの自動識別・分離",
      "Cookie不使用・GDPR対応の設計",
      "時系列チャートによる推移可視化",
      "ページ別・流入元別の詳細分析",
    ],
  },
  {
    category: "分析・レポート",
    icon: "🎯",
    color: C.purple,
    items: [
      "全指標を統合したダッシュボード",
      "被引用ページ分析（AIに評価されているコンテンツの特定）",
      "月次PDFレポート自動生成・メール配信",
      "AIメンションギャップの可視化",
      "改善施策の優先度スコアリング",
    ],
  },
  {
    category: "技術仕様・信頼性",
    icon: "🔒",
    color: C.cyan,
    items: [
      "プロンプトベースの検出（方向性指標として設計）",
      "IPハッシュ化・24時間破棄のプライバシー設計",
      "APIユニット不要（追加コストなし）",
      "Webサイトに2KBのスクリプト1行で設置完了",
      "全データの出典を透明に開示",
    ],
  },
];

const RESULTS = [
  { value: "+45%", label: "AI言及率の改善", sub: "改善提案に基づくコンテンツ最適化後（3ヶ月平均）", color: C.green },
  { value: "527%", label: "AI検索トラフィック増加率", sub: "AI検索からのWebサイト訪問の前年比（市場全体）", color: C.accent },
  { value: "95%", label: "モニタリング工数削減", sub: "6プラットフォーム手動確認 → 自動ダッシュボード", color: C.cyan },
  { value: "0h", label: "レポート作成工数", sub: "月次レポート自動生成により完全自動化（従来:月8時間）", color: C.purple },
  { value: "9.46%", label: "AIO表示キーワード比率", sub: "デスクトップキーワードの表示率（米国では16%）", color: C.amber },
  { value: "-34.5%", label: "AIO表示時のCTR変化", sub: "AI Overview表示時のクリック率低下 → 対策で回避", color: C.red },
];

const USE_CASES = [
  {
    icon: "💻",
    tag: "BtoB SaaS企業",
    title: "AI検索で「選ばれるSaaS」になる",
    problem: "「○○ツール おすすめ」でAI検索すると競合ばかり表示される",
    solution: "AI Share of Voiceで競合との差を定量化。ギャップ分析で「言及されていない領域」を特定し、コンテンツを優先的に改善",
    result: "3ヶ月でAI言及率を15%→40%に向上",
  },
  {
    icon: "🛒",
    tag: "EC・D2Cブランド",
    title: "商品カテゴリ検索のAI可視性を確保",
    problem: "商品カテゴリ検索でAI Overviewに競合商品が表示され、流入が減少",
    solution: "AIトラフィック計測で影響範囲を特定。構造化データ・レビュー最適化の改善提案を実行",
    result: "AI経由の商品ページ流入を月間200%増",
  },
  {
    icon: "🏢",
    tag: "SEO・マーケティング代理店",
    title: "AI対策を新たなサービスメニューに",
    problem: "クライアントから「AI対策もやってほしい」と言われるが、効果測定手段がない",
    solution: "クライアントごとにAI可視性をモニタリング。月次レポートで施策効果を定量報告",
    result: "新規サービスメニュー化でクライアント単価向上",
  },
  {
    icon: "📰",
    tag: "メディア・情報サイト",
    title: "AI引用からの流入減少を食い止める",
    problem: "AI Overviewに記事内容が引用され、サイトへの直接流入が激減",
    solution: "被引用ページ分析で「引用されているが流入がないページ」を特定。E-E-A-T強化でクリック誘導を改善",
    result: "AI引用ページのCTRを回復・向上",
  },
];

const EVIDENCE = [
  {
    category: "データソース",
    icon: "🔬",
    items: [
      { claim: "3つのAIプラットフォームでブランド言及を自動検出", source: "AI Brand Monitor 仕様", url: "#", detail: "ChatGPT (OpenAI gpt-4o-mini)、Perplexity (Sonar)、Gemini (2.0 flash-lite) の3プラットフォームに対して業界特化プロンプトを送信し、ブランド言及・引用を自動検出します。", verified: true },
      { claim: "Web Analytics APIは完全無料・APIユニット不要", source: "Ahrefs公式ドキュメント", url: "https://docs.ahrefs.com/docs/api/web-analytics/", detail: "statsとchartの2つのエンドポイントに対応。WAレポートの「API」ボタンからクエリを自動生成可能。Enterpriseプラン不要で全ユーザーが利用可能。", verified: true },
      { claim: "Cookie不使用・個人情報非収集・GDPR対応", source: "Ahrefs Help Center", url: "https://help.ahrefs.com/en/articles/10247870-about-ahrefs-web-analytics", detail: "IPアドレスはハッシュ化され24時間で破棄。個人を追跡せず、デバイス×サイト×日単位でのデータポイントのみ保持。", verified: true },
    ],
  },
  {
    category: "データの信頼性に関する注意",
    icon: "⚠️",
    items: [
      { claim: "AI Brand Monitorの指標は「方向性指標」であり絶対値ではない", source: "AI Brand Monitor", url: "#", detail: "AIプラットフォームへのプロンプトベースの検出であり、実際のユーザー検索とは異なります。トレンド把握には有効ですが、精密なトラフィック予測には使えません。", verified: true, isWarning: true },
      { claim: "プロンプトは業界に合わせてカスタマイズ可能", source: "AI Brand Monitor", url: "#", detail: "デフォルトでは5つの日本語プロンプトを使用しますが、カスタムプロンプトの設定も可能です。プロンプトの内容によって結果が変わる場合があります。", verified: true, isWarning: true },
      { claim: "Web Analyticsのユニーク訪問者は日単位のカウント", source: "Ahrefs Help Center", url: "https://help.ahrefs.com/en/articles/10247870-about-ahrefs-web-analytics", detail: "同一人物が異なるデバイスや異なる日にアクセスした場合、別の訪問者としてカウントされる。GA4等との数値差異が生じる可能性あり。", verified: true, isWarning: true },
    ],
  },
  {
    category: "市場背景",
    icon: "📊",
    items: [
      { claim: "AIプラットフォームからのトラフィックが前年比527%増加", source: "AllAboutAI 2025 Visibility Statistics", url: "https://www.allaboutai.com/ai-seo/website-traffic-checker/", detail: "AI検索（ChatGPT、Perplexity等）からのWebサイト訪問が急増しており、従来のSEOだけでは不十分な時代に突入。", verified: true },
      { claim: "AIオーバービューはデスクトップキーワードの9.46%に表示", source: "Ahrefs AI Visibility Guide", url: "https://ahrefs.com/blog/ai-visibility/", detail: "2025年5月時点。米国では16%に達する。AIO表示時はクリック率が約34.5%減少するため、AIO対策は事業インパクトに直結。", verified: true },
    ],
  },
];

const PLANS = [
  {
    name: "無料",
    price: "¥0",
    target: "まずは試したい方",
    badge: null,
    isFree: true,
    features: [
      { label: "AI検索可視性診断", value: "○" },
      { label: "基本レポート（スコア・カテゴリ別評価）", value: "○" },
      { label: "課題の件数・重要度表示", value: "○" },
      { label: "課題の詳細・改善提案", value: "メアド登録で閲覧" },
      { label: "AI検索エンジン別 表示予測", value: "メアド登録で閲覧" },
      { label: "同業種比較データ", value: "メアド登録で閲覧" },
      { label: "構造化データ自動生成", value: "—" },
      { label: "metaタグ改善案生成", value: "—" },
      { label: "月次スコアモニタリング", value: "—" },
    ],
  },
  {
    name: "プロ",
    price: "¥10,000",
    target: "本格的にAI検索対策したい方",
    badge: "RECOMMENDED",
    isFree: false,
    features: [
      { label: "AI検索可視性診断", value: "○（月次自動再診断）" },
      { label: "基本レポート（スコア・カテゴリ別評価）", value: "○" },
      { label: "課題の詳細・改善提案", value: "○（全文）" },
      { label: "AI検索エンジン別 表示予測", value: "○" },
      { label: "同業種比較データ", value: "○" },
      { label: "構造化データ（JSON-LD）自動生成", value: "○" },
      { label: "metaタグ改善案生成（AI）", value: "○" },
      { label: "月次スコアモニタリング+メール", value: "○" },
      { label: "サポート", value: "メール" },
    ],
  },
];

const FAQS = [
  { q: "無料トライアルはありますか？", a: "はい。7日間の無料体験をご用意しています。クレジットカード不要で、すべての機能をお試しいただけます。" },
  { q: "契約期間の縛りはありますか？", a: "ありません。月額制でいつでも解約可能です。Stripeのサブスクリプション管理から簡単に手続きできます。" },
  { q: "導入に技術的な知識は必要ですか？", a: "不要です。Ahrefs Web Analyticsのスクリプト設置（2KBのコード1行）のみお願いしています。設置方法のサポートも無料で行います。" },
  { q: "複数サイトを管理したい場合は？", a: "スタンダードプラン（3サイト）またはエージェンシープラン（無制限）をご利用ください。プラン変更はいつでも可能です。" },
];

// ── Components ──

const Section = ({ children, id, style = {}, mob }) => (
  <section id={id} style={{ padding: mob ? "48px 0" : "80px 0", ...style }}>
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: mob ? "0 16px" : "0 24px" }}>
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
    transition: "border-color 0.3s, transform 0.3s", cursor: "default",
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

const StatCard = ({ value, label, sub, color, mob }) => (
  <div style={{
    background: C.card, borderRadius: 14, padding: mob ? 20 : 28,
    border: `1px solid ${C.border}`, textAlign: "center",
    transition: "border-color 0.3s, transform 0.3s", cursor: "default",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "50"; e.currentTarget.style.transform = "translateY(-2px)"; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
  >
    <div style={{ fontSize: mob ? 32 : 40, fontWeight: 800, color, fontFamily: "Outfit", marginBottom: 8 }}>{value}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{sub}</div>
  </div>
);

// ── Main ──

export default function AIOServiceLP() {
  const [mounted, setMounted] = useState(false);
  const [diagnosisUrl, setDiagnosisUrl] = useState("");
  const [diagnosisUrlError, setDiagnosisUrlError] = useState("");
  const [expandedEvidence, setExpandedEvidence] = useState({});
  const [activeEvidenceTab, setActiveEvidenceTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFuncTab, setActiveFuncTab] = useState(0);
  const mob = useIsMobile();

  useEffect(() => { setMounted(true); }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const NAV_ITEMS = [
    { label: "課題", id: "problem" },
    { label: "機能", id: "features" },
    { label: "効果", id: "results" },
    { label: "エビデンス", id: "evidence" },
    { label: "料金", id: "pricing" },
  ];

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

      {/* ===== 1. NAV ===== */}
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
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} style={{
                background: "none", border: "none", color: C.textSub, fontSize: 13,
                fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s",
              }}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.textSub}
              >{n.label}</button>
            ))}
            <button className="btn-primary" onClick={() => goToDiagnosis()}
              style={{ padding: "8px 20px", fontSize: 13 }}>
              無料診断
            </button>
          </div>
        )}
      </nav>
      {mob && menuOpen && (
        <div style={{
          position: "sticky", top: 53, zIndex: 49,
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", padding: "8px 16px",
        }}>
          {NAV_ITEMS.map(n => (
            <button key={n.id} onClick={() => { scrollTo(n.id); setMenuOpen(false); }} style={{
              background: "none", border: "none", color: C.textSub, fontSize: 14,
              fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "10px 0",
              textAlign: "left", borderBottom: `1px solid ${C.border}`,
            }}>{n.label}</button>
          ))}
          <button className="btn-primary" onClick={() => { goToDiagnosis(); setMenuOpen(false); }}
            style={{ padding: "10px 20px", fontSize: 14, marginTop: 8, marginBottom: 4 }}>
            無料診断
          </button>
        </div>
      )}

      {/* ===== 2. HERO ===== */}
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
            ChatGPT・Perplexity・Gemini 対応 ／ 月額 ¥10,000〜
          </div>

          <h1 className="fade-up" style={{
            fontSize: "clamp(34px, 5.5vw, 58px)", fontWeight: 800,
            lineHeight: 1.15, margin: "0 0 20px", letterSpacing: -1,
            animationDelay: "100ms",
          }}>
            <span style={{ color: C.text }}>AI検索で</span>
            <span style={{
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight}, #A78BFA)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>"選ばれる"</span>
            <span style={{ color: C.text }}>ブランドへ。</span>
            <br />
            <span style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 600, color: C.textSub }}>
              可視性を計測し、改善する。
            </span>
          </h1>

          <p className="fade-up" style={{
            fontSize: mob ? 15 : 18, color: C.textSub, maxWidth: 640, margin: "0 auto 36px",
            lineHeight: 1.7, animationDelay: "200ms",
          }}>
            ChatGPT・Perplexity・Geminiがあなたのブランドをどう語っているか、知っていますか？
            <br />AI Brand Monitor + Web Analyticsで、AI時代の
            <br />"見つけてもらえる力"を可視化・改善します。
          </p>

          <div className="fade-up" style={{
            display: "flex", gap: 16, justifyContent: "center",
            flexDirection: mob ? "column" : "row", alignItems: "center",
            animationDelay: "300ms",
          }}>
            <button className="btn-primary" onClick={() => goToDiagnosis()} style={mob ? { width: "100%" } : undefined}>
              無料でAI検索可視性を診断する →
            </button>
            <button className="btn-outline" onClick={() => scrollTo("evidence")} style={mob ? { width: "100%" } : undefined}>
              エビデンスを確認
            </button>
          </div>

          {/* AI Platform Icons */}
          <div className="fade-up" style={{
            display: "flex", gap: mob ? 16 : 28, justifyContent: "center", alignItems: "center",
            marginTop: mob ? 32 : 48, animationDelay: "400ms", flexWrap: "wrap",
          }}>
            {[
              { name: "ChatGPT", icon: "🤖" },
              { name: "Perplexity", icon: "🔍" },
              { name: "Gemini", icon: "✨" },
              { name: "Copilot", icon: "🧑‍✈️" },
              { name: "Claude", icon: "🧠" },
              { name: "Grok", icon: "⚡" },
            ].map((p, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: C.surface,
                  border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>{p.icon}</div>
                <span style={{ fontSize: 10, color: C.textDim, fontWeight: 500 }}>{p.name}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="fade-up" style={{
            display: "grid",
            gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, auto)",
            gap: mob ? 12 : 32,
            justifyContent: mob ? undefined : "center",
            justifyItems: mob ? "center" : undefined,
            marginTop: mob ? 24 : 36, animationDelay: "500ms",
          }}>
            {[
              { icon: "🔒", label: "Cookie不使用" },
              { icon: "📡", label: "6 AIプラットフォーム" },
              { icon: "📊", label: "Ahrefs連携" },
              { icon: "📄", label: "月次レポート自動" },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== 3. PROBLEM ===== */}
      <Section mob={mob} id="problem" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Problem"
          title="こんな課題、ありませんか？"
          sub="AI検索が普及する今、従来のSEOだけでは見えない課題が増えています"
        />
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {PROBLEMS.map((p, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 14, padding: mob ? 20 : 24,
              border: `1px solid ${C.border}`, display: "flex", gap: 16, alignItems: "flex-start",
              ...(i === PROBLEMS.length - 1 && !mob ? { gridColumn: "1 / -1", maxWidth: 440, justifySelf: "center" } : {}),
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: C.surface, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                border: `1px solid ${C.border}`,
              }}>{p.icon}</div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <div style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 12,
            background: C.accentGlow, border: `1px solid ${C.accent}30`,
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.accentLight }}>
              ↓ これらの課題を AIO Insight がすべて解決します
            </span>
          </div>
        </div>
      </Section>

      {/* ===== 4. FEATURES ===== */}
      <Section mob={mob} id="features">
        <SectionTitle
          tag="Features"
          title="AIO Insight でできること"
          sub="AI Brand MonitorとWeb Analytics APIを統合し、AI時代のマーケティングインテリジェンスを提供します"
        />
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: 18 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} delay={i * 80} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </Section>

      {/* ===== 5. FUNCTION ===== */}
      <Section mob={mob} id="functions" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Functions"
          title="主な機能"
          sub="4つのカテゴリに分かれた機能群で、AI可視性の計測から改善までをカバーします"
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {FUNCTIONS.map((f, i) => (
            <button key={i} onClick={() => setActiveFuncTab(i)} style={{
              padding: "8px 18px", borderRadius: 8,
              border: `1px solid ${activeFuncTab === i ? f.color + "50" : C.border}`,
              background: activeFuncTab === i ? f.color + "12" : "transparent",
              color: activeFuncTab === i ? f.color : C.textSub,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}>
              {f.icon} {f.category}
            </button>
          ))}
        </div>

        <div style={{
          background: C.card, borderRadius: 16, padding: mob ? 24 : 36,
          border: `1px solid ${C.border}`, maxWidth: 700, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: FUNCTIONS[activeFuncTab].color + "15",
              border: `1px solid ${FUNCTIONS[activeFuncTab].color}30`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>{FUNCTIONS[activeFuncTab].icon}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
              {FUNCTIONS[activeFuncTab].category}
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FUNCTIONS[activeFuncTab].items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                  background: FUNCTIONS[activeFuncTab].color,
                }} />
                <span style={{ fontSize: 14, color: C.textSub, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== 6. RESULTS ===== */}
      <Section mob={mob} id="results">
        <SectionTitle
          tag="Results"
          title="導入効果"
          sub="AIO Insightの導入で期待できるインパクトを数値でご紹介します"
        />
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {RESULTS.map((r, i) => (
            <StatCard key={i} mob={mob} value={r.value} label={r.label} sub={r.sub} color={r.color} />
          ))}
        </div>
        <p style={{
          fontSize: 11, color: C.textDim, textAlign: "center", marginTop: 24, lineHeight: 1.6,
        }}>
          ※ 市場データはAhrefs・AllAboutAI等の第三者調査に基づきます。個別の改善効果は業種・対策内容により異なります。
        </p>
      </Section>

      {/* ===== 7. USE CASES ===== */}
      <Section mob={mob} id="usecases" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Use Cases"
          title="活用シーン"
          sub="業種・目的に応じた具体的な活用例をご紹介します"
        />
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 18 }}>
          {USE_CASES.map((uc, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 16, padding: mob ? 22 : 28,
              border: `1px solid ${C.border}`,
              transition: "border-color 0.3s", cursor: "default",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "40"}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{uc.icon}</span>
                <div>
                  <div style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 6,
                    background: C.accentGlow, border: `1px solid ${C.accent}25`,
                    fontSize: 11, fontWeight: 600, color: C.accentLight, marginBottom: 4,
                  }}>{uc.tag}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{uc.title}</h3>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.red}15` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>課題</div>
                  <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{uc.problem}</div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.accent}15` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>活用方法</div>
                  <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{uc.solution}</div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: C.greenBg, border: `1px solid ${C.green}15` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.green, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>成果イメージ</div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, fontWeight: 600 }}>{uc.result}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== 8. EVIDENCE ===== */}
      <Section mob={mob} id="evidence">
        <SectionTitle
          tag="Evidence & Transparency"
          title="データソースと信頼性について"
          sub="本サービスで使用するデータの出典と、その限界について透明に開示します"
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {EVIDENCE.map((cat, i) => (
            <button key={i} onClick={() => setActiveEvidenceTab(i)} style={{
              padding: "8px 18px", borderRadius: 8, border: `1px solid ${activeEvidenceTab === i ? C.accent + "50" : C.border}`,
              background: activeEvidenceTab === i ? C.accentGlow : "transparent",
              color: activeEvidenceTab === i ? C.accentLight : C.textSub,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}>
              {cat.icon} {cat.category}
            </button>
          ))}
        </div>

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
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
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
                    color: item.verified ? C.green : C.amber, flexShrink: 0,
                  }}>
                    {item.verified ? "検証済" : "未検証"}
                  </div>
                  <span style={{
                    color: C.textDim, fontSize: 14, transition: "transform 0.2s",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0,
                  }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{
                    padding: "0 22px 18px", borderTop: `1px solid ${C.border}`,
                    marginTop: -2, paddingTop: 16,
                  }}>
                    <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, margin: "0 0 12px" }}>{item.detail}</p>
                    {item.url !== "#" && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 12, color: C.accent, textDecoration: "none",
                        padding: "6px 12px", borderRadius: 6, background: C.accentGlow,
                        border: `1px solid ${C.accent}25`, fontWeight: 600, transition: "background 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.accentGlow2}
                      onMouseLeave={e => e.currentTarget.style.background = C.accentGlow}
                      >
                        🔗 ソースを確認 → {item.url.replace("https://", "").split("/").slice(0, 2).join("/")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 32, padding: 22, borderRadius: 12,
          background: C.cyanBg, border: `1px solid ${C.cyan}20`,
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>透明性へのコミットメント</div>
              <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, margin: 0 }}>
                トラフィックデータはAhrefs Web Analytics APIから、ブランド言及データはAI Brand Monitor（ChatGPT・Perplexity・Gemini）から取得しています。
                AI Brand Monitorの数値は方向性指標であり、絶対的なトラフィック数値ではありません。この制約を正直にお伝えした上で、
                トレンドの把握と戦略的な意思決定に有効なインサイトを提供します。
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ===== 9. PRICING ===== */}
      <Section mob={mob} id="pricing" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Pricing"
          title="料金プラン"
          sub="無料診断でまずは試し、本格対策はプロプランで"
        />

        <div style={{
          display: "grid",
          gridTemplateColumns: mob ? "1fr" : "1fr 1fr",
          gap: 18, maxWidth: 800, margin: "0 auto",
        }}>
          {PLANS.map((plan, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 16, overflow: "hidden",
              border: `1px solid ${plan.badge ? C.accent + "40" : C.border}`,
              position: "relative",
              transform: plan.badge && !mob ? "scale(1.03)" : undefined,
              zIndex: plan.badge ? 1 : 0,
            }}>
              {plan.badge && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${C.accent}, #8B5CF6, ${C.accentLight})`,
                }} />
              )}
              <div style={{ padding: mob ? 22 : 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSub }}>{plan.target}</div>
                  </div>
                  {plan.badge && (
                    <div style={{
                      padding: "4px 12px", borderRadius: 6,
                      background: C.greenBg, border: `1px solid ${C.green}20`,
                      fontSize: 10, fontWeight: 700, color: C.green,
                    }}>{plan.badge}</div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: C.text, fontFamily: "Outfit" }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: C.textDim }}>/月（税別）</span>
                </div>

                <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: C.textSub }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.value}</span>
                    </div>
                  ))}
                </div>

                {plan.isFree ? (
                  <button className="btn-primary" onClick={() => scrollTo("diagnosis-form")}
                    style={{
                      width: "100%", padding: 14, fontSize: 14, borderRadius: 10,
                      background: C.accent,
                    }}>
                    無料で診断する
                  </button>
                ) : (
                  <>
                    <button className="btn-primary" onClick={() => goToDiagnosis()}
                      style={{
                        width: "100%", padding: 14, fontSize: 14, borderRadius: 10,
                        background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`,
                      }}>
                      まず無料診断を試す
                    </button>
                    <div style={{ textAlign: "center", marginTop: 10 }}>
                      <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: C.textDim, textDecoration: "underline", cursor: "pointer" }}>
                        すぐに有料プランに申し込む →
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 700, margin: "56px auto 0" }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 28 }}>よくある質問</h3>
          {FAQS.map((faq, i) => (
            <div key={i} style={{
              padding: "18px 0", borderBottom: i < FAQS.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== 10. CLOSING ===== */}
      <Section mob={mob} id="closing" style={{
        background: `linear-gradient(180deg, ${C.bg} 0%, ${C.accent}08 50%, ${C.bg} 100%)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 500, height: 500,
          background: `radial-gradient(circle, ${C.accent}0A, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <h2 style={{
            fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800,
            color: C.text, lineHeight: 1.3, margin: "0 0 16px", letterSpacing: -0.5,
          }}>
            AI検索で"見えない"コストは、
            <br />毎日積み上がっている。
          </h2>
          <p style={{
            fontSize: mob ? 14 : 16, color: C.textSub, maxWidth: 580, margin: "0 auto 36px", lineHeight: 1.7,
          }}>
            競合がAI検索で言及されている間、あなたのブランドはどれだけの機会を逃していますか？
            <br />まずは無料診断で、今の立ち位置を確認しませんか。
          </p>
          <div style={{
            display: "flex", gap: 16, justifyContent: "center",
            flexDirection: mob ? "column" : "row", alignItems: "center",
          }}>
            <button className="btn-primary" onClick={() => goToDiagnosis()}
              style={{ ...(mob ? { width: "100%" } : {}), padding: "16px 36px", fontSize: 16 }}>
              無料でAI検索可視性を診断する →
            </button>
            <button className="btn-outline" onClick={() => scrollTo("pricing")} style={mob ? { width: "100%" } : undefined}>
              料金プランを見る
            </button>
          </div>
        </div>
      </Section>

      {/* ===== 11. DIAGNOSIS FORM (URL入力) ===== */}
      <Section mob={mob} id="diagnosis-form" style={{ background: C.bgAlt }}>
        <SectionTitle
          tag="Contact"
          title="無料AI可視性診断"
          sub="貴社サイトのURLを入力するだけ。診断ページへ遷移し、AI検索での可視性をスコアリングします。"
        />

        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{
            background: C.card, borderRadius: 16, padding: mob ? "28px 20px" : "36px 32px",
            border: `1px solid ${C.border}`,
          }}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const url = diagnosisUrl.trim();
              if (!url) {
                setDiagnosisUrlError("URLを入力してください");
                return;
              }
              goToDiagnosis(url);
            }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textSub, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  WebサイトURL <span style={{ color: C.red }}>*</span>
                </label>
                <input className={`input-field ${diagnosisUrlError ? "input-error" : ""}`}
                  placeholder="https://www.example.co.jp"
                  value={diagnosisUrl}
                  onChange={e => { setDiagnosisUrl(e.target.value); setDiagnosisUrlError(""); }} />
                {diagnosisUrlError && <span style={{ fontSize: 11, color: C.red, marginTop: 4, display: "block" }}>{diagnosisUrlError}</span>}
                <span style={{ fontSize: 11, color: C.textDim, marginTop: 4, display: "block" }}>※ 診断ページでAI可視性を分析します</span>
              </div>

              <button type="submit" className="btn-primary"
                disabled={!diagnosisUrl.trim()}
                style={{
                  width: "100%", padding: 16, fontSize: 15,
                  opacity: !diagnosisUrl.trim() ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                無料でAI検索可視性を診断する →
              </button>

              <p style={{ fontSize: 11, color: C.textDim, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                ※ 診断結果は診断ページで即座にご確認いただけます。
              </p>
            </form>
          </div>
        </div>
      </Section>

      {/* ===== 12. FOOTER ===== */}
      <footer style={{
        padding: mob ? "32px 16px" : "48px 28px", borderTop: `1px solid ${C.border}`,
        background: C.bg,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: mob ? "1fr" : "2fr 1fr 1fr",
            gap: mob ? 28 : 48, marginBottom: 32,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: `linear-gradient(135deg, ${C.accent}, #8B5CF6)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: "#fff",
                }}>AI</div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>AIO Insight</span>
              </div>
              <p style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6, margin: 0 }}>
                AI Brand Monitor + Ahrefs Web Analytics APIを活用した
                <br />AI最適化ダッシュボード。
              </p>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>サービス</div>
              {[
                { label: "機能一覧", id: "features" },
                { label: "料金プラン", id: "pricing" },
                { label: "活用事例", id: "usecases" },
                { label: "エビデンス", id: "evidence" },
              ].map(l => (
                <button key={l.id} onClick={() => scrollTo(l.id)} style={{
                  display: "block", background: "none", border: "none", color: C.textDim,
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "4px 0",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => e.target.style.color = C.text}
                onMouseLeave={e => e.target.style.color = C.textDim}
                >{l.label}</button>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>法的情報</div>
              {[
                { label: "無料診断", id: "diagnosis-form" },
                { label: "プライバシーポリシー", href: "/privacy" },
                { label: "利用規約", href: "/terms" },
                { label: "特定商取引法に基づく表記", href: "/tokusho" },
              ].map((l, i) => (
                l.id ? (
                  <button key={i} onClick={() => scrollTo(l.id)} style={{
                    display: "block", background: "none", border: "none", color: C.textDim,
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "4px 0",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={e => e.target.style.color = C.text}
                  onMouseLeave={e => e.target.style.color = C.textDim}
                  >{l.label}</button>
                ) : (
                  <a key={i} href={l.href} style={{
                    display: "block", color: C.textDim, fontSize: 12, textDecoration: "none",
                    padding: "4px 0", transition: "color 0.2s",
                  }}
                  onMouseEnter={e => e.target.style.color = C.text}
                  onMouseLeave={e => e.target.style.color = C.textDim}
                  >{l.label}</a>
                )
              ))}
            </div>
          </div>

          <div style={{
            paddingTop: 20, borderTop: `1px solid ${C.border}`,
            display: "flex", flexDirection: mob ? "column" : "row",
            justifyContent: "space-between", alignItems: mob ? "flex-start" : "center", gap: 8,
          }}>
            <span style={{ fontSize: 11, color: C.textDim }}>
              by Fulfill Corporation / BeginAI
            </span>
            <span style={{ fontSize: 11, color: C.textDim }}>
              データソース: AI Brand Monitor + Ahrefs Web Analytics API | © 2026 AIO Insight
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
