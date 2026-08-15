/**
 * Presence in a praxis room (#1744) — the pure seam.
 *
 * Everything visible about presence is drawn by `y-codemirror.next` out of one
 * awareness field, and awareness is **self-reported by each client and
 * relayed** (ADR-0073). So this file tests two different things:
 *
 * 1. The derivation the roster's dot reads — who is connected, deduped and
 *    stable enough that a cursor twitch is not a re-render.
 * 2. The **sanitizing seam**, which is the security half. The caret widget
 *    writes `style="background-color: ${color}"` into the DOM from the remote's
 *    own state object, so a co-member could otherwise post arbitrary CSS onto
 *    your page. The wire carries a faction SLUG and the receiver derives the
 *    colour, which means a remote can only ever pick one of nine known hues.
 *
 * The wire path is simulated with the real `y-protocols` encoder rather than by
 * poking `awareness.states`, because JSON-through-the-socket is exactly the
 * step that turns a claimed object into whatever the sender wanted.
 */
import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness'
import {
  paintedAwareness,
  presentCharacterIds,
  publishPresence,
  samePresence,
} from '../roomPresence'

interface Peer {
  doc: Y.Doc
  awareness: Awareness
}

function peer(): Peer {
  const doc = new Y.Doc()
  return { doc, awareness: new Awareness(doc) }
}

function destroy(...peers: Peer[]): void {
  for (const p of peers) {
    p.awareness.destroy()
    p.doc.destroy()
  }
}

/** Ship `from`'s local state to `into`, over the real awareness encoding. */
function relay(from: Peer, into: Peer): void {
  applyAwarenessUpdate(
    into.awareness,
    encodeAwarenessUpdate(from.awareness, [from.awareness.clientID]),
    'test',
  )
}

const CHARACTER = { id: 7, display_name: 'Wren', faction_slug: 'coven' }

describe('presentCharacterIds — who the roster dot lights up', () => {
  it('carries a published character across the wire', () => {
    const me = peer()
    const them = peer()
    publishPresence(them.awareness, CHARACTER)
    relay(them, me)

    expect(presentCharacterIds(me.awareness.getStates())).toEqual([7])
    destroy(me, them)
  })

  it('is empty before anyone publishes — a socket alone is not a person', () => {
    const me = peer()
    expect(presentCharacterIds(me.awareness.getStates())).toEqual([])
    destroy(me)
  })

  // Two tabs are two clientIDs and one player. A roster row is per CHARACTER,
  // so the derivation has to collapse them or the dot means "sockets", not
  // "here".
  it('dedupes one character open in two tabs, and sorts', () => {
    const me = peer()
    const tabA = peer()
    const tabB = peer()
    const other = peer()
    publishPresence(tabA.awareness, CHARACTER)
    publishPresence(tabB.awareness, CHARACTER)
    publishPresence(other.awareness, { ...CHARACTER, id: 2 })
    relay(tabA, me)
    relay(tabB, me)
    relay(other, me)

    expect(presentCharacterIds(me.awareness.getStates())).toEqual([2, 7])
    destroy(me, tabA, tabB, other)
  })

  // The awareness `change` event fires on every cursor move. Without a value
  // equality guard the roster re-renders on each keystroke of every co-author.
  it('samePresence compares by value, not identity', () => {
    expect(samePresence([2, 7], [2, 7])).toBe(true)
    expect(samePresence([2, 7], [7, 2])).toBe(false)
    expect(samePresence([2, 7], [2])).toBe(false)
    expect(samePresence([], [])).toBe(true)
  })
})

describe('paintedAwareness — the sanitizing seam (CSS injection)', () => {
  function remoteUserAsSeen(state: Record<string, unknown>): Record<string, unknown> {
    const me = peer()
    const them = peer()
    them.awareness.setLocalState(state)
    relay(them, me)
    const seen = paintedAwareness(me.awareness).getStates().get(them.awareness.clientID)
    destroy(me, them)
    return (seen?.user ?? {}) as Record<string, unknown>
  }

  it('derives the caret colour from the slug, as a CSS variable', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'Wren', factionSlug: 'coven' },
    })
    expect(user.color).toBe('var(--faction-coven)')
  })

  // THE ONE THIS SEAM EXISTS FOR. `y-codemirror.next` interpolates `color`
  // straight into a style attribute, so a co-member sending a declaration
  // instead of a colour gets `position: fixed` real estate on your composer.
  it('ignores a colour the remote supplied and paints its slug instead', () => {
    const user = remoteUserAsSeen({
      user: {
        characterId: 7,
        name: 'Wren',
        factionSlug: 'coven',
        color: 'red; position: fixed; inset: 0; background-image: url(https://evil/x',
        colorLight: 'url(https://evil/beacon)',
      },
    })
    expect(user.color).toBe('var(--faction-coven)')
    expect(JSON.stringify(user)).not.toContain('evil')
    expect(JSON.stringify(user)).not.toContain('fixed')
  })

  // An unregistered slug resolves to `default` rather than borrowing a hue, so
  // the set of reachable colours is closed (ADR-0039, `factionCssVar`).
  it('resolves an unknown slug to the default hue, never a raw value', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'Wren', factionSlug: '); content: url(x' },
    })
    expect(user.color).toBe('var(--faction-default)')
  })

  it('survives a `user` field that is not an object at all', () => {
    expect(remoteUserAsSeen({ user: 'nope' }).color).toBe('var(--faction-default)')
    expect(remoteUserAsSeen({ cursor: null }).color).toBe('var(--faction-default)')
  })

  // The library's fallback is `color + '33'`, which on a `var()` produces the
  // invalid `var(--faction-coven)33` and paints no selection at all. Supplying
  // it is not a nicety — it is what makes the selection band render.
  it('always supplies colorLight, so the library never appends 33 to a var()', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'Wren', factionSlug: 'coven' },
    })
    expect(user.colorLight).toBe(
      'color-mix(in srgb, var(--faction-coven) 22%, transparent)',
    )
  })

  // The name lands in an absolutely-positioned `white-space: nowrap` label, so
  // an unbounded one is a layout weapon even though it cannot inject markup.
  it('clips an unbounded remote name', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'x'.repeat(5000), factionSlug: 'coven' },
    })
    expect((user.name as string).length).toBeLessThanOrEqual(64)
  })

  it('keeps the remote cursor untouched — it is what positions the caret', () => {
    const me = peer()
    const them = peer()
    them.awareness.setLocalState({
      user: { characterId: 7, name: 'Wren', factionSlug: 'coven' },
      cursor: { anchor: { type: null, tname: 'body', item: null, assoc: 0 }, head: null },
    })
    relay(them, me)
    const seen = paintedAwareness(me.awareness)
      .getStates()
      .get(them.awareness.clientID)
    expect((seen?.cursor as { anchor: { tname: string } }).anchor.tname).toBe('body')
    destroy(me, them)
  })
})

describe('paintedAwareness — everything else passes through', () => {
  it('forwards the fields y-codemirror.next reads off the awareness object', () => {
    const me = peer()
    const painted = paintedAwareness(me.awareness)

    // The caret plugin skips the local client by comparing against this.
    expect(painted.doc.clientID).toBe(me.doc.clientID)

    // It writes the local cursor through `setLocalStateField` and reads it back
    // through `getLocalState` — both must reach the REAL awareness or the
    // provider broadcasts nothing.
    painted.setLocalStateField('cursor', { anchor: 1, head: 1 })
    expect(me.awareness.getLocalState()?.cursor).toEqual({ anchor: 1, head: 1 })
    expect(painted.getLocalState()?.cursor).toEqual({ anchor: 1, head: 1 })

    // `on`/`off` must subscribe to the real emitter, or a remote's arrival never
    // redraws — and must UNsubscribe, or a destroyed editor keeps dispatching.
    let changes = 0
    const listener = () => {
      changes += 1
    }
    painted.on('change', listener)
    const them = peer()
    publishPresence(them.awareness, CHARACTER)
    relay(them, me)
    expect(changes).toBe(1)

    painted.off('change', listener)
    publishPresence(them.awareness, { ...CHARACTER, display_name: 'Wren the second' })
    relay(them, me)
    expect(changes).toBe(1)

    destroy(me, them)
  })
})
