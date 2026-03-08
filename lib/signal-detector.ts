// lib/signal-detector.ts
// URLを受け取り、12個の技術シグナルを自動検出するモジュール（Puppeteer使用）

import { launchBrowser, createPage } from "./browser";
import type { Browser, Page } from "puppeteer-core";

// ============================================================
// 型定義
// ============================================================

interface SignalResult {
  detected: boolean;
  score: number;
  detail: string;
}

export interface SignalDetectorOutput {
  signals: {
    s1_no_schema: SignalResult;
    s2_no_faq: SignalResult;
    s3_no_llms_txt: SignalResult;
    s4_ai_blocked: SignalResult;
    s5_no_ssl: SignalResult;
    s6_not_mobile: SignalResult;
    s7_no_sitemap: SignalResult;
    s8_slow_page: SignalResult;
    s9_thin_content: SignalResult;
    s10_no_meta_desc: SignalResult;
    s11_no_ogp: SignalResult;
    s12_stale_site: SignalResult;
  };
  total_signal_score: number;
  rank: "S" | "A" | "B" | "C" | "PASSED";
  detected_count: number;
  category_scores: {
    llmo_core: number;
    tech_lag: number;
    content_quality: number;
  };
}

type SignalKey = keyof SignalDetectorOutput["signals"];

// ============================================================
// スコア定数
// ============================================================

const SIGNAL_SCORES: Record<SignalKey, number> = {
  s1_no_schema: 30,
  s2_no_faq: 15,
  s3_no_llms_txt: 10,
  s4_ai_blocked: 20,
  s5_no_ssl: 15,
  s6_not_mobile: 15,
  s7_no_sitemap: 8,
  s8_slow_page: 7,
  s9_thin_content: 10,
  s10_no_meta_desc: 8,
  s11_no_ogp: 5,
  s12_stale_site: 12,
};

// ============================================================
// ヘルパー: 安全にシグナル検出を実行
// ============================================================

function skipped(key: SignalKey, reason: string): SignalResult {
  return { detected: false, score: 0, detail: `スキップ: ${reason}` };
}

function result(key: SignalKey, detected: boolean, detail: string): SignalResult {
  return {
    detected,
    score: detected ? SIGNAL_SCORES[key] : 0,
    detail,
  };
}

// ============================================================
// 各シグナル検出関数
// ============================================================

/** S1: Schema.org完全未実装 (+30pt) */
async function detectS1(page: Page): Promise<SignalResult> {
  const count = await page.evaluate(() => {
    return document.querySelectorAll('script[type="application/ld+json"]').length;
  });
  const detected = count === 0;
  return result(
    "s1_no_schema",
    detected,
    detected
      ? "JSON-LD構造化データが見つかりません"
      : `JSON-LDスクリプトが${count}件見つかりました`,
  );
}

/** S2: FAQ未設置 (+15pt) */
async function detectS2(page: Page): Promise<SignalResult> {
  const detected = await page.evaluate(() => {
    // ページ内リンクからFAQページをチェック
    const links = Array.from(document.querySelectorAll("a[href]"));
    const hasFaqPage = links.some((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent || "";
      return (
        /faq|question|よくある/i.test(href) ||
        /よくある質問|FAQ|Q&A/i.test(text)
      );
    });

    // FAQPage スキーマをチェック
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    let hasFaqSchema = false;
    jsonLdScripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "FAQPage") hasFaqSchema = true;
          if (Array.isArray(item["@graph"])) {
            for (const g of item["@graph"]) {
              if (g["@type"] === "FAQPage") hasFaqSchema = true;
            }
          }
        }
      } catch {
        // ignore
      }
    });

    return !hasFaqPage && !hasFaqSchema;
  });
  return result(
    "s2_no_faq",
    detected,
    detected
      ? "FAQページ・FAQスキーマが見つかりません"
      : "FAQページまたはFAQスキーマが検出されました",
  );
}

/** S3: llms.txt未設置 (+10pt) */
async function detectS3(origin: string): Promise<SignalResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${origin}/llms.txt`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const detected = res.status !== 200;
    return result(
      "s3_no_llms_txt",
      detected,
      detected
        ? `llms.txt が見つかりません（ステータス: ${res.status}）`
        : "llms.txt が設置されています",
    );
  } catch (e) {
    return skipped("s3_no_llms_txt", `llms.txt取得エラー: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** S4: AIクローラーブロック (+20pt) */
async function detectS4(origin: string): Promise<SignalResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${origin}/robots.txt`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return result("s4_ai_blocked", false, "robots.txt が見つかりません（ブロックなし）");
    }

    const text = await res.text();
    const blockedBots: string[] = [];
    const aiAgents = ["GPTBot", "Google-Extended", "ClaudeBot", "ChatGPT-User", "CCBot", "Anthropic"];

    // robots.txtをブロック単位で解析
    const blocks = text.split(/(?=User-agent\s*:)/i);
    for (const block of blocks) {
      for (const agent of aiAgents) {
        const agentRegex = new RegExp(`User-agent:\\s*${agent}`, "i");
        if (agentRegex.test(block) && /Disallow:\s*\/\s*$/m.test(block)) {
          blockedBots.push(agent);
        }
      }
    }

    const detected = blockedBots.length > 0;
    return result(
      "s4_ai_blocked",
      detected,
      detected
        ? `AIボットがブロックされています: ${blockedBots.join(", ")}`
        : "AIクローラーはブロックされていません",
    );
  } catch (e) {
    return skipped("s4_ai_blocked", `robots.txt取得エラー: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** S5: SSL未対応 (+15pt) */
async function detectS5(url: string): Promise<SignalResult> {
  if (url.startsWith("https://")) {
    return result("s5_no_ssl", false, "HTTPS で接続されています");
  }

  // http:// の場合、httpsへリダイレクトされるかチェック
  try {
    const httpsUrl = url.replace(/^http:\/\//, "https://");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(httpsUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (res.ok) {
      return result(
        "s5_no_ssl",
        false,
        "HTTP URLですが、HTTPS でもアクセス可能です",
      );
    }
  } catch {
    // HTTPS接続失敗
  }

  return result("s5_no_ssl", true, "SSL（HTTPS）に対応していません");
}

/** S6: スマホ非対応 (+15pt) */
async function detectS6(page: Page): Promise<SignalResult> {
  const viewportInfo = await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return { exists: false, content: "" };
    return {
      exists: true,
      content: viewport.getAttribute("content") || "",
    };
  });

  if (!viewportInfo.exists) {
    return result("s6_not_mobile", true, "viewport メタタグが見つかりません");
  }

  const content = viewportInfo.content;
  if (/width=\d/.test(content) && !content.includes("width=device")) {
    return result(
      "s6_not_mobile",
      true,
      `viewport が固定幅に設定されています: ${content}`,
    );
  }

  if (!content.includes("width=device")) {
    return result(
      "s6_not_mobile",
      true,
      `viewport に width=device-width が含まれていません: ${content}`,
    );
  }

  return result("s6_not_mobile", false, "モバイル対応の viewport が設定されています");
}

/** S7: サイトマップ未設置 (+8pt) */
async function detectS7(origin: string): Promise<SignalResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${origin}/sitemap.xml`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const detected = res.status !== 200;
    return result(
      "s7_no_sitemap",
      detected,
      detected
        ? `sitemap.xml が見つかりません（ステータス: ${res.status}）`
        : "sitemap.xml が設置されています",
    );
  } catch (e) {
    return skipped("s7_no_sitemap", `sitemap.xml取得エラー: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** S8: ページ速度過遅 (+7pt) */
async function detectS8(page: Page): Promise<SignalResult> {
  const timing = await page.evaluate(() => {
    const perf = performance.timing;
    return perf.domContentLoadedEventEnd - perf.navigationStart;
  });

  const detected = timing > 5000;
  return result(
    "s8_slow_page",
    detected,
    detected
      ? `ページ読み込みが遅い（${timing}ms、閾値5000ms）`
      : `ページ読み込み時間: ${timing}ms`,
  );
}

/** S9: コンテンツ過少 (+10pt) */
async function detectS9(page: Page): Promise<SignalResult> {
  const textLength = await page.evaluate(() => {
    return (document.body.innerText || "").length;
  });

  const detected = textLength < 500;
  return result(
    "s9_thin_content",
    detected,
    detected
      ? `コンテンツが少なすぎます（${textLength}文字、閾値500文字）`
      : `コンテンツ量: ${textLength}文字`,
  );
}

/** S10: meta description未設定 (+8pt) */
async function detectS10(page: Page): Promise<SignalResult> {
  const descInfo = await page.evaluate(() => {
    const desc = document.querySelector('meta[name="description"]');
    if (!desc) return { exists: false, length: 0 };
    const content = desc.getAttribute("content") || "";
    return { exists: true, length: content.length };
  });

  const detected = !descInfo.exists || descInfo.length < 10;
  return result(
    "s10_no_meta_desc",
    detected,
    detected
      ? descInfo.exists
        ? `meta description が短すぎます（${descInfo.length}文字）`
        : "meta description が設定されていません"
      : `meta description が設定されています（${descInfo.length}文字）`,
  );
}

/** S11: OGP未設定 (+5pt) */
async function detectS11(page: Page): Promise<SignalResult> {
  const ogInfo = await page.evaluate(() => {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    return {
      hasTitle: !!ogTitle,
      hasDesc: !!ogDesc,
    };
  });

  const detected = !ogInfo.hasTitle || !ogInfo.hasDesc;
  const missing: string[] = [];
  if (!ogInfo.hasTitle) missing.push("og:title");
  if (!ogInfo.hasDesc) missing.push("og:description");

  return result(
    "s11_no_ogp",
    detected,
    detected
      ? `OGPタグが不足しています: ${missing.join(", ")}`
      : "OGPタグが設定されています",
  );
}

/** S12: 化石サイト (+12pt) */
async function detectS12(
  page: Page,
  responseHeaders: Record<string, string>,
): Promise<SignalResult> {
  const currentYear = new Date().getFullYear();

  // 方法1: copyright年をチェック
  const copyrightYear = await page.evaluate(() => {
    const body = document.body.innerText || "";
    const match = body.match(/[\u00A9©]\s*(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  });

  if (copyrightYear !== null) {
    const diff = currentYear - copyrightYear;
    if (diff >= 2) {
      return result(
        "s12_stale_site",
        true,
        `copyright年が${copyrightYear}年です（${diff}年前）`,
      );
    }
    return result(
      "s12_stale_site",
      false,
      `copyright年が${copyrightYear}年です（最新）`,
    );
  }

  // 方法2: Last-Modifiedヘッダーチェック
  const lastModified = responseHeaders["last-modified"];
  if (lastModified) {
    const modDate = new Date(lastModified);
    const diffYears =
      (Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears >= 2) {
      return result(
        "s12_stale_site",
        true,
        `Last-Modified が ${lastModified} です（${Math.floor(diffYears)}年前）`,
      );
    }
    return result(
      "s12_stale_site",
      false,
      `Last-Modified: ${lastModified}`,
    );
  }

  // 方法3: dateメタタグチェック
  const metaDate = await page.evaluate(() => {
    const dateMeta =
      document.querySelector('meta[name="date"]') ||
      document.querySelector('meta[property="article:published_time"]') ||
      document.querySelector('meta[property="article:modified_time"]');
    return dateMeta ? dateMeta.getAttribute("content") : null;
  });

  if (metaDate) {
    const d = new Date(metaDate);
    const diffYears =
      (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears >= 2) {
      return result(
        "s12_stale_site",
        true,
        `メタ日付が ${metaDate} です（${Math.floor(diffYears)}年前）`,
      );
    }
    return result("s12_stale_site", false, `メタ日付: ${metaDate}`);
  }

  // 判定不能の場合はスキップ
  return result("s12_stale_site", false, "更新日の情報が見つかりませんでした");
}

// ============================================================
// ランク判定
// ============================================================

function calcRank(total: number): "S" | "A" | "B" | "C" | "PASSED" {
  if (total >= 100) return "S";
  if (total >= 70) return "A";
  if (total >= 40) return "B";
  if (total >= 1) return "C";
  return "PASSED";
}

// ============================================================
// メインエクスポート
// ============================================================

export async function detectSignals(input: {
  url: string;
}): Promise<SignalDetectorOutput> {
  let { url } = input;

  // URL正規化
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }

  const origin = new URL(url).origin;

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // レスポンスヘッダーを取得するためにリスナーを設定
    const responseHeaders: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page.on("response", (response: any) => {
      if (response.url() === url || response.url() === url + "/") {
        const headers = response.headers();
        Object.assign(responseHeaders, headers);
      }
    });

    // ページ遷移（15秒タイムアウト）
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // 全シグナルを並列検出（各try-catchで包む）
    const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12] =
      await Promise.all([
        detectS1(page).catch((e) => skipped("s1_no_schema", String(e))),
        detectS2(page).catch((e) => skipped("s2_no_faq", String(e))),
        detectS3(origin).catch((e) => skipped("s3_no_llms_txt", String(e))),
        detectS4(origin).catch((e) => skipped("s4_ai_blocked", String(e))),
        detectS5(url).catch((e) => skipped("s5_no_ssl", String(e))),
        detectS6(page).catch((e) => skipped("s6_not_mobile", String(e))),
        detectS7(origin).catch((e) => skipped("s7_no_sitemap", String(e))),
        detectS8(page).catch((e) => skipped("s8_slow_page", String(e))),
        detectS9(page).catch((e) => skipped("s9_thin_content", String(e))),
        detectS10(page).catch((e) => skipped("s10_no_meta_desc", String(e))),
        detectS11(page).catch((e) => skipped("s11_no_ogp", String(e))),
        detectS12(page, responseHeaders).catch((e) =>
          skipped("s12_stale_site", String(e)),
        ),
      ]);

    const signals = {
      s1_no_schema: s1,
      s2_no_faq: s2,
      s3_no_llms_txt: s3,
      s4_ai_blocked: s4,
      s5_no_ssl: s5,
      s6_not_mobile: s6,
      s7_no_sitemap: s7,
      s8_slow_page: s8,
      s9_thin_content: s9,
      s10_no_meta_desc: s10,
      s11_no_ogp: s11,
      s12_stale_site: s12,
    };

    // 集計
    const total_signal_score = Object.values(signals).reduce(
      (sum, s) => sum + s.score,
      0,
    );
    const detected_count = Object.values(signals).filter(
      (s) => s.detected,
    ).length;

    const category_scores = {
      llmo_core: s1.score + s2.score + s3.score + s4.score,
      tech_lag: s5.score + s6.score + s7.score + s8.score,
      content_quality: s9.score + s10.score + s11.score + s12.score,
    };

    return {
      signals,
      total_signal_score,
      rank: calcRank(total_signal_score),
      detected_count,
      category_scores,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
