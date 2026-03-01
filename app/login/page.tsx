"use client";

import { useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder"
);

const C = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textSub: "#4B5563",
  textDim: "#9CA3AF",
  accent: "#2563EB",
  red: "#DC2626",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mob = useIsMobile();

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
        background: "#F9FAFB",
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
          padding: mob ? "36px 24px" : "48px 36px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
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
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
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
          <p style={{ color: C.textDim, fontSize: 14, margin: 0 }}>
            ダッシュボードにログイン
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                color: C.textSub,
                fontSize: 14,
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
                background: "#F9FAFB",
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
                fontSize: 14,
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
                background: "#F9FAFB",
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
                fontSize: 14,
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
              background: `linear-gradient(135deg, ${C.accent}, #1D4ED8)`,
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

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/reset-password" style={{ color: C.accent, fontSize: 14, textDecoration: "none" }}>
            パスワードをお忘れですか？
          </a>
        </div>
        <p
          style={{
            color: C.textDim,
            fontSize: 13,
            textAlign: "center",
            marginTop: 12,
            lineHeight: 1.7,
          }}
        >
          パスワードはウェルカムメールに記載されています。
        </p>
      </div>
    </div>
  );
}
