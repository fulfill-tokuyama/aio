"use client";

import { useState, useEffect, useCallback } from "react";

interface QueueLead {
  id: string;
  company: string;
  url: string;
  contact_email: string | null;
  campaign: string | null;
  llmo_score: number | null;
  scheduled_at: string | null;
}

interface QueueTabProps {
  refreshTrigger: number;
}

export default function QueueTab({ refreshTrigger }: QueueTabProps) {
  const [leads, setLeads] = useState<QueueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leadgenius/queue");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshTrigger]);

  const handleDequeue = async (ids: string[]) => {
    await fetch("/api/leadgenius/queue", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dequeue", leadIds: ids }),
    });
    setSelectedIds(new Set());
    fetchQueue();
  };

  const handlePreview = async (ids: string[]) => {
    setSending(true);
    try {
      const res = await fetch("/api/leadgenius/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, dryRun: true }),
      });
      if (res.ok) {
        setPreviewData(await res.json());
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (ids: string[]) => {
    if (!confirm(`${ids.length}社にメールを送信します。よろしいですか？`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/leadgenius/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, dryRun: false }),
      });
      if (res.ok) {
        alert("送信完了");
        setPreviewData(null);
        setSelectedIds(new Set());
        fetchQueue();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`送信失敗: ${data.error || res.status}`);
      }
    } finally {
      setSending(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#888888]">キュー読み込み中...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[#888888]">
        送信キューは空です。検索結果タブからリードを追加してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#888888]">{leads.length}社がキューにあります</p>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => handlePreview(Array.from(selectedIds))} disabled={sending} className="rounded border border-[#53a8b6] px-3 py-1.5 text-xs text-[#53a8b6] hover:bg-[#53a8b6]/10 transition disabled:opacity-50">
                プレビュー ({selectedIds.size})
              </button>
              <button onClick={() => handleSend(Array.from(selectedIds))} disabled={sending} className="rounded bg-[#e94560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e94560]/80 transition disabled:opacity-50">
                {sending ? "送信中..." : `承認・送信 (${selectedIds.size})`}
              </button>
              <button onClick={() => handleDequeue(Array.from(selectedIds))} className="rounded border border-white/10 px-3 py-1.5 text-xs text-[#888888] hover:bg-white/5 transition">
                キューから除外
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#111622] p-3">
            <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="h-4 w-4 rounded border-gray-600 bg-gray-800" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f0f0f5] truncate">{lead.company}</p>
              <div className="flex gap-3 text-xs text-[#888888] mt-0.5">
                <span>{lead.contact_email || "メールなし"}</span>
                {lead.llmo_score !== null && <span>LLMO: {lead.llmo_score}</span>}
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/5">
                  {(lead.campaign || "").replace("leadgenius-", "")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[#111622] border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">メールプレビュー（dryRun）</h3>
            <pre className="whitespace-pre-wrap text-xs text-[#99a4b8] bg-[#0a0a0f] rounded p-4">
              {JSON.stringify(previewData, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPreviewData(null)} className="rounded border border-white/10 px-4 py-2 text-sm text-[#888888] hover:bg-white/5">
                閉じる
              </button>
              <button onClick={() => handleSend(Array.from(selectedIds))} disabled={sending} className="rounded bg-[#e94560] px-4 py-2 text-sm font-medium text-white hover:bg-[#e94560]/80 disabled:opacity-50">
                このまま送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
