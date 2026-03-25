"use client";

import { useState, useEffect } from "react";

interface HistoryEntry {
  t: string;
  msg: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export default function HistoryTab() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pipeline-activity");
        if (res.ok) {
          const data = await res.json();
          const allEntries: HistoryEntry[] = data.entries || [];
          setEntries(allEntries.filter((e) => e.type === "leadgenius_outreach"));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#888888]">履歴読み込み中...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[#888888]">
        送信履歴はまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => {
        const summary = entry.metadata?.summary as Record<string, unknown> | undefined;
        return (
          <div key={idx} className="rounded-lg border border-white/10 bg-[#111622] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#f0f0f5]">LeadGenius送信</span>
              <span className="text-xs text-[#888888]">{new Date(entry.t).toLocaleString("ja-JP")}</span>
            </div>
            <p className="text-xs text-[#99a4b8] mt-1">{entry.msg}</p>
            {summary && (
              <div className="mt-2 flex gap-4 text-xs text-[#888888]">
                <span>送信: <span className="text-emerald-400">{String(summary.sent || 0)}</span></span>
                <span>失敗: <span className="text-red-400">{String(summary.failed || 0)}</span></span>
                <span>スキップ: {String(summary.skipped || 0)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
