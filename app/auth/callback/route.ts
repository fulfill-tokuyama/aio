// app/auth/callback/route.ts
// Supabase Auth のメール確認後コールバック
// diagnosis_id があれば詳細レポートページへリダイレクト

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const diagnosisId = searchParams.get("diagnosis_id");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Called from Server Component — ignore
            }
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  // 診断IDがあれば詳細レポートへリダイレクト
  if (diagnosisId) {
    return NextResponse.redirect(`${origin}/diagnosis/${diagnosisId}/detail`);
  }

  // デフォルトは診断ページへ
  return NextResponse.redirect(`${origin}/diagnosis`);
}
