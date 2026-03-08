"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Suspense } from "react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

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

interface DiagnosisData {
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
  weaknessDetails?: { id: string; severity: string; message: string; suggestion: string }[];
  suggestions: string[];
  htmlAnalysis: { title: string };
  reportId?: string | null;
}

function DiagnosisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnosisData | null>(null);
  const [error, setError] = useState("");
  const [inputUrl, setInputUrl] = useState(url || "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const runDiagnosis = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/llmo-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "診断に失敗しました");
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) {
      runDiagnosis(url);
    }
    // 認証状態チェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const breakdownItems = data ? [
    { label: "E-E-A-T（信頼性）", score: data.breakdown.eeat, max: 25, color: C.accent },
    { label: "コンテンツ品質", score: data.breakdown.contentQuality, max: 25, color: C.green },
    { label: "構造化データ", score: data.breakdown.structuredData, max: 20, color: C.orange },
    { label: "AIクローラビリティ", score: data.breakdown.crawlability, max: 15, color: "#D97706" },
    { label: "メタ・エンティティ", score: data.breakdown.metaEntity, max: 10, color: "#7C3AED" },
    { label: "技術パフォーマンス", score: data.breakdown.techPerformance, max: 5, color: "#0891B2" },
  ] : [];

  const STRIPE_PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#";

  const handleSignup = () => {
    const params = new URLSearchParams();
    params.set("from", "diagnosis");
    if (url) params.set("url", url);
    router.push(`/signup?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Noto Sans JP', system-ui, sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, background: C.bg }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          ⚡
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>AIO Insight</div>
          <div style={{ fontSize: 13, color: C.dim }}>AI検索可視性 無料診断レポート</div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>

        {/* URL入力 */}
        {!loading && !data && (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, textAlign: "center", marginBottom: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>AI検索可視性 無料診断</h1>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              URLを入力すると、貴社サイトのAI検索（ChatGPT / Perplexity等）での可視性を<br />
              6つのカテゴリで自動分析し、具体的な改善アクションをご提案します。
            </p>
            <form onSubmit={(e) => { e.preventDefault(); runDiagnosis(inputUrl); }} style={{ display: "flex", gap: 8, maxWidth: 500, margin: "0 auto" }}>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.co.jp"
                style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#F9FAFB", color: C.text, fontSize: 14, outline: "none" }}
              />
              <button type="submit" disabled={!inputUrl.trim()} style={{
                padding: "12px 24px", borderRadius: 8, border: "none",
                background: inputUrl.trim() ? `linear-gradient(135deg, ${C.accent}, #1D4ED8)` : C.border,
                color: inputUrl.trim() ? "#fff" : C.dim, fontSize: 14, fontWeight: 700, cursor: inputUrl.trim() ? "pointer" : "default",
              }}>
                診断する
              </button>
            </form>
            {error && <p style={{ color: C.red, fontSize: 14, marginTop: 16 }}>{error}</p>}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", gap: 16 }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 14, color: C.sub }}>サイトを分析中...</div>
            <div style={{ fontSize: 13, color: C.dim }}>通常30秒ほどかかります</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            {/* ===== 無料で見える範囲 ===== */}

            {/* Score Hero */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, textAlign: "center", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 14, color: C.sub, marginBottom: 4 }}>
                {data.htmlAnalysis?.title || url}
              </div>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 20 }}>
                {url}
              </div>
              <div style={{
                display: "inline-flex", width: 120, height: 120, borderRadius: "50%",
                border: `4px solid ${getScoreColor(data.score)}`,
                alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: getScoreColor(data.score), lineHeight: 1 }}>{data.score}</div>
                  <div style={{ fontSize: 13, color: C.sub }}>/ 100</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: getScoreColor(data.score) }}>
                {data.score >= 70 ? "良好" : data.score >= 40 ? "改善の余地あり" : "要改善"}
              </div>
              <p style={{ color: C.sub, fontSize: 14, marginTop: 8 }}>
                {data.score >= 70 ? "AI検索での可視性は良好ですが、さらに強化できるポイントがあります。"
                  : data.score >= 40 ? "AI検索での可視性に改善の余地があります。対策することで流入増加が期待できます。"
                  : "AI検索での可視性が低い状態です。早急な対策をお勧めします。"}
              </p>
            </div>

            {/* Breakdown (カテゴリ別スコア — 無料で見える) */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, margin: "0 0 16px" }}>カテゴリ別スコア</h2>
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

            {/* Weaknesses — 件数 + severity のみ表示、message/suggestion はぼかし */}
            {data.weaknessDetails && data.weaknessDetails.length > 0 && (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>検出された課題（{data.weaknessDetails.length}件）</h2>

                {/* ログイン済み: 全件表示 / 未ログイン: 最初の2件のみ */}
                {(isLoggedIn ? data.weaknessDetails : data.weaknessDetails.slice(0, 2)).map((w, i) => (
                  <div key={w.id || i} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
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

                {/* 未ログイン時のみ: 残りをぼかして表示 */}
                {!isLoggedIn && data.weaknessDetails.length > 2 && (
                  <div style={{ position: "relative" }}>
                    {data.weaknessDetails.slice(2, 5).map((w, i) => (
                      <div key={w.id || i} style={{ padding: "12px 0", borderBottom: i < Math.min(data.weaknessDetails!.length - 3, 2) ? `1px solid ${C.border}` : "none", filter: "blur(5px)", userSelect: "none" as const, pointerEvents: "none" as const }}>
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

                    {/* CTA オーバーレイ */}
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.6)",
                      borderRadius: 8,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                        他 {data.weaknessDetails.length - 2}件の課題と改善提案
                      </div>
                      <button
                        onClick={handleSignup}
                        style={{
                          padding: "10px 28px", borderRadius: 8, border: "none",
                          background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
                          fontSize: 14, fontWeight: 700, cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                        }}
                      >
                        無料登録して詳細を見る
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Weaknesses fallback (no details) */}
            {(!data.weaknessDetails || data.weaknessDetails.length === 0) && data.weaknesses.length > 0 && (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>検出された課題（{data.weaknesses.length}件）</h2>
                <p style={{ fontSize: 14, color: C.sub }}>
                  {data.weaknesses.length}件の課題が見つかりました。詳細を確認するには無料登録が必要です。
                </p>
              </div>
            )}

            {/* ===== ここからぼかし＋CTAゾーン（未ログインの場合）/ 全表示（ログイン済み） ===== */}

            {/* Suggestions */}
            {isLoggedIn ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>改善提案（{data.suggestions.length}件）</h2>
                {data.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: i < data.suggestions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ color: C.green, fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, color: C.sub }}>{s}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 24 }}>
                <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", filter: "blur(5px)", userSelect: "none" as const, pointerEvents: "none" as const }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>改善提案（{data.suggestions.length}件）</h2>
                  {data.suggestions.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ color: C.green, fontSize: 14, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 14, color: C.sub }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.6)", borderRadius: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>改善提案の全リスト</div>
                  <button onClick={handleSignup} style={{
                    padding: "10px 28px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  }}>無料登録して詳細を見る</button>
                </div>
              </div>
            )}

            {/* AI検索エンジン別 表示予測 */}
            {isLoggedIn ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>AI検索エンジン別 表示予測</h2>
                {["ChatGPT", "Perplexity", "Gemini", "Copilot"].map((engine) => (
                  <div key={engine} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{engine}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.orange }}>中程度</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 24 }}>
                <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", filter: "blur(5px)", userSelect: "none" as const, pointerEvents: "none" as const }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>AI検索エンジン別 表示予測</h2>
                  {["ChatGPT", "Perplexity", "Gemini", "Copilot"].map((engine) => (
                    <div key={engine} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{engine}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.orange }}>中程度</span>
                    </div>
                  ))}
                </div>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.6)", borderRadius: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>AI検索エンジン別の表示予測</div>
                  <button onClick={handleSignup} style={{
                    padding: "10px 28px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  }}>無料登録して詳細を見る</button>
                </div>
              </div>
            )}

            {/* 同業種比較データ */}
            {isLoggedIn ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>同業種比較データ</h2>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "16px 0" }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>62</div>
                    <div style={{ fontSize: 13, color: C.sub }}>業界平均スコア</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: getScoreColor(data.score) }}>{data.score}</div>
                    <div style={{ fontSize: 13, color: C.sub }}>あなたのスコア</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.green }}>85</div>
                    <div style={{ fontSize: 13, color: C.sub }}>上位企業平均</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", marginBottom: 24 }}>
                <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", filter: "blur(5px)", userSelect: "none" as const, pointerEvents: "none" as const }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>同業種比較データ</h2>
                  <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "16px 0" }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>62</div>
                      <div style={{ fontSize: 13, color: C.sub }}>業界平均スコア</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: getScoreColor(data.score) }}>{data.score}</div>
                      <div style={{ fontSize: 13, color: C.sub }}>あなたのスコア</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: C.green }}>85</div>
                      <div style={{ fontSize: 13, color: C.sub }}>上位企業平均</div>
                    </div>
                  </div>
                </div>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.6)", borderRadius: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>同業種との比較データ</div>
                  <button onClick={handleSignup} style={{
                    padding: "10px 28px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  }}>無料登録して詳細を見る</button>
                </div>
              </div>
            )}

            {/* CTA: 未登録 → 無料登録 / 登録済み無料 → 有料プラン案内 */}
            {isLoggedIn ? (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.accent}20`, padding: 32, textAlign: "center", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>プロプランで本格的なAI検索対策を</h3>
                <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  構造化データ（JSON-LD）自動生成・metaタグ改善案・月次モニタリングで<br />
                  AI検索での可視性を継続的に改善します。
                </p>
                <a
                  href={STRIPE_PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", padding: "14px 48px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff", fontSize: 15, fontWeight: 800,
                    cursor: "pointer", textDecoration: "none",
                  }}
                >
                  プロプランに申し込む（月額 ¥10,000）
                </a>
                <p style={{ color: C.dim, fontSize: 13, marginTop: 12 }}>7日間の無料体験付き・いつでも解約可能</p>
              </div>
            ) : (
              <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.accent}20`, padding: 32, textAlign: "center", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>まずは無料登録で詳細レポートを確認</h3>
                <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  課題の詳細・改善提案・AI検索エンジン別の表示予測・同業種比較データを<br />
                  無料でご確認いただけます。
                </p>
                <button
                  onClick={handleSignup}
                  style={{
                    display: "inline-block", padding: "14px 48px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "#fff", fontSize: 15, fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  無料登録して詳細レポートを見る
                </button>
                <p style={{ color: C.dim, fontSize: 13, marginTop: 12 }}>メールアドレスだけで登録できます</p>
              </div>
            )}

            {/* Re-scan */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <button onClick={() => { setData(null); setError(""); }} style={{
                padding: "10px 24px", borderRadius: 8, border: `1px solid ${C.border}`,
                background: "transparent", color: C.sub, fontSize: 14, cursor: "pointer",
              }}>
                別のURLを診断する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4B5563", fontSize: 14 }}>読み込み中...</div>
      </div>
    }>
      <DiagnosisContent />
    </Suspense>
  );
}
