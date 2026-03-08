// app/api/analyze-form-fields/route.ts
// フォーム解析API: Puppeteer でフォームフィールドを抽出し、Gemini でマッピングを生成

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { launchBrowser, createPage, detectCaptcha } from "@/lib/browser";

export const maxDuration = 300;

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface FormFieldInfo {
  selector: string;
  tagName: string;
  type: string;
  name: string;
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
}

interface FormFieldMapping {
  selector: string;
  label: string;
  value: string;
  source: "profile" | "ai" | "manual";
}

interface UserProfile {
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  service_name?: string;
  service_content?: string;
  service_strengths?: string[];
  target_customer?: string;
  phone?: string;
  department?: string;
  position?: string;
  postal_code?: string;
  address?: string;
  fax?: string;
}

async function callGemini(apiKey: string, systemInstruction: string, query: string, modelName: string): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: query }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Gemini API error [${res.status}]: ${errJson?.error?.message || res.statusText}`);
  }
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" }, { status: 500 });
  }

  let formUrl: string;
  let userProfile: UserProfile;
  let companyName: string;
  let servicePitch: string | undefined;
  try {
    const body = await req.json();
    formUrl = body.formUrl ?? "";
    userProfile = body.userProfile ?? {};
    companyName = body.companyName ?? "";
    servicePitch = body.servicePitch;
    if (!formUrl) {
      return NextResponse.json({ error: "フォームURLが必要です" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await createPage(browser);
    await page.goto(formUrl, { waitUntil: "networkidle2" });

    // フォーム描画待ち（JSフレームワーク対応）
    await page.evaluate(() => new Promise<void>((resolve) => {
      if (document.querySelector("form")) return resolve();
      const observer = new MutationObserver(() => {
        if (document.querySelector("form")) { observer.disconnect(); resolve(); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    }));

    // Cookie consent / ポップアップ自動閉じ
    await page.evaluate(() => {
      const dismissTexts = ["同意する", "同意します", "承諾", "accept", "accept all", "agree", "ok", "閉じる", "close", "got it"];
      const dismissSelectors = ['[class*="cookie"] button', '[id*="cookie"] button', '[class*="consent"] button', '[class*="gdpr"] button'];
      for (const sel of dismissSelectors) {
        const btn = document.querySelector(sel) as HTMLElement;
        if (btn && btn.offsetParent !== null) { btn.click(); return; }
      }
      const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      for (const btn of allButtons) {
        const text = (btn.textContent || "").trim().toLowerCase();
        if (dismissTexts.some((t) => text === t || text.includes(t))) {
          if ((btn as HTMLElement).offsetParent !== null) { (btn as HTMLElement).click(); return; }
        }
      }
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

    // フォームフィールドを抽出
    const extractionResult = await targetFrame.evaluate(() => {
      const fields: Array<{
        selector: string; tagName: string; type: string; name: string; id: string;
        label: string; placeholder: string; required: boolean; options?: string[];
      }> = [];

      function cleanLabel(text: string): string {
        return text.replace(/必須/g, "").replace(/任意/g, "").replace(/\s*\*\s*/g, "").replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
      }

      function findLabel(el: HTMLElement): string {
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) return cleanLabel(ariaLabel);
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        if (ariaLabelledBy) { const labelEl = document.getElementById(ariaLabelledBy); if (labelEl) return cleanLabel(labelEl.textContent ?? ""); }
        const id = el.id;
        if (id) { try { const label = document.querySelector(`label[for="${CSS.escape(id)}"]`); if (label) return cleanLabel(label.textContent ?? ""); } catch { const label = document.querySelector(`label[for="${id}"]`); if (label) return cleanLabel(label.textContent ?? ""); } }
        const parentLabel = el.closest("label");
        if (parentLabel) { let labelText = ""; parentLabel.childNodes.forEach((node) => { if (node === el) return; if (node.nodeType === Node.TEXT_NODE) { labelText += node.textContent ?? ""; } else if (node.nodeType === Node.ELEMENT_NODE) { const htmlNode = node as HTMLElement; if (!["INPUT", "TEXTAREA", "SELECT"].includes(htmlNode.tagName)) { labelText += htmlNode.textContent ?? ""; } } }); const cleaned = cleanLabel(labelText); if (cleaned) return cleaned; }
        const row = el.closest("tr"); if (row) { const th = row.querySelector("th"); if (th) return cleanLabel(th.textContent ?? ""); }
        const dd = el.closest("dd"); if (dd) { let prev = dd.previousElementSibling; while (prev) { if (prev.tagName === "DT") return cleanLabel(prev.textContent ?? ""); prev = prev.previousElementSibling; } }
        const prev = el.previousElementSibling; if (prev && ["SPAN", "P", "DIV", "LABEL"].includes(prev.tagName)) { const text = cleanLabel(prev.textContent ?? ""); if (text.length > 0 && text.length < 80) return text; }
        const parent = el.parentElement; if (parent && parent.tagName !== "FORM" && parent.tagName !== "BODY") { const parentPrev = parent.previousElementSibling; if (parentPrev && ["SPAN", "P", "DIV", "LABEL", "H3", "H4", "H5"].includes(parentPrev.tagName)) { const text = cleanLabel(parentPrev.textContent ?? ""); if (text.length > 0 && text.length < 80) return text; } }
        const placeholder = (el as HTMLInputElement).placeholder; if (placeholder) { const cleaned = placeholder.replace(/^例[：:]?\s*/, "").trim(); if (cleaned.length < 50) return cleaned; }
        return "";
      }

      function escapeForSelector(str: string): string { return str.replace(/["\\[\](){}:.,>+~!@#$%^&*=|/]/g, "\\$&"); }

      function makeSelector(el: HTMLElement): string {
        if (el.id) { try { return `#${CSS.escape(el.id)}`; } catch { return `#${escapeForSelector(el.id)}`; } }
        if ((el as HTMLInputElement).name) { return `${el.tagName.toLowerCase()}[name="${escapeForSelector((el as HTMLInputElement).name)}"]`; }
        const parent = el.parentElement;
        if (parent) { const tag = el.tagName.toLowerCase(); const sameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName); if (sameTag.length === 1) return `${parent.tagName.toLowerCase()} > ${tag}`; return `${tag}:nth-of-type(${sameTag.indexOf(el) + 1})`; }
        return el.tagName.toLowerCase();
      }

      function isVisible(el: HTMLElement): boolean {
        if (el.offsetParent === null && el.style.position !== "fixed") return false;
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
      }

      const forms = document.querySelectorAll("form");
      let targetForm: HTMLElement = document.body;
      if (forms.length === 1) { targetForm = forms[0]; }
      else if (forms.length > 1) {
        let bestForm = forms[0]; let bestScore = -1;
        forms.forEach((form) => { let score = 0; score += form.querySelectorAll("input, textarea, select").length * 2; if (form.querySelector("textarea")) score += 10; if (form.querySelector('input[type="email"]')) score += 10; const action = (form.action || "").toLowerCase(); if (action.includes("contact") || action.includes("inquiry") || action.includes("form")) score += 5; const formText = (form.textContent || "").toLowerCase(); if (formText.includes("お問い合わせ") || formText.includes("お名前") || formText.includes("メール")) score += 5; if (score > bestScore) { bestScore = score; bestForm = form; } });
        targetForm = bestForm;
      }

      const inputs = targetForm.querySelectorAll("input, textarea, select");
      inputs.forEach((el) => {
        const htmlEl = el as HTMLElement; const inputEl = el as HTMLInputElement;
        const type = inputEl.type?.toLowerCase() || "";
        if (["hidden", "submit", "button", "image"].includes(type)) return;
        if (inputEl.disabled || inputEl.readOnly) return;
        if (type !== "radio" && type !== "checkbox" && !isVisible(htmlEl)) return;

        const field: typeof fields[number] = {
          selector: makeSelector(htmlEl), tagName: el.tagName.toLowerCase(),
          type: type || (el.tagName === "TEXTAREA" ? "textarea" : el.tagName === "SELECT" ? "select" : ""),
          name: inputEl.name || "", id: inputEl.id || "", label: findLabel(htmlEl),
          placeholder: inputEl.placeholder || "", required: inputEl.required || htmlEl.getAttribute("aria-required") === "true",
        };

        if (el.tagName === "SELECT") {
          const placeholderPat = ["選択してください", "選択して下さい", "お選びください", "---", "▼", "未選択", "please select"];
          field.options = Array.from((el as HTMLSelectElement).options).map((o) => o.text.replace(/\u3000/g, " ").trim()).filter((t) => t.length > 0).filter((t) => !placeholderPat.some((p) => t.toLowerCase().includes(p.toLowerCase())));
        }

        if (type === "radio" || type === "checkbox") {
          const escapedName = escapeForSelector(inputEl.name);
          const sameName = targetForm.querySelectorAll(`input[name="${escapedName}"]`);
          if (sameName.length > 1) { const existing = fields.find((f) => f.name === inputEl.name); if (existing) { if (!existing.options) existing.options = []; const optLabel = findLabel(htmlEl) || inputEl.value; if (!existing.options.includes(optLabel)) existing.options.push(optLabel); return; } }
          field.options = [findLabel(htmlEl) || inputEl.value];
        }
        fields.push(field);
      });

      const form = targetForm.tagName === "FORM" ? (targetForm as HTMLFormElement) : null;
      return { fields, formMethod: form?.method?.toUpperCase() || "POST", formAction: form?.action || "" };
    });

    const hasCaptcha = await detectCaptcha(page);
    await browser.close();

    // Gemini でマッピング生成
    const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    const profileInfo = [
      userProfile.company_name ? `会社名: ${userProfile.company_name}` : "",
      userProfile.contact_name ? `担当者名: ${userProfile.contact_name}` : "",
      userProfile.contact_email ? `メールアドレス: ${userProfile.contact_email}` : "",
      userProfile.phone ? `電話番号: ${userProfile.phone}` : "",
      userProfile.department ? `部署名: ${userProfile.department}` : "",
      userProfile.position ? `役職: ${userProfile.position}` : "",
      userProfile.postal_code ? `郵便番号: ${userProfile.postal_code}` : "",
      userProfile.address ? `住所: ${userProfile.address}` : "",
      userProfile.fax ? `FAX番号: ${userProfile.fax}` : "",
      userProfile.service_name ? `サービス名: ${userProfile.service_name}` : "",
      userProfile.service_content ? `サービス内容: ${userProfile.service_content}` : "",
      userProfile.service_strengths?.length ? `強み: ${userProfile.service_strengths.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const systemInstruction = `あなたは日本の企業Webサイトのお問い合わせフォームに自動入力するためのマッピングを生成するエキスパートです。

以下のフォームフィールド一覧とユーザープロフィール情報をもとに、各フィールドに入力すべき値を決定してください。

ルール:
- ユーザープロフィール情報から直接マッピングできるフィールドは source を "profile" にする
- AIが生成する値（お問い合わせ内容等）は source を "ai" にする
- 「お問い合わせ内容」「ご相談内容」「メッセージ」等のフリーテキスト欄には、相手企業（${companyName}）向けの丁寧な営業メッセージを生成する
- select/radio フィールドは、選択肢の中から最も適切なものを選ぶ
- 「会社名」「御社名」「貴社名」→ ユーザーの会社名
- 「お名前」「氏名」「ご担当者名」→ ユーザーの担当者名
- 「メールアドレス」「email」→ ユーザーのメールアドレス
- 「電話番号」「TEL」「電話」→ ユーザーの電話番号
- 「部署」「部門」「所属」→ ユーザーの部署名
- 「役職」「肩書」「職位」→ ユーザーの役職
- 「郵便番号」「〒」→ ユーザーの郵便番号
- 「住所」「所在地」→ ユーザーの住所
- 「FAX」「ファックス」「ファクス」→ ユーザーのFAX番号
- マッピングできないフィールドは value を空文字にし、source を "manual" にする

必ず以下のJSON配列形式で回答してください:
[
  { "selector": "...", "label": "...", "value": "入力値", "source": "profile|ai|manual" },
  ...
]`;

    const query = `フォームフィールド:
${JSON.stringify(extractionResult.fields, null, 2)}

ユーザープロフィール:
${profileInfo}

送信先企業名: ${companyName}
${servicePitch ? `サービス概要: ${servicePitch}` : ""}

各フィールドに入力すべき値をマッピングしてください。`;

    const mappingText = await callGemini(apiKey, systemInstruction, query, modelName);

    let mappings: FormFieldMapping[] = [];
    const codeBlockMatch = mappingText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonSource = codeBlockMatch ? codeBlockMatch[1] : mappingText;
    const jsonMatch = jsonSource.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try { mappings = JSON.parse(jsonMatch[0]) as FormFieldMapping[]; } catch {
        const minMatch = jsonSource.match(/\[[\s\S]*?\]/);
        if (minMatch) { try { mappings = JSON.parse(minMatch[0]) as FormFieldMapping[]; } catch { /* empty */ } }
      }
    }

    return NextResponse.json({
      fields: extractionResult.fields,
      mappings,
      hasCaptcha,
      formMethod: extractionResult.formMethod,
      formAction: extractionResult.formAction,
    });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    console.error("analyze-form-fields error:", e);
    return NextResponse.json({ error: "フォーム解析に失敗しました" }, { status: 500 });
  }
}
