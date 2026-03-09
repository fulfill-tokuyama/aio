/**
 * ワークショップ招待メール一括送信 GAS スクリプト
 *
 * 【セットアップ手順】
 * 1. Google Sheets に list.csv をインポート
 * 2. 拡張機能 → Apps Script を開く
 * 3. このコードを貼り付け
 * 4. CONFIG の FROM_ALIAS を設定（Gmailのエイリアスに登録済みのアドレス）
 * 5. まず testSendOne() で1通テスト送信
 * 6. 問題なければ sendWorkshopInvitations() を実行
 *
 * 【シート構成】（list.csv そのまま）
 * A列: 企業名, K列: 業種, L列: 従業員, Z列: メールアドレス
 * → 新しく AG列に「送信済み」フラグ、AH列に「送信日時」を記録
 */

// ===== 設定 =====
const CONFIG = {
  FROM_ALIAS: 't.tokuyama@fulfill-net.com',  // Gmailに追加したエイリアス
  SENDER_NAME: '徳山',
  COMPANY_NAME: 'Fulfill株式会社',
  DAILY_LIMIT: 300,         // 1日の送信上限
  DELAY_SECONDS: 1,          // メール間の待機秒数
  BATCH_SIZE: 80,            // 1回の実行で送る件数（GAS 6分制限対策）
  SHEET_NAME: 'list',       // シート名（csvインポート時のデフォルト名。違う場合は変更）

  // カラムインデックス（0始まり）
  COL_COMPANY_NAME: 0,      // A列: 企業名
  COL_INDUSTRY: 10,         // K列: 業種
  COL_EMPLOYEES: 11,        // L列: 従業員
  COL_EMAIL: 25,            // Z列: メールアドレス
  COL_SENT_FLAG: 32,        // AG列: 送信済みフラグ
  COL_SENT_DATE: 33,        // AH列: 送信日時

  // 対象業種キーワード
  TARGET_INDUSTRIES: ['製造', '医療', '福祉', '不動産', 'コンサルティング', '小売'],
  MIN_EMPLOYEES: 10,
};

// ===== ワークショップ情報 =====
const WORKSHOP = {
  title: '【無料】AI活用ワークショップ',
  date: '※日程は個別調整',  // 確定したら書き換え
  duration: '90分',
  format: 'オンライン（Zoom）',
  lpUrl: 'https://leadgenius-ai-search.vercel.app/workshop.html',
};

// ===== 業種別メールテンプレート =====
function getEmailTemplate(industry, companyName) {
  const templates = {
    '製造': {
      subject: `【無料ご招待】製造現場のAI活用ワークショップ｜${CONFIG.COMPANY_NAME}`,
      pain: '生産管理の属人化、日報・報告書の手作業、熟練技術者の暗黙知の共有',
      benefit: '製造業では、AIによる生産計画の自動最適化や、議事録・日報の自動作成で、月40時間以上の工数削減を実現した事例があります',
      cases: [
        '生産管理レポートの自動生成（月20時間削減）',
        '品質検査データのAI分析による不良率30%低減',
        '熟練者のノウハウをAIナレッジベース化',
      ],
    },
    '医療・福祉': {
      subject: `【無料ご招待】医療・福祉現場のAI活用ワークショップ｜${CONFIG.COMPANY_NAME}`,
      pain: 'カルテ・ケアプランの作成負担、シフト管理の手間、議事録・申送りの時間',
      benefit: '医療・福祉業界では、AIによる議事録自動作成やケアプラン素案の生成で、スタッフ1人あたり月15時間の事務作業削減を実現した事例があります',
      cases: [
        'カンファレンス議事録のAI自動作成（記録時間80%削減）',
        'ケアプラン素案のAI生成で作成時間を半減',
        'シフト最適化AIで人員配置の効率化',
      ],
    },
    '不動産': {
      subject: `【無料ご招待】不動産業界のAI活用ワークショップ｜${CONFIG.COMPANY_NAME}`,
      pain: '契約書類の作成・チェック、物件情報の入力作業、顧客対応の属人化',
      benefit: '不動産業界では、AIによる重要事項説明書の自動チェックや物件紹介文の自動生成で、営業1人あたり月25時間の業務削減を実現した事例があります',
      cases: [
        '重説・契約書のAIレビューで確認時間を70%短縮',
        '物件紹介文・広告コピーのAI自動生成',
        '顧客問合せへのAI自動応答で対応速度3倍',
      ],
    },
    'コンサルティング': {
      subject: `【無料ご招待】コンサル業務のAI活用ワークショップ｜${CONFIG.COMPANY_NAME}`,
      pain: '提案資料・レポート作成の工数、リサーチ業務の時間、議事録・タスク管理',
      benefit: 'コンサルティング業界では、AIによるリサーチ自動化や提案資料の素案生成で、コンサルタント1人あたりの案件対応数を1.5倍にした事例があります',
      cases: [
        '業界リサーチ・競合分析のAI自動化（調査時間60%削減）',
        '提案書・報告書の素案をAIが自動生成',
        '会議議事録＋ネクストアクション自動抽出',
      ],
    },
    '小売': {
      subject: `【無料ご招待】小売業のAI活用ワークショップ｜${CONFIG.COMPANY_NAME}`,
      pain: '在庫管理の精度、販促企画の立案、スタッフのシフト調整',
      benefit: '小売業界では、AIによる需要予測で在庫ロスを30%削減し、販促文面の自動生成でチラシ・POP制作時間を大幅短縮した事例があります',
      cases: [
        'AI需要予測による在庫最適化（廃棄ロス30%減）',
        'チラシ・POP・SNS投稿文のAI自動生成',
        '顧客購買データのAI分析でリピート率向上',
      ],
    },
  };

  // 業種マッチング
  const key = matchIndustryKey(industry);
  const tmpl = templates[key] || templates['製造']; // デフォルトは製造

  const casesHtml = tmpl.cases.map(c => `<li style="margin-bottom:6px;">${c}</li>`).join('');

  const subject = tmpl.subject;

  const body = `
<div style="font-family:'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;line-height:1.8;color:#333;max-width:600px;margin:0 auto;">

  <p>${companyName} ご担当者様</p>

  <p>突然のご連絡、失礼いたします。<br>
  ${CONFIG.COMPANY_NAME}の${CONFIG.SENDER_NAME}と申します。</p>

  <p>貴社のような${key}の企業様が今まさに直面されている<br>
  <strong>「${tmpl.pain}」</strong><br>
  といった課題を、<strong>AIで解決</strong>する実践的なワークショップを<br>
  <strong>無料</strong>で開催しております。</p>

  <div style="background:#f8f9fa;border-left:4px solid #2563eb;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
    <p style="margin:0 0 8px 0;font-weight:bold;color:#2563eb;">実際の導入効果</p>
    <p style="margin:0 0 12px 0;">${tmpl.benefit}</p>
    <ul style="margin:0;padding-left:20px;">
      ${casesHtml}
    </ul>
  </div>

  <div style="background:#eff6ff;padding:16px 20px;margin:20px 0;border-radius:8px;">
    <p style="margin:0 0 4px 0;font-weight:bold;">無料AIワークショップ 概要</p>
    <table style="border-collapse:collapse;margin-top:8px;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">内容</td><td style="padding:4px 0;">ChatGPT/生成AIの業務活用（デモ＋ハンズオン）</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">時間</td><td style="padding:4px 0;">${WORKSHOP.duration}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">形式</td><td style="padding:4px 0;">${WORKSHOP.format}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">費用</td><td style="padding:4px 0;"><strong>無料</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">日程</td><td style="padding:4px 0;">${WORKSHOP.date}</td></tr>
    </table>
  </div>

  <p>ワークショップでは、貴社の業務に即した<strong>具体的なAI活用デモ</strong>をお見せします。<br>
  「うちの業務でAIが使えるのか？」というご確認だけでも構いません。</p>

  <p style="margin:20px 0;">
    <a href="${WORKSHOP.lpUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:bold;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">詳細・お申込みはこちら</a>
  </p>

  <p style="font-size:14px;color:#666;">▼ ワークショップの詳細ページ<br>
  <a href="${WORKSHOP.lpUrl}" style="color:#2563eb;">${WORKSHOP.lpUrl}</a></p>

  <p>もちろん、<strong>本メールへのご返信</strong>でもお申込みいただけます。<br>
  日程を調整させていただきます。</p>

  <p style="margin-top:24px;">━━━━━━━━━━━━━━━━━━━━<br>
  ${CONFIG.COMPANY_NAME}<br>
  最高戦略責任者（CSO） ${CONFIG.SENDER_NAME}<br>
  Email: ${CONFIG.FROM_ALIAS}<br>
  ━━━━━━━━━━━━━━━━━━━━</p>

</div>`;

  return { subject, body };
}

// ===== 業種キーワードマッチ =====
function matchIndustryKey(industry) {
  if (!industry) return '製造';
  const s = String(industry);
  if (s.includes('医療') || s.includes('福祉') || s.includes('介護') || s.includes('病院') || s.includes('クリニック')) return '医療・福祉';
  if (s.includes('不動産')) return '不動産';
  if (s.includes('コンサル')) return 'コンサルティング';
  if (s.includes('小売') || s.includes('スーパー') || s.includes('ドラッグ') || s.includes('ホームセンター') || s.includes('百貨店')) return '小売';
  if (s.includes('製造') || s.includes('工場') || s.includes('メーカー')) return '製造';
  return '製造'; // デフォルト
}

// ===== 対象フィルタリング =====
function isTargetRow(industry, employees, email, sentFlag) {
  // 送信済みスキップ
  if (sentFlag === '送信済み') return false;

  // メールアドレスあり
  if (!email || String(email).trim() === '') return false;

  // 簡易メール形式チェック
  const emailStr = String(email).trim();
  if (!emailStr.includes('@') || !emailStr.includes('.')) return false;

  // 業種チェック
  const industryStr = String(industry || '');
  const matchesIndustry = CONFIG.TARGET_INDUSTRIES.some(t => industryStr.includes(t));
  if (!matchesIndustry) return false;

  // 従業員数チェック（10名以上）
  const empNum = parseInt(String(employees).replace(/[^0-9]/g, ''), 10);
  if (isNaN(empNum) || empNum < CONFIG.MIN_EMPLOYEES) return false;

  return true;
}

// ===== メイン送信関数 =====
// GASの6分制限があるため、1回の実行でBATCH_SIZE件ずつ送信。
// 残りがあれば2分後に自動で次のバッチを実行する。
function sendWorkshopInvitations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  // 本日の送信済み件数を取得（AG列が「送信済み」かつAH列が今日の日付）
  const today = new Date();
  const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  let todaySent = 0;
  for (let i = 1; i < data.length; i++) {
    const flag = String(data[i][CONFIG.COL_SENT_FLAG] || '');
    const date = data[i][CONFIG.COL_SENT_DATE];
    if (flag === '送信済み' && date instanceof Date) {
      const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (dateStr === todayStr) todaySent++;
    }
  }

  const remaining = CONFIG.DAILY_LIMIT - todaySent;
  if (remaining <= 0) {
    Logger.log(`本日の上限 ${CONFIG.DAILY_LIMIT} 通に到達済み。明日再実行してください。`);
    return;
  }

  const batchLimit = Math.min(CONFIG.BATCH_SIZE, remaining);
  let sentCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 1; i < data.length; i++) {
    if (sentCount >= batchLimit) break;

    const row = data[i];
    const companyName = String(row[CONFIG.COL_COMPANY_NAME] || '').trim();
    const industry = String(row[CONFIG.COL_INDUSTRY] || '').trim();
    const employees = row[CONFIG.COL_EMPLOYEES];
    const email = String(row[CONFIG.COL_EMAIL] || '').trim();
    const sentFlag = String(row[CONFIG.COL_SENT_FLAG] || '').trim();

    if (!isTargetRow(industry, employees, email, sentFlag)) {
      skipCount++;
      continue;
    }

    try {
      const tmpl = getEmailTemplate(industry, companyName);

      GmailApp.sendEmail(email, tmpl.subject, '', {
        htmlBody: tmpl.body,
        from: CONFIG.FROM_ALIAS,
        name: `${CONFIG.SENDER_NAME}｜${CONFIG.COMPANY_NAME}`,
      });

      sheet.getRange(i + 1, CONFIG.COL_SENT_FLAG + 1).setValue('送信済み');
      sheet.getRange(i + 1, CONFIG.COL_SENT_DATE + 1).setValue(new Date());

      sentCount++;
      Logger.log(`[${todaySent + sentCount}/${CONFIG.DAILY_LIMIT}] 送信OK: ${companyName} (${email})`);

      if (sentCount < batchLimit) {
        Utilities.sleep(CONFIG.DELAY_SECONDS * 1000);
      }

    } catch (e) {
      errorCount++;
      errors.push(`${companyName}: ${e.message}`);
      Logger.log(`[ERROR] ${companyName} (${email}): ${e.message}`);
    }
  }

  const totalSentToday = todaySent + sentCount;
  const summary = `
=== バッチ完了 ===
今回送信: ${sentCount} 通
本日合計: ${totalSentToday}/${CONFIG.DAILY_LIMIT} 通
スキップ: ${skipCount} 件
エラー: ${errorCount} 件
${errors.length > 0 ? '\nエラー詳細:\n' + errors.join('\n') : ''}`.trim();

  Logger.log(summary);

  // まだ上限に達していなければ、2分後に次のバッチをトリガー
  if (sentCount >= batchLimit && totalSentToday < CONFIG.DAILY_LIMIT) {
    ScriptApp.newTrigger('sendWorkshopInvitations')
      .timeBased()
      .after(2 * 60 * 1000)
      .create();
    Logger.log(`残りあり → 2分後に次のバッチを自動実行します`);
  } else {
    // 完了時にトリガーを掃除
    cleanupTriggers_();
    Logger.log(`全件送信完了、または本日の上限に到達`);
  }
}

// 自動トリガーの掃除
function cleanupTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'sendWorkshopInvitations') {
      ScriptApp.deleteTrigger(t);
    }
  }
}

// ===== テスト送信（1通だけ自分に送る） =====
function testSendOne() {
  const testEmail = CONFIG.FROM_ALIAS; // 自分自身に送信
  const testCompany = 'テスト株式会社';
  const testIndustry = '製造';

  const tmpl = getEmailTemplate(testIndustry, testCompany);

  GmailApp.sendEmail(testEmail, `【テスト】${tmpl.subject}`, '', {
    htmlBody: tmpl.body,
    from: CONFIG.FROM_ALIAS,
    name: `${CONFIG.SENDER_NAME}｜${CONFIG.COMPANY_NAME}`,
  });

  Logger.log(`テスト送信完了: ${testEmail}`);
}

// ===== 対象件数を事前確認 =====
function countTargets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const counts = { '製造': 0, '医療・福祉': 0, '不動産': 0, 'コンサルティング': 0, '小売': 0 };
  let total = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const industry = String(row[CONFIG.COL_INDUSTRY] || '').trim();
    const employees = row[CONFIG.COL_EMPLOYEES];
    const email = String(row[CONFIG.COL_EMAIL] || '').trim();
    const sentFlag = String(row[CONFIG.COL_SENT_FLAG] || '').trim();

    if (isTargetRow(industry, employees, email, sentFlag)) {
      const key = matchIndustryKey(industry);
      counts[key] = (counts[key] || 0) + 1;
      total++;
    }
  }

  const msg = `
=== 送信対象件数 ===
製造業: ${counts['製造']} 件
医療・福祉: ${counts['医療・福祉']} 件
不動産: ${counts['不動産']} 件
コンサルティング: ${counts['コンサルティング']} 件
小売: ${counts['小売']} 件
────────────────
合計: ${total} 件

※1日の送信上限: ${CONFIG.DAILY_LIMIT} 通
※全件送信に約 ${Math.ceil(total / CONFIG.DAILY_LIMIT)} 日かかります
  `.trim();

  Logger.log(msg);
}

// ===== メニュー追加 =====
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('メール送信')
    .addItem('対象件数を確認', 'countTargets')
    .addItem('テスト送信（自分宛に1通）', 'testSendOne')
    .addSeparator()
    .addItem('一括送信（本番）', 'sendWorkshopInvitations')
    .addToUi();
}
