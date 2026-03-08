"use client";

import { useState, useCallback } from "react";
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
  red: "#DC2626",
};

/** ランダムパスワード生成（ユーザーには見せない） */
function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get("from");
  const url = searchParams.get("url");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getRedirectPath = useCallback(() => {
    if (from === "diagnosis" && url) {
      return `/diagnosis?url=${encodeURIComponent(url)}`;
    }
    if (from === "email" && url) {
      return `/diagnosis?url=${encodeURIComponent(url)}`;
    }
    return "/dashboard";
  }, [from, url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const password = generateRandomPassword();

    // まずサインアップを試行
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      // 既に登録済みの場合
      if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
        setError("このメールアドレスは既に登録されています。ログインページからお入りください。");
        setLoading(false);
        return;
      }
      setError("登録に失敗しました。しばらく経ってからお試しください。");
      setLoading(false);
      return;
    }

    // signUp 成功 → セッションが自動的に作成される（Supabase のデフォルト設定）
    // リダイレクト
    const redirectPath = getRedirectPath();
    router.push(redirectPath);
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
          <div style={{ fontSize: 13, color: C.dim }}>無料アカウント登録</div>
        </div>
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "48px 16px" }}>
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>
            無料アカウント登録
          </h1>
          <p style={{ color: C.sub, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 1.7 }}>
            メールアドレスを入力するだけで
            <br />詳細な診断レポートを無料でご確認いただけます
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: "#F9FAFB",
                  color: C.text, fontSize: 14, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p style={{ color: C.red, fontSize: 14, marginBottom: 16, textAlign: "center" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: loading ? C.border : "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: loading ? C.dim : "#fff",
                fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "登録中..." : "無料登録する（パスワード不要）"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a
              href="/login"
              style={{ background: "none", border: "none", color: C.accent, fontSize: 14, cursor: "pointer", textDecoration: "underline" }}
            >
              既にアカウントをお持ちの方はログイン
            </a>
          </div>

          <p style={{ color: C.dim, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 1.7 }}>
            パスワードは自動生成されます。ログイン情報はウェルカムメールでお届けします。
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4B5563", fontSize: 14 }}>読み込み中...</div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
