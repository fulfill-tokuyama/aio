export const metadata = {
  title: "特定商取引法に基づく表記 | AIO Insight",
  description: "AIO Insight の特定商取引法に基づく表記",
};

export default function TokushoPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "'Noto Sans JP', sans-serif", color: "#111827", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32 }}>特定商取引法に基づく表記</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 32 }}>
        <tbody>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, width: 200, color: "#374151" }}>事業者名</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>フルフィル株式会社</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, color: "#374151" }}>代表者</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>—</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, color: "#374151" }}>所在地</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>—</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, color: "#374151" }}>お問い合わせ</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>本サービス内のお問い合わせフォームより</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, color: "#374151" }}>販売価格</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>各プランページに表示</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, color: "#374151" }}>支払方法</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>クレジットカード（Stripe 経由）</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            <td style={{ padding: "12px 0", fontWeight: 600, color: "#374151" }}>解約</td>
            <td style={{ padding: "12px 0", color: "#111827" }}>Stripe のサブスクリプション管理からいつでも可能</td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 16 }}>
        ※ 上記のうち「—」は、正式な情報に差し替えてください。
      </p>

      <p style={{ marginTop: 32 }}>
        <a href="/lp" style={{ color: "#2563EB", fontSize: 14, textDecoration: "underline" }}>← LP に戻る</a>
      </p>
    </div>
  );
}
