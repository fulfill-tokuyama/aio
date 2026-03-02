// ステップメール（アウトリーチ）HTMLテンプレート
// 4通分: step1(初回), step2(3日後), step3(7日後), step4(14日後)

export interface OutreachEmailData {
  company: string;
  llmoScore: number;
  weaknesses: string[];
  diagnosisLink: string;
  paymentLink: string;
  senderName: string;
  leadId?: string;
  unsubscribeLink?: string;
}

type OutreachStep = 1 | 2 | 3 | 4;

// HTMLエスケープ（XSS防止）
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function wrapLayout(content: string, options?: { leadId?: string; unsubscribeLink?: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  const trackingPixel = options?.leadId
    ? `<img src="${appUrl}/api/track?type=open&lid=${options.leadId}" width="1" height="1" alt="" style="display:none;" />`
    : "";
  const unsubscribeHtml = options?.unsubscribeLink
    ? `<a href="${options.unsubscribeLink}" style="color:#3E4A5C;font-size:10px;text-decoration:underline;">配信停止</a>`
    : `<span style="color:#3E4A5C;font-size:10px;">配信停止をご希望の場合は本メールにご返信ください。</span>`;

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
      <p style="color:#8896AB;font-size:12px;margin:0;">AI検索可視性の最適化パートナー</p>
    </div>

${content}

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="color:#5A6A80;font-size:11px;margin:0 0 4px;">
        AIO Insight by BeginAI / 株式会社Fulfill
      </p>
      <p style="margin:0;">
        ${unsubscribeHtml}
      </p>
    </div>

    ${trackingPixel}
  </div>
</body>
</html>`;
}

function trackLink(url: string, leadId?: string): string {
  if (!leadId) return url;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  return `${appUrl}/api/track?type=click&lid=${leadId}&url=${encodeURIComponent(url)}`;
}

function buildStep1Html(data: OutreachEmailData): string {
  const scoreColor = getScoreColor(data.llmoScore);
  const weaknessItems = data.weaknesses.slice(0, 3)
    .map(w => `<li style="color:#8896AB;font-size:13px;line-height:1.8;">${escapeHtml(w)}</li>`)
    .join("");
  const diagLink = trackLink(data.diagnosisLink, data.leadId);

  return wrapLayout(`
    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">
      <p style="color:#E2E8F0;font-size:15px;margin:0 0 20px;">
        ${escapeHtml(data.company)} ご担当者様
      </p>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 20px;">
        突然のご連絡失礼いたします。<br>
        ${escapeHtml(data.senderName)}と申します。<br><br>
        貴社サイトのAI検索可視性を分析したところ、<strong style="color:#E2E8F0;">改善の余地が見つかりました</strong>ので、無料診断レポートをお送りできればと思いご連絡いたしました。
      </p>

      <!-- Score -->
      <div style="text-align:center;padding:20px 0;border-top:1px solid #1E293B;border-bottom:1px solid #1E293B;margin-bottom:20px;">
        <p style="color:#8896AB;font-size:12px;margin:0 0 8px;">現在のAI可視性スコア</p>
        <div style="display:inline-block;width:80px;height:80px;border-radius:50%;border:3px solid ${scoreColor};line-height:80px;text-align:center;">
          <span style="color:${scoreColor};font-size:30px;font-weight:800;">${data.llmoScore}</span>
        </div>
        <p style="color:#8896AB;font-size:11px;margin:8px 0 0;">100点満点中</p>
      </div>

      <!-- Weaknesses Top 3 -->
      ${weaknessItems ? `
      <h3 style="color:#EF4444;font-size:13px;margin:0 0 10px;">⚠ 検出された主な課題（Top 3）</h3>
      <ul style="margin:0 0 20px;padding:0 0 0 20px;">
        ${weaknessItems}
      </ul>` : ""}

      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0;">
        詳細な診断レポートでは、各カテゴリの評価と具体的な改善アクションをご提案しています。
      </p>
    </div>

    <!-- CTA -->
    <div style="background:#111827;border-radius:16px;border:1px solid #3B82F620;padding:32px;text-align:center;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:16px;margin:0 0 12px;">無料でAI可視性診断を受けてみませんか？</h3>
      <p style="color:#8896AB;font-size:12px;line-height:1.7;margin:0 0 20px;">
        30秒の入力で、貴社サイトのAI検索対策レポートを即時発行します。
      </p>
      <a href="${diagLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
        無料診断レポートを受け取る →
      </a>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

function buildStep2Html(data: OutreachEmailData): string {
  const scoreColor = getScoreColor(data.llmoScore);
  const diagLink = trackLink(data.diagnosisLink, data.leadId);

  return wrapLayout(`
    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">
      <p style="color:#E2E8F0;font-size:15px;margin:0 0 20px;">
        ${escapeHtml(data.company)} ご担当者様
      </p>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 20px;">
        先日はご案内差し上げた${escapeHtml(data.senderName)}です。<br>
        本日は、<strong style="color:#E2E8F0;">貴社と同業界のAI検索対策状況</strong>をお伝えします。
      </p>

      <!-- Industry Comparison -->
      <div style="border-top:1px solid #1E293B;border-bottom:1px solid #1E293B;padding:20px 0;margin-bottom:20px;">
        <h3 style="color:#F0B429;font-size:14px;margin:0 0 16px;">📊 同業界のAI対策状況</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;border-bottom:1px solid #1E293B20;">業界平均スコア</td>
            <td style="color:#F59E0B;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #1E293B20;">45 / 100</td>
          </tr>
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;border-bottom:1px solid #1E293B20;">貴社スコア</td>
            <td style="color:${scoreColor};font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #1E293B20;">${data.llmoScore} / 100</td>
          </tr>
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;border-bottom:1px solid #1E293B20;">AI対策実施企業の割合</td>
            <td style="color:#10B981;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #1E293B20;">約32%</td>
          </tr>
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;">AI検索経由の流入増加率(2025)</td>
            <td style="color:#3B82F6;font-size:13px;font-weight:700;text-align:right;padding:8px 0;">+527%</td>
          </tr>
        </table>
      </div>

      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0;">
        競合他社がAI検索対策を始める前に、先行者優位を確立しませんか？<br>
        無料の診断レポートで、貴社の現在地と改善ロードマップをお示しします。
      </p>
    </div>

    <!-- CTA -->
    <div style="background:#111827;border-radius:16px;border:1px solid #3B82F620;padding:32px;text-align:center;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:16px;margin:0 0 12px;">競合に差をつける第一歩</h3>
      <p style="color:#8896AB;font-size:12px;line-height:1.7;margin:0 0 20px;">
        無料でAI検索可視性レポートを発行します。
      </p>
      <a href="${diagLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
        無料診断を受ける →
      </a>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

function buildStep3Html(data: OutreachEmailData): string {
  const diagLink = trackLink(data.diagnosisLink, data.leadId);
  const payLink = trackLink(data.paymentLink, data.leadId);

  return wrapLayout(`
    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">
      <p style="color:#E2E8F0;font-size:15px;margin:0 0 20px;">
        ${escapeHtml(data.company)} ご担当者様
      </p>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 20px;">
        ${escapeHtml(data.senderName)}です。<br>
        本日は、<strong style="color:#E2E8F0;">AIO Insightをご導入いただいた企業様の成果事例</strong>をご紹介いたします。
      </p>

      <!-- Case Studies -->
      <div style="border-top:1px solid #1E293B;padding:20px 0;margin-bottom:20px;">
        <h3 style="color:#10B981;font-size:14px;margin:0 0 16px;">📈 導入企業の改善実績</h3>

        <div style="background:#0B0F1A;border-radius:10px;padding:16px;margin-bottom:12px;border:1px solid #1E293B;">
          <div style="font-size:12px;font-weight:700;color:#E2E8F0;margin-bottom:6px;">IT企業 A社</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#8896AB;font-size:11px;">AI検索可視性スコア</span>
            <span style="font-size:12px;font-weight:700;"><span style="color:#EF4444;">23</span> → <span style="color:#10B981;">72</span> <span style="color:#10B981;font-size:10px;">(+213%)</span></span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
            <span style="color:#8896AB;font-size:11px;">AI経由の月間流入</span>
            <span style="font-size:12px;font-weight:700;color:#3B82F6;">+340セッション/月</span>
          </div>
        </div>

        <div style="background:#0B0F1A;border-radius:10px;padding:16px;margin-bottom:12px;border:1px solid #1E293B;">
          <div style="font-size:12px;font-weight:700;color:#E2E8F0;margin-bottom:6px;">製造業 B社</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#8896AB;font-size:11px;">AI検索可視性スコア</span>
            <span style="font-size:12px;font-weight:700;"><span style="color:#EF4444;">18</span> → <span style="color:#10B981;">65</span> <span style="color:#10B981;font-size:10px;">(+261%)</span></span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
            <span style="color:#8896AB;font-size:11px;">問い合わせ数</span>
            <span style="font-size:12px;font-weight:700;color:#F0B429;">月3件 → 月12件</span>
          </div>
        </div>

        <div style="background:#0B0F1A;border-radius:10px;padding:16px;border:1px solid #1E293B;">
          <div style="font-size:12px;font-weight:700;color:#E2E8F0;margin-bottom:6px;">EC事業 C社</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#8896AB;font-size:11px;">AI検索可視性スコア</span>
            <span style="font-size:12px;font-weight:700;"><span style="color:#F59E0B;">35</span> → <span style="color:#10B981;">81</span> <span style="color:#10B981;font-size:10px;">(+131%)</span></span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
            <span style="color:#8896AB;font-size:11px;">AI経由の売上</span>
            <span style="font-size:12px;font-weight:700;color:#10B981;">月間 +¥420,000</span>
          </div>
        </div>
      </div>

      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0;">
        まずは無料診断で貴社の現状を把握し、改善の可能性をご確認ください。
      </p>
    </div>

    <!-- CTA (2 options) -->
    <div style="background:#111827;border-radius:16px;border:1px solid #3B82F620;padding:32px;text-align:center;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:16px;margin:0 0 16px;">貴社も成果を出しませんか？</h3>
      <div style="margin-bottom:12px;">
        <a href="${diagLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">
          無料診断を受ける →
        </a>
      </div>
      <p style="color:#5A6A80;font-size:11px;margin:0 0 12px;">または</p>
      <a href="${payLink}" style="display:inline-block;padding:12px 36px;background:linear-gradient(135deg,#F0B429,#D49B1F);color:#0B0F1A;font-size:13px;font-weight:700;text-decoration:none;border-radius:10px;">
        月額プランに申し込む（¥10,000/月）
      </a>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

function buildStep4Html(data: OutreachEmailData): string {
  const payLink = trackLink(data.paymentLink, data.leadId);

  return wrapLayout(`
    <!-- Main Card -->
    <div style="background:#111827;border-radius:16px;border:1px solid #1E293B;padding:32px;margin-bottom:24px;">
      <p style="color:#E2E8F0;font-size:15px;margin:0 0 20px;">
        ${escapeHtml(data.company)} ご担当者様
      </p>
      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0 0 20px;">
        ${escapeHtml(data.senderName)}です。最後のご案内となります。<br><br>
        AI検索市場は急速に拡大しており、<strong style="color:#E2E8F0;">早期に対策を講じた企業ほど大きな成果</strong>を上げています。
      </p>

      <!-- Trend Data -->
      <div style="border-top:1px solid #1E293B;padding:20px 0;margin-bottom:20px;">
        <h3 style="color:#F0B429;font-size:14px;margin:0 0 16px;">🔥 2025年 AI検索トレンドデータ</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;border-bottom:1px solid #1E293B20;">AI検索利用者数の増加率</td>
            <td style="color:#EF4444;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #1E293B20;">+527%</td>
          </tr>
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;border-bottom:1px solid #1E293B20;">AI検索からのコンバージョン率</td>
            <td style="color:#10B981;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #1E293B20;">従来SEOの2.3倍</td>
          </tr>
          <tr>
            <td style="color:#8896AB;font-size:12px;padding:8px 0;">2026年のAI検索シェア予測</td>
            <td style="color:#3B82F6;font-size:13px;font-weight:700;text-align:right;padding:8px 0;">検索全体の25%</td>
          </tr>
        </table>
      </div>

      <!-- Limited Offer -->
      <div style="background:#F0B42910;border:1px solid #F0B42930;border-radius:10px;padding:20px;margin-bottom:20px;">
        <div style="text-align:center;">
          <span style="color:#F0B429;font-size:13px;font-weight:700;">🎁 今月限定特典</span>
          <p style="color:#E2E8F0;font-size:14px;font-weight:600;margin:8px 0;">
            月額プランお申込みで初月のセットアップ費用（通常¥30,000）が無料
          </p>
          <p style="color:#8896AB;font-size:11px;margin:0;">
            AI検索対策の初期設定・構造化データ実装・改善アクションプランを無料で提供
          </p>
        </div>
      </div>

      <p style="color:#8896AB;font-size:13px;line-height:1.7;margin:0;">
        本メールが最後のご案内となります。<br>
        ご検討いただけますと幸いです。
      </p>
    </div>

    <!-- CTA (Stripe直リンク) -->
    <div style="background:#111827;border-radius:16px;border:1px solid #F0B42930;padding:32px;text-align:center;margin-bottom:24px;">
      <h3 style="color:#E2E8F0;font-size:16px;margin:0 0 8px;">AI検索時代の先行者になる</h3>
      <p style="color:#8896AB;font-size:12px;line-height:1.7;margin:0 0 20px;">
        月額¥10,000でAI検索可視性を継続モニタリング＆改善
      </p>
      <a href="${payLink}" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#F0B429,#D49B1F);color:#0B0F1A;font-size:15px;font-weight:800;text-decoration:none;border-radius:10px;">
        有料プランに申し込む →
      </a>
      <p style="color:#5A6A80;font-size:11px;margin:12px 0 0;">初月セットアップ費用無料キャンペーン中</p>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

export function buildOutreachSubject(company: string, step: OutreachStep): string {
  switch (step) {
    case 1:
      return `【無料】${company}様のAI検索可視性 診断レポートをお届けします`;
    case 2:
      return `${company}様の競合はAI検索で先行しています — 無料データ共有`;
    case 3:
      return `AI検索対策で問い合わせ4倍に — ${company}様にも実現可能です`;
    case 4:
      return `【最終ご案内】${company}様へ — AI検索対策 初月セットアップ無料`;
  }
}

export function buildOutreachHtml(data: OutreachEmailData, step: OutreachStep): string {
  switch (step) {
    case 1: return buildStep1Html(data);
    case 2: return buildStep2Html(data);
    case 3: return buildStep3Html(data);
    case 4: return buildStep4Html(data);
  }
}
