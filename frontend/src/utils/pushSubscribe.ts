import { apiPost } from '../api/client'

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Ask the browser, subscribe, register with the server (#3678's idempotent route). 'denied' = the player said no. */
export async function subscribePush(vapidPublicKey: string): Promise<'ok' | 'denied'> {
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.ready
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
