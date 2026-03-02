// app/api/stripe-webhook/route.ts
// Stripe Webhook: checkout完了 → アカウント自動作成 → ウェルカムメール

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "");
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripeClient = getStripe();
    event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    // Return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true, error: "Handler error" });
  }

  return NextResponse.json({ received: true });
}

// ============================================================
// checkout.session.completed
// ============================================================
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) {
    console.error("No email in checkout session");
    return;
  }

  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id || null;

  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id || null;

  // 1. leads から該当リードを検索
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, name, company, url")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const name = lead?.name || session.customer_details?.name || email.split("@")[0];

  // 2. Supabase Auth でユーザー作成（一時パスワード）
  const tempPassword = generateTempPassword();

  let supabaseUserId: string | null = null;

  // Check if user already exists (paginated listUsers → filter by email)
  let existingUser: { id: string; email?: string } | null = null;
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    // Iterate pages to find user by email (safer than unpaginated listUsers)
    let page = 1;
    const perPage = 100;
    let found = false;
    while (!found) {
      const { data: pageData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (!pageData?.users || pageData.users.length === 0) break;
      const match = pageData.users.find(u => u.email === email);
      if (match) {
        existingUser = match;
        found = true;
      }
      if (pageData.users.length < perPage) break;
      page++;
    }
  } catch {
    // If listUsers fails, proceed with user creation attempt
  }

  if (existingUser) {
    supabaseUserId = existingUser.id;
  } else {
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth user creation error:", authError);
    } else {
      supabaseUserId = newUser.user.id;
    }
  }

  // 3. customers テーブルに保存（upsert）
  await supabaseAdmin.from("customers").upsert(
    {
      email,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      supabase_user_id: supabaseUserId,
      status: "active",
    },
    { onConflict: "email" }
  );

  // 4. leads ステータスを converted に更新
  if (lead) {
    await supabaseAdmin
      .from("leads")
      .update({ status: "converted" })
      .eq("id", lead.id);
  }

  // 4b. pipeline_leads の phase を customer に更新（メールまたはURLで照合）
  try {
    // メールアドレスで照合
    const { data: pipelineLead } = await supabaseAdmin
      .from("pipeline_leads")
      .select("id")
      .eq("contact_email", email)
      .neq("phase", "customer")
      .limit(1)
      .single();

    if (pipelineLead) {
      await supabaseAdmin
        .from("pipeline_leads")
        .update({
          phase: "customer",
          stripe_status: "active",
          mrr: session.amount_total ? Math.round(session.amount_total) : 10000,
          follow_up_scheduled: null,
        })
        .eq("id", pipelineLead.id);
    } else if (lead?.url) {
      // URLドメインで照合（フォールバック）
      await supabaseAdmin
        .from("pipeline_leads")
        .update({
          phase: "customer",
          stripe_status: "active",
          mrr: session.amount_total ? Math.round(session.amount_total) : 10000,
          follow_up_scheduled: null,
        })
        .eq("url", lead.url)
        .neq("phase", "customer");
    }
  } catch {
    console.error("pipeline_leads customer update failed (non-fatal)");
  }

  // 5. ウェルカムメール送信（既存ユーザーにはパスワードなし）
  if (!existingUser) {
    try {
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail({
        to: email,
        name,
        tempPassword,
      });
    } catch (err) {
      console.error("Welcome email error:", err);
    }
  }
}

// ============================================================
// customer.subscription.deleted
// ============================================================
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  await supabaseAdmin
    .from("customers")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscriptionId);

  // pipeline_leads の stripe_status も同期
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("email")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (customer?.email) {
    await supabaseAdmin
      .from("pipeline_leads")
      .update({ stripe_status: "canceled", mrr: 0 })
      .eq("contact_email", customer.email);
  }
}

// ============================================================
// customer.subscription.updated
// ============================================================
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const status = subscription.status === "active" ? "active" : subscription.status;

  await supabaseAdmin
    .from("customers")
    .update({ status })
    .eq("stripe_subscription_id", subscriptionId);

  // pipeline_leads の stripe_status も同期
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("email")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (customer?.email) {
    await supabaseAdmin
      .from("pipeline_leads")
      .update({ stripe_status: status })
      .eq("contact_email", customer.email);
  }
}

// ============================================================
// Helpers
// ============================================================
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const crypto = require("crypto");
  const bytes = crypto.randomBytes(12);
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += chars.charAt(bytes[i] % chars.length);
  }
  return pw;
}
