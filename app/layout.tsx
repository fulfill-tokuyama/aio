import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "AIO Insight — AI検索最適化サービス",
  description: "LLMO/AIO対策で AI検索からの集客を実現。月額¥10,000で始めるAI可視性モニタリング。",
  openGraph: {
    title: "AIO Insight — AI検索最適化サービス",
    description: "ChatGPT, Perplexity, Gemini からの流入を可視化・最適化",
    siteName: "AIO Insight by BeginAI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#04060B" }}>
        {children}
      </body>
    </html>
  );
}
