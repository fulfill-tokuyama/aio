"use client";

import { useState } from "react";
import DiagnosisCard from "./DiagnosisCard";
import type { LeadGeniusSearchDiagnoseResult } from "@/types/leadgenius";

interface SearchTabProps {
  onEnqueueLeads: (ids: string[]) => Promise<void>;
}

export default function SearchTab({ onEnqueueLeads }: SearchTabProps) {
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [keyword, setKeyword] = useState("");
  const [diagnoseTop, setDiagnoseTop] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LeadGeniusSearchDiagnoseResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!industry && !region && !keyword) {
      setError("業種、地域、キーワードのいずれかを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/leadgenius/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: industry || undefined,
          region: region || undefined,
          keyword: keyword || undefined,
          diagnoseTop,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `API error: ${res.status}`);
      }
      setResults(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setLoading(false);
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

  const selectAll = () => {
    if (!results) return;
    const allIds = results.searchResults.companies.map((c) => c.id);
    setSelectedIds(selectedIds.size === allIds.length ? new Set() : new Set(allIds));
  };

  const handleBulkEnqueue = async () => {
    if (selectedIds.size === 0) return;
    await onEnqueueLeads(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const companies = results?.searchResults.companies || [];
  const diagMap = new Map(
    (results?.diagnosisResults || []).map((d) => [d.companyId, d])
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-[#111622] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs text-[#888888] mb-1">業種</label>
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="例: IT, 製造業" className="w-full rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#555] focus:border-[#53a8b6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-[#888888] mb-1">地域</label>
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="例: 東京, 大阪" className="w-full rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#555] focus:border-[#53a8b6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-[#888888] mb-1">キーワード</label>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例: AI導入, DX推進" className="w-full rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#555] focus:border-[#53a8b6] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-[#888888] mb-1">診断件数</label>
            <div className="flex gap-2">
              <input type="number" min={1} max={10} value={diagnoseTop} onChange={(e) => setDiagnoseTop(Number(e.target.value))} className="w-20 rounded bg-[#0a0a0f] border border-white/10 px-3 py-2 text-sm text-[#f0f0f5] focus:border-[#53a8b6] focus:outline-none" />
              <button onClick={handleSearch} disabled={loading} className="flex-1 rounded bg-[#e94560] px-4 py-2 text-sm font-medium text-white hover:bg-[#e94560]/80 transition disabled:opacity-50">
                {loading ? "検索中..." : "検索+診断"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      {loading && (
        <div className="flex items-center justify-center py-12 text-[#888888]">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[#53a8b6] border-t-transparent mx-auto" />
            <p className="text-sm">LeadGenius APIで検索+診断中...</p>
            <p className="text-xs mt-1">（2〜3分かかる場合があります）</p>
          </div>
        </div>
      )}
      {!loading && results && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888888]">
              {companies.length}社見つかりました（{results.diagnosisResults.length}社を診断済み）
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="rounded border border-white/10 px-3 py-1.5 text-xs text-[#888888] hover:bg-white/5 transition">
                {selectedIds.size === companies.length ? "選択解除" : "全選択"}
              </button>
              {selectedIds.size > 0 && (
                <button onClick={handleBulkEnqueue} className="rounded bg-[#e94560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e94560]/80 transition">
                  選択した{selectedIds.size}社をキューに追加
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {companies.map((company) => (
              <DiagnosisCard
                key={company.id}
                company={company}
                diagnosis={diagMap.get(company.id)}
                selected={selectedIds.has(company.id)}
                onToggleSelect={toggleSelect}
                onEnqueue={async (id) => { await onEnqueueLeads([id]); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
