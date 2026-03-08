// lib/generate-structured-data.ts — 構造化データ（JSON-LD）自動生成
// DiagnosisResult + URL + 業種 → JSON-LD コード

import { generateWithGemini } from "@/lib/gemini";
import type { DiagnosisResult, HtmlAnalysis } from "@/lib/diagnosis";

export interface StructuredDataInput {
  url: string;
  industry?: string;
  htmlAnalysis: HtmlAnalysis | Record<string, unknown>;
  diagnosisResult?: Partial<DiagnosisResult>;
}

export interface StructuredDataOutput {
  jsonLd: string;
  schemas: string[];
  explanation: string;
}

function buildPrompt(input: StructuredDataInput): string {
  const html = input.htmlAnalysis as Record<string, unknown>;
  const title = (html.title as string) || "";
  const hasJsonLd = html.hasJsonLd || false;
  const hasFaqSchema = html.hasFaqSchema || false;
  const hasOrganizationSchema = html.hasOrganizationSchema || false;
  const hasBreadcrumbSchema = html.hasBreadcrumbSchema || false;

  const industry = input.industry || "中小企業";

  // 士業特化のコンテキスト
  const professionContext = /税理士|社労士|行政書士|弁護士|司法書士|公認会計士/.test(industry)
    ? `この企業は${industry}事務所です。ProfessionalServiceスキーマを使用し、以下を含めてください:
- serviceType: 具体的な業務内容（例: 税務申告、給与計算、許認可申請）
- areaServed: 対応地域
- hasOfferCatalog: 主要サービスのリスト
- priceRange: 料金目安（"$$" 等）`
    : `この企業の業種は「${industry}」です。LocalBusinessまたはProfessionalServiceスキーマを適宜選択してください。`;

  const missingSchemas: string[] = [];
  if (!hasJsonLd) missingSchemas.push("JSON-LD自体が未実装");
  if (!hasOrganizationSchema) missingSchemas.push("Organization/LocalBusinessスキーマ");
  if (!hasFaqSchema) missingSchemas.push("FAQPageスキーマ");
  if (!hasBreadcrumbSchema) missingSchemas.push("BreadcrumbListスキーマ");

  return `あなたはSEOと構造化データの専門家です。
以下の企業サイト情報に基づいて、AI検索エンジン（ChatGPT, Perplexity等）で引用されやすい構造化データ（JSON-LD）を生成してください。

## 企業サイト情報
- URL: ${input.url}
- サイトタイトル: ${title}
- ${professionContext}

## 現在の構造化データ状況
- JSON-LD: ${hasJsonLd ? "実装済み" : "未実装"}
- Organization/LocalBusiness: ${hasOrganizationSchema ? "あり" : "なし"}
- FAQPage: ${hasFaqSchema ? "あり" : "なし"}
- BreadcrumbList: ${hasBreadcrumbSchema ? "あり" : "なし"}
${missingSchemas.length > 0 ? `- 不足: ${missingSchemas.join(", ")}` : ""}

## 生成要件
1. <head>タグに直接貼れる完全な<script type="application/ld+json">タグを生成
2. 以下のスキーマを含める:
   - Organization or LocalBusiness or ProfessionalService（企業情報）
   - WebSite（サイト検索対応）
   - BreadcrumbList（パンくず）
   - FAQPage（よくある質問3〜5件を業種に適した内容で生成）
3. 実在の情報が不明な部分は [要編集: ○○] のプレースホルダーを入れる
4. JSON-LDは@graphパターンで1つのscriptタグにまとめる
5. Schema.orgの仕様に完全準拠する

## 出力フォーマット
以下のJSON形式で出力してください（コードブロックなし、純粋なJSON）:
{
  "jsonLd": "<script type=\\"application/ld+json\\">ここにJSON-LD</script>",
  "schemas": ["生成したスキーマタイプのリスト"],
  "explanation": "この構造化データが何を改善するかの簡潔な説明（日本語、3文以内）"
}`;
}

export async function generateStructuredData(
  input: StructuredDataInput
): Promise<StructuredDataOutput> {
  const prompt = buildPrompt(input);
  const raw = await generateWithGemini(prompt, { maxTokens: 4096 });

  // JSONを抽出（コードブロックで囲まれている場合も対応）
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("構造化データの生成に失敗しました。再試行してください。");
  }

  const parsed = JSON.parse(jsonMatch[0]) as StructuredDataOutput;

  if (!parsed.jsonLd || !parsed.schemas) {
    throw new Error("生成結果のフォーマットが不正です。");
  }

  return parsed;
}
