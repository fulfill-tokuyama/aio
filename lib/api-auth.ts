// lib/api-auth.ts
// API ルート用認証ヘルパー
// Supabase セッション or ADMIN_SECRET ヘッダーで認証

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/**
 * APIリクエストを認証する。
 * 認証方法:
 *   1. Authorization: Bearer <ADMIN_SECRET> ヘッダー
 *   2. Supabase セッション Cookie
 * 認証成功時は null を返す。失敗時は 401 NextResponse を返す。
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization");

  // 1. ADMIN_SECRET ヘッダーチェック
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) {
    return null; // 認証OK
  }

  // 2. CRON_SECRET（Cron からの内部呼び出し用）
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null; // 認証OK
  }

  // 3. Supabase セッション Cookie チェック
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return UNAUTHORIZED;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // API routes don't need to set cookies
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return null; // 認証OK
    }
  } catch {
    // セッション検証失敗
  }

  return UNAUTHORIZED;
}
