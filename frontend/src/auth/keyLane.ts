import { keyChallenge, keyVerify } from '../api/auth'

/**
 * The browser half of the key lane (ADR-0088). This browser IS the key:
 * an Ed25519 pair is minted here on first use and the private half never
 * leaves localStorage — the same trust shape as the theme in this tab, raised
 * to identity. `components/SignInOptions.tsx` renders the button; this module
 * never renders anything.
 *
 * The message signed is the server's verbatim challenge — nothing reassembled
 * on this side, so there is no document here to drift against the one
 * `services/key_auth.py` owns.
 */

export const KEY_STORAGE_KEY = 'wz-ed25519-jwk'

export interface StoredKeyPair {
  publicJwk: JsonWebKey
  privateJwk: JsonWebKey
  /** base64 of the raw 32 key bytes — the string the server names the key by. */
  publicKeyB64: string
}

export function keyLaneAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle?.generateKey === 'function'
}

export function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

export function b64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

function isStoredShape(value: unknown): value is StoredKeyPair {
  const record = value as StoredKeyPair | null
  return (
    !!record &&
    typeof record === 'object' &&
    typeof record.publicKeyB64 === 'string' &&
    !!record.publicJwk &&
    !!record.privateJwk
  )
}

export function loadStoredKey(): StoredKeyPair | null {
  try {
    const raw = localStorage.getItem(KEY_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isStoredShape(parsed) ? parsed : null
  } catch {
    return null // private mode, blocked storage, corrupt text — same answer
  }
}

/** Mint on first use; the stored pair answers from then on (a browser profile IS a keyring). */
export async function loadOrCreateKey(): Promise<StoredKeyPair> {
  const stored = loadStoredKey()
  if (stored) return stored
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' } as Algorithm, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const storedPair: StoredKeyPair = {
    publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey),
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicKeyB64: bytesToB64(rawPublic),
  }
  try {
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(storedPair))
  } catch {
    // Held in memory for THIS sign-in only; custody note stays honest.
  }
  return storedPair
}

async function importPrivate(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' } as Algorithm, true, ['sign'])
}

export async function signMessage(stored: StoredKeyPair, message: string): Promise<string> {
  const privateKey = await importPrivate(stored.privateJwk)
  const signature = await crypto.subtle.sign(
    'Ed25519',
    privateKey,
    new TextEncoder().encode(message),
  )
  return bytesToB64(new Uint8Array(signature))
}

/**
 * One whole round trip: challenge, sign, verify. Throws whatever apiPost
 * threw on a refusal — callers render with extractError. Any thrown value
 * means no session; there is no partial answer to read.
 */
export async function loginWithKey(stored: StoredKeyPair): Promise<void> {
  const challenge = await keyChallenge(stored.publicKeyB64)
  const signature = await signMessage(stored, challenge.message)
  await keyVerify(stored.publicKeyB64, signature)
}
