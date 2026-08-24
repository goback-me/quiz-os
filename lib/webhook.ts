import { signPayload } from './crypto'

type ForwardResult = { ok: boolean; error?: string }

/**
 * Forwards a qualified lead to the CLIENT's real webhook URL (already decrypted by the caller).
 * The browser never sees this URL — it only ever talks to /api/submit/[quizId].
 */
export async function forwardToWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>,
  webhookSecret?: string | null,
  timeoutMs = 8000
): Promise<ForwardResult> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (webhookSecret) {
    headers['X-QuizOS-Signature'] = signPayload(body, webhookSecret)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(webhookUrl, { method: 'POST', headers, body, signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return { ok: false, error: `Webhook responded ${res.status}` }
    return { ok: true }
  } catch (err) {
    clearTimeout(timeout)
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown webhook error' }
  }
}

/**
 * One retry, short backoff. Good enough for inline use in the submit route.
 * For real durability (VPS is always on so no cold-start risk, but n8n could be down for a bit),
 * pair this with a cron sweep — same pattern as Ad Performance OS / Swarm's retry queue:
 * a route like /api/cron/retry-webhooks that finds Submission.webhookStatus = 'failed'
 * and re-attempts every few minutes.
 */
export async function forwardWithRetry(
  webhookUrl: string,
  payload: Record<string, unknown>,
  webhookSecret?: string | null
): Promise<ForwardResult> {
  const first = await forwardToWebhook(webhookUrl, payload, webhookSecret)
  if (first.ok) return first
  await new Promise((r) => setTimeout(r, 1500))
  return forwardToWebhook(webhookUrl, payload, webhookSecret)
}
