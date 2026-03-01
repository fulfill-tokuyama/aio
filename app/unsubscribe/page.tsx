"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
};

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("lid");

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleUnsubscribe = async () => {
    if (!leadId) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  // Auto-unsubscribe on page load if lid is present
  useEffect(() => {
    if (leadId && status === "idle") {
      handleUnsubscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F9FAFB", fontFamily: "'Noto Sans JP', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: "100%", background: C.card, borderRadius: 16,
        border: `1px solid ${C.border}`, padding: "48px 36px", textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        <div style={{
          display: "inline-block", width: 44, height: 44, borderRadius: 10,
          background: "linear-gradient(135deg, #2563EB, #1D4ED8)", lineHeight: "44px",
          textAlign: "center", fontSize: 22, marginBottom: 16,
        }}>
          ⚡
        </div>

        {status === "loading" && (
          <>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>処理中...</h1>
            <p style={{ color: C.sub, fontSize: 14 }}>配信停止処理を行っています。</p>
          </>
        )}

        {status === "done" && (
          <>
            <h1 style={{ color: C.green, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>配信停止完了</h1>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
              メールの配信を停止しました。<br />
              今後、AIO Insight からのメールは届きません。<br /><br />
              ご利用ありがとうございました。
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ color: C.red, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>エラー</h1>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
              配信停止処理に失敗しました。<br />
              お手数ですが、メールに返信して配信停止をお申し付けください。
            </p>
          </>
        )}

        {status === "idle" && !leadId && (
          <>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>配信停止</h1>
            <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
              無効なリンクです。<br />
              メールに記載されたリンクから再度お試しください。
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4B5563", fontSize: 14 }}>読み込み中...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
