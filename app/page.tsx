"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "/lp", label: "無料AI可視性診断", desc: "AIの検索結果で貴社がどう見えているか無料で診断", color: "#F0B429", primary: true },
  { href: "/dashboard", label: "AIOダッシュボード", desc: "AI トラフィック・Brand Radar・競合分析（要ログイン）", color: "#60A5FA", primary: false },
  { href: "/login", label: "ログイン", desc: "有料プランご契約者様のダッシュボードアクセス", color: "#34D399", primary: false },
];

export default function Home() {
  const [mt, setMt] = useState(false);
  useEffect(() => setMt(true), []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 40,
      fontFamily: "'Noto Sans JP', system-ui, sans-serif",
      background: "#04060B", color: "#D2DAE8",
      opacity: mt ? 1 : 0, transition: "opacity 0.5s",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 10,
        background: "linear-gradient(135deg, #F0B429, #D49B1F)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, fontSize: 22,
      }}>⚡</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>AIO Insight</h1>
      <p style={{ fontSize: 14, color: "#7E8CA4", marginBottom: 40 }}>
        AI検索最適化サービス by BeginAI / Fulfill Corporation
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {links.map(l => (
          <a key={l.href} href={l.href} style={{
            display: "block", width: 280, padding: "24px 20px",
            background: l.primary ? "#161C2B" : "#111622", borderRadius: 10,
            border: `1px solid ${l.primary ? l.color + "40" : "#1B2235"}`, textDecoration: "none",
            color: "#D2DAE8", transition: "border-color 0.2s, transform 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = l.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = l.primary ? l.color + "40" : "#1B2235"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: l.color }}>{l.label}</div>
            <div style={{ fontSize: 12, color: "#7E8CA4", lineHeight: 1.5 }}>{l.desc}</div>
            <div style={{ fontSize: 11, color: l.color, marginTop: 12, fontWeight: 600 }}>→ 開く</div>
          </a>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "#454F63", marginTop: 40 }}>
        © 2026 Fulfill Corporation / BeginAI
      </p>
    </div>
  );
}
