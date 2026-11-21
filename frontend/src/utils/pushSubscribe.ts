import { apiPost } from '../api/client'

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

const READY_MS = 8000

/** Is this device already subscribed? Never waits on a service worker that may not exist. */
export async function deviceSubscribed(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return !!(reg && (await reg.pushManager.getSubscription()))
}

export function pushSupported(): boolean {
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator
}

/**
 * Ask the browser, subscribe, register with the server (#3678's idempotent route).
 * 'denied' = the player said no; 'dismissed' = closed the prompt (ask again later).
 * Rejects when the service worker never comes up, so a tap cannot hang.
 */
export async function subscribePush(
  vapidPublicKey: string,
): Promise<'ok' | 'denied' | 'dismissed' | 'unsupported'> {
  if (!pushSupported()) return 'unsupported'
  const asked = await Notification.requestPermission()
  if (asked === 'denied') return 'denied'
  if (asked !== 'granted') return 'dismissed'
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, no) =>
      setTimeout(() => no(new Error('service worker not ready')), READY_MS),
    ),
  ])
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(vapidPublicKey),
    }))
  const { endpoint, keys } = sub.toJSON()
  await apiPost('/push/subscriptions', {
    body: { endpoint: endpoint!, keys: { p256dh: keys!.p256dh, auth: keys!.auth } },
  })
  return 'ok'
}
