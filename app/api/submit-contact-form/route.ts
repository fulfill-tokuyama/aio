// app/api/submit-contact-form/route.ts
// フォーム送信API: Puppeteer でフォームに自動入力し送信
// 確認ページ・AJAX送信・iframe・マルチステップ・Cookie consent 対応

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { launchBrowser, createPage } from "@/lib/browser";

export const maxDuration = 300;

interface FieldMapping {
  selector: string;
  label: string;
  value: string;
  source: "profile" | "ai" | "manual";
}

const BACK_BUTTON_PATTERNS = [
  "戻", "もどる", "back", "cancel", "reset", "リセット", "クリア", "初期化",
  "キャンセル", "前のページ", "修正", "clear", "previous",
];

const CONFIRM_PATTERNS = [
  "入力内容の確認", "入力内容のご確認", "入力確認", "確認画面",
  "以下の内容で", "内容をご確認", "送信してよろしいですか",
  "以下の内容をご確認", "内容に間違いがないか", "内容にお間違い",
  "確認してください", "ご確認ください",
];

const SUCCESS_PATTERNS = [
  "ありがとうございます", "ありがとうございました",
  "送信が完了", "送信しました", "送信いたしました", "送信完了",
  "受け付けました", "受付いたしました", "受付完了",
  "完了しました", "完了いたしました",
  "お問い合わせいただき", "お申し込み",
  "thank you", "thanks",
];

const SUCCESS_URL_PATTERNS = [
  "/thanks", "/thank", "/complete", "/done", "/finish", "/success",
  "/kanryo", "/sent",
];

const ERROR_PAGE_PATTERNS = [
  "500", "internal server error", "サーバーエラー",
  "403", "forbidden", "アクセス拒否",
  "404", "not found", "見つかりません",
];

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  let formUrl: string;
  let mappings: FieldMapping[];
  try {
    const body = await req.json();
    formUrl = body.formUrl ?? "";
    mappings = body.mappings ?? [];
    if (!formUrl || mappings.length === 0) {
      return NextResponse.json({ error: "フォームURLとマッピングが必要です" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await createPage(browser);
    await page.goto(formUrl, { waitUntil: "networkidle2" });

    // フォーム描画待ち
    await page.evaluate(() => new Promise<void>((resolve) => {
      if (document.querySelector("form")) return resolve();
      const observer = new MutationObserver(() => {
        if (document.querySelector("form")) { observer.disconnect(); resolve(); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    }));

    // Cookie consent 自動閉じ
    await page.evaluate(() => {
      const dismissTexts = ["同意する", "同意します", "承諾", "accept", "accept all", "agree", "ok", "閉じる", "close", "got it"];
      const dismissSelectors = ['[class*="cookie"] button', '[id*="cookie"] button', '[class*="consent"] button', '[class*="gdpr"] button'];
      for (const sel of dismissSelectors) { const btn = document.querySelector(sel) as HTMLElement; if (btn && btn.offsetParent !== null) { btn.click(); return; } }
      const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      for (const btn of allButtons) { const text = (btn.textContent || "").trim().toLowerCase(); if (dismissTexts.some((t) => text === t || text.includes(t))) { if ((btn as HTMLElement).offsetParent !== null) { (btn as HTMLElement).click(); return; } } }
    }).catch(() => {});

    // iframe 内フォーム検出
    let targetFrame = page.mainFrame();
    const hasMainForm = await page.evaluate(() => !!document.querySelector("form"));
    if (!hasMainForm) {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        try {
          const hasForm = await frame.evaluate(() => !!document.querySelector("form"));
          if (hasForm) { targetFrame = frame; break; }
        } catch { /* cross-origin iframe はスキップ */ }
      }
    }

    // 各フィールドに値を入力
    const fillErrors: string[] = [];
    for (const mapping of mappings) {
      if (!mapping.value || !mapping.selector) continue;
      try {
        const elementInfo = await targetFrame.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          return {
            tagName: el.tagName.toLowerCase(),
            type: (el as HTMLInputElement).type?.toLowerCase() || "",
            disabled: (el as HTMLInputElement).disabled || false,
            readOnly: (el as HTMLInputElement).readOnly || false,
          };
        }, mapping.selector);

        if (!elementInfo) { fillErrors.push(`${mapping.label}: 要素が見つかりません`); continue; }
        if (elementInfo.disabled || elementInfo.readOnly) continue;

        if (elementInfo.tagName === "select") {
          const matched = await targetFrame.evaluate((sel, val) => {
            const select = document.querySelector(sel) as HTMLSelectElement;
            if (!select) return false;
            const normalize = (s: string) => s.replace(/\u3000/g, " ").trim().toLowerCase();
            const normalizedVal = normalize(val);
            const placeholderPat = ["選択してください", "選択して下さい", "お選びください", "---", "▼", "未選択", "please select"];
            const options = Array.from(select.options).filter((o) => { if (!o.value) return false; return !placeholderPat.some((p) => normalize(o.text).includes(p)); });
            const exact = options.find((o) => normalize(o.text) === normalizedVal || o.value === val);
            if (exact) { select.value = exact.value; }
            else {
              const partials = options.filter((o) => { const t = normalize(o.text); return t.includes(normalizedVal) || normalizedVal.includes(t); }).filter((o) => normalize(o.text).length > 0).sort((a, b) => normalize(b.text).length - normalize(a.text).length);
              if (partials.length > 0) select.value = partials[0].value; else return false;
            }
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }, mapping.selector, mapping.value);
          if (!matched) fillErrors.push(`${mapping.label}: 選択肢に一致なし (${mapping.value})`);
          if (matched) {
            await targetFrame.evaluate(() => new Promise<void>((resolve) => {
              const observer = new MutationObserver(() => { observer.disconnect(); resolve(); });
              observer.observe(document.body, { childList: true, subtree: true });
              setTimeout(() => { observer.disconnect(); resolve(); }, 800);
            }));
          }
        } else if (elementInfo.type === "radio") {
          await targetFrame.evaluate((sel, val) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (!el || !el.name) return;
            const escapedName = el.name.replace(/["\\[\](){}:.,>+~!@#$%^&*=|/]/g, "\\$&");
            const radios = Array.from(document.querySelectorAll(`input[name="${escapedName}"]`)) as HTMLInputElement[];
            const normalize = (s: string) => s.replace(/\u3000/g, " ").trim();
            const normalizedVal = normalize(val);
            let matched = false;
            for (const radio of radios) {
              let labelText = "";
              if (radio.id) { const lbl = document.querySelector(`label[for="${radio.id}"]`); if (lbl) labelText = normalize(lbl.textContent ?? ""); }
              if (!labelText) { const parentLbl = radio.closest("label"); if (parentLbl) labelText = normalize(parentLbl.textContent ?? ""); }
              if (!labelText) labelText = radio.value;
              if (labelText === normalizedVal || radio.value === val) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); matched = true; break; }
            }
            if (!matched) {
              for (const radio of radios) {
                let labelText = "";
                const parentLbl = radio.closest("label"); if (parentLbl) labelText = normalize(parentLbl.textContent ?? "");
                if (!labelText) labelText = radio.value;
                if (labelText.includes(normalizedVal) || normalizedVal.includes(labelText)) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); break; }
              }
            }
          }, mapping.selector, mapping.value);
        } else if (elementInfo.type === "checkbox") {
          await targetFrame.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (el && !el.checked && !el.disabled) el.click();
          }, mapping.selector);
        } else {
          await targetFrame.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (el) { el.focus(); el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
          }, mapping.selector);
          await targetFrame.type(mapping.selector, mapping.value, { delay: 20 });
          await targetFrame.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLInputElement;
            if (el) el.dispatchEvent(new Event("blur", { bubbles: true }));
          }, mapping.selector);
        }
      } catch (fieldErr) {
        fillErrors.push(`${mapping.label}: ${String(fieldErr)}`);
      }
    }

    // 送信ボタンを探してクリック
    const submitSelector = await targetFrame.evaluate((backPatterns: string[]) => {
      function isBack(text: string): boolean { return backPatterns.some((p) => text.toLowerCase().includes(p)); }
      function makeButtonSelector(btn: Element): string | null {
        if ((btn as HTMLElement).id) return `#${(btn as HTMLElement).id}`;
        const inp = btn as HTMLInputElement;
        if (inp.name) { const esc = inp.name.replace(/["\\[\](){}:.,>+~!@#$%^&*=|/]/g, "\\$&"); return `${btn.tagName.toLowerCase()}[name="${esc}"]`; }
        if (btn.tagName === "INPUT" && inp.type === "submit") return 'input[type="submit"]';
        if (btn.tagName === "BUTTON") { const t = btn.getAttribute("type"); if (t === "submit" || !t) return 'button[type="submit"]'; }
        return null;
      }
      const form = document.querySelector("form");
      const scope = form || document.body;
      const submitTypeBtns = Array.from(scope.querySelectorAll('input[type="submit"], button[type="submit"]'));
      for (const btn of submitTypeBtns) { if (isBack((btn.textContent || (btn as HTMLInputElement).value || ""))) continue; const sel = makeButtonSelector(btn); if (sel) return sel; }
      const defaultBtns = Array.from(scope.querySelectorAll("button:not([type])"));
      for (const btn of defaultBtns) { if (isBack(btn.textContent || "")) continue; const sel = makeButtonSelector(btn); if (sel) return sel; }
      const submitTexts = ["送信", "確認", "申し込", "申込", "登録", "submit", "send", "next", "次へ"];
      const allClickable = Array.from(scope.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button, a[class*="submit"]'));
      for (const btn of allClickable) { const text = (btn.textContent || (btn as HTMLInputElement).value || ""); if (isBack(text)) continue; if (submitTexts.some((t) => text.toLowerCase().trim().includes(t))) { const sel = makeButtonSelector(btn); if (sel) return sel; } }
      return null;
    }, BACK_BUTTON_PATTERNS);

    if (!submitSelector) {
      await browser.close();
      return NextResponse.json({ success: false, message: "送信ボタンが見つかりませんでした", submittedAt: new Date().toISOString() }, { status: 422 });
    }

    const urlBeforeSubmit = page.url();
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20_000 }).catch(() => {}),
      targetFrame.click(submitSelector),
    ]);

    // AJAX送信対応
    if (page.url() === urlBeforeSubmit) {
      await targetFrame.evaluate(() => new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => { observer.disconnect(); resolve(); });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
      }));
    }

    // マルチステップ対応ループ（確認ページ・中間ステップ・最大5回）
    for (let step = 0; step < 5; step++) {
      const isComplete = await targetFrame.evaluate((textPatterns: string[], urlPatterns: string[]) => {
        const bodyText = document.body.innerText.toLowerCase();
        if (textPatterns.some((p) => bodyText.includes(p.toLowerCase()))) return true;
        return urlPatterns.some((p) => window.location.href.toLowerCase().includes(p));
      }, SUCCESS_PATTERNS, SUCCESS_URL_PATTERNS);
      if (isComplete) break;

      const serverError = await targetFrame.evaluate((errorPatterns: string[]) => {
        const title = document.title.toLowerCase();
        const bodyText = (document.body.innerText || "").substring(0, 500).toLowerCase();
        for (const p of errorPatterns) { if (title.includes(p) || bodyText.includes(p)) return p; }
        return null;
      }, ERROR_PAGE_PATTERNS);
      if (serverError) { fillErrors.push(`サーバーエラー: ${serverError}`); break; }

      const validationError = await targetFrame.evaluate(() => {
        const errorSelectors = [".error", ".field-error", ".validation-error", ".form-error", '[class*="error-message"]', '[class*="err-msg"]', ".invalid-feedback", ".help-block.error", '[role="alert"]'];
        for (const sel of errorSelectors) { for (const el of Array.from(document.querySelectorAll(sel))) { const text = (el as HTMLElement).textContent?.trim() || ""; if (text.length > 0 && text.length < 200 && (el as HTMLElement).offsetParent !== null) return text; } }
        const invalidInputs = document.querySelectorAll("input:invalid, select:invalid, textarea:invalid");
        if (invalidInputs.length > 0) { return `入力エラー: ${Array.from(invalidInputs).map((el) => (el as HTMLInputElement).name || (el as HTMLInputElement).id || "unknown").slice(0, 3).join(", ")}`; }
        return null;
      });
      if (validationError) { fillErrors.push(`バリデーション: ${validationError}`); break; }

      const isStepPage = await targetFrame.evaluate((patterns: string[]) => {
        return patterns.some((p) => document.body.innerText.includes(p));
      }, CONFIRM_PATTERNS);
      if (!isStepPage) break;

      // 確認ページの送信ボタンをクリック
      const stepSubmitSelector = await targetFrame.evaluate((backPatterns: string[]) => {
        function isBack(text: string): boolean { return backPatterns.some((p) => text.toLowerCase().includes(p)); }
        function makeButtonSelector(btn: Element): string | null {
          if ((btn as HTMLElement).id) return `#${(btn as HTMLElement).id}`;
          const inp = btn as HTMLInputElement;
          if (inp.name) { const esc = inp.name.replace(/["\\[\](){}:.,>+~!@#$%^&*=|/]/g, "\\$&"); return `${btn.tagName.toLowerCase()}[name="${esc}"]`; }
          if (btn.tagName === "INPUT" && inp.type === "submit") return 'input[type="submit"]';
          if (btn.tagName === "BUTTON") { const t = btn.getAttribute("type"); if (t === "submit" || !t) return 'button[type="submit"]'; }
          return null;
        }
        const submitTexts = ["送信", "完了", "次へ", "next", "submit", "send"];
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a.button'));
        for (const btn of allButtons) { const text = (btn.textContent || (btn as HTMLInputElement).value || ""); if (isBack(text)) continue; if (submitTexts.some((t) => text.toLowerCase().trim().includes(t))) { const sel = makeButtonSelector(btn); if (sel) return sel; } }
        const fallback = Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"]'));
        for (const btn of fallback) { if (!isBack((btn.textContent || (btn as HTMLInputElement).value || ""))) { const sel = makeButtonSelector(btn); if (sel) return sel; } }
        return 'button[type="submit"], input[type="submit"]';
      }, BACK_BUTTON_PATTERNS);

      const urlBeforeStep = page.url();
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20_000 }).catch(() => {}),
        targetFrame.click(stepSubmitSelector).catch(() => {}),
      ]);
      if (page.url() === urlBeforeStep) {
        await targetFrame.evaluate(() => new Promise<void>((resolve) => {
          const observer = new MutationObserver(() => { observer.disconnect(); resolve(); });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
        }));
      }
    }

    // 最終完了チェック
    const completionCheck = await targetFrame.evaluate((textPatterns: string[], urlPatterns: string[]) => {
      const bodyText = document.body.innerText.toLowerCase();
      if (textPatterns.some((p) => bodyText.includes(p.toLowerCase()))) return true;
      return urlPatterns.some((p) => window.location.href.toLowerCase().includes(p));
    }, SUCCESS_PATTERNS, SUCCESS_URL_PATTERNS);

    await browser.close();

    return NextResponse.json({
      success: completionCheck,
      message: completionCheck
        ? "フォーム送信が完了しました"
        : fillErrors.length > 0
          ? `フォーム送信の確認ができませんでした（${fillErrors[0]}）`
          : "フォームを送信しましたが、完了を確認できませんでした",
      submittedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    console.error("submit-contact-form error:", e);
    return NextResponse.json({
      success: false,
      message: "フォーム送信に失敗しました: " + String(e),
      submittedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
