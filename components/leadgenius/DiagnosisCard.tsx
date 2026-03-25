"use client";

import type {
  LeadGeniusCompany,
  LeadGeniusDiagnosisResult,
} from "@/types/leadgenius";

interface DiagnosisCardProps {
  company: LeadGeniusCompany;
  diagnosis?: LeadGeniusDiagnosisResult;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEnqueue: (id: string) => void;
}

const SEGMENT_LABELS: Record<string, { label: string; color: string }> = {
  hpcreater: { label: "HPCreater対象", color: "text-amber-400 bg-amber-400/10" },
  llmo: { label: "LLMO対象", color: "text-cyan-400 bg-cyan-400/10" },
  both: { label: "HP + LLMO対象", color: "text-emerald-400 bg-emerald-400/10" },
  none: { label: "対象外", color: "text-gray-400 bg-gray-400/10" },
};

export default function DiagnosisCard({
  company,
  diagnosis,
  selected,
  onToggleSelect,
  onEnqueue,
}: DiagnosisCardProps) {
  const segment = diagnosis?.targetSegment || "none";
  const segmentInfo = SEGMENT_LABELS[segment] || SEGMENT_LABELS.none;
  const score = diagnosis?.visibilityScore?.total;

  return (
    <div className="rounded-lg border border-white/10 bg-[#111622] p-4 transition hover:border-white/20">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(company.id)}
          className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#f0f0f5] truncate">
              {company.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${segmentInfo.color}`}>
              {segmentInfo.label}
            </span>
          </div>
          <a
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#53a8b6] hover:underline truncate block mt-1"
          >
            {company.url}
          </a>
          <div className="mt-2 flex items-center gap-4 text-xs text-[#888888]">
            {company.industry && <span>{company.industry}</span>}
            {company.region && <span>{company.region}</span>}
            {score !== undefined && (
              <span>
                AI可視性: <span className={score < 40 ? "text-red-400" : "text-emerald-400"}>{score}</span>/100
              </span>
            )}
            {company.email && <span>{company.email}</span>}
          </div>
          {diagnosis?.executiveSummary && (
            <p className="mt-2 text-xs text-[#99a4b8] line-clamp-2">
              {diagnosis.executiveSummary}
            </p>
          )}
          {diagnosis?.top3Improvements && diagnosis.top3Improvements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {diagnosis.top3Improvements.map((item, i) => (
                <li key={i} className="text-xs text-[#888888] flex items-start gap-1">
                  <span className="text-amber-400 mt-0.5">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={() => onEnqueue(company.id)}
          className="shrink-0 rounded bg-[#e94560] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e94560]/80 transition"
        >
          キューに追加
        </button>
      </div>
    </div>
  );
}
