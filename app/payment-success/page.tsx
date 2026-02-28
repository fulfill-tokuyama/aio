"use client";

import { useEffect, useState } from "react";

const C = {
  bg: "#04060B",
  card: "#111827",
  border: "#1E293B",
  text: "#E2E8F0",
  textSub: "#8896AB",
  textDim: "#5A6A80",
  accent: "#3B82F6",
  green: "#10B981",
  gold: "#F0B429",
};

export default function PaymentSuccessPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.5s",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: C.card,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 48,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>

        <h1
          style={{
            color: C.text,
            fontSize: 24,
            fontWeight: 800,
            margin: "0 0 12px",
          }}
        >
          お支払いが完了しました
        </h1>

        <p
          style={{
            color: C.textSub,
            fontSize: 14,
            lineHeight: 1.8,
            margin: "0 0 32px",
          }}
        >
          AIO Insight月額プランへのご登録ありがとうございます。
          <br />
          ログイン情報をメールでお送りしましたのでご確認ください。
        </p>

        <div
          style={{
            background: C.bg,
            borderRadius: 12,
            padding: 24,
            border: `1px solid ${C.border}`,
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              color: C.gold,
              fontSize: 14,
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            次のステップ
          </h3>
          <div style={{ textAlign: "left" }}>
            {[
              "メールでログイン情報を確認",
              "ダッシュボードにログイン",
              "AI可視性スコアと改善提案を確認",
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0",
                  color: C.textSub,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: `${C.green}20`,
                    color: C.green,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>

        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "14px 40px",
            background: `linear-gradient(135deg, ${C.accent}, #2563EB)`,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            borderRadius: 10,
          }}
        >
          ダッシュボードにログイン →
        </a>

        <p
          style={{
            color: C.textDim,
            fontSize: 11,
            marginTop: 24,
          }}
        >
          AIO Insight by BeginAI / 株式会社Fulfill
        </p>
      </div>
    </div>
  );
}
