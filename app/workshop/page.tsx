"use client";

import { useState, useCallback } from "react";

// ============================================================
// 型定義
// ============================================================
interface FormData {
  company: string;
  name: string;
  email: string;
  position: string;
  employeeCount: string;
  industry: string;
  interests: string[];
  workshopDate: string;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

// ============================================================
// 定数
// ============================================================
const WORKSHOP_TOPICS = [
  {
    icon: "💬",
    title: "ChatGPT 業務活用",
    desc: "議事録・メール・企画書を10分で作成。プロンプト設計の基礎から応用まで。",
  },
  {
    icon: "✨",
    title: "Gemini 活用術",
    desc: "Google Workspace連携、長文分析、マルチモーダル活用で業務を効率化。",
  },
  {
    icon: "🧠",
    title: "Claude 実践テクニック",
    desc: "長文処理・コード生成・分析タスクに強いClaudeの使い分け戦略。",
  },
  {
    icon: "📓",
    title: "NotebookLM 活用法",
    desc: "社内資料・PDF・議事録をAIが自動整理。ナレッジベース構築の実演。",
  },
  {
    icon: "⚡",
    title: "Google AI Studio",
    desc: "ノーコードでAIアプリを構築。自社専用のAIツールを作る方法を実演。",
  },
  {
    icon: "🛠️",
    title: "Claude Code でシステム開発",
    desc: "プログラミング未経験でもAIと対話しながら業務システムを構築する手法。",
  },
] as const;

const EMPLOYEE_COUNT_OPTIONS = [
  "1〜10名",
  "11〜30名",
  "31〜50名",
  "51〜100名",
  "101〜300名",
  "301〜500名",
  "500名以上",
] as const;

const INDUSTRY_OPTIONS = [
  "製造業",
  "建設・不動産",
  "IT・通信",
  "小売・卸売",
  "医療・福祉",
  "士業（税理士・弁護士等）",
  "物流・運輸",
  "飲食・サービス",
  "教育",
  "その他",
] as const;

const INTEREST_OPTIONS = [
  "ChatGPT・Gemini・Claudeの使い分け",
  "NotebookLMでの社内ナレッジ管理",
  "Google AI Studioでのノーコード開発",
  "Claude Codeでのシステム開発",
  "AI研修（助成金活用）について",
  "AI人材の派遣について",
] as const;

// ============================================================
// ページコンポーネント
// ============================================================
export default function WorkshopPage() {
  const [form, setForm] = useState<FormData>({
    company: "",
    name: "",
    email: "",
    position: "",
    employeeCount: "",
    industry: "",
    interests: [],
    workshopDate: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleInterestToggle = useCallback((interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/workshop-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "登録に失敗しました");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("通信エラーが発生しました。しばらく経ってから再度お試しください。");
      setStatus("error");
    }
  };

  return (
    <div style={{ margin: 0, padding: 0, background: "#ffffff" }}>
      {/* ============ ヘッダー ============ */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
              フルフィル株式会社
            </span>
            <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>
              AI研修・コンサルティング
            </span>
          </div>
          <a
            href="#register"
            style={{
              background: "#2563EB",
              color: "#fff",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            無料で参加する
          </a>
        </div>
      </header>

      {/* ============ ヒーロー ============ */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              background: "#dc2626",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: 20,
              marginBottom: 24,
            }}
          >
            参加費無料 ｜ オンライン開催
          </div>
          <h1
            style={{
              color: "#f8fafc",
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 800,
              lineHeight: 1.3,
              margin: "0 0 20px",
            }}
          >
            他社が有料で教えている
            <br />
            <span style={{ color: "#60a5fa" }}>生成AI活用ノウハウ</span>を
            <br />
            すべて無料で公開します
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 16,
              lineHeight: 1.8,
              margin: "0 0 32px",
            }}
          >
            ChatGPT・Gemini・Claude・NotebookLM・Google AI Studio・Claude
            Code
            <br />
            6つのAIツールを業務で即活用する方法を、実演付きでお伝えします。
          </p>
          <a
            href="#register"
            style={{
              display: "inline-block",
              background: "#2563EB",
              color: "#fff",
              padding: "16px 48px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            無料ワークショップに申し込む
          </a>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>
            所要時間：90分 ｜ Zoom開催 ｜ 録画配布あり
          </p>
        </div>
      </section>

      {/* ============ 問題提起 ============ */}
      <section style={{ background: "#f8fafc", padding: "64px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 16,
            }}
          >
            こんなお悩みはありませんか？
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 32,
              textAlign: "left",
            }}
          >
            {[
              "ChatGPTを導入したが、社員がほとんど使っていない",
              "AIツールが多すぎて、どれを使えばいいか分からない",
              "「AI活用しろ」と言われるが、具体的な方法が分からない",
              "有料のAI研修は高額で、効果が出るか不安",
              "IT部門がなく、AIの導入を相談できる人がいない",
              "競合がAIを活用し始めていて、差が開いている気がする",
            ].map((text, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px 24px",
                  fontSize: 14,
                  color: "#475569",
                  lineHeight: 1.7,
                }}
              >
                <span style={{ color: "#dc2626", fontWeight: 700, marginRight: 8 }}>✓</span>
                {text}
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: 16,
              color: "#1e293b",
              fontWeight: 600,
              marginTop: 32,
              lineHeight: 1.8,
            }}
          >
            このワークショップでは、これらの悩みを
            <span style={{ color: "#2563EB" }}>90分で解消</span>します。
          </p>
        </div>
      </section>

      {/* ============ ワークショップ内容 ============ */}
      <section style={{ background: "#fff", padding: "64px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              ワークショップで学べること
            </h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              すべて実演付き。その場で一緒に手を動かしながら学べます。
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {WORKSHOP_TOPICS.map((topic, i) => (
              <div
                key={i}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 28,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{topic.icon}</div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1e293b",
                    marginBottom: 8,
                  }}
                >
                  {topic.title}
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
                  {topic.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ なぜ無料？ ============ */}
      <section style={{ background: "#1e293b", padding: "64px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: 24,
            }}
          >
            なぜ無料で公開するのか？
          </h2>
          <div
            style={{
              background: "#0f172a",
              borderRadius: 16,
              padding: 32,
              textAlign: "left",
            }}
          >
            <p
              style={{
                fontSize: 15,
                color: "#cbd5e1",
                lineHeight: 2,
                margin: 0,
              }}
            >
              正直にお伝えします。
              <br />
              <br />
              このワークショップの目的は、
              <strong style={{ color: "#f8fafc" }}>
                AI活用に本気で取り組みたい企業様との出会い
              </strong>
              です。
              <br />
              <br />
              ワークショップでAIの可能性を実感していただいた後、
              <br />
              「自社の業務にどう落とし込めばいいか？」
              <br />
              「社員全員に使わせるにはどうすればいいか？」
              <br />
              <br />
              そう感じていただけた企業様には、
              <strong style={{ color: "#60a5fa" }}>
                助成金を活用したAI研修プログラム
              </strong>
              や
              <strong style={{ color: "#60a5fa" }}>AI人材の派遣サービス</strong>
              をご提案しています。
              <br />
              <br />
              ただし、ワークショップで営業は一切しません。
              <br />
              <strong style={{ color: "#f8fafc" }}>
                まずは、純粋にAIの力を体感してください。
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* ============ こんな方におすすめ ============ */}
      <section style={{ background: "#fff", padding: "64px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1e293b",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            こんな方におすすめです
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                role: "経営者・役員",
                text: "AI投資の判断材料がほしい。社員に何を学ばせるべきか知りたい。",
              },
              {
                role: "DX推進担当",
                text: "AIツールの選定に迷っている。社内展開の進め方を知りたい。",
              },
              {
                role: "管理職・マネージャー",
                text: "チームの生産性を上げたい。AIで何が自動化できるか知りたい。",
              },
              {
                role: "総務・人事担当",
                text: "AI研修の助成金活用について情報収集したい。",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#2563EB",
                    marginBottom: 8,
                  }}
                >
                  {item.role}
                </div>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: 0 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 申込フォーム ============ */}
      <section
        id="register"
        style={{ background: "#f8fafc", padding: "64px 24px" }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: 8,
              }}
            >
              無料ワークショップに申し込む
            </h2>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              参加費無料 ｜ オンライン（Zoom） ｜ 90分
            </p>
          </div>

          {status === "success" ? (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#166534",
                  marginBottom: 12,
                }}
              >
                お申込みありがとうございます
              </h3>
              <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.8 }}>
                ワークショップの詳細（Zoom URL・事前準備）を
                <br />
                ご登録のメールアドレスにお送りいたします。
                <br />
                当日のご参加をお待ちしております。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 32,
                }}
              >
                {/* 必須項目 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    会社名 <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: 株式会社サンプル"
                    value={form.company}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, company: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    お名前 <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: 山田 太郎"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    メールアドレス <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="例: yamada@example.co.jp"
                    value={form.email}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, email: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>

                {/* 任意項目 */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>役職</label>
                  <input
                    type="text"
                    placeholder="例: 代表取締役 / DX推進室長"
                    value={form.position}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, position: e.target.value }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <label style={labelStyle}>従業員数</label>
                    <select
                      value={form.employeeCount}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          employeeCount: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="">選択してください</option>
                      {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>業種</label>
                    <select
                      value={form.industry}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, industry: e.target.value }))
                      }
                      style={inputStyle}
                    >
                      <option value="">選択してください</option>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 興味のあるトピック */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>
                    興味のあるトピック（複数選択可）
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {INTEREST_OPTIONS.map((interest) => {
                      const selected = form.interests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 20,
                            fontSize: 13,
                            border: selected
                              ? "1px solid #2563EB"
                              : "1px solid #cbd5e1",
                            background: selected ? "#eff6ff" : "#fff",
                            color: selected ? "#2563EB" : "#475569",
                            fontWeight: selected ? 600 : 400,
                            cursor: "pointer",
                          }}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* エラー表示 */}
                {status === "error" && errorMsg && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      padding: "12px 16px",
                      color: "#dc2626",
                      fontSize: 13,
                      marginBottom: 20,
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                {/* 送信ボタン */}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  style={{
                    width: "100%",
                    padding: "16px 0",
                    background:
                      status === "submitting" ? "#93c5fd" : "#2563EB",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 8,
                    cursor:
                      status === "submitting" ? "not-allowed" : "pointer",
                  }}
                >
                  {status === "submitting"
                    ? "送信中..."
                    : "無料ワークショップに申し込む"}
                </button>

                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  ご入力いただいた情報はワークショップのご案内にのみ使用いたします。
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section style={{ background: "#fff", padding: "64px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1e293b",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            よくあるご質問
          </h2>
          {[
            {
              q: "本当に無料ですか？後から費用が発生しませんか？",
              a: "はい、完全に無料です。ワークショップ後の営業もいたしません。ご自身で「もっと深く学びたい」と思われた場合にのみ、研修プログラムをご案内しています。",
            },
            {
              q: "ITに詳しくなくても参加できますか？",
              a: "はい。パソコンでメールが使える方であれば問題ありません。専門用語は使わず、実際の画面を見せながら進めます。",
            },
            {
              q: "1社から複数名で参加できますか？",
              a: "はい、歓迎です。経営者と実務担当の方が一緒に参加されると、社内での活用がスムーズに進みます。",
            },
            {
              q: "録画はもらえますか？",
              a: "はい、参加者全員にワークショップの録画をお送りします。当日ご都合が合わない場合も、録画のみの視聴が可能です。",
            },
            {
              q: "助成金を使ったAI研修とは何ですか？",
              a: "人材開発支援助成金を活用すると、通常1名40万円のAI研修を1名10万円で受講できます。助成金の申請手続きは弊社が代行いたします。詳しくはワークショップ後にご相談ください。",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                borderBottom: "1px solid #e2e8f0",
                padding: "24px 0",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                Q. {item.q}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ 最終CTA ============ */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: 16,
            }}
          >
            まずは無料で、AIの力を体感してください
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>
            90分のワークショップで、明日から使えるAI活用スキルが手に入ります。
          </p>
          <a
            href="#register"
            style={{
              display: "inline-block",
              background: "#2563EB",
              color: "#fff",
              padding: "16px 48px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            無料ワークショップに申し込む
          </a>
        </div>
      </section>

      {/* ============ フッター ============ */}
      <footer
        style={{
          background: "#0f172a",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
          © {new Date().getFullYear()} フルフィル株式会社 All rights reserved.
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// スタイル定数
// ============================================================
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 14,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
};
