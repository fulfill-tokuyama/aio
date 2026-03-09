// ステップメール（AI研修・人材派遣アウトリーチ）HTMLテンプレート
// 4通分: step1(初回・助成金フック), step2(3日後・事例), step3(7日後・緊急性), step4(14日後・最終)

import { generateTrackingSig } from "@/lib/unsubscribe-token";

export interface TrainingOutreachEmailData {
  company: string;
  industry?: string;
  employeeCount?: string;
  contactName?: string;
  leadId?: string;
  unsubscribeLink?: string;
  // ワークショップ + 研修特有
  workshopLink: string; // 無料ワークショップ申込リンク
  senderName: string;
  senderTitle?: string;
}

type OutreachStep = 1 | 2 | 3 | 4;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSenderFooter(): string {
  const company = process.env.NEXT_PUBLIC_SENDER_COMPANY || "フルフィル株式会社";
  const name = process.env.NEXT_PUBLIC_SENDER_NAME || "フルフィル株式会社 AI研修事業部";
  const address = process.env.NEXT_PUBLIC_SENDER_ADDRESS || "";
  const email = process.env.NEXT_PUBLIC_SENDER_EMAIL || "info@and-and.co.jp";
  const parts = [`${company} ${name}`];
  if (address) parts.push(address);
  parts.push(`お問い合わせ: ${email}`);
  return parts.join(" | ");
}

function wrapLayout(content: string, options?: { leadId?: string; unsubscribeLink?: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aio-rouge.vercel.app";
  const trackingPixel = options?.leadId
    ? `<img src="${appUrl}/api/track?type=open&lid=${options.leadId}&sig=${generateTrackingSig(options.leadId)}" width="1" height="1" alt="" style="display:none;" />`
    : "";
  const unsubscribeHtml = options?.unsubscribeLink
    ? `<a href="${options.unsubscribeLink}" style="color:#3E4A5C;font-size:10px;text-decoration:underline;">配信停止</a>`
    : `<span style="color:#3E4A5C;font-size:10px;">配信停止をご希望の場合は本メールにご返信ください。</span>`;
  const senderFooter = getSenderFooter();

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,'Noto Sans JP','Hiragino Sans',sans-serif;color:#333333;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #2563EB;">
      <h1 style="color:#1e293b;font-size:18px;margin:0 0 4px;font-weight:700;">フルフィル株式会社</h1>
      <p style="color:#64748b;font-size:12px;margin:0;">AI研修・AI人材派遣サービス</p>
    </div>

${content}

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0 0 8px;line-height:1.5;">
        ${senderFooter}
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
  return `${appUrl}/api/track?type=click&lid=${leadId}&sig=${generateTrackingSig(leadId)}&url=${encodeURIComponent(url)}`;
}

// ============================================================
// Step 1: 初回 — 助成金フックで興味喚起
// ============================================================
function buildStep1Html(data: TrainingOutreachEmailData): string {
  const ctaLink = trackLink(data.workshopLink, data.leadId);
  const addressee = data.contactName
    ? `${escapeHtml(data.contactName)}様`
    : `${escapeHtml(data.company)} ご担当者様`;

  return wrapLayout(`
    <div style="padding:28px 0;">
      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;color:#1e293b;">
        ${addressee}
      </p>
      <p style="font-size:14px;line-height:1.8;margin:0 0 20px;color:#475569;">
        突然のご連絡失礼いたします。<br>
        ${escapeHtml(data.senderName)}と申します。
      </p>
      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        現在、他社が有料で提供しているAI活用ノウハウを<br>
        <strong style="color:#dc2626;">すべて無料で公開</strong>するワークショップを開催しております。
      </p>

      <!-- ワークショップ内容ボックス -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="color:#1e40af;font-size:15px;margin:0 0 16px;font-weight:700;">無料AIワークショップ — 学べること</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#475569;font-size:13px;padding:8px 0;border-bottom:1px solid #dbeafe;">ChatGPT・Gemini・Claude</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:8px 0;border-bottom:1px solid #dbeafe;">3大AIの使い分け戦略</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:8px 0;border-bottom:1px solid #dbeafe;">NotebookLM</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:8px 0;border-bottom:1px solid #dbeafe;">社内資料のAI整理術</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:8px 0;border-bottom:1px solid #dbeafe;">Google AI Studio</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:8px 0;border-bottom:1px solid #dbeafe;">ノーコードAIアプリ構築</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:8px 0;">Claude Code</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:8px 0;">AIで業務システム開発</td>
          </tr>
        </table>
      </div>

      <!-- ワークショップ詳細 -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748b;font-size:13px;padding:6px 0;">参加費</td>
            <td style="color:#dc2626;font-size:14px;font-weight:800;text-align:right;padding:6px 0;">無料</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:6px 0;">形式</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:6px 0;">オンライン（Zoom）</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:6px 0;">所要時間</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:6px 0;">90分（録画配布あり）</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        すべて実演付きで、その場で手を動かしながら学べます。<br>
        営業は一切いたしません。まずはAIの力を体感してください。
      </p>

      <!-- CTA -->
      <div style="text-align:center;padding:24px 0;">
        <a href="${ctaLink}" style="display:inline-block;padding:16px 48px;background:#2563EB;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
          無料ワークショップに申し込む
        </a>
        <p style="color:#94a3b8;font-size:11px;margin:12px 0 0;">1社から複数名の参加も歓迎です</p>
      </div>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

// ============================================================
// Step 2: 3日後 — 導入事例で信頼性
// ============================================================
function buildStep2Html(data: TrainingOutreachEmailData): string {
  const ctaLink = trackLink(data.workshopLink, data.leadId);
  const addressee = data.contactName
    ? `${escapeHtml(data.contactName)}様`
    : `${escapeHtml(data.company)} ご担当者様`;

  return wrapLayout(`
    <div style="padding:28px 0;">
      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;color:#1e293b;">
        ${addressee}
      </p>
      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        先日ご案内いたしました${escapeHtml(data.senderName)}です。<br>
        本日は、<strong style="color:#1e293b;">ワークショップ参加企業様がどんな成果を出しているか</strong>をお伝えします。
      </p>

      <!-- 参加者の声 -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;">製造業 A社様（従業員85名）</div>
        <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 8px;font-style:italic;">
          「ChatGPTとClaudeの使い分けが明確になった。翌日から報告書作成に活用し始めた。」
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748b;font-size:12px;padding:6px 0;">報告書作成時間</td>
            <td style="color:#dc2626;font-size:13px;font-weight:700;text-align:right;padding:6px 0;">3時間 → 45分（75%削減）</td>
          </tr>
        </table>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;">建設業 B社様（従業員120名）</div>
        <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 8px;font-style:italic;">
          「NotebookLMで過去の設計資料をAIに読ませる方法が衝撃的だった。」
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748b;font-size:12px;padding:6px 0;">見積書作成</td>
            <td style="color:#dc2626;font-size:13px;font-weight:700;text-align:right;padding:6px 0;">2日 → 半日に短縮</td>
          </tr>
        </table>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;">不動産業 C社様（従業員30名）</div>
        <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 8px;font-style:italic;">
          「Google AI Studioで自社専用の物件紹介AI を作れることに驚いた。」
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#64748b;font-size:12px;padding:6px 0;">物件紹介文の作成</td>
            <td style="color:#16a34a;font-size:13px;font-weight:700;text-align:right;padding:6px 0;">1件30分 → 5分</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        同じ内容を、御社でも<strong style="color:#1e293b;">無料で</strong>体験できます。<br>
        営業は一切ありません。純粋にAIの可能性を体感してください。
      </p>

      <div style="text-align:center;padding:24px 0;">
        <a href="${ctaLink}" style="display:inline-block;padding:16px 48px;background:#2563EB;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
          無料ワークショップに申し込む
        </a>
        <p style="color:#94a3b8;font-size:11px;margin:12px 0 0;">録画配布あり — 当日参加できなくてもOK</p>
      </div>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

// ============================================================
// Step 3: 7日後 — 緊急性（助成金期限＋競合との差）
// ============================================================
function buildStep3Html(data: TrainingOutreachEmailData): string {
  const ctaLink = trackLink(data.workshopLink, data.leadId);
  const addressee = data.contactName
    ? `${escapeHtml(data.contactName)}様`
    : `${escapeHtml(data.company)} ご担当者様`;

  return wrapLayout(`
    <div style="padding:28px 0;">
      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;color:#1e293b;">
        ${addressee}
      </p>
      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        ${escapeHtml(data.senderName)}です。<br>
        本日は<strong style="color:#1e293b;">AI活用に関する最新の市場データ</strong>をお伝えいたします。
      </p>

      <!-- 市場データ -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="color:#dc2626;font-size:14px;margin:0 0 16px;font-weight:700;">見過ごせないAI活用の現実</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#475569;font-size:12px;padding:8px 0;border-bottom:1px solid #fecaca;">AI導入済み企業の割合（大企業）</td>
            <td style="color:#dc2626;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #fecaca;">73%</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:12px;padding:8px 0;border-bottom:1px solid #fecaca;">AI導入済み企業の割合（中小企業）</td>
            <td style="color:#f59e0b;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #fecaca;">わずか12%</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:12px;padding:8px 0;border-bottom:1px solid #fecaca;">AI活用企業の生産性向上</td>
            <td style="color:#16a34a;font-size:13px;font-weight:700;text-align:right;padding:8px 0;border-bottom:1px solid #fecaca;">平均30%</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:12px;padding:8px 0;">「AI人材不足」と回答した企業</td>
            <td style="color:#dc2626;font-size:13px;font-weight:700;text-align:right;padding:8px 0;">82%</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        大企業の73%がAIを導入済みの中、<br>
        中小企業はわずか12%。この差は日に日に広がっています。<br><br>
        <strong style="color:#1e293b;">まずは無料ワークショップで、AIが御社の業務をどう変えるか体感してください。</strong><br>
        90分で、ChatGPT・Gemini・Claude・NotebookLM・Google AI Studio・Claude Codeの実践的な使い方がすべて分かります。
      </p>

      <!-- ワークショップ後の選択肢 -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="color:#1e40af;font-size:14px;font-weight:700;margin:0 0 12px;">ワークショップ後、さらに深く学びたい方には</p>
        <ul style="margin:0;padding:0 0 0 20px;color:#475569;font-size:13px;line-height:2;">
          <li><strong style="color:#1e293b;">AI研修プログラム</strong> — 助成金活用で1名10万円（通常40万円）</li>
          <li><strong style="color:#1e293b;">AI人材派遣</strong> — 週1回の伴走サポート（月額30万円）</li>
        </ul>
        <p style="color:#64748b;font-size:12px;margin:8px 0 0;">※ ワークショップ内で営業は一切いたしません</p>
      </div>

      <div style="text-align:center;padding:24px 0;">
        <a href="${ctaLink}" style="display:inline-block;padding:16px 48px;background:#2563EB;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
          無料ワークショップに申し込む
        </a>
        <p style="color:#94a3b8;font-size:11px;margin:12px 0 0;">メール返信でのご質問も承っております</p>
      </div>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

// ============================================================
// Step 4: 14日後 — 最終案内（特別オファー）
// ============================================================
function buildStep4Html(data: TrainingOutreachEmailData): string {
  const ctaLink = trackLink(data.workshopLink, data.leadId);
  const addressee = data.contactName
    ? `${escapeHtml(data.contactName)}様`
    : `${escapeHtml(data.company)} ご担当者様`;

  return wrapLayout(`
    <div style="padding:28px 0;">
      <p style="font-size:15px;line-height:1.8;margin:0 0 20px;color:#1e293b;">
        ${addressee}
      </p>
      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        ${escapeHtml(data.senderName)}です。最後のご案内となります。
      </p>

      <!-- ワークショップまとめ -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="color:#166534;font-size:15px;margin:0 0 16px;font-weight:700;">無料AIワークショップ — まとめ</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#475569;font-size:13px;padding:10px 0;border-bottom:1px solid #dcfce7;">参加費</td>
            <td style="color:#dc2626;font-size:15px;font-weight:800;text-align:right;padding:10px 0;border-bottom:1px solid #dcfce7;">無料</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:10px 0;border-bottom:1px solid #dcfce7;">内容</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:10px 0;border-bottom:1px solid #dcfce7;">6つのAIツール実践活用</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:10px 0;border-bottom:1px solid #dcfce7;">形式</td>
            <td style="color:#1e293b;font-size:13px;font-weight:600;text-align:right;padding:10px 0;border-bottom:1px solid #dcfce7;">オンライン（Zoom）90分</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:10px 0;border-bottom:1px solid #dcfce7;">録画</td>
            <td style="color:#16a34a;font-size:13px;font-weight:700;text-align:right;padding:10px 0;border-bottom:1px solid #dcfce7;">参加者全員に配布</td>
          </tr>
          <tr>
            <td style="color:#475569;font-size:13px;padding:10px 0;">営業</td>
            <td style="color:#2563eb;font-size:13px;font-weight:700;text-align:right;padding:10px 0;">一切なし</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;line-height:1.8;margin:0 0 24px;color:#475569;">
        本メールが最後のご案内となります。<br>
        ChatGPT・Gemini・Claude・NotebookLM・Google AI Studio・Claude Code ——<br>
        <strong style="color:#1e293b;">他社が有料で教えている内容を、すべて無料でお伝えします。</strong><br><br>
        少しでもAI活用にご興味がございましたら、ぜひご参加ください。
      </p>

      <div style="text-align:center;padding:24px 0;">
        <a href="${ctaLink}" style="display:inline-block;padding:16px 48px;background:#2563EB;color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
          無料ワークショップに申し込む
        </a>
        <p style="color:#94a3b8;font-size:11px;margin:12px 0 0;">メール返信でのご質問も承っております</p>
      </div>
    </div>`, { leadId: data.leadId, unsubscribeLink: data.unsubscribeLink });
}

// ============================================================
// Exports
// ============================================================
export function buildTrainingOutreachSubject(company: string, step: OutreachStep): string {
  switch (step) {
    case 1:
      return `【参加費無料】他社が有料で教えるAI活用ノウハウを全公開｜${company}様`;
    case 2:
      return `AI活用で業務時間75%削減 — 無料ワークショップ参加企業の声｜${company}様`;
    case 3:
      return `中小企業のAI導入率はわずか12% — 無料ワークショップのご案内｜${company}様`;
    case 4:
      return `【最終ご案内】無料AIワークショップ — ${company}様`;
  }
}

export function buildTrainingOutreachHtml(data: TrainingOutreachEmailData, step: OutreachStep): string {
  switch (step) {
    case 1: return buildStep1Html(data);
    case 2: return buildStep2Html(data);
    case 3: return buildStep3Html(data);
    case 4: return buildStep4Html(data);
  }
}
