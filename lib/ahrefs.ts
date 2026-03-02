// ============================================================
// Ahrefs API Client
// Checks AHREFS_API_KEY env — returns null when not connected
// ============================================================

const AHREFS_API_BASE = "https://api.ahrefs.com/v2";

export function isAhrefsConnected(): boolean {
  return !!process.env.AHREFS_API_KEY;
}

export async function ahrefsRequest(
  path: string,
  params?: Record<string, string>
): Promise<any | null> {
  if (!isAhrefsConnected()) return null;

  const url = new URL(`${AHREFS_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.AHREFS_API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Ahrefs API error: ${res.status} ${res.statusText}`);
      return null;
    }

    return await res.json();
  } catch (e) {
    console.error("Ahrefs API request failed:", e);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Fetch Web Analytics chart data (traffic over time) */
export async function fetchWebAnalyticsChart(
  siteUrl: string,
  dateFrom: string,
  dateTo: string
) {
  return ahrefsRequest("/web-analytics/chart", {
    target: siteUrl,
    date_from: dateFrom,
    date_to: dateTo,
  });
}

/** Fetch Web Analytics stats (aggregated) */
export async function fetchWebAnalyticsStats(
  siteUrl: string,
  dateFrom: string,
  dateTo: string
) {
  return ahrefsRequest("/web-analytics/stats", {
    target: siteUrl,
    date_from: dateFrom,
    date_to: dateTo,
  });
}

