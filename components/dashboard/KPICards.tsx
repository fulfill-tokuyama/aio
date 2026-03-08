"use client";
import { useMemo } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";

// ============================================================
// Design Tokens (mirrors C object in FormPilotAutoV2)
// ============================================================
const C = {
  card: "#111622",
  bdr: "#1B2235",
  tx: "#D2DAE8",
  sub: "#7E8CA4",
  dim: "#454F63",
  acc: "#F0B429",
  g: "#34D399",
  r: "#F87171",
  b: "#60A5FA",
  p: "#A78BFA",
  cy: "#22D3EE",
};

// ============================================================
// Icons (SVG path elements)
// ============================================================
const icons = {
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  dollar: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
};

const Icon = ({
  d,
  s = 12,
  c = C.sub,
}: {
  d: React.ReactNode;
  s?: number;
  c?: string;
}) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

// ============================================================
// KPICard
// ============================================================
interface KPICardProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  trendPositive?: boolean;
}

export function KPICard({
  icon,
  iconColor,
  label,
  value,
  sub,
  trend,
  trendPositive,
}: KPICardProps) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 8,
        padding: "13px 15px",
        border: `1px solid ${C.bdr}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: iconColor,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              color: C.sub,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: C.tx,
              fontFamily: "'Geist Mono',monospace",
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 9, color: C.dim, marginTop: 3 }}>
              {sub}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 3,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: `${iconColor}10`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon d={icon} s={12} c={iconColor} />
          </div>
          {trend !== undefined && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: trendPositive ? C.g : C.r,
              }}
            >
              {trend >= 0 ? "↑" : "↓"}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KPICards (4-card set)
// ============================================================
interface PipelineLead {
  id: string;
  phase: string;
  mrr: number;
  createdAt?: string;
  sentAt?: string;
  openedEmail?: boolean;
  [key: string]: unknown;
}

interface KPICardsProps {
  leads: PipelineLead[];
}

export default function KPICards({ leads }: KPICardsProps) {
  const mob = useIsMobile();

  const kpi = useMemo(() => {
    const t = leads.length;
    const sentCount = leads.filter((l) => l.sentAt).length;
    const opened = leads.filter(
      (l) =>
        l.openedEmail &&
        l.phase !== "discovered" &&
        l.phase !== "form_found"
    ).length;
    const cust = leads.filter((l) => l.phase === "customer").length;
    const mrr = leads.reduce((a, l) => a + l.mrr, 0);
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = leads.filter((l) => {
      const d = l.createdAt ? new Date(l.createdAt) : null;
      return d && d >= mStart;
    }).length;
    const openRate = sentCount ? (opened / sentCount * 100).toFixed(1) : "0";
    return { t, sentCount, opened, cust, mrr, newThisMonth, openRate };
  }, [leads]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: mob ? "repeat(2,1fr)" : "repeat(4,1fr)",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <KPICard
        icon={icons.users}
        iconColor={C.cy}
        label="今月の新規リード"
        value={kpi.newThisMonth.toString()}
        sub={`全${kpi.t}件中`}
      />
      <KPICard
        icon={icons.send}
        iconColor={C.p}
        label="メール送信数"
        value={kpi.sentCount.toString()}
        sub="累計送信"
      />
      <KPICard
        icon={icons.eye}
        iconColor={C.b}
        label="開封率"
        value={`${kpi.openRate}%`}
        sub={`${kpi.opened}/${kpi.sentCount}件`}
      />
      <KPICard
        icon={icons.dollar}
        iconColor={C.acc}
        label="MRR"
        value={`¥${kpi.mrr.toLocaleString()}`}
        sub={`${kpi.cust}社契約中`}
        trend={22}
        trendPositive
      />
    </div>
  );
}
