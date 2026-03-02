// ウェルカムメール HTMLテンプレート（決済後）

// HTMLエスケープ（XSS防止）
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface WelcomeEmailData {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export function buildWelcomeEmailSubject(): string {
  return "【AIO Insight】ご登録ありがとうございます — ダッシュボードのご案内";
}

export function buildWelcomeEmailHtml(data: WelcomeEmailData): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:'Helvetica Neue',Arial,'Noto Sans JP',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#F0B429,#D49B1F);line-height:40px;font-size:20px;text-align:center;">⚡</div>
      <h1 style="color:#E2E8F0;font-size:20px;margin:12px 0 4px;">AIO Insight</h1>
      <p style="color:#8896AB;font-size:12px;margin:0;">Welcome to AIO Insight</p>
    </div>

    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">

      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">🎉</span>
      </div>

      <h2 style="color:#E2E8F0;font-size:18px;text-align:center;margin:0 0 16px;">
        ご登録ありがとうございます！
      </h2>

      <p style="color:#8896AB;font-size:13px;line-height:1.8;margin:0 0 24px;">
        ${escapeHtml(data.name)}様<br><br>
        AIO Insight月額プランへのお申し込み、誠にありがとうございます。<br>
        ダッシュボードへのアクセス情報をお送りいたします。
      </p>

      <!-- Login Info -->
      <div style="background:#0B0F1A;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #1E293B;">
        <h3 style="color:#E2E8F0;font-size:14px;margin:0 0 16px;">ログイン情報</h3>
        <table style="width:100%;">
          <tr>
            <td style="color:#8896AB;font-size:13px;padding:6px 0;">メールアドレス</td>
            <td style="color:#E2E8F0;font-size:13px;padding:6px 0;font-weight:600;">${escapeHtml(data.email)}</td>
          </tr>
          <tr>
            <td style="color:#8896AB;font-size:13px;padding:6px 0;">初期パスワード</td>
            <td style="color:#F0B429;font-size:13px;padding:6px 0;font-weight:600;font-family:monospace;">${escapeHtml(data.tempPassword)}</td>
          </tr>
        </table>
      </div>

      <p style="color:#EF4444;font-size:12px;margin:0 0 24px;">
        ※ セキュリティのため、初回ログイン後にパスワードを変更してください。
      </p>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${data.loginUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
          ダッシュボードにログイン →
        </a>
      </div>
    </div>

    <!-- Features Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:14px;margin:0 0 16px;">ご利用いただける機能</h3>
      <table style="width:100%;">
        <tr>
          <td style="color:#10B981;font-size:20px;padding:8px 12px 8px 0;vertical-align:top;">✓</td>
          <td style="color:#8896AB;font-size:13px;padding:8px 0;line-height:1.6;">
            <strong style="color:#E2E8F0;">AI可視性スコア</strong><br>
            貴社サイトのAI検索での可視性を定期計測
          </td>
        </tr>
        <tr>
          <td style="color:#10B981;font-size:20px;padding:8px 12px 8px 0;vertical-align:top;">✓</td>
          <td style="color:#8896AB;font-size:13px;padding:8px 0;line-height:1.6;">
            <strong style="color:#E2E8F0;">弱点分析 & 改善提案</strong><br>
            構造化データ・E-E-A-T・Core Web Vitalsの改善点を提示
          </td>
        </tr>
        <tr>
          <td style="color:#10B981;font-size:20px;padding:8px 12px 8px 0;vertical-align:top;">✓</td>
          <td style="color:#8896AB;font-size:13px;padding:8px 0;line-height:1.6;">
            <strong style="color:#E2E8F0;">ダッシュボード</strong><br>
            AIトラフィック・Brand Radar・競合分析を一画面で確認
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="color:#5A6A80;font-size:11px;margin:0 0 4px;">
        AIO Insight by BeginAI / 株式会社Fulfill
      </p>
      <p style="color:#3E4A5C;font-size:10px;margin:0;">
        ご不明な点がございましたら、このメールにご返信ください。
      </p>
    </div>

  </div>
</body>
</html>`;
}
