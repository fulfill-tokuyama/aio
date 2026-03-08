// lib/gemini.ts — Gemini API クライアント
// レート制限: 1分10回以内

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!apiKey && typeof window === "undefined") {
  console.error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

// レート制限: 直近1分間のリクエスト数を追跡
const requestLog: number[] = [];
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(): void {
  const now = Date.now();
  // 古いエントリを削除
  while (requestLog.length > 0 && now - requestLog[0] > RATE_WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT) {
    throw new Error("Gemini API レート制限に達しました。1分後に再試行してください。");
  }
  requestLog.push(now);
}

export async function generateWithGemini(
  prompt: string,
  options?: { model?: string; maxTokens?: number }
): Promise<string> {
  checkRateLimit();

  const model = genAI.getGenerativeModel({
    model: options?.model || "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: options?.maxTokens || 4096,
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
