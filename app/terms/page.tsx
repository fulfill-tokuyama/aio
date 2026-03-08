export const metadata = {
  title: "利用規約 | AIO Insight",
  description: "AIO Insight の利用規約",
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "'Noto Sans JP', sans-serif", color: "#111827", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32 }}>利用規約</h1>

      <p style={{ fontSize: 14, color: "#4B5563", marginBottom: 32 }}>
        本利用規約は、フルフィル株式会社（以下「当社」）が提供する AIO Insight サービス（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただくことで、本規約に同意したものとみなします。
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>第1条 サービス内容</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          本サービスは、WebサイトのAI検索（ChatGPT・Perplexity・Gemini等）における可視性を診断し、改善提案を提供するSaaSです。無料プランと有料プランがあります。
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>第2条 利用登録</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          本サービスの利用には、メールアドレスによる登録が必要です。登録時に提供された情報は正確かつ最新の状態であることをご自身で保証するものとします。
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>第3条 料金・支払い</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          有料プランは月額制です。料金は Stripe 経由で決済され、契約期間は毎月自動更新されます。解約は任意のタイミングで可能です。
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>第4条 禁止事項</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          本サービスの利用にあたり、以下の行為を禁止します。
        </p>
        <ul style={{ paddingLeft: 24, marginBottom: 12 }}>
          <li>法令または公序良俗に違反する行為</li>
          <li>当社または第三者の権利を侵害する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>不正アクセス・不正利用</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>第5条 免責事項</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          診断結果は参考情報であり、AI検索の表示状況を保証するものではありません。本サービスの利用により生じた損害について、当社は責任を負いかねます。
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>第6条 規約の変更</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          当社は、必要に応じて本規約を変更することがあります。変更後の規約は本サービス上で公表した時点で効力を生じます。
        </p>
      </section>

      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 32 }}>
        制定日: 2026年3月<br />
        フルフィル株式会社（Fulfill Corporation）
      </p>

      <p style={{ marginTop: 32 }}>
        <a href="/lp" style={{ color: "#2563EB", fontSize: 14, textDecoration: "underline" }}>← LP に戻る</a>
      </p>
    </div>
  );
}
