// app/api/llmo-scan/route.ts
// 単体URL LLMO診断 — /diagnosis ページから呼び出し

import { NextRequest, NextResponse } from "next/server";
import { runDiagnosis } from "@/lib/diagnosis";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url は必須です" }, { status: 400 });
    }

    const result = await runDiagnosis(url);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
