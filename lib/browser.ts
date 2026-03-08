// lib/browser.ts
// Puppeteer + @sparticuz/chromium によるブラウザ自動化ユーティリティ（Vercel Serverless対応）

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { Browser, Page } from "puppeteer-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chr = chromium as any;

/** Chromium を起動（Vercel Serverless 向け） */
export async function launchBrowser(): Promise<Browser> {
  const executablePath = await chromium.executablePath();
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chr.defaultViewport ?? { width: 1280, height: 720 },
    executablePath,
    headless: chr.headless ?? "shell",
  });
}

/** ページ生成（日本語ヘッダー・UA・タイムアウト設定） */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "ja,en-US;q=0.9,en;q=0.8" });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  page.setDefaultNavigationTimeout(20_000);
  page.setDefaultTimeout(10_000);
  return page;
}

/** CAPTCHA の有無を検出 */
export async function detectCaptcha(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const patterns = ["g-recaptcha", "recaptcha", "grecaptcha", "hcaptcha", "h-captcha", "cf-turnstile", "turnstile"];
    const lower = html.toLowerCase();
    return patterns.some((p) => lower.includes(p));
  });
}
