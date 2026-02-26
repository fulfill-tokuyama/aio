// app/api/stripe-webhook/route.ts
// Stripe Webhook: 顧客ステータスの自動更新
// Vercel環境変数: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: 本番実装時に以下を追加
  // 1. Stripe signature検証
  // 2. イベントタイプに応じた処理
  //    - checkout.session.completed → 新規顧客登録
  //    - customer.subscription.updated → ステータス更新
  //    - customer.subscription.deleted → 解約処理
  //    - invoice.payment_failed → 支払い失敗通知
  // 3. Supabase/DBへの書き込み

  const body = await req.text();

  // Placeholder response
  return NextResponse.json({
    received: true,
    message: "Stripe webhook endpoint ready. Implement with stripe npm package.",
    events_to_handle: [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
      "invoice.payment_succeeded",
    ],
  });
}
