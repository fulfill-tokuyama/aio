// lib/unsubscribe-token.ts
// 配信停止リンク用HMAC署名トークン + トラッキング署名

import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET or ADMIN_SECRET environment variable is required");
  }
  return secret;
}

/** leadId からHMAC署名を生成（unsub: プレフィックスでドメイン分離、32文字） */
export function generateUnsubscribeToken(leadId: string): string {
  return createHmac("sha256", getSecret())
    .update(`unsub:${leadId}`)
    .digest("hex")
    .slice(0, 32);
}

/** leadId + token の組み合わせを検証（タイミング攻撃防止） */
export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(leadId);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** 署名付き配信停止URLを生成 */
export function buildUnsubscribeUrl(leadId: string, appUrl: string): string {
  const sig = generateUnsubscribeToken(leadId);
  return `${appUrl}/unsubscribe?lid=${leadId}&sig=${sig}`;
}

/** leadId からトラッキング用HMAC署名を生成（track: プレフィックス、32文字） */
export function generateTrackingSig(leadId: string): string {
  return createHmac("sha256", getSecret())
    .update(`track:${leadId}`)
    .digest("hex")
    .slice(0, 32);
}

/** トラッキング署名を検証（タイミング攻撃防止） */
export function verifyTrackingSig(leadId: string, sig: string): boolean {
  const expected = generateTrackingSig(leadId);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
