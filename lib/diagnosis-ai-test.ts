// lib/diagnosis-ai-test.ts
// AI実測: Gemini にプロンプトを送り、企業名の言及率・順位を測定（LeadGenius 統合）

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type PromptCategory = "info" | "comparison" | "purchase";

function generateTestPrompts(
  companyName: string,
  industry: string,
  region: string
): Array<{ prompt: string; category: PromptCategory }> {
  const industryLabel = industry || "該当業界";
  const regionLabel = region || "国内";
  return [
    {
      prompt: `${industryLabel}で信頼できる企業を5社教えてください。${regionLabel}の企業を優先して。`,
      category: "info",
    },
    {
      prompt: `${industryLabel}のサービスを提供している会社を教えてください。`,
      category: "info",
    },
    {
      prompt: `${companyName}について教えてください。事業内容と強みを簡潔に。`,
      category: "info",
    },
    {
      prompt: `${industryLabel}でおすすめの企業を比較して教えてください。`,
      category: "comparison",
    },
    {
      prompt: `${industryLabel}のサービスを利用したいです。信頼できる会社を3社挙げてください。`,
      category: "purchase",
    },
    {
      prompt: `${industryLabel}で実績のある企業を紹介してください。`,
      category: "purchase",
    },
  ];
}

function extractMentionRank(
  response: string,
  companyName: string
): { rank: number | null; included: boolean } {
  if (!response || !companyName) return { rank: null, included: false };
  const lower = response.toLowerCase();
  const nameLower = companyName.toLowerCase();
  if (!lower.includes(nameLower)) return { rank: null, included: false };

  const sentences = response.split(/[。\n.!?]/);
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].toLowerCase().includes(nameLower)) {
      return { rank: i + 1, included: true };
    }
  }
  return { rank: 1, included: true };
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export interface AiTestResult {
  inclusionRate: number;
  recommendationPosition: number;
  total: number;
  promptCount: number;
  mentionCount: number;
}

/**
 * AI実測: 6プロンプトを Gemini に送り、企業名の言及率を測定
 * レート制限対策のため、プロンプト間に 1 秒の遅延を入れる
 */
export async function runAiTest(
  companyName: string,
  industry: string,
  region: string
): Promise<AiTestResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const prompts = generateTestPrompts(companyName, industry, region);
  const results: Array<{ included: boolean; mentionRank: number | null }> = [];

  for (const p of prompts) {
    try {
      const text = await callGemini(apiKey, p.prompt);
      const { rank, included } = extractMentionRank(text, companyName);
      results.push({ included, mentionRank: rank });
      // レート制限対策（Gemini 1分10回 → 6秒間隔）
      await new Promise((r) => setTimeout(r, 6000));
    } catch {
      results.push({ included: false, mentionRank: null });
    }
  }

  const mentionCount = results.filter((r) => r.included).length;
  const inclusionRate = results.length > 0 ? Math.round((mentionCount / results.length) * 100) : 0;
  const positions = results.filter((r) => r.mentionRank != null).map((r) => r.mentionRank!);
  const avgPosition =
    positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
  const recPosScore = avgPosition != null ? Math.max(0, 100 - (avgPosition - 1) * 25) : 50;
  const total = Math.round(inclusionRate * 0.8 + recPosScore * 0.2);

  return {
    inclusionRate,
    recommendationPosition: Math.round(recPosScore),
    total: Math.min(100, Math.max(0, total)),
    promptCount: prompts.length,
    mentionCount,
  };
}
