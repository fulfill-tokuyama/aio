// lib/n8n-webhook.ts
// n8n Webhook連携 — イベント発火用クライアント
// 環境変数でWebhook URLを設定し、各イベントをn8nワークフローに送信

// ============================================================
// イベント型定義
// ============================================================

/** WS申込イベント */
export interface WorkshopRegisteredEvent {
  event: "workshop_registered";
  timestamp: string;
  data: {
    registrationId: string;
    company: string;
    name: string;
    email: string;
    position: string | null;
    employeeCount: string | null;
    industry: string | null;
    interests: string[];
    workshopDate: string | null;
  };
}

/** HOTリード検出イベント */
export interface HotLeadEvent {
  event: "hot_lead_detected";
  timestamp: string;
  data: {
    leadId: string;
    company: string;
    contactName: string | null;
    contactEmail: string | null;
    industry: string | null;
    employeeCount: string | null;
    heatScore: number;
    action: "link_click" | "email_open";
    followUpCount: number;
  };
}

/** WS実施完了イベント（徳山さんが手動トリガー） */
export interface WorkshopCompletedEvent {
  event: "workshop_completed";
  timestamp: string;
  data: {
    workshopDate: string;
    attendeeIds: string[];
    noShowIds: string[];
    recordingUrl?: string;
  };
}

type WebhookEvent =
  | WorkshopRegisteredEvent
  | HotLeadEvent
  | WorkshopCompletedEvent;

// ============================================================
// Webhook送信
// ============================================================

function getWebhookUrl(event: WebhookEvent["event"]): string | null {
  switch (event) {
    case "workshop_registered":
      return process.env.N8N_WEBHOOK_WORKSHOP_REGISTERED || process.env.N8N_WEBHOOK_URL || null;
    case "hot_lead_detected":
      return process.env.N8N_WEBHOOK_HOT_LEAD || process.env.N8N_WEBHOOK_URL || null;
    case "workshop_completed":
      return process.env.N8N_WEBHOOK_WORKSHOP_COMPLETED || process.env.N8N_WEBHOOK_URL || null;
    default:
      return process.env.N8N_WEBHOOK_URL || null;
  }
}

/**
 * n8n Webhookにイベントを送信（fire-and-forget）
 * Webhook URLが未設定の場合は何もしない
 */
export async function fireN8nWebhook(payload: WebhookEvent): Promise<void> {
  const url = getWebhookUrl(payload.event);
  if (!url) return; // URL未設定ならスキップ

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // n8n認証（オプション）
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch {
    // Webhook失敗はサイレント（メイン処理をブロックしない）
    console.warn(`n8n webhook failed for event: ${payload.event}`);
  }
}
