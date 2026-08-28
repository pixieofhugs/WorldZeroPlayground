/**
 * keyLane (ADR-0088): the keyring IS this browser profile.
 *
 * Real WebCrypto runs under the node harness, so the signing math is genuine
 * here — what is mocked is the wire (`fetch` or the api fns), never the
 * crypto. What is pinned: custody (localStorage first, memory fallback),
 * first-use mint vs stored-return, and the one login message contract —
 * the server answers the text, we sign it byte-exact, never our own version.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/auth', () => ({
  keyChallenge: vi.fn(),
  keyVerify: vi.fn(),
  keyRegister: vi.fn(),
}))

import { keyChallenge, keyVerify } from '../../api/auth'
import {
  KEY_STORAGE_KEY,
  b64ToBytes,
  bytesToB64,
  keyLaneAvailable,
  loadOrCreateKey,
  signMessage,
} from '../keyLane'
import { loginWithKey } from '../keyLane'

const KEY_CHALLENGE = 'World Zero key login v1\nnonce: abcdef0123456789abcdef01\n'

// TS 5.7's typed-array generics call every `Uint8Array` a maybe-shared
// buffer; WebCrypto's BufferSource does not. The runtime disagrees, so the
// cast is confined to this one helper rather than smeared over the tests.
const asView = (u: Uint8Array) => u as Uint8Array<ArrayBuffer>

// The harness is node (no DOM shim): localStorage does not exist at all here.
// A Map-backed stand-in keeps custody assertions real — keyLane treats storage
// through exactly these three calls, so the shim is the surface, not a fake.
const memStore = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (memStore.has(k) ? memStore.get(k)! : null),
    setItem: (k: string, v: unknown) => void memStore.set(k, String(v)),
    removeItem: (k: string) => void memStore.delete(k),
    clear: () => void memStore.clear(),
  },
})

describe('keyLaneAvailable', () => {
  it('is true wherever webcrypto Ed25519 exists (node harness proof)', () => {
    expect(keyLaneAvailable()).toBe(true)
  })
})

describe('b64 helpers', () => {
  it('round-trip', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    expect([...b64ToBytes(bytesToB64(bytes))]).toEqual([...bytes])
  })
})

describe('loadOrCreateKey', () => {
  beforeEach(() => localStorage.clear())

  it('mints once, then the stored key IS the same key forever', async () => {
    const a = await loadOrCreateKey()
    const b = await loadOrCreateKey()
    expect(b.publicKeyB64).toBe(a.publicKeyB64)
    expect(localStorage.getItem(KEY_STORAGE_KEY)).toContain(a.publicKeyB64)
  })

  it('a minted key is a real Ed25519 pair: 32 raw bytes, signs verifiably', async () => {
    const key = await loadOrCreateKey()
    expect(b64ToBytes(key.publicKeyB64)).toHaveLength(32)
    const signature = await signMessage(key, KEY_CHALLENGE)
    const publicKey = await crypto.subtle.importKey(
      'raw',
      asView(b64ToBytes(key.publicKeyB64)),
      { name: 'Ed25519' } as Algorithm,
      false,
      ['verify'],
    )
    const ok = await crypto.subtle.verify(
      { name: 'Ed25519' } as Algorithm,
      publicKey,
      asView(b64ToBytes(signature)),
      new TextEncoder().encode(KEY_CHALLENGE),
    )
    expect(ok).toBe(true)
  })

  it('corrupt stored text is a fresh mint, not a crash', async () => {
    localStorage.setItem(KEY_STORAGE_KEY, '{oops')
    const key = await loadOrCreateKey()
    expect(b64ToBytes(key.publicKeyB64)).toHaveLength(32)
  })

  it('falls back to an in-memory key with custody intact when storage is denied', async () => {
    const realSet = memStore.set.bind(memStore)
    memStore.set = () => {
      throw new Error('denied')
    }
    const key = await loadOrCreateKey()
    expect(b64ToBytes(key.publicKeyB64)).toHaveLength(32)
    memStore.set = realSet
  })
})

describe('loginWithKey', () => {
  it('signs the server message verbatim and posts key + signature only', async () => {
    localStorage.clear()
    const key = await loadOrCreateKey()
    const mockChallenge = vi.mocked(keyChallenge)
    const mockVerify = vi.mocked(keyVerify)
    mockChallenge.mockResolvedValue({ message: KEY_CHALLENGE, expires_in: 60 })
    mockVerify.mockResolvedValue({ message: 'ok' } as never)

    await loginWithKey(key)

    expect(mockChallenge).toHaveBeenCalledWith(key.publicKeyB64)
    expect(mockVerify).toHaveBeenCalledTimes(1)
    const [postedKey, postedSignature] = mockVerify.mock.calls[0]
    expect(postedKey).toBe(key.publicKeyB64)
    const publicKey = await crypto.subtle.importKey(
      'raw',
      asView(b64ToBytes(key.publicKeyB64)),
      { name: 'Ed25519' } as Algorithm,
      false,
      ['verify'],
    )
    expect(
      await crypto.subtle.verify(
        { name: 'Ed25519' } as Algorithm,
        publicKey,
        asView(b64ToBytes(postedSignature)),
        new TextEncoder().encode(KEY_CHALLENGE),
      ),
    ).toBe(true)
  })
})
