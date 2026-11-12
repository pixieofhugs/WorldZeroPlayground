/**
 * Room presence (#1744). Awareness is self-reported and relayed (ADR-0073), and
 * the caret widget writes `color` into a style attribute — so the wire carries a
 * faction SLUG and the receiver derives the colour (security). Relayed through
 * the real `y-protocols` encoder, the step where a remote can lie.
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

  // `change` fires on every cursor move; identity equality re-renders each keystroke.
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

  /** Mixed with body ink for contrast (#2267, `roomPresenceContrast.test.ts`). */
  const painted = (key: string) =>
    `color-mix(in srgb, var(--faction-${key}) 60%, currentColor)`

  it('derives the caret colour from the slug, as a CSS variable', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'Wren', factionSlug: 'coven' },
    })
    expect(user.color).toBe(painted('coven'))
  })

  // The CSS-injection case: `color` goes straight into a style attribute.
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
    expect(user.color).toBe(painted('coven'))
    expect(JSON.stringify(user)).not.toContain('evil')
    expect(JSON.stringify(user)).not.toContain('fixed')
  })

  // Keeps the set of reachable colours closed (ADR-0039).
  it('resolves an unknown slug to the default hue, never a raw value', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'Wren', factionSlug: '); content: url(x' },
    })
    expect(user.color).toBe(painted('default'))
  })

  it('survives a `user` field that is not an object at all', () => {
    expect(remoteUserAsSeen({ user: 'nope' }).color).toBe(painted('default'))
    expect(remoteUserAsSeen({ cursor: null }).color).toBe(painted('default'))
  })

  // The library's fallback `color + '33'` is invalid on a `var()`: no selection band.
  it('always supplies colorLight, so the library never appends 33 to a var()', () => {
    const user = remoteUserAsSeen({
      user: { characterId: 7, name: 'Wren', factionSlug: 'coven' },
    })
    expect(user.colorLight).toBe(
      `color-mix(in srgb, ${painted('coven')} 22%, transparent)`,
    )
  })

  // The label is absolute + nowrap, so a huge name breaks layout.
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

    expect(painted.doc.clientID).toBe(me.doc.clientID)

    // Must reach the REAL awareness or the provider broadcasts nothing.
    painted.setLocalStateField('cursor', { anchor: 1, head: 1 })
    expect(me.awareness.getLocalState()?.cursor).toEqual({ anchor: 1, head: 1 })
    expect(painted.getLocalState()?.cursor).toEqual({ anchor: 1, head: 1 })

    // Subscribe and UNsubscribe on the real emitter.
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
