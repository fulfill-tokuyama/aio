"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";

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

function getSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const diagnosisId = searchParams.get("diagnosis_id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode === "login" && !password.trim()) return;

    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    const redirectUrl = diagnosisId
      ? `${window.location.origin}/auth/callback?diagnosis_id=${diagnosisId}`
      : `${window.location.origin}/auth/callback`;

    if (mode === "signup") {
      // メールアドレスのみ：Magic Link で登録（設計書準拠）
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectUrl },
      });

      if (otpError) {
        setError(otpError.message === "User already registered"
          ? "このメールアドレスは既に登録されています。ログインしてください。"
          : otpError.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("メールアドレスまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }

      if (diagnosisId) {
        router.push(`/diagnosis/${diagnosisId}/detail`);
      } else {
        router.push("/diagnosis");
      }
    }

    setLoading(false);
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

        {success ? (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>認証メールを送信しました</h1>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
              <strong>{email}</strong> にログイン用のリンクを送信しました。<br />
              メール内のリンクをクリックして、登録・ログインを完了してください。
            </p>
            <p style={{ color: C.dim, fontSize: 13, marginTop: 16 }}>
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </p>
          </div>
        ) : (
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>
              {mode === "signup" ? "無料アカウント登録" : "ログイン"}
            </h1>
            <p style={{ color: C.sub, fontSize: 14, textAlign: "center", marginBottom: 24 }}>
              {mode === "signup"
                ? "詳細な診断レポートを無料でご確認いただけます"
                : "アカウントにログインして診断レポートを確認"}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: mode === "login" ? 16 : 24 }}>
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

              {mode === "login" && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6, color: C.sub }}>
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6文字以上"
                    required
                    minLength={6}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 8,
                      border: `1px solid ${C.border}`, background: "#F9FAFB",
                      color: C.text, fontSize: 14, outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              {error && (
                <p style={{ color: C.red, fontSize: 14, marginBottom: 16, textAlign: "center" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim() || (mode === "login" && !password.trim())}
                style={{
                  width: "100%", padding: "14px", borderRadius: 10, border: "none",
                  background: loading ? C.border : "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  color: loading ? C.dim : "#fff",
                  fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer",
                }}
              >
                {loading ? "処理中..." : mode === "signup" ? "無料登録する" : "ログイン"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
                style={{ background: "none", border: "none", color: C.accent, fontSize: 14, cursor: "pointer", textDecoration: "underline" }}
              >
                {mode === "signup" ? "既にアカウントをお持ちの方はログイン" : "アカウントをお持ちでない方は新規登録"}
              </button>
            </div>
          </div>
        )}
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
