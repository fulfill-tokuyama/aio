import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "無料AIワークショップ | ChatGPT・Gemini・Claude 活用講座 — フルフィル株式会社",
  description:
    "ChatGPT・Gemini・Claude・NotebookLM・Google AI Studio・Claude Code の6つのAIツールを業務で即活用する方法を、90分の無料ワークショップで実演付きでお伝えします。参加費無料・オンライン開催。",
  openGraph: {
    title: "無料AIワークショップ | 6つのAIツール活用講座",
    description:
      "他社が有料で教えている生成AI活用ノウハウをすべて無料で公開。ChatGPT・Gemini・Claude・NotebookLM・Google AI Studio・Claude Code を90分で学べます。",
    type: "website",
  },
};

export default function WorkshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
