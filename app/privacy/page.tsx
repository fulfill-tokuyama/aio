export const metadata = {
  title: "プライバシーポリシー | AIO Insight",
  description: "AIO Insight のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "'Noto Sans JP', sans-serif", color: "#111827", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32 }}>プライバシーポリシー</h1>

      <p style={{ fontSize: 14, color: "#4B5563", marginBottom: 32 }}>
        フルフィル株式会社（以下「当社」）は、AIO Insight サービス（以下「本サービス」）におけるユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>1. 収集する情報</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          本サービスでは、以下の情報を収集します。
        </p>
        <ul style={{ paddingLeft: 24, marginBottom: 12 }}>
          <li>メールアドレス（無料登録・有料契約時）</li>
          <li>企業名・担当者名・WebサイトURL（診断申込時）</li>
          <li>診断結果のデータ（スコア・課題・改善提案等）</li>
          <li>決済情報（Stripe 経由で処理。当社はクレジットカード番号を直接保持しません）</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>2. 利用目的</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          収集した情報は、以下の目的で利用します。
        </p>
        <ul style={{ paddingLeft: 24, marginBottom: 12 }}>
          <li>AI検索可視性診断の提供および結果の表示</li>
          <li>アカウント・認証の管理</li>
          <li>有料プランの課金・契約管理</li>
          <li>サービス改善・メール配信（診断結果・月次レポート等）</li>
          <li>お問い合わせへの対応</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>3. 第三者への提供</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          当社は、ユーザーの同意なく個人情報を第三者に提供しません。ただし、以下の場合は除きます。
        </p>
        <ul style={{ paddingLeft: 24, marginBottom: 12 }}>
          <li>法令に基づく場合</li>
          <li>決済処理（Stripe 等）に必要な範囲</li>
          <li>メール送信（SendGrid / Resend 等）に必要な範囲</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>4. データの保持・削除</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          診断結果はサービス提供に必要な期間保持します。アカウント削除またはご要望により、個人データの削除に対応します。
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>5. お問い合わせ</h2>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          プライバシーに関するお問い合わせは、本サービス内のお問い合わせフォームまたはメールにてご連絡ください。
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
