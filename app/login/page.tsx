"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

const C = {
  bg: "#04060B",
  card: "#111827",
  border: "#1E293B",
  text: "#E2E8F0",
  textSub: "#8896AB",
  textDim: "#5A6A80",
  accent: "#3B82F6",
  red: "#EF4444",
  gold: "#F0B429",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        fontFamily: "'Noto Sans JP', system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: "48px 36px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-block",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "linear-gradient(135deg, #F0B429, #D49B1F)",
              lineHeight: "44px",
              textAlign: "center",
              fontSize: 22,
              marginBottom: 12,
            }}
          >
            ⚡
          </div>
          <h1
            style={{
              color: C.text,
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 4px",
            }}
          >
            AIO Insight
          </h1>
          <p style={{ color: C.textDim, fontSize: 12, margin: 0 }}>
            ダッシュボードにログイン
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                color: C.textSub,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@company.co.jp"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                color: C.textSub,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: C.red,
                fontSize: 13,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              background: `linear-gradient(135deg, ${C.accent}, #2563EB)`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <p
          style={{
            color: C.textDim,
            fontSize: 11,
            textAlign: "center",
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          パスワードはウェルカムメールに記載されています。
          <br />
          ご不明な場合はサポートまでお問い合わせください。
        </p>
      </div>
    </div>
  );
}
