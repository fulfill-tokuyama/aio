// ============================================================
// AI Brand Monitor — ChatGPT / Perplexity Sonar / Gemini
// Replaces Ahrefs Brand Radar API with self-hosted AI checks
// ============================================================

// --- Types ---

export interface BrandCheckResult {
  platform: string;
  mentioned: boolean;
  context: string;
  sources: string[];
}

export interface PlatformData {
  platform: string;
  mentions: number;
  citations: number;
  sov: number;
  impressions: number;
  trend: number;
}

// Impressions multipliers per platform
const IMPRESSIONS_MULTIPLIER: Record<string, number> = {
  ChatGPT: 1000,
  Perplexity: 300,
  Gemini: 500,
};

// --- 1. Generate Prompts ---

export function generatePrompts(
  brandName: string,
  industry: string
): string[] {
  const ctx = industry ? `${industry}の分野で` : "";
  return [
    `${ctx}${brandName}というサービス（ブランド）について教えてください。特徴や強みを詳しく説明してください。`,
    `${ctx}おすすめのサービスを教えてください。${brandName}は含まれますか？`,
    `${ctx}${brandName}の評判やレビューを教えてください。`,
    `${ctx}トップ企業やサービスを比較してください。${brandName}はどの位置にありますか？`,
    `${ctx}${brandName}を使うメリット・デメリットを教えてください。`,
  ];
}

// --- 2. Check ChatGPT (OpenAI gpt-4o-mini) ---

export async function checkChatGPT(
  prompt: string,
  brandName: string,
  targetDomain: string
): Promise<BrandCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { platform: "ChatGPT", mentioned: false, context: "", sources: [] };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "あなたは正確な情報を提供するアシスタントです。質問に対して事実に基づいて回答してください。" },
          { role: "user", content: prompt },
        ],
        functions: [
          {
            name: "report_brand_mention",
            description: "Report whether the brand was mentioned in the response",
            parameters: {
              type: "object",
              properties: {
                mentioned: { type: "boolean", description: "Whether the brand was mentioned" },
                context: { type: "string", description: "The context in which the brand was mentioned" },
                sources: { type: "array", items: { type: "string" }, description: "Any URLs or sources referenced" },
              },
              required: ["mentioned", "context", "sources"],
            },
          },
        ],
        function_call: { name: "report_brand_mention" },
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      console.error(`ChatGPT API error: ${res.status}`);
      return { platform: "ChatGPT", mentioned: false, context: "", sources: [] };
    }

    const data = await res.json();
    const fnCall = data.choices?.[0]?.message?.function_call;
    if (!fnCall?.arguments) {
      // Fallback: parse content directly
      const content = data.choices?.[0]?.message?.content || "";
      const mentioned = content.toLowerCase().includes(brandName.toLowerCase()) ||
        content.includes(targetDomain);
      return {
        platform: "ChatGPT",
        mentioned,
        context: mentioned ? content.slice(0, 300) : "",
        sources: [],
      };
    }

    const parsed = JSON.parse(fnCall.arguments);
    return {
      platform: "ChatGPT",
      mentioned: parsed.mentioned ?? false,
      context: parsed.context || "",
      sources: parsed.sources || [],
    };
  } catch (e) {
    console.error("ChatGPT check failed:", e);
    return { platform: "ChatGPT", mentioned: false, context: "", sources: [] };
  }
}

// --- 3. Check Perplexity (Sonar) ---

export async function checkPerplexity(
  prompt: string,
  brandName: string,
  targetDomain: string
): Promise<BrandCheckResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { platform: "Perplexity", mentioned: false, context: "", sources: [] };

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "正確な情報を提供してください。出典があれば必ず含めてください。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      console.error(`Perplexity API error: ${res.status}`);
      return { platform: "Perplexity", mentioned: false, context: "", sources: [] };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    const mentioned =
      content.toLowerCase().includes(brandName.toLowerCase()) ||
      content.includes(targetDomain) ||
      citations.some((c: string) => c.includes(targetDomain));

    const relevantSources = citations.filter(
      (c: string) => c.includes(targetDomain) || c.includes(brandName.toLowerCase())
    );

    return {
      platform: "Perplexity",
      mentioned,
      context: mentioned ? content.slice(0, 300) : "",
      sources: relevantSources,
    };
  } catch (e) {
    console.error("Perplexity check failed:", e);
    return { platform: "Perplexity", mentioned: false, context: "", sources: [] };
  }
}

// --- 4. Check Gemini (2.0 flash-lite) ---

export async function checkGemini(
  prompt: string,
  brandName: string,
  targetDomain: string
): Promise<BrandCheckResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return { platform: "Gemini", mentioned: false, context: "", sources: [] };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          tools: [{ google_search: {} }],
        }),
      }
    );

    if (!res.ok) {
      console.error(`Gemini API error: ${res.status}`);
      return { platform: "Gemini", mentioned: false, context: "", sources: [] };
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textContent = parts.map((p: any) => p.text || "").join(" ");

    // Extract grounding sources
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    const groundingSources: string[] = [];
    if (groundingMeta?.groundingChunks) {
      for (const chunk of groundingMeta.groundingChunks) {
        if (chunk.web?.uri) groundingSources.push(chunk.web.uri);
      }
    }

    const mentioned =
      textContent.toLowerCase().includes(brandName.toLowerCase()) ||
      textContent.includes(targetDomain) ||
      groundingSources.some((s) => s.includes(targetDomain));

    const relevantSources = groundingSources.filter(
      (s) => s.includes(targetDomain) || s.includes(brandName.toLowerCase())
    );

    return {
      platform: "Gemini",
      mentioned,
      context: mentioned ? textContent.slice(0, 300) : "",
      sources: relevantSources,
    };
  } catch (e) {
    console.error("Gemini check failed:", e);
    return { platform: "Gemini", mentioned: false, context: "", sources: [] };
  }
}

// --- 5. Map to PlatformData ---

export function mapToPlatformData(
  platform: string,
  results: BrandCheckResult[],
  previousSnapshot?: PlatformData
): PlatformData {
  const mentionedCount = results.filter((r) => r.mentioned).length;
  const totalPrompts = results.length;
  const allSources = results.flatMap((r) => r.sources);
  const uniqueSources = Array.from(new Set(allSources));

  const mentions = mentionedCount;
  const citations = uniqueSources.length;
  const sov = totalPrompts > 0 ? Math.round((mentionedCount / totalPrompts) * 100 * 10) / 10 : 0;
  const multiplier = IMPRESSIONS_MULTIPLIER[platform] || 500;
  const impressions = mentionedCount * multiplier;

  let trend = 0;
  if (previousSnapshot && previousSnapshot.sov > 0) {
    trend = Math.round((sov - previousSnapshot.sov) * 10) / 10;
  }

  return { platform, mentions, citations, sov, impressions, trend };
}

// --- 6. Run Brand Check (orchestrator) ---

export async function runBrandCheck(
  brandName: string,
  targetDomain: string,
  industry: string,
  customPrompts?: string[],
  skipPerplexity = false
): Promise<{ platforms: PlatformData[]; raw: Record<string, BrandCheckResult[]> }> {
  const prompts = customPrompts && customPrompts.length > 0
    ? customPrompts
    : generatePrompts(brandName, industry);

  // Run all prompts per platform in parallel
  const [chatgptResults, perplexityResults, geminiResults] = await Promise.all([
    Promise.all(prompts.map((p) => checkChatGPT(p, brandName, targetDomain))),
    skipPerplexity
      ? Promise.resolve([] as BrandCheckResult[])
      : Promise.all(prompts.map((p) => checkPerplexity(p, brandName, targetDomain))),
    Promise.all(prompts.map((p) => checkGemini(p, brandName, targetDomain))),
  ]);

  const raw: Record<string, BrandCheckResult[]> = {
    ChatGPT: chatgptResults,
    Perplexity: perplexityResults,
    Gemini: geminiResults,
  };

  // Note: trend calculation requires previousSnapshot, which is injected by the cron job
  const platforms: PlatformData[] = [
    mapToPlatformData("ChatGPT", chatgptResults),
    ...(skipPerplexity ? [] : [mapToPlatformData("Perplexity", perplexityResults)]),
    mapToPlatformData("Gemini", geminiResults),
  ];

  return { platforms, raw };
}
