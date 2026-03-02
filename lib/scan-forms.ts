// lib/scan-forms.ts
// HP URLからお問い合わせフォーム・メールアドレス・電話番号を自動探索
// cheerioベース（Vercel互換、Puppeteer不要）
// scan-forms route と auto-pipeline route から共有利用

import * as cheerio from "cheerio";

export const FORM_PATHS = [
  "/contact", "/contact-us", "/inquiry", "/お問い合わせ", "/otoiawase",
  "/toiawase", "/form", "/contact/form", "/support", "/feedback",
  "/contactus", "/inquiries", "/consulting", "/request", "/demo",
  "/trial", "/about/contact", "/company/contact", "/help/contact",
  "/contact.html", "/mail", "/info",
];

// 日本語電話番号パターン (03-xxxx-xxxx, 0120-xxx-xxx, 090-xxxx-xxxx, etc.)
export const PHONE_REGEX = /\b0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}\b/g;
// メールアドレスパターン (/g for .match(), use EMAIL_REGEX_TEST for .test())
export const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const EMAIL_REGEX_TEST = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const BATCH_SIZE = 5;
const FETCH_TIMEOUT = 8000;

export interface ScanResult {
  contactEmail: string | null;
  contactPhone: string | null;
  formUrl: string | null;
  contactPageUrl: string | null;
  pagesScanned: number;
  pagesFound: string[];
}

export async function fetchWithTimeout(url: string, timeout: number, method: "HEAD" | "GET" = "GET"): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AIOInsight/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// バッチ並列でHEADリクエストし、200のURLを返す
export async function findLivePages(baseUrl: string): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const livePages: string[] = [];

  for (let i = 0; i < FORM_PATHS.length; i += BATCH_SIZE) {
    const batch = FORM_PATHS.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (path) => {
        const fullUrl = `${origin}${path}`;
        try {
          const res = await fetchWithTimeout(fullUrl, FETCH_TIMEOUT, "HEAD");
          if (res.ok) return fullUrl;
          return null;
        } catch {
          return null;
        }
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        livePages.push(r.value);
      }
    }
  }

  return livePages;
}

// HTMLからメールアドレスを抽出
export function extractEmails($: cheerio.CheerioAPI, html: string): string[] {
  const emails = new Set<string>();

  // mailto: リンクから
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const email = href.replace("mailto:", "").split("?")[0].trim();
    if (email && EMAIL_REGEX_TEST.test(email)) {
      emails.add(email);
    }
  });

  // テキスト全体から正規表現で抽出
  const textMatches = html.match(EMAIL_REGEX);
  if (textMatches) {
    for (const m of textMatches) {
      // 画像ファイルやCSS等を除外
      if (!m.endsWith(".png") && !m.endsWith(".jpg") && !m.endsWith(".gif") && !m.endsWith(".css") && !m.endsWith(".js")) {
        emails.add(m);
      }
    }
  }

  return Array.from(emails);
}

// HTMLから電話番号を抽出
export function extractPhones($: cheerio.CheerioAPI, html: string): string[] {
  const phones = new Set<string>();

  // tel: リンクから
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const phone = href.replace("tel:", "").replace(/[\s\-+]/g, "").trim();
    if (phone.length >= 9) {
      phones.add(href.replace("tel:", "").trim());
    }
  });

  // テキストから正規表現で抽出
  const textMatches = html.match(PHONE_REGEX);
  if (textMatches) {
    for (const m of textMatches) {
      phones.add(m.trim());
    }
  }

  return Array.from(phones);
}

// HTMLからフォームURLを抽出
export function extractFormUrl($: cheerio.CheerioAPI, pageUrl: string): string | null {
  const forms = $("form");
  if (forms.length === 0) return null;

  const action = forms.first().attr("action");
  if (!action || action === "#" || action === "") {
    // actionなしの場合、ページ自体がフォームページ
    return pageUrl;
  }

  try {
    return new URL(action, pageUrl).toString();
  } catch {
    return pageUrl;
  }
}

export async function scanUrl(baseUrl: string): Promise<ScanResult> {
  const result: ScanResult = {
    contactEmail: null,
    contactPhone: null,
    formUrl: null,
    contactPageUrl: null,
    pagesScanned: 0,
    pagesFound: [],
  };

  // 1. FORM_PATHSをバッチ5並列でHEAD → 200のページを特定
  const livePages = await findLivePages(baseUrl);
  result.pagesScanned = FORM_PATHS.length;
  result.pagesFound = livePages;

  // トップページも対象に含める
  const pagesToAnalyze = [baseUrl, ...livePages];
  // 重複排除
  const uniquePages = Array.from(new Set(pagesToAnalyze));

  const allEmails: string[] = [];
  const allPhones: string[] = [];

  // 2. 発見ページのHTMLをfetch+cheerioで解析
  for (const pageUrl of uniquePages) {
    try {
      const res = await fetchWithTimeout(pageUrl, FETCH_TIMEOUT);
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      // メールアドレス抽出
      const emails = extractEmails($, html);
      allEmails.push(...emails);

      // 電話番号抽出
      const phones = extractPhones($, html);
      allPhones.push(...phones);

      // フォームURL抽出（最初に見つかったものを採用）
      if (!result.formUrl && pageUrl !== baseUrl) {
        const formUrl = extractFormUrl($, pageUrl);
        if (formUrl) {
          result.formUrl = formUrl;
          result.contactPageUrl = pageUrl;
        }
      }
    } catch {
      // タイムアウト等はスキップ
      continue;
    }
  }

  // 最初に見つかったものを代表値として設定
  if (allEmails.length > 0) {
    result.contactEmail = allEmails[0];
  }
  if (allPhones.length > 0) {
    result.contactPhone = allPhones[0];
  }

  // フォームURLが見つからなかった場合、ライブページの最初を設定
  if (!result.formUrl && livePages.length > 0) {
    result.formUrl = livePages[0];
    result.contactPageUrl = livePages[0];
  }

  return result;
}
