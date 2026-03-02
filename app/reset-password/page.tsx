"use client";

import { useState, useEffect } from "react";
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
  sub: "#4B5563",
  dim: "#9CA3AF",
  accent: "#2563EB",
  red: "#DC2626",
  green: "#059669",
};

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"request" | "update">("request");

  // Check if this is a password update callback (from Supabase email link)
  // Supabase redirects to this page with a session after clicking the reset link
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setMode("update");
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (resetError) {
      setError("リセットメールの送信に失敗しました。メールアドレスをご確認ください。");
    } else {
      setSuccess("パスワードリセットメールを送信しました。メールをご確認ください。");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (newPassword.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError("パスワードの更新に失敗しました。リンクが期限切れの可能性があります。");
    } else {
      setSuccess("パスワードを更新しました。ログインページに移動します...");
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F9FAFB", fontFamily: "'Noto Sans JP', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        maxWidth: 400, width: "100%", background: C.card, borderRadius: 16,
        border: `1px solid ${C.border}`, padding: "48px 36px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-block", width: 44, height: 44, borderRadius: 10,
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)", lineHeight: "44px",
            textAlign: "center", fontSize: 22, marginBottom: 12,
          }}>
            ⚡
          </div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>
            {mode === "request" ? "パスワードリセット" : "新しいパスワード設定"}
          </h1>
          <p style={{ color: C.dim, fontSize: 14, margin: 0 }}>
            {mode === "request" ? "登録メールアドレスにリセットリンクを送信します" : "新しいパスワードを入力してください"}
          </p>
        </div>

        {mode === "request" ? (
          <form onSubmit={handleRequestReset}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                メールアドレス
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="your@company.co.jp"
                style={{
                  width: "100%", padding: "12px 14px", background: "#F9FAFB", border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && <p style={{ color: C.red, fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</p>}
            {success && <p style={{ color: C.green, fontSize: 14, textAlign: "center", marginBottom: 16 }}>{success}</p>}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: 14, background: `linear-gradient(135deg, ${C.accent}, #1D4ED8)`,
              color: "#fff", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "送信中..." : "リセットメールを送信"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: C.sub, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                新しいパスワード
              </label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                placeholder="8文字以上"
                style={{
                  width: "100%", padding: "12px 14px", background: "#F9FAFB", border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && <p style={{ color: C.red, fontSize: 14, textAlign: "center", marginBottom: 16 }}>{error}</p>}
            {success && <p style={{ color: C.green, fontSize: 14, textAlign: "center", marginBottom: 16 }}>{success}</p>}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: 14, background: `linear-gradient(135deg, ${C.accent}, #1D4ED8)`,
              color: "#fff", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "更新中..." : "パスワードを更新"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/login" style={{ color: C.sub, fontSize: 14, textDecoration: "none" }}>
            ログインページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
