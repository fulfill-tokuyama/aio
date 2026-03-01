"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const C = {
  bg: "#04060B",
  card: "#111827",
  border: "#1E293B",
  text: "#E2E8F0",
  sub: "#8896AB",
  dim: "#5A6A80",
  accent: "#3B82F6",
  green: "#10B981",
  red: "#EF4444",
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
      background: C.bg, fontFamily: "'Noto Sans JP', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: "100%", background: C.card, borderRadius: 16,
        border: `1px solid ${C.border}`, padding: "48px 36px", textAlign: "center",
      }}>
        <div style={{
          display: "inline-block", width: 44, height: 44, borderRadius: 10,
          background: "linear-gradient(135deg, #F0B429, #D49B1F)", lineHeight: "44px",
          textAlign: "center", fontSize: 22, marginBottom: 16,
        }}>
          ⚡
        </div>

        {status === "loading" && (
          <>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>処理中...</h1>
            <p style={{ color: C.sub, fontSize: 13 }}>配信停止処理を行っています。</p>
          </>
        )}

        {status === "done" && (
          <>
            <h1 style={{ color: C.green, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>配信停止完了</h1>
            <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.7 }}>
              メールの配信を停止しました。<br />
              今後、AIO Insight からのメールは届きません。<br /><br />
              ご利用ありがとうございました。
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ color: C.red, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>エラー</h1>
            <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.7 }}>
              配信停止処理に失敗しました。<br />
              お手数ですが、メールに返信して配信停止をお申し付けください。
            </p>
          </>
        )}

        {status === "idle" && !leadId && (
          <>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>配信停止</h1>
            <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.7 }}>
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
      <div style={{ minHeight: "100vh", background: "#04060B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#8896AB", fontSize: 14 }}>読み込み中...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
