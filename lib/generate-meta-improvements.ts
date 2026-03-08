// lib/generate-meta-improvements.ts — metaタグ改善案生成
// 現在のtitle/description → AI検索最適化観点の改善案3パターン

import { generateWithGemini } from "@/lib/gemini";
import type { HtmlAnalysis } from "@/lib/diagnosis";

export interface MetaImprovementInput {
  url: string;
  htmlAnalysis: HtmlAnalysis | Record<string, unknown>;
  industry?: string;
}

export interface MetaImprovement {
  title: string;
  description: string;
  rationale: string;
}

export interface MetaImprovementOutput {
  currentTitle: string;
  currentDescription: string;
  improvements: MetaImprovement[];
}

export async function generateMetaImprovements(
  input: MetaImprovementInput
): Promise<MetaImprovementOutput> {
  const html = input.htmlAnalysis as Record<string, unknown>;
  const currentTitle = (html.title as string) || "";
  const hasMetaDescription = html.hasMetaDescription || false;
  const metaDescriptionLength = (html.metaDescriptionLength as number) || 0;
  const industry = input.industry || "中小企業";

  const prompt = `あなたはAI検索最適化（LLMO）の専門家です。
以下のサイトのtitleタグとmeta descriptionの改善案を3パターン生成してください。

## サイト情報
- URL: ${input.url}
- 現在のタイトル: ${currentTitle || "（未設定）"}
- meta description: ${hasMetaDescription ? `設定済み（${metaDescriptionLength}文字）` : "未設定"}
- 業種: ${industry}

## 改善の観点
- AI検索エンジン（ChatGPT, Perplexity, Gemini）で引用されやすい表現
- E-E-A-T（専門性・権威性・信頼性）を示すキーワードを含める
- 具体的な数値や実績を入れる（不明な場合はプレースホルダー [要編集: ○○]）
- titleは30〜60文字、descriptionは80〜160文字

## 出力フォーマット
以下のJSON形式で出力してください（コードブロックなし、純粋なJSON）:
{
  "improvements": [
    {
      "title": "改善案のtitleタグ",
      "description": "改善案のmeta description",
      "rationale": "この改善案のポイント（1文）"
    }
  ]
}

3パターン生成してください。`;

  const raw = await generateWithGemini(prompt, { maxTokens: 2048 });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("metaタグ改善案の生成に失敗しました。再試行してください。");
  }

  const parsed = JSON.parse(jsonMatch[0]) as { improvements: MetaImprovement[] };

  if (!parsed.improvements || parsed.improvements.length === 0) {
    throw new Error("生成結果のフォーマットが不正です。");
  }

  return {
    currentTitle,
    currentDescription: hasMetaDescription ? `設定済み（${metaDescriptionLength}文字）` : "未設定",
    improvements: parsed.improvements,
  };
}
