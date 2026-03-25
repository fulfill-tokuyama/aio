"use client";

import { useState, useCallback } from "react";
import SearchTab from "./SearchTab";
import QueueTab from "./QueueTab";
import HistoryTab from "./HistoryTab";

const TABS = [
  { id: "search", label: "検索結果" },
  { id: "queue", label: "送信キュー" },
  { id: "history", label: "送信済み" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LeadGeniusView() {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [queueRefresh, setQueueRefresh] = useState(0);

  const handleEnqueueLeads = useCallback(
    async (ids: string[]) => {
      const res = await fetch("/api/leadgenius/queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enqueue", leadIds: ids }),
      });
      if (res.ok) {
        setQueueRefresh((prev) => prev + 1);
        setActiveTab("queue");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`キュー追加に失敗: ${data.error || res.status}`);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-bold mb-1">LeadGenius</h1>
        <p className="text-sm text-[#888888] mb-6">企業検索 → LLMO診断 → アウトリーチ送信</p>
        <div className="flex gap-1 border-b border-white/10 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-[#e94560] text-[#f0f0f5]"
                  : "border-transparent text-[#888888] hover:text-[#f0f0f5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "search" && <SearchTab onEnqueueLeads={handleEnqueueLeads} />}
        {activeTab === "queue" && <QueueTab refreshTrigger={queueRefresh} />}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
