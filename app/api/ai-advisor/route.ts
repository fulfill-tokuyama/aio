import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWithGemini } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    // 有料プランチェック
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, status")
      .eq("supabase_user_id", user.id)
      .eq("status", "active")
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: "この機能は有料プランユーザーのみご利用いただけます" },
        { status: 403 }
      );
    }

    const { message, diagnosis_id, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "メッセージが必要です。" }, { status: 400 });
    }

    // 診断データを取得（customer_idまたはlead_idベースで）
    let diagnosisContext = "";
    if (diagnosis_id) {
      // leads テーブルから顧客のメールに紐づくデータを取得
      const { data: leads } = await supabaseAdmin
        .from("leads")
        .select("id, company, url")
        .eq("email", user.email)
        .order("created_at", { ascending: false });

      if (leads && leads.length > 0) {
        const leadIds = leads.map((l: { id: string }) => l.id);
        const { data: report } = await supabaseAdmin
          .from("diagnosis_reports")
          .select("*")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (report) {
          const weaknesses = Array.isArray(report.weaknesses)
            ? report.weaknesses.join("\n- ")
            : "データなし";
          const suggestions = Array.isArray(report.suggestions)
            ? report.suggestions.join("\n- ")
            : "データなし";

          diagnosisContext = `
## ユーザーの診断データ
- **対象サイト**: ${leads[0].url || "不明"}
- **企業名**: ${leads[0].company || "不明"}
- **現在のAIOスコア**: ${report.score ?? "不明"}/100
- **弱点・課題**:
- ${weaknesses}
- **改善提案**:
- ${suggestions}`;
        }
      }
    }

    // 会話履歴を構築
    const conversationHistory = Array.isArray(history)
      ? history
          .slice(-10)
          .map((msg: { role: string; content: string }) =>
            `${msg.role === "user" ? "ユーザー" : "アドバイザー"}: ${msg.content}`
          )
          .join("\n\n")
      : "";

    const prompt = `あなたはAIO（AI Overview）およびLLMO（LLM最適化）の専門コンサルタントです。
ユーザーのウェブサイト診断データに基づいて、具体的で実行可能なアドバイスを提供してください。

${diagnosisContext}

## あなたの役割と指針
1. 上記の診断データを常に参照し、ユーザーのサイトに特化した具体的なアドバイスを提供すること。一般的・抽象的な回答は避けてください。
2. 以下の専門分野に関する深い知識を持っています：
   - **構造化データ（Schema.org）**: JSON-LDの実装、適切なスキーマタイプの選定、リッチリザルト対応
   - **metaタグ最適化**: title、description、OGP、canonical等の最適化戦略
   - **FAQ作成**: FAQPage構造化データ、ユーザーの検索意図に合ったQ&A設計
   - **コンテンツ戦略**: AIに引用されやすいコンテンツの構成、見出し設計、情報の網羅性
   - **E-E-A-T改善**: 経験・専門性・権威性・信頼性の向上施策
   - **技術的SEO**: Core Web Vitals、サイト構造、内部リンク、クロール最適化
3. 回答は日本語で、読みやすく構成してください。
4. 可能な限り、具体的なコード例、実装手順、HTMLスニペットを含めてください。
5. 優先度の高い改善点から順に提案してください。

${conversationHistory ? `## これまでの会話\n${conversationHistory}\n` : ""}

## ユーザーの最新の質問
${message}

上記の質問に対して、診断データを踏まえた具体的なアドバイスを日本語で回答してください。`;

    const reply = await generateWithGemini(prompt, { maxTokens: 4096 });

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("AI Advisor error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました。";
    return NextResponse.json(
      { error: `AIアドバイザーでエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
