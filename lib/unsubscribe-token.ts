// lib/unsubscribe-token.ts
// 配信停止リンク用HMAC署名トークン

import { createHmac } from "crypto";

function getSecret(): string {
  return process.env.CRON_SECRET || process.env.ADMIN_SECRET || "fallback-unsubscribe-key";
}

/** leadId からHMAC署名を生成 */
export function generateUnsubscribeToken(leadId: string): string {
  return createHmac("sha256", getSecret()).update(leadId).digest("hex").slice(0, 16);
}

/** leadId + token の組み合わせを検証 */
export function verifyUnsubscribeToken(leadId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(leadId);
  return token === expected;
}

/** 署名付き配信停止URLを生成 */
export function buildUnsubscribeUrl(leadId: string, appUrl: string): string {
  const sig = generateUnsubscribeToken(leadId);
  return `${appUrl}/unsubscribe?lid=${leadId}&sig=${sig}`;
}
